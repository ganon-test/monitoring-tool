/**
 * Proxmox監視ダッシュボード - Node.js版
 * Proxmox APIから直接データを取得してリアルタイム表示
 */

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const axios = require('axios');
const https = require('https');
const fs = require('fs');
const path = require('path');
const yaml = require('yaml');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// 設定
const PORT = process.env.PORT || 3000;
const CONFIG_PATH = process.env.CONFIG_PATH || '../config.yaml';

// ミドルウェア
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

class ProxmoxClient {
    constructor(host, username, password, verifySSL = false) {
        this.host = host;
        this.username = username;
        this.password = password;
        this.verifySSL = verifySSL;
        this.ticket = null;
        this.csrfToken = null;
        
        // SSL証明書を無視するHTTPSエージェント
        this.httpsAgent = new https.Agent({
            rejectUnauthorized: verifySSL
        });
    }

    async authenticate() {
        try {
            const authUrl = `https://${this.host}:8006/api2/json/access/ticket`;
            const authData = {
                username: this.username,
                password: this.password
            };

            console.log(`🔐 認証試行: ${this.host} (user: ${this.username})`);

            const response = await axios.post(authUrl, authData, {
                httpsAgent: this.httpsAgent,
                timeout: 10000
            });

            if (response.data && response.data.data) {
                this.ticket = response.data.data.ticket;
                this.csrfToken = response.data.data.CSRFPreventionToken;
                console.log(`✅ Proxmox認証成功: ${this.host}`);
                return true;
            } else {
                console.error(`❌ 認証レスポンス不正 ${this.host}:`, response.data);
                return false;
            }
        } catch (error) {
            console.error(`❌ Proxmox認証失敗 ${this.host}:`, {
                message: error.message,
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data
            });
            return false;
        }
    }

    async apiRequest(endpoint) {
        if (!this.ticket) {
            const authSuccess = await this.authenticate();
            if (!authSuccess) return null;
        }

        try {
            const url = `https://${this.host}:8006/api2/json${endpoint}`;
            const response = await axios.get(url, {
                headers: {
                    'Cookie': `PVEAuthCookie=${this.ticket}`,
                    'CSRFPreventionToken': this.csrfToken
                },
                httpsAgent: this.httpsAgent,
                timeout: 10000
            });

            return response.data?.data || null;
        } catch (error) {
            if (error.response?.status === 401) {
                // 認証が切れた場合は再認証
                this.ticket = null;
                return await this.apiRequest(endpoint);
            }
            console.error(`API リクエストエラー ${this.host}${endpoint}:`, error.message);
            return null;
        }
    }

    async getClusterData() {
        console.log(`📡 Proxmoxデータ取得開始: ${this.host}`);
        
        const data = {
            nodes: [],
            vms: [],
            storage: [],
            cluster_status: 'online'
        };

        try {
            // ノード一覧取得
            const nodes = await this.apiRequest('/nodes');
            if (!nodes) {
                data.cluster_status = 'offline';
                return data;
            }

            for (const node of nodes) {
                const nodeName = node.node;
                console.log(`📊 ノード処理中: ${nodeName}`);

                // ノード詳細情報
                const status = await this.apiRequest(`/nodes/${nodeName}/status`);
                if (status) {
                    const memoryUsed = status.memory?.used || 0;
                    const memoryTotal = status.memory?.total || 0;
                    const memoryPercent = memoryTotal > 0 ? (memoryUsed / memoryTotal * 100) : 0;
                    
                    const nodeData = {
                        name: nodeName,
                        status: node.status,
                        cpu: (status.cpu || 0) * 100,
                        memory_used: memoryUsed,
                        memory_total: memoryTotal,
                        memory_percent: memoryPercent,
                        uptime: status.uptime || 0,
                        load: status.loadavg || [0, 0, 0],
                        host: this.host  // どのProxmoxホストからのデータか識別
                    };
                    data.nodes.push(nodeData);
                    
                    console.log(`📈 ノード統計 ${nodeName}: CPU=${nodeData.cpu.toFixed(1)}%, メモリ=${memoryPercent.toFixed(1)}% (${(memoryUsed/1024/1024/1024).toFixed(1)}GB/${(memoryTotal/1024/1024/1024).toFixed(1)}GB)`);
                }

                // VM一覧
                const vms = await this.apiRequest(`/nodes/${nodeName}/qemu`);
                if (vms) {
                    for (const vm of vms) {
                        data.vms.push({
                            id: vm.vmid,
                            name: vm.name || `VM-${vm.vmid}`,
                            status: vm.status,
                            node: nodeName,
                            host: this.host,
                            type: 'vm',
                            cpu: vm.cpu ? vm.cpu * 100 : 0,
                            memory: vm.mem || 0,
                            maxmem: vm.maxmem || 0
                        });
                    }
                    console.log(`🖥️  ${nodeName}: ${vms.length}個のVM`);
                }

                // コンテナ一覧
                const containers = await this.apiRequest(`/nodes/${nodeName}/lxc`);
                if (containers) {
                    for (const ct of containers) {
                        data.vms.push({
                            id: ct.vmid,
                            name: ct.name || `CT-${ct.vmid}`,
                            status: ct.status,
                            node: nodeName,
                            host: this.host,
                            type: 'container',
                            cpu: ct.cpu ? ct.cpu * 100 : 0,
                            memory: ct.mem || 0,
                            maxmem: ct.maxmem || 0
                        });
                    }
                    console.log(`📦 ${nodeName}: ${containers.length}個のコンテナ`);
                }

                // ストレージ情報
                const storage = await this.apiRequest(`/nodes/${nodeName}/storage`);
                if (storage) {
                    for (const store of storage) {
                        data.storage.push({
                            node: nodeName,
                            name: store.storage,
                            type: store.type || 'unknown',
                            total: store.total || 0,
                            used: store.used || 0,
                            available: store.avail || 0
                        });
                    }
                }
            }

            console.log(`✅ データ取得完了: ${this.host} - ノード:${data.nodes.length}, VM/CT:${data.vms.length}`);
            return data;

        } catch (error) {
            console.error(`❌ クラスターデータ取得エラー ${this.host}:`, error.message);
            data.cluster_status = 'offline';
            return data;
        }
    }
}

class DatabaseManager {
    constructor(dbPath = 'monitoring.db') {
        this.dbPath = dbPath;
        this.db = new sqlite3.Database(dbPath);
        this.initDatabase();
    }

    initDatabase() {
        const sql = `
            CREATE TABLE IF NOT EXISTS metrics_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                total_cpu REAL,
                total_memory_used INTEGER,
                total_memory_total INTEGER,
                nodes_count INTEGER,
                vms_running INTEGER,
                vms_total INTEGER
            )
        `;
        
        this.db.run(sql, (err) => {
            if (err) {
                console.error('データベース初期化エラー:', err);
            } else {
                console.log('✅ データベース初期化完了');
            }
        });
    }

    saveMetrics(data) {
        const nodes = data.nodes || [];
        const vms = data.vms || [];
        
        // アクティブノードのみを対象とした統計
        const activeNodes = nodes.filter(node => node.status === 'online');
        
        const totalCpu = activeNodes.length > 0 ? activeNodes.reduce((sum, node) => sum + node.cpu, 0) / activeNodes.length : 0;
        const totalMemoryUsed = activeNodes.reduce((sum, node) => sum + node.memory_used, 0);
        const totalMemoryTotal = activeNodes.reduce((sum, node) => sum + node.memory_total, 0);
        const vmsRunning = vms.filter(vm => vm.status === 'running').length;

        console.log('💾 統計保存:', {
            activeNodes: activeNodes.length,
            totalNodes: nodes.length,
            avgCpu: totalCpu.toFixed(1),
            memoryUsedGB: (totalMemoryUsed / 1024 / 1024 / 1024).toFixed(1),
            memoryTotalGB: (totalMemoryTotal / 1024 / 1024 / 1024).toFixed(1),
            vmsRunning: vmsRunning,
            vmsTotal: vms.length
        });

        const sql = `
            INSERT INTO metrics_history 
            (total_cpu, total_memory_used, total_memory_total, nodes_count, vms_running, vms_total)
            VALUES (?, ?, ?, ?, ?, ?)
        `;

        this.db.run(sql, [totalCpu, totalMemoryUsed, totalMemoryTotal, activeNodes.length, vmsRunning, vms.length], (err) => {
            if (err) {
                console.error('メトリクス保存エラー:', err);
            }
        });
    }

    getHistory(hours = 24) {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    timestamp,
                    total_cpu,
                    (total_memory_used * 100.0 / total_memory_total) as memory_percent,
                    vms_running
                FROM metrics_history 
                WHERE timestamp > datetime('now', '-${hours} hours')
                ORDER BY timestamp
            `;

            this.db.all(sql, [], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    const history = rows.map(row => ({
                        time: row.timestamp,
                        cpu: row.total_cpu,
                        memory: row.memory_percent,
                        vms: row.vms_running
                    }));
                    resolve(history);
                }
            });
        });
    }
}

class ProxmoxMonitor {
    constructor() {
        this.clients = [];
        this.database = new DatabaseManager();
        this.latestData = {};
        this.isRunning = false;
        this.updateInterval = null;
        
        this.loadConfig();
    }

    loadConfig() {
        try {
            const configPath = path.resolve(__dirname, CONFIG_PATH);
            console.log(`📄 設定ファイル読み込み: ${configPath}`);
            
            const configFile = fs.readFileSync(configPath, 'utf8');
            const config = yaml.parse(configFile);
            console.log('📄 設定ファイル内容:', JSON.stringify(config, null, 2));

            // 環境変数の優先、設定ファイルの構造に対応
            let proxmoxHosts;
            if (process.env.PROXMOX_HOSTS) {
                proxmoxHosts = JSON.parse(process.env.PROXMOX_HOSTS);
            } else if (Array.isArray(config.proxmox)) {
                // config.yaml の proxmox が直接配列の場合
                proxmoxHosts = config.proxmox;
            } else if (config.proxmox && config.proxmox.hosts) {
                // config.yaml の proxmox.hosts が配列の場合
                proxmoxHosts = config.proxmox.hosts;
            } else {
                throw new Error('Proxmoxホスト設定が見つかりません');
            }

            if (!proxmoxHosts || !Array.isArray(proxmoxHosts)) {
                throw new Error('Proxmoxホスト設定が配列ではありません');
            }

            console.log(`🔧 発見されたProxmoxホスト: ${proxmoxHosts.length}台`);

            for (let i = 0; i < proxmoxHosts.length; i++) {
                const hostConfig = proxmoxHosts[i];
                
                // 環境変数からパスワードを取得
                const passwordEnvVar = `PROXMOX_PASSWORD_${i + 1}`;
                const password = process.env[passwordEnvVar] || hostConfig.password;
                
                if (!password) {
                    console.warn(`⚠️ パスワードが設定されていません: ${hostConfig.host} (${passwordEnvVar})`);
                    continue;
                }
                
                console.log(`🔧 Proxmoxクライアント設定: ${hostConfig.host}:${hostConfig.port || 8006} (user: ${hostConfig.username})`);
                
                const client = new ProxmoxClient(
                    hostConfig.host,
                    hostConfig.username,
                    password,
                    hostConfig.verify_ssl || false
                );
                this.clients.push(client);
            }

            console.log(`✅ 設定読み込み完了: ${this.clients.length}台のProxmoxサーバー`);
        } catch (error) {
            console.error('❌ 設定読み込みエラー:', error.message);
            process.exit(1);
        }
    }

    async startMonitoring() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        console.log('🚀 Proxmox監視開始...');

        const updateData = async () => {
            try {
                console.log('📊 データ更新開始...');
                
                const allData = {
                    nodes: [],
                    vms: [],
                    storage: [],
                    cluster_status: 'online'
                };

                // 全Proxmoxサーバーからデータ収集
                const seenNodes = new Set();
                const seenVMs = new Set();
                
                for (let i = 0; i < this.clients.length; i++) {
                    const client = this.clients[i];
                    console.log(`📡 データ収集中 (${i + 1}/${this.clients.length}): ${client.host}`);
                    
                    const data = await client.getClusterData();
                    if (data) {
                        // ノードの重複排除（ノード名をキーとして使用）
                        data.nodes.forEach(node => {
                            if (!seenNodes.has(node.name)) {
                                seenNodes.add(node.name);
                                allData.nodes.push({
                                    ...node,
                                    source_host: client.host  // どのホストから取得したかを記録
                                });
                            }
                        });
                        
                        // VM/CTの重複排除（VMID + ノード名をキーとして使用）
                        data.vms.forEach(vm => {
                            const vmKey = `${vm.node}-${vm.id}`;
                            if (!seenVMs.has(vmKey)) {
                                seenVMs.add(vmKey);
                                allData.vms.push({
                                    ...vm,
                                    source_host: client.host
                                });
                            }
                        });
                        
                        // ストレージは各ホストごとに個別（重複排除なし）
                        allData.storage.push(...data.storage.map(storage => ({
                            ...storage,
                            source_host: client.host
                        })));
                        
                        console.log(`✅ データ収集完了 (${i + 1}/${this.clients.length}): ${client.host} - ノード:${data.nodes.length}, VM/CT:${data.vms.length}`);
                    } else {
                        console.log(`❌ データ収集失敗 (${i + 1}/${this.clients.length}): ${client.host}`);
                        if (this.clients.length === 1) {
                            allData.cluster_status = 'offline';
                        }
                    }
                }
                
                console.log(`📊 重複排除後の統計 - ユニークノード:${allData.nodes.length}, ユニークVM/CT:${allData.vms.length}, ストレージ:${allData.storage.length}`);

                this.latestData = allData;
                this.database.saveMetrics(allData);

                // WebSocketでクライアントに送信
                io.emit('data_update', allData);

                console.log(`✅ データ更新完了 - ノード:${allData.nodes.length}, VM/CT:${allData.vms.length}`);

            } catch (error) {
                console.error('❌ データ更新エラー:', error.message);
            }
        };

        // 初回実行
        await updateData();
        
        // 定期実行 (10秒間隔)
        this.updateInterval = setInterval(updateData, 10000);
    }

    stopMonitoring() {
        this.isRunning = false;
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        console.log('🛑 Proxmox監視停止');
    }

    getLatestData() {
        return this.latestData;
    }

    async getHistory() {
        return await this.database.getHistory();
    }
}

// Proxmox監視インスタンス
const monitor = new ProxmoxMonitor();

// ルート設定
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        version: require('./package.json').version
    });
});

app.get('/api/status', (req, res) => {
    res.json({
        success: true,
        data: monitor.getLatestData(),
        timestamp: new Date().toISOString()
    });
});

app.get('/api/history', async (req, res) => {
    try {
        const history = await monitor.getHistory();
        res.json({
            success: true,
            data: history,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            data: []
        });
    }
});

// WebSocket接続
io.on('connection', (socket) => {
    console.log('👥 クライアント接続:', socket.id);
    
    // 最新データを即座に送信
    socket.emit('data_update', monitor.getLatestData());
    
    socket.on('disconnect', () => {
        console.log('👋 クライアント切断:', socket.id);
    });
});

// サーバー起動
server.listen(PORT, () => {
    console.log('🚀 Proxmox監視ダッシュボード起動完了');
    console.log(`📊 ダッシュボード: http://localhost:${PORT}`);
    console.log(`🔗 ステータスAPI: http://localhost:${PORT}/api/status`);
    console.log(`📈 履歴API: http://localhost:${PORT}/api/history`);
    
    // 監視開始
    monitor.startMonitoring();
});

// 終了処理
process.on('SIGINT', () => {
    console.log('\n🛑 サーバー終了中...');
    monitor.stopMonitoring();
    server.close(() => {
        console.log('✅ サーバー終了完了');
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
    monitor.stopMonitoring();
    server.close(() => {
        process.exit(0);
    });
});
