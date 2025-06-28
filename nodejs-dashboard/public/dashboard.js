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
        
        console.log('📊 概要カード更新開始:', { nodes: nodes.length, vms: vms.length });
        
        // アクティブなノードのみを対象
        const activeNodes = nodes.filter(node => node.status === 'online');
        
        // CPU使用率計算（アクティブノードの平均）
        let totalCpu = 0;
        let cpuCount = 0;
        activeNodes.forEach(node => {
            if (node.cpu !== undefined) {
                totalCpu += node.cpu;
                cpuCount++;
            }
        });
        const avgCpu = cpuCount > 0 ? (totalCpu / cpuCount) : 0;

        // メモリ使用率計算（アクティブノードの合計）
        let totalMemoryUsed = 0;
        let totalMemoryMax = 0;
        activeNodes.forEach(node => {
            if (node.memory_used !== undefined && node.memory_total !== undefined) {
                totalMemoryUsed += node.memory_used;
                totalMemoryMax += node.memory_total;
            }
        });
        const memoryUsage = totalMemoryMax > 0 ? (totalMemoryUsed / totalMemoryMax * 100) : 0;

        // VM/コンテナの統計
        const runningVMs = vms.filter(vm => vm.status === 'running');
        const totalVMs = vms.length;
        
        console.log('📈 計算結果:', {
            avgCpu: avgCpu.toFixed(1) + '%',
            memoryUsage: memoryUsage.toFixed(1) + '%',
            activeNodes: activeNodes.length,
            totalNodes: nodes.length,
            runningVMs: runningVMs.length,
            totalVMs: totalVMs
        });

        // UI更新
        document.getElementById('overallCpuUsage').textContent = `${avgCpu.toFixed(1)}%`;
        document.getElementById('overallMemoryUsage').textContent = `${memoryUsage.toFixed(1)}%`;
        document.getElementById('activeNodes').textContent = activeNodes.length;
        document.getElementById('totalNodes').textContent = nodes.length;
        document.getElementById('runningVms').textContent = runningVMs.length;
        document.getElementById('totalVms').textContent = totalVMs;
        document.getElementById('totalVms').textContent = totalVMs;

        // トレンド表示（簡略化）
        this.updateTrend('cpuTrend', 0);
        this.updateTrend('memoryTrend', 0);
    }

    updateTrend(elementId, change) {
        const element = document.getElementById(elementId);
        const icon = element.querySelector('i');
        const span = element.querySelector('span');
        
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
        card.className = 'node-card';
        
        const statusClass = node.status === 'online' ? 'online' : 'offline';
        const cpuUsage = node.cpu || 0;
        
        // メモリ使用率の正しい計算
        let memoryUsage = 0;
        let memoryText = '0 GB / 0 GB';
        
        if (node.memory_percent !== undefined) {
            // バックエンドで計算済みの場合
            memoryUsage = node.memory_percent;
        } else if (node.memory_total && node.memory_total > 0) {
            // 手動計算
            memoryUsage = (node.memory_used / node.memory_total) * 100;
        }
        
        if (node.memory_used && node.memory_total) {
            const usedGB = (node.memory_used / 1024 / 1024 / 1024).toFixed(1);
            const totalGB = (node.memory_total / 1024 / 1024 / 1024).toFixed(1);
            memoryText = `${usedGB} GB / ${totalGB} GB`;
        }
        
        console.log(`🖥️ ノード ${node.name}: CPU=${cpuUsage.toFixed(1)}%, メモリ=${memoryUsage.toFixed(1)}%`);
        
        card.innerHTML = `
            <div class="node-header">
                <div class="node-title">${node.name || node.node}</div>
                <div class="status-badge ${statusClass}">${node.status}</div>
                ${node.source_host ? `<div class="node-host">データ元: ${node.source_host}</div>` : ''}
            </div>
            <div class="resource-info">
                <div class="resource-item">
                    <div class="resource-label">CPU使用率</div>
                    <div class="resource-value">${cpuUsage.toFixed(1)}%</div>
                    <div class="progress-bar">
                        <div class="progress-fill ${this.getProgressClass(cpuUsage)}" 
                             style="width: ${Math.min(cpuUsage, 100)}%"></div>
                    </div>
                </div>
                <div class="resource-item">
                    <div class="resource-label">メモリ使用率</div>
                    <div class="resource-value">${memoryUsage.toFixed(1)}%</div>
                    <div class="resource-detail">${memoryText}</div>
                    <div class="progress-bar">
                        <div class="progress-fill ${this.getProgressClass(memoryUsage)}" 
                             style="width: ${Math.min(memoryUsage, 100)}%"></div>
                    </div>
                </div>
            </div>
        `;
        
        return card;
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
        // クラスターホスト一覧を作成
        const hosts = new Set();
        const nodes = data?.nodes || [];
        
        nodes.forEach(node => {
            if (node.source_host) {
                hosts.add(node.source_host);
            }
        });
        
        const hostsArray = Array.from(hosts);
        const clusterHostsElement = document.getElementById('clusterHosts');
        
        if (clusterHostsElement) {
            if (hostsArray.length > 0) {
                clusterHostsElement.textContent = hostsArray.join(', ');
            } else {
                clusterHostsElement.textContent = '--';
            }
        }
        
        console.log('🏠 クラスターホスト情報更新:', hostsArray);
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
