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
        
        // Socket.IO接続
        this.connectSocket();
        
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
        document.getElementById('refreshNodes')?.addEventListener('click', () => {
            this.loadInitialData();
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
        
        this.lastData = data;
        
        // 最終更新時刻
        safeUpdateElement('lastUpdate', `最終更新: ${new Date().toLocaleTimeString()}`);
        
        // クラスター情報更新
        this.updateClusterInfo(data);
        
        // ノード情報更新
        this.nodeManager.updateNodesOverview(data.nodes || []);
        this.nodeManager.updateNodesDetail(data.nodes || []);
        
        // VM/CT情報更新
        this.vmManager.updateVMs(data.vms || []);
        
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
        // ローディング表示の実装（必要に応じて）
    }

    hideLoading() {
        // ローディング非表示の実装（必要に応じて）
    }

    showError(message) {
        console.error('🚨 エラー表示:', message);
        // エラーモーダルの実装（必要に応じて）
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
