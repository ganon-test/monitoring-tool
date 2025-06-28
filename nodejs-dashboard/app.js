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
                timeout: 5000  // 短いタイムアウト
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
                code: error.code,
                status: error.response?.status
            });
            return false;
        }
    }

    async apiRequest(endpoint, params = null, options = {}) {
        if (!this.ticket) {
            const authSuccess = await this.authenticate();
            if (!authSuccess) return null;
        }

        try {
            const method = options.method || 'GET';
            let url = `https://${this.host}:8006/api2/json${endpoint}`;
            
            const config = {
                headers: {
                    'Cookie': `PVEAuthCookie=${this.ticket}`,
                    'CSRFPreventionToken': this.csrfToken
                },
                httpsAgent: this.httpsAgent,
                timeout: 8000
            };
            
            let response;
            
            if (method === 'POST') {
                // POSTリクエストの場合
                const postData = options.data || {};
                response = await axios.post(url, postData, config);
            } else {
                // GETリクエストの場合（既存のロジック）
                if (params && typeof params === 'object') {
                    const queryString = new URLSearchParams(params).toString();
                    url += `?${queryString}`;
                }
                response = await axios.get(url, config);
            }

            return response.data?.data || null;
        } catch (error) {
            if (error.response?.status === 401) {
                // 認証が切れた場合は再認証
                this.ticket = null;
                return await this.apiRequest(endpoint, params, options);
            }
            
            // ネットワークエラーやタイムアウトの場合は詳細ログ
            console.error(`API リクエストエラー ${this.host}${endpoint}:`, {
                message: error.message,
                code: error.code,
                status: error.response?.status
            });
            throw error; // エラーを上位に伝播
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
            // ノード一覧取得（まず接続性を確認）
            const nodes = await this.apiRequest('/nodes');
            if (!nodes || nodes.length === 0) {
                console.warn(`⚠️ ノード情報が空: ${this.host}`);
                data.cluster_status = 'offline';
                return data;
            }

            console.log(`📊 ${nodes.length}個のノードを発見: ${this.host}`);

            for (const node of nodes) {
                const nodeName = node.node;
                console.log(`📊 ノード処理中: ${nodeName} @ ${this.host}`);

                try {
                    // ノード詳細情報
                    const status = await this.apiRequest(`/nodes/${nodeName}/status`);
                    if (status) {
                        const memoryUsed = status.memory?.used || 0;
                        const memoryTotal = status.memory?.total || 0;
                        const memoryPercent = memoryTotal > 0 ? (memoryUsed / memoryTotal * 100) : 0;
                        
                        // ロードアベレージの安全な取得
                        let loadAvg = [0, 0, 0];
                        if (status.loadavg) {
                            if (Array.isArray(status.loadavg)) {
                                loadAvg = status.loadavg.map(load => parseFloat(load) || 0);
                            } else if (typeof status.loadavg === 'string') {
                                // 文字列の場合は分割
                                const parts = status.loadavg.split(' ').map(part => parseFloat(part) || 0);
                                loadAvg = [parts[0] || 0, parts[1] || 0, parts[2] || 0];
                            }
                        }
                        
                        // 追加のシステム統計を取得
                        let systemStats = null;
                        try {
                            systemStats = await this.apiRequest(`/nodes/${nodeName}/rrddata`, {
                                ds: 'loadavg,cpu,memused',
                                timeframe: 'hour'
                            });
                            if (systemStats && systemStats.length > 0) {
                                const latest = systemStats[systemStats.length - 1];
                                if (latest.loadavg !== null && latest.loadavg !== undefined) {
                                    loadAvg = [parseFloat(latest.loadavg) || 0, 0, 0];
                                }
                            }
                        } catch (rrdError) {
                            console.log(`⚠️  RRD統計取得失敗 ${nodeName}: ${rrdError.message}`);
                        }
                        
                        // ネットワーク統計を取得（シンプルで確実な方法）
                        let networkData = null;
                        try {
                            console.log(`🔍 ネットワーク統計取得開始 ${nodeName}`);
                            
                            // 方法1: RRDデータから取得（最も信頼性が高く、実際のトラフィック量を取得可能）
                            try {
                                console.log(`🔍 RRDデータ取得試行 ${nodeName}`);
                                const rrdResponse = await this.apiRequest(`/nodes/${nodeName}/rrddata`, {
                                    ds: 'netin,netout',
                                    timeframe: 'hour'
                                });
                                
                                if (rrdResponse && rrdResponse.length > 0) {
                                    // 最新のデータポイントを使用
                                    const latest = rrdResponse[rrdResponse.length - 1];
                                    console.log(`🔍 RRD最新データ ${nodeName}:`, { netin: latest.netin, netout: latest.netout, time: latest.time });
                                    
                                    if (latest && (latest.netin !== null || latest.netout !== null)) {
                                        const netin = Math.abs(parseFloat(latest.netin) || 0);
                                        const netout = Math.abs(parseFloat(latest.netout) || 0);
                                        
                                        // RRDデータはバイト/秒なので、累積値として1時間分で概算
                                        const timeMultiplier = 3600; // 1時間分
                                        const totalRx = Math.round(netin * timeMultiplier);
                                        const totalTx = Math.round(netout * timeMultiplier);
                                        
                                        networkData = {
                                            interfaces: 1,
                                            total_rx_bytes: totalRx,
                                            total_tx_bytes: totalTx,
                                            rx_rate: netin,
                                            tx_rate: netout,
                                            details: [{
                                                name: 'total',
                                                rx_bytes: totalRx,
                                                tx_bytes: totalTx,
                                                rx_packets: 0,
                                                tx_packets: 0,
                                                rx_rate: netin,
                                                tx_rate: netout
                                            }]
                                        };
                                        console.log(`🌐 ネットワーク統計(RRD) ${nodeName}: 受信=${(netin / 1024).toFixed(1)}KB/s, 送信=${(netout / 1024).toFixed(1)}KB/s, 累積=${((totalRx + totalTx) / 1024 / 1024).toFixed(1)}MB`);
                                    }
                                }
                            } catch (rrdError) {
                                console.log(`⚠️  RRD取得失敗 ${nodeName}: ${rrdError.message}`);
                            }
                            
                            // 方法2: ネットワーク設定から推定（RRDが失敗した場合）
                            if (!networkData) {
                                try {
                                    console.log(`🔍 network設定取得試行 ${nodeName}`);
                                    const networkConfig = await this.apiRequest(`/nodes/${nodeName}/network`);
                                    
                                    if (networkConfig && Array.isArray(networkConfig)) {
                                        console.log(`🔍 network設定 ${nodeName}:`, networkConfig.map(iface => ({ iface: iface.iface, active: iface.active, type: iface.type })));
                                        
                                        const activeInterfaces = networkConfig.filter(iface => 
                                            iface.active == 1 && iface.iface && iface.iface !== 'lo'
                                        );
                                        
                                        if (activeInterfaces.length > 0) {
                                            // 実データのみでネットワーク統計を構築
                                            networkData = {
                                                interfaces: activeInterfaces.length,
                                                total_rx_bytes: 0,
                                                total_tx_bytes: 0,
                                                details: activeInterfaces.map((iface, index) => ({
                                                    name: iface.iface,
                                                    rx_bytes: 0,
                                                    tx_bytes: 0,
                                                    rx_packets: 0,
                                                    tx_packets: 0,
                                                    type: iface.type || 'unknown'
                                                }))
                                            };
                                            console.log(`🌐 ネットワーク統計(実データなし) ${nodeName}: ${activeInterfaces.length}IF, 統計データ取得できず`);
                                        }
                                    }
                                } catch (configError) {
                                    console.log(`⚠️  network設定取得失敗 ${nodeName}: ${configError.message}`);
                                }
                            }
                            
                            // すべて失敗した場合はデフォルト値
                            if (!networkData) {
                                console.log(`⚠️  ネットワーク統計取得不可 ${nodeName}: デフォルト値を使用`);
                                networkData = {
                                    interfaces: 0,
                                    total_rx_bytes: 0,
                                    total_tx_bytes: 0,
                                    details: []
                                };
                            }
                        } catch (netError) {
                            console.log(`⚠️  ネットワーク統計取得失敗 ${nodeName}: ${netError.message}`);
                            
                            // エラー時もデフォルト値を設定
                            networkData = {
                                interfaces: 0,
                                total_rx_bytes: 0,
                                total_tx_bytes: 0,
                                details: []
                            };
                        }

                        // ディスク情報を取得（ストレージ統計を使用）
                        let diskData = null;
                        try {
                            // まずストレージ情報から使用率を取得
                            const storage = await this.apiRequest(`/nodes/${nodeName}/storage`);
                            if (storage && storage.length > 0) {
                                let totalSize = 0;
                                let totalUsed = 0;
                                let localStorages = 0;
                                
                                for (const store of storage) {
                                    if (store.type === 'dir' || store.type === 'zfspool' || store.type === 'lvm' || store.type === 'lvmthin') {
                                        const size = parseInt(store.total || 0);
                                        const used = parseInt(store.used || 0);
                                        if (size > 0) {
                                            totalSize += size;
                                            totalUsed += used;
                                            localStorages++;
                                        }
                                    }
                                }
                                
                                if (totalSize > 0) {
                                    diskData = {
                                        total_size: totalSize,
                                        total_used: totalUsed,
                                        usage_percent: (totalUsed / totalSize) * 100,
                                        disks_count: localStorages,
                                        details: storage.filter(s => s.total > 0).map(store => ({
                                            device: store.storage,
                                            model: store.type,
                                            size: parseInt(store.total || 0),
                                            used: parseInt(store.used || 0),
                                            usage_percent: store.total > 0 ? (parseInt(store.used || 0) / parseInt(store.total || 0)) * 100 : 0,
                                            type: store.type
                                        }))
                                    };
                                }
                            }
                            
                            // ストレージ情報が取得できない場合はディスクリストを試す
                            if (!diskData) {
                                const diskList = await this.apiRequest(`/nodes/${nodeName}/disks/list`);
                                if (diskList && diskList.length > 0) {
                                    diskData = {
                                        total_size: 0,
                                        total_used: 0,
                                        usage_percent: 0,
                                        disks_count: diskList.length,
                                        details: diskList.map(disk => ({
                                            device: disk.devpath || disk.device,
                                            model: disk.model || 'Unknown',
                                            size: parseInt(disk.size || 0),
                                            used: 0, // ディスクリストでは使用量がわからない
                                            usage_percent: 0,
                                            type: disk.type || 'disk'
                                        }))
                                    };
                                }
                            }
                        } catch (diskError) {
                            console.log(`⚠️  ディスク情報取得失敗 ${nodeName}: ${diskError.message}`);
                        }

                        const nodeData = {
                            name: nodeName,
                            status: node.status,
                            cpu: (status.cpu || 0) * 100,
                            maxcpu: status.maxcpu || status.cpuinfo?.cpus || 1,
                            memory_used: memoryUsed,
                            memory_total: memoryTotal,
                            memory_percent: memoryPercent,
                            uptime: status.uptime || 0,
                            loadavg: loadAvg,
                            network: networkData,
                            disk: diskData,
                            host: this.host  // どのProxmoxホストからのデータか識別
                        };
                        data.nodes.push(nodeData);
                        
                        // 詳細なログ出力
                        const networkInfo = networkData ? `ネットワーク: ${(((networkData.total_rx_bytes || 0) + (networkData.total_tx_bytes || 0)) / 1024 / 1024 / 1024).toFixed(2)}GB (${networkData.interfaces}IF)` : 'ネットワーク: N/A';
                        const diskInfo = diskData ? `ディスク: ${(diskData.usage_percent || 0).toFixed(1)}% (${diskData.disks_count}台)` : 'ディスク: N/A';
                        const loadInfo = `ロード: ${loadAvg[0].toFixed(2)}/${loadAvg[1].toFixed(2)}/${loadAvg[2].toFixed(2)}`;
                        
                        console.log(`📈 ノード統計 ${nodeName}: CPU=${nodeData.cpu.toFixed(1)}%, メモリ=${memoryPercent.toFixed(1)}% (${(memoryUsed/1024/1024/1024).toFixed(1)}GB/${(memoryTotal/1024/1024/1024).toFixed(1)}GB), ${loadInfo}, ${networkInfo}, ${diskInfo}`);
                    }

                    // VM一覧
                    const vms = await this.apiRequest(`/nodes/${nodeName}/qemu`);
                    if (vms) {
                        for (const vm of vms) {
                            // 各VMの詳細な統計を取得
                            let vmDetails = null;
                            try {
                                if (vm.status === 'running') {
                                    vmDetails = await this.apiRequest(`/nodes/${nodeName}/qemu/${vm.vmid}/status/current`);
                                }
                            } catch (vmError) {
                                console.log(`⚠️  VM ${vm.vmid} 詳細取得失敗: ${vmError.message}`);
                            }

                            data.vms.push({
                                id: vm.vmid,
                                name: vm.name || `VM-${vm.vmid}`,
                                status: vm.status,
                                node: nodeName,
                                host: this.host,
                                type: 'vm',
                                cpu: vm.cpu ? vm.cpu * 100 : 0,
                                memory: vm.mem || 0,
                                maxmem: vm.maxmem || 0,
                                uptime: vmDetails?.uptime || 0,
                                netio: vmDetails ? {
                                    netin: vmDetails.netin || 0,
                                    netout: vmDetails.netout || 0
                                } : null,
                                diskio: vmDetails ? {
                                    diskread: vmDetails.diskread || 0,
                                    diskwrite: vmDetails.diskwrite || 0
                                } : null,
                                pid: vmDetails?.pid || null,
                                balloon: vmDetails?.balloon || null,
                                ballooninfo: vmDetails?.ballooninfo || null
                            });
                        }
                        console.log(`🖥️  ${nodeName}: ${vms.length}個のVM`);
                    }

                    // コンテナ一覧
                    const containers = await this.apiRequest(`/nodes/${nodeName}/lxc`);
                    if (containers) {
                        for (const ct of containers) {
                            // 各コンテナの詳細な統計を取得
                            let ctDetails = null;
                            try {
                                if (ct.status === 'running') {
                                    ctDetails = await this.apiRequest(`/nodes/${nodeName}/lxc/${ct.vmid}/status/current`);
                                }
                            } catch (ctError) {
                                console.log(`⚠️  CT ${ct.vmid} 詳細取得失敗: ${ctError.message}`);
                            }

                            data.vms.push({
                                id: ct.vmid,
                                name: ct.name || `CT-${ct.vmid}`,
                                status: ct.status,
                                node: nodeName,
                                host: this.host,
                                type: 'container',
                                cpu: ct.cpu ? ct.cpu * 100 : 0,
                                memory: ct.mem || 0,
                                maxmem: ct.maxmem || 0,
                                uptime: ctDetails?.uptime || 0,
                                netio: ctDetails ? {
                                    netin: ctDetails.netin || 0,
                                    netout: ctDetails.netout || 0
                                } : null,
                                diskio: ctDetails ? {
                                    diskread: ctDetails.diskread || 0,
                                    diskwrite: ctDetails.diskwrite || 0
                                } : null,
                                pid: ctDetails?.pid || null
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
                } catch (nodeError) {
                    console.error(`❌ ノード ${nodeName} のデータ取得エラー:`, nodeError.message);
                    // 個別ノードのエラーは全体に影響させない
                    continue;
                }
            }

            console.log(`✅ データ取得完了: ${this.host} - ノード:${data.nodes.length}, VM/CT:${data.vms.length}`);
            return data;

        } catch (error) {
            console.error(`❌ クラスターデータ取得エラー ${this.host}:`, error.message);
            data.cluster_status = 'offline';
            throw error; // エラーを上位に伝播してフェイルオーバーを促す
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

            // Proxmoxホスト設定の読み込み
            // すべての設定はconfig.yamlから、パスワードのみ環境変数から取得
            let proxmoxHosts;
            if (Array.isArray(config.proxmox)) {
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

            console.log(`🔧 発見されたProxmoxホスト: ${proxmoxHosts.length}台（冗長化構成）`);

            for (let i = 0; i < proxmoxHosts.length; i++) {
                const hostConfig = proxmoxHosts[i];
                
                // パスワードのみ環境変数から取得（セキュリティのため）
                const passwordEnvVar = `PROXMOX_PASSWORD_${i + 1}`;
                const password = process.env[passwordEnvVar] || hostConfig.password;
                
                if (!password) {
                    console.warn(`⚠️ パスワードが設定されていません: ${hostConfig.host} (${passwordEnvVar})`);
                    continue;
                }
                
                const priority = i === 0 ? 'プライマリ' : `セカンダリ(${i})`;
                console.log(`🔧 Proxmoxクライアント設定 [${priority}]: ${hostConfig.host}:${hostConfig.port || 8006} (user: ${hostConfig.username})`);
                
                const client = new ProxmoxClient(
                    hostConfig.host,
                    hostConfig.username,
                    password,
                    hostConfig.verify_ssl || false
                );
                this.clients.push(client);
            }

            console.log(`✅ 冗長化設定完了: ${this.clients.length}台のProxmoxサーバー（優先順位順）`);
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
                    cluster_status: 'online',
                    active_api_host: null
                };

                // 冗長構成：最初に応答するホストからのみデータを取得
                let dataFetched = false;
                let lastError = null;
                
                for (let i = 0; i < this.clients.length; i++) {
                    const client = this.clients[i];
                    console.log(`� API接続試行 (${i + 1}/${this.clients.length}): ${client.host}`);
                    
                    try {
                        const data = await client.getClusterData();
                        if (data && data.nodes.length > 0) {
                            // 成功したホストからデータを取得
                            allData.nodes = data.nodes.map(node => ({
                                ...node,
                                source_host: client.host
                            }));
                            allData.vms = data.vms.map(vm => ({
                                ...vm,
                                source_host: client.host
                            }));
                            allData.storage = data.storage.map(storage => ({
                                ...storage,
                                source_host: client.host
                            }));
                            allData.active_api_host = client.host;
                            
                            console.log(`✅ データ取得成功: ${client.host} - ノード:${data.nodes.length}, VM/CT:${data.vms.length}`);
                            dataFetched = true;
                            break; // 成功したら他のホストは試行しない
                        }
                    } catch (error) {
                        lastError = error;
                        console.log(`❌ API接続失敗 (${i + 1}/${this.clients.length}): ${client.host} - ${error.message}`);
                        continue; // 次のホストを試行
                    }
                }
                
                if (!dataFetched) {
                    console.error('❌ 全てのProxmoxホストへの接続に失敗');
                    allData.cluster_status = 'offline';
                    if (lastError) {
                        console.error('最後のエラー:', lastError.message);
                    }
                } else {
                    console.log(`� アクティブAPIホスト: ${allData.active_api_host}`);
                }

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
