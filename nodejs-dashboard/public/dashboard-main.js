/**
 * Proxmox監視ダッシュボード - メインクラス
 */
class ProxmoxDashboard {
    constructor() {
        this.socket = null;
        this.lastData = null;
        this.updateInterval = null;
        
        // 管理クラスのインスタンス化
        this.nodeManager = new NodeManager();
        this.vmManager = new VMManager();
        this.chartManager = new ChartManager();
        
        this.init();
    }

    async init() {
        console.log('🚀 ダッシュボード初期化開始');
        
        // ローディング表示
        this.showLoading();
        
        try {
            // Socket.IO接続
            this.connectSocket();
            
            // イベントリスナー設定
            this.setupEventListeners();
            
            // 初期データ読み込み
            await this.loadInitialData();
            
            console.log('✅ ダッシュボード初期化完了');
        } catch (error) {
            console.error('❌ ダッシュボード初期化エラー:', error);
            this.showError('ダッシュボードの初期化に失敗しました');
        } finally {
            // ローディングを隠す
            this.hideLoading();
        }
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
            this.updateDashboard(data);
        });
        
        this.socket.on('connect_error', (error) => {
            console.error('❌ WebSocket接続エラー:', error);
            this.updateConnectionStatus(false);
        });
    }

    updateConnectionStatus(connected) {
        const statusElement = document.getElementById('connectionStatus');
        if (!statusElement) return;
        
        const dot = statusElement.querySelector('.status-dot');
        const span = statusElement.querySelector('span');
        
        if (connected) {
            dot?.classList.remove('disconnected');
            if (span) span.textContent = '接続済み';
        } else {
            dot?.classList.add('disconnected');
            if (span) span.textContent = '切断中';
        }
    }

    setupEventListeners() {
        // 更新ボタン
        document.getElementById('refreshNodes')?.addEventListener('click', async () => {
            this.showLoading();
            try {
                await this.loadInitialData();
            } finally {
                this.hideLoading();
            }
        });

        // VMフィルター
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const filter = e.target.dataset.filter;
                this.vmManager.setFilter(filter);
            });
        });

        // 時間範囲選択
        document.getElementById('cpuTimeRange')?.addEventListener('change', (e) => {
            this.chartManager.updateTimeRange('cpu', e.target.value);
        });

        document.getElementById('memoryTimeRange')?.addEventListener('change', (e) => {
            this.chartManager.updateTimeRange('memory', e.target.value);
        });

        // ビュー切り替え
        document.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.nodeManager.toggleView(e.target.dataset.view);
            });
        });
    }

    async loadInitialData() {
        try {
            console.log('📡 初期データ読み込み中...');
            
            // ステータスデータを取得
            const statusResponse = await fetch('/api/status');
            const statusData = await statusResponse.json();
            
            if (statusData.success) {
                this.updateDashboard(statusData.data);
            }
            
            // 履歴データを取得
            const historyResponse = await fetch('/api/history');
            const historyData = await historyResponse.json();
            
            if (historyData.success) {
                this.chartManager.updateCharts(historyData.data);
            }
            
        } catch (error) {
            console.error('❌ 初期データ読み込みエラー:', error);
            this.showError('初期データの読み込みに失敗しました');
        }
    }

    updateDashboard(data) {
        console.log('🔄 ダッシュボード更新開始:', data);
        
        if (!data) {
            console.warn('⚠️ データが空です');
            return;
        }
        
        // ネットワークデータのデバッグ出力
        console.log('🔍 データ構造チェック:');
        console.log('  - data.nodes存在:', !!data.nodes);
        console.log('  - data.nodes型:', typeof data.nodes);
        console.log('  - data.nodes長さ:', data.nodes ? data.nodes.length : 'N/A');
        
        if (data.nodes && data.nodes.length > 0) {
            console.log('🔍 ノードデータ詳細:');
            data.nodes.forEach((node, index) => {
                console.log(`  [${index}] ${node.name}:`);
                console.log(`    - ネットワーク:`, node.network);
                
                // ネットワーク統計の詳細分析
                if (node.network) {
                    const netTotal = (node.network.rx_rate || 0) + (node.network.tx_rate || 0);
                    const netStatus = netTotal > 0 ? `${(netTotal/1024).toFixed(1)}KB/s` : 'アイドル';
                    console.log(`    - ネットワーク解析: ${netStatus} (IF=${node.network.interfaces})`);
                } else {
                    console.log(`    - ネットワーク解析: データなし`);
                }
                
                console.log(`    - ディスク:`, node.disk);
                console.log(`    - ロードアベレージ:`, node.loadavg);
            });
        } else {
            console.warn('⚠️ ノードデータが存在しないか空です');
        }
        
        this.lastData = data;
        
        // 最終更新時刻
        safeUpdateElement('lastUpdate', `最終更新: ${new Date().toLocaleTimeString()}`);
        
        // クラスター情報更新
        this.updateClusterInfo(data);
        
        // ノード詳細情報更新
        this.nodeManager.updateNodesDetail(data.nodes || []);
        
        // VM/CT情報更新
        this.vmManager.updateVMs(data.vms || []);
        
        // VM/CTのI/O統計デバッグ出力
        if (data.vms && data.vms.length > 0) {
            console.log('🔍 VM/CT I/O統計サマリー:');
            data.vms.forEach(vm => {
                const netTotal = vm.netio ? (vm.netio.netin + vm.netio.netout) : 0;
                const diskTotal = vm.diskio ? (vm.diskio.diskread + vm.diskio.diskwrite) : 0;
                const netStatus = netTotal > 0 ? `${(netTotal/1024).toFixed(1)}KB/s` : '0';
                const diskStatus = diskTotal > 0 ? `${(diskTotal/1024).toFixed(1)}KB/s` : '0';
                
                console.log(`  ${vm.type.toUpperCase()} ${vm.id} (${vm.name}): ネット=${netStatus}, ディスク=${diskStatus}, 状態=${vm.status}`);
            });
        }
        
        // 選択されたVMの詳細モーダルが開いている場合は更新
        if (this.vmManager.selectedVMId) {
            const selectedVM = (data.vms || []).find(vm => vm.id === this.vmManager.selectedVMId);
            if (selectedVM) {
                this.vmManager.showVMDetail(selectedVM.id);
            }
        }
        
        console.log('✅ ダッシュボード更新完了');
    }

    updateClusterInfo(data) {
        const clusterHostsElement = document.getElementById('clusterHosts');
        if (clusterHostsElement && data?.active_api_host) {
            clusterHostsElement.textContent = data.active_api_host;
            clusterHostsElement.style.color = data.cluster_status === 'online' ? 'var(--success-color)' : 'var(--danger-color)';
        } else if (clusterHostsElement) {
            clusterHostsElement.textContent = '--';
            clusterHostsElement.style.color = 'var(--text-muted)';
        }
        
        console.log('🏠 アクティブAPIホスト:', data?.active_api_host || 'なし');
    }

    showLoading() {
        showLoading();
    }

    hideLoading() {
        hideLoading();
    }

    showError(message) {
        console.error('🚨 エラー表示:', message);
        
        const errorModal = document.getElementById('errorModal');
        const errorMessage = document.getElementById('errorMessage');
        
        if (errorMessage) {
            errorMessage.textContent = message;
        }
        
        if (errorModal) {
            errorModal.classList.add('show');
        }
        
        // モーダルを閉じるイベント
        const closeModal = () => {
            if (errorModal) {
                errorModal.classList.remove('show');
            }
        };
        
        document.getElementById('errorModalClose')?.addEventListener('click', closeModal);
        document.getElementById('errorModalOk')?.addEventListener('click', closeModal);
        
        // 背景クリックで閉じる
        errorModal?.addEventListener('click', (e) => {
            if (e.target === errorModal) {
                closeModal();
            }
        });
    }
}

// ダッシュボード初期化
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new ProxmoxDashboard();
});

// デバッグ用（開発時のみ）
if (typeof window !== 'undefined') {
    window.ProxmoxDashboard = ProxmoxDashboard;
}
