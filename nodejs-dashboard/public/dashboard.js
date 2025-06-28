/**
 * Proxmox監視ダッシュボード - フロントエンド
 * Node.jsバックエンドと連携してリアルタイムデータを表示
 */

class ProxmoxDashboard {
    constructor() {
        this.socket = null;
        this.charts = {};
        this.lastData = null;
        this.updateInterval = null;
        
        this.init();
    }

    async init() {
        console.log('🚀 ダッシュボード初期化開始');
        
        // Socket.IO接続
        this.connectSocket();
        
        // チャート初期化
        this.initCharts();
        
        // イベントリスナー設定
        this.setupEventListeners();
        
        // 初期データ読み込み
        await this.loadInitialData();
        
        // ローディングを隠す
        this.hideLoading();
        
        console.log('✅ ダッシュボード初期化完了');
    }

    connectSocket() {
        console.log('🔌 WebSocket接続中...');
        
        this.socket = io();
        
        this.socket.on('connect', () => {
            console.log('✅ WebSocket接続成功');
            this.updateConnectionStatus(true);
        });
        
        this.socket.on('disconnect', () => {
            console.log('❌ WebSocket切断');
            this.updateConnectionStatus(false);
        });
        
        this.socket.on('data_update', (data) => {
            console.log('📊 リアルタイムデータ受信:', data);
            console.log('📈 データ詳細:', {
                nodes: data?.nodes?.length || 0,
                vms: data?.vms?.length || 0,
                storage: data?.storage?.length || 0,
                status: data?.cluster_status || 'unknown'
            });
            
            // クラスターホスト情報を更新
            this.updateClusterInfo(data);
            
            this.updateDashboard(data);
        });
        
        this.socket.on('connect_error', (error) => {
            console.error('❌ WebSocket接続エラー:', error);
            this.updateConnectionStatus(false);
        });
    }

    updateConnectionStatus(connected) {
        const statusElement = document.getElementById('connectionStatus');
        const dot = statusElement.querySelector('.status-dot');
        const span = statusElement.querySelector('span');
        
        if (connected) {
            dot.classList.remove('disconnected');
            span.textContent = '接続済み';
        } else {
            dot.classList.add('disconnected');
            span.textContent = '切断中';
        }
    }

    initCharts() {
        // CPUチャート
        const cpuCtx = document.getElementById('cpuChart').getContext('2d');
        this.charts.cpu = new Chart(cpuCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'CPU使用率 (%)',
                    data: [],
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: { color: '#cbd5e1' }
                    }
                },
                scales: {
                    x: {
                        ticks: { color: '#64748b' },
                        grid: { color: '#334155' }
                    },
                    y: {
                        min: 0,
                        max: 100,
                        ticks: { color: '#64748b' },
                        grid: { color: '#334155' }
                    }
                },
                elements: {
                    point: {
                        radius: 0,
                        hoverRadius: 6
                    }
                }
            }
        });

        // メモリチャート
        const memoryCtx = document.getElementById('memoryChart').getContext('2d');
        this.charts.memory = new Chart(memoryCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'メモリ使用率 (%)',
                    data: [],
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: { color: '#cbd5e1' }
                    }
                },
                scales: {
                    x: {
                        ticks: { color: '#64748b' },
                        grid: { color: '#334155' }
                    },
                    y: {
                        min: 0,
                        max: 100,
                        ticks: { color: '#64748b' },
                        grid: { color: '#334155' }
                    }
                },
                elements: {
                    point: {
                        radius: 0,
                        hoverRadius: 6
                    }
                }
            }
        });
    }

    setupEventListeners() {
        // 更新ボタン
        document.getElementById('refreshNodes')?.addEventListener('click', () => {
            this.loadInitialData();
        });

        // VMフィルター
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.filterVMs(e.target.dataset.filter);
            });
        });

        // 時間範囲選択
        document.getElementById('cpuTimeRange')?.addEventListener('change', (e) => {
            this.updateChartTimeRange('cpu', e.target.value);
        });

        document.getElementById('memoryTimeRange')?.addEventListener('change', (e) => {
            this.updateChartTimeRange('memory', e.target.value);
        });

        // ビュー切り替え
        document.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.toggleNodesView(e.target.dataset.view);
            });
        });

        // エラーモーダル
        document.getElementById('errorModalClose')?.addEventListener('click', () => {
            this.hideErrorModal();
        });

        document.getElementById('errorModalOk')?.addEventListener('click', () => {
            this.hideErrorModal();
        });
    }

    async loadInitialData() {
        try {
            console.log('📡 初期データ読み込み中...');
            this.showLoading();

            // 現在のステータス取得
            const statusResponse = await fetch('/api/status');
            const statusData = await statusResponse.json();

            if (statusData.success) {
                this.updateDashboard(statusData.data);
            }

            // 履歴データ取得
            const historyResponse = await fetch('/api/history');
            const historyData = await historyResponse.json();

            if (historyData.success) {
                this.updateCharts(historyData.data);
            }

        } catch (error) {
            console.error('❌ 初期データ読み込みエラー:', error);
            this.showError('データの読み込みに失敗しました。ネットワーク接続を確認してください。');
        } finally {
            this.hideLoading();
        }
    }

    updateDashboard(data) {
        console.log('🔄 ダッシュボード更新開始:', data);
        
        if (!data) {
            console.warn('⚠️ データが空です');
            return;
        }
        
        this.lastData = data;
        
        // 最終更新時刻
        document.getElementById('lastUpdate').textContent = 
            `最終更新: ${new Date().toLocaleTimeString()}`;

        // 概要カード更新
        this.updateOverviewCards(data);
        
        // ノード情報更新
        this.updateNodes(data.nodes || []);
        
        // VM/CT情報更新
        this.updateVMs([...(data.vms || []), ...(data.containers || [])]);
        
        console.log('✅ ダッシュボード更新完了');
    }

    updateOverviewCards(data) {
        const nodes = data.nodes || [];
        const vms = data.vms || [];
        const containers = data.containers || [];
        const storage = data.storage || [];
        
        console.log('📊 概要カード更新開始:', { 
            nodes: nodes.length, 
            vms: vms.length, 
            containers: containers.length,
            storage: storage.length 
        });
        
        // アクティブなノードのみを対象
        const activeNodes = nodes.filter(node => node.status === 'online');
        
        // 基本統計
        const totalVMs = vms.length;
        const totalContainers = containers.length;
        const runningVMs = vms.filter(vm => vm.status === 'running');
        const runningContainers = containers.filter(ct => ct.status === 'running');
        const runningVMsCount = runningVMs.length;
        const runningContainersCount = runningContainers.length;
        
        // CPU統計（アクティブノードの合計と平均）
        let totalCpuUsed = 0;
        let totalCpuCores = 0;
        let cpuCount = 0;
        activeNodes.forEach(node => {
            if (node.cpu !== undefined && node.maxcpu !== undefined) {
                totalCpuUsed += (node.cpu / 100) * node.maxcpu;
                totalCpuCores += node.maxcpu;
                cpuCount++;
            }
        });
        const avgCpu = cpuCount > 0 ? (totalCpuUsed / totalCpuCores * 100) : 0;

        // メモリ統計（アクティブノードの合計）
        let totalMemoryUsed = 0;
        let totalMemoryMax = 0;
        activeNodes.forEach(node => {
            if (node.memory_used !== undefined && node.memory_total !== undefined) {
                totalMemoryUsed += node.memory_used;
                totalMemoryMax += node.memory_total;
            }
        });
        const memoryUsage = totalMemoryMax > 0 ? (totalMemoryUsed / totalMemoryMax * 100) : 0;

        // ストレージ統計
        let totalStorageUsed = 0;
        let totalStorageMax = 0;
        storage.forEach(store => {
            if (store.used !== undefined && store.total !== undefined) {
                totalStorageUsed += store.used;
                totalStorageMax += store.total;
            }
        });
        const storageUsage = totalStorageMax > 0 ? (totalStorageUsed / totalStorageMax * 100) : 0;

        // 負荷平均統計
        let totalLoad1 = 0;
        let totalLoad5 = 0;
        let totalLoad15 = 0;
        let loadCount = 0;
        activeNodes.forEach(node => {
            if (node.loadavg && Array.isArray(node.loadavg)) {
                totalLoad1 += node.loadavg[0] || 0;
                totalLoad5 += node.loadavg[1] || 0;
                totalLoad15 += node.loadavg[2] || 0;
                loadCount++;
            }
        });
        const avgLoad1 = loadCount > 0 ? (totalLoad1 / loadCount) : 0;
        const avgLoad5 = loadCount > 0 ? (totalLoad5 / loadCount) : 0;
        const avgLoad15 = loadCount > 0 ? (totalLoad15 / loadCount) : 0;

        // DOM要素の更新
        this.safeUpdateElement('activeNodes', activeNodes.length);
        this.safeUpdateElement('totalNodes', nodes.length);
        this.safeUpdateElement('runningVms', runningVMsCount + runningContainersCount);
        this.safeUpdateElement('totalVms', totalVMs + totalContainers);
        this.safeUpdateElement('runningVmsCount', runningVMsCount);
        this.safeUpdateElement('runningCtCount', runningContainersCount);
        
        // CPU統計
        this.safeUpdateElement('overallCpuUsage', `${avgCpu.toFixed(1)}%`);
        this.safeUpdateElement('cpuCoresUsed', Math.round(totalCpuUsed));
        this.safeUpdateElement('cpuCoresTotal', totalCpuCores);
        this.updateProgressBar('cpuProgressBar', avgCpu);
        
        // メモリ統計
        this.safeUpdateElement('overallMemoryUsage', `${memoryUsage.toFixed(1)}%`);
        this.safeUpdateElement('memoryUsed', this.formatBytes(totalMemoryUsed, 1));
        this.safeUpdateElement('memoryTotal', this.formatBytes(totalMemoryMax, 1));
        this.updateProgressBar('memoryProgressBar', memoryUsage);
        
        // ストレージ統計
        this.safeUpdateElement('overallStorageUsage', `${storageUsage.toFixed(1)}%`);
        this.safeUpdateElement('storageUsed', this.formatBytes(totalStorageUsed, 1));
        this.safeUpdateElement('storageTotal', this.formatBytes(totalStorageMax, 1));
        this.updateProgressBar('storageProgressBar', storageUsage);
        
        // 負荷平均
        this.safeUpdateElement('overallLoadAverage', avgLoad1.toFixed(2));
        this.safeUpdateElement('loadAverage1m', avgLoad1.toFixed(2));
        this.safeUpdateElement('loadAverage5m', avgLoad5.toFixed(2));
        this.safeUpdateElement('loadAverage15m', avgLoad15.toFixed(2));

        // トレンドインジケーター更新
        this.updateTrendIndicator('nodeTrend', activeNodes.length === nodes.length);
        
        console.log('✅ 概要カード更新完了:', {
            avgCpu: avgCpu.toFixed(1),
            memoryUsage: memoryUsage.toFixed(1),
            storageUsage: storageUsage.toFixed(1),
            activeNodes: activeNodes.length,
            totalVMs: totalVMs + totalContainers
        });
    }

    // ヘルパー関数：安全なDOM要素更新
    safeUpdateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    // ヘルパー関数：プログレスバー更新
    updateProgressBar(id, percentage) {
        const element = document.getElementById(id);
        if (element) {
            element.style.width = `${Math.min(100, Math.max(0, percentage))}%`;
        }
    }

    // ヘルパー関数：トレンドインジケーター更新
    updateTrendIndicator(id, isGood) {
        const element = document.getElementById(id);
        if (element) {
            const icon = element.querySelector('i');
            if (icon) {
                icon.className = isGood ? 'fas fa-check-circle' : 'fas fa-exclamation-triangle';
            }
            element.style.color = isGood ? 'var(--success-color)' : 'var(--warning-color)';
        }
    }

    // ヘルパー関数：バイト単位フォーマット
    formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 GB';
        
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    // ビュー切り替え機能
    toggleNodesView(view) {
        const container = document.getElementById('nodesContainer');
        if (container) {
            container.className = `nodes-container ${view}-view`;
        }
    }

    updateTrend(elementId, change) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        element.className = 'card-trend';
        
        if (change > 0) {
            element.classList.add('up');
            icon.className = 'fas fa-arrow-up';
        } else if (change < 0) {
            element.classList.add('down');
            icon.className = 'fas fa-arrow-down';
        } else {
            element.classList.add('neutral');
            icon.className = 'fas fa-minus';
        }
        
        span.textContent = `${Math.abs(change).toFixed(1)}%`;
    }

    updateNodes(nodes) {
        const container = document.getElementById('nodesContainer');
        container.innerHTML = '';

        nodes.forEach(node => {
            const nodeCard = this.createNodeCard(node);
            container.appendChild(nodeCard);
        });
    }

    createNodeCard(node) {
        const card = document.createElement('div');
        card.className = 'node-card enhanced';
        
        const statusClass = node.status === 'online' ? 'online' : 'offline';
        const cpuUsage = node.cpu || 0;
        
        // メモリ使用率の正確な計算
        let memoryUsage = 0;
        let memoryText = '0 GB / 0 GB';
        
        if (node.memory_percent !== undefined) {
            memoryUsage = node.memory_percent;
        } else if (node.memory_total && node.memory_total > 0) {
            memoryUsage = (node.memory_used / node.memory_total) * 100;
        }
        
        if (node.memory_used && node.memory_total) {
            const usedGB = (node.memory_used / 1024 / 1024 / 1024).toFixed(1);
            const totalGB = (node.memory_total / 1024 / 1024 / 1024).toFixed(1);
            memoryText = `${usedGB} GB / ${totalGB} GB`;
        }
        
        // アップタイム計算
        const uptimeText = this.formatUptime(node.uptime || 0);
        
        // ロードアベレージ
        const loadAvg = node.load || [0, 0, 0];
        const loadText = `${loadAvg[0]?.toFixed(2) || '0.00'} / ${loadAvg[1]?.toFixed(2) || '0.00'} / ${loadAvg[2]?.toFixed(2) || '0.00'}`;
        
        console.log(`🖥️ ノード ${node.name}: CPU=${cpuUsage.toFixed(1)}%, メモリ=${memoryUsage.toFixed(1)}%`);
        
        card.innerHTML = `
            <div class="node-header">
                <div class="node-info">
                    <div class="node-title">${node.name || node.node}</div>
                    <div class="node-subtitle">
                        ${node.source_host ? `データ元: ${node.source_host}` : ''}
                        ${uptimeText ? ` • アップタイム: ${uptimeText}` : ''}
                    </div>
                </div>
                <div class="status-badge ${statusClass}">${node.status}</div>
            </div>
            
            <div class="resource-grid">
                <div class="resource-card cpu">
                    <div class="resource-header">
                        <div class="resource-icon">
                            <i class="fas fa-microchip"></i>
                        </div>
                        <div class="resource-title">CPU使用率</div>
                    </div>
                    <div class="resource-value">${cpuUsage.toFixed(1)}%</div>
                    <div class="progress-bar">
                        <div class="progress-fill ${this.getProgressClass(cpuUsage)}" 
                             style="width: ${Math.min(cpuUsage, 100)}%"></div>
                    </div>
                </div>
                
                <div class="resource-card memory">
                    <div class="resource-header">
                        <div class="resource-icon">
                            <i class="fas fa-memory"></i>
                        </div>
                        <div class="resource-title">メモリ使用率</div>
                    </div>
                    <div class="resource-value">${memoryUsage.toFixed(1)}%</div>
                    <div class="resource-detail">${memoryText}</div>
                    <div class="progress-bar">
                        <div class="progress-fill ${this.getProgressClass(memoryUsage)}" 
                             style="width: ${Math.min(memoryUsage, 100)}%"></div>
                    </div>
                </div>
                
                <div class="resource-card load">
                    <div class="resource-header">
                        <div class="resource-icon">
                            <i class="fas fa-chart-line"></i>
                        </div>
                        <div class="resource-title">ロードアベレージ</div>
                    </div>
                    <div class="resource-value load-values">${loadText}</div>
                    <div class="resource-detail">1分 / 5分 / 15分</div>
                </div>
            </div>
        `;
        
        return card;
    }

    formatUptime(seconds) {
        if (!seconds || seconds === 0) return '0分';
        
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        
        if (days > 0) {
            return `${days}日${hours}時間`;
        } else if (hours > 0) {
            return `${hours}時間${minutes}分`;
        } else {
            return `${minutes}分`;
        }
    }

    updateVMs(vms) {
        const container = document.getElementById('vmsContainer');
        container.innerHTML = '';

        vms.forEach(vm => {
            const vmCard = this.createVMCard(vm);
            container.appendChild(vmCard);
        });
    }

    createVMCard(vm) {
        const card = document.createElement('div');
        card.className = 'vm-card';
        card.dataset.status = vm.status;
        
        const statusClass = vm.status === 'running' ? 'running' : 'stopped';
        const cpuUsage = vm.cpu || 0;
        const memoryUsage = vm.memory ? (vm.memory.used / vm.memory.total * 100) : 0;
        const type = vm.type === 'qemu' ? 'VM' : 'CT';
        
        card.innerHTML = `
            <div class="vm-header">
                <div class="vm-title">${vm.name} (${type}${vm.vmid})</div>
                <div class="status-badge ${statusClass}">${vm.status}</div>
            </div>
            <div class="resource-info">
                <div class="resource-item">
                    <div class="resource-label">CPU使用率</div>
                    <div class="resource-value">${cpuUsage.toFixed(1)}%</div>
                    <div class="progress-bar">
                        <div class="progress-fill ${this.getProgressClass(cpuUsage)}" 
                             style="width: ${cpuUsage}%"></div>
                    </div>
                </div>
                <div class="resource-item">
                    <div class="resource-label">メモリ使用率</div>
                    <div class="resource-value">${memoryUsage.toFixed(1)}%</div>
                    <div class="progress-bar">
                        <div class="progress-fill ${this.getProgressClass(memoryUsage)}" 
                             style="width: ${memoryUsage}%"></div>
                    </div>
                </div>
            </div>
        `;
        
        return card;
    }

    getProgressClass(percentage) {
        if (percentage >= 80) return 'danger';
        if (percentage >= 60) return 'warning';
        return '';
    }

    filterVMs(filter) {
        const vmCards = document.querySelectorAll('.vm-card');
        
        vmCards.forEach(card => {
            const status = card.dataset.status;
            let show = false;
            
            switch (filter) {
                case 'all':
                    show = true;
                    break;
                case 'running':
                    show = status === 'running';
                    break;
                case 'stopped':
                    show = status === 'stopped';
                    break;
            }
            
            card.style.display = show ? 'block' : 'none';
        });
    }

    updateCharts(historyData) {
        if (!historyData || historyData.length === 0) return;

        // 時系列データを準備
        const labels = historyData.map(item => 
            new Date(item.timestamp).toLocaleTimeString('ja-JP', { 
                hour: '2-digit', 
                minute: '2-digit' 
            })
        );

        const cpuData = historyData.map(item => item.avg_cpu || 0);
        const memoryData = historyData.map(item => item.avg_memory || 0);

        // CPUチャート更新
        this.charts.cpu.data.labels = labels;
        this.charts.cpu.data.datasets[0].data = cpuData;
        this.charts.cpu.update('none');

        // メモリチャート更新
        this.charts.memory.data.labels = labels;
        this.charts.memory.data.datasets[0].data = memoryData;
        this.charts.memory.update('none');
    }

    updateChartTimeRange(chartType, timeRange) {
        // 時間範囲に基づいてデータを再取得
        // 簡略化のため、現在は全データを表示
        console.log(`📈 ${chartType}チャートの時間範囲を${timeRange}に変更`);
    }

    showLoading() {
        document.getElementById('loadingOverlay').style.display = 'flex';
    }

    hideLoading() {
        document.getElementById('loadingOverlay').style.display = 'none';
    }

    showError(message) {
        document.getElementById('errorMessage').textContent = message;
        document.getElementById('errorModal').classList.add('show');
    }

    hideErrorModal() {
        document.getElementById('errorModal').classList.remove('show');
    }

    updateClusterInfo(data) {
        // アクティブAPIホスト情報を更新
        const clusterHostsElement = document.getElementById('clusterHosts');
        
        if (clusterHostsElement) {
            if (data?.active_api_host) {
                clusterHostsElement.textContent = data.active_api_host;
                clusterHostsElement.style.color = 'var(--success-color)';
            } else if (data?.cluster_status === 'offline') {
                clusterHostsElement.textContent = 'オフライン';
                clusterHostsElement.style.color = 'var(--danger-color)';
            } else {
                clusterHostsElement.textContent = '--';
                clusterHostsElement.style.color = 'var(--text-muted)';
            }
        }
        
        console.log('🏠 アクティブAPIホスト:', data?.active_api_host || 'なし');
    }
}

// ダッシュボード初期化
document.addEventListener('DOMContentLoaded', () => {
    new ProxmoxDashboard();
});

// デバッグ用（開発時のみ）
if (typeof window !== 'undefined') {
    window.dashboard = ProxmoxDashboard;
}
