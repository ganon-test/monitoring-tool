/**
 * メインダッシュボードアプリケーション - MVCコーディネーター
 */
class DashboardApp {
    constructor() {
        this.currentView = 'nextcloud';
        this.autoRefreshInterval = null;
        this.autoRefreshDelay = 10000; // 10秒
        
        // 各コンポーネントを初期化
        this.dataModel = new DataModel();
        this.chartManager = new ChartManager();
        this.socketManager = new SocketManager();
        this.nextcloudController = new NextcloudViewController(this.chartManager, this.dataModel);
        this.proxmoxController = new ProxmoxViewController(this.chartManager, this.dataModel);
    }

    /**
     * アプリケーションを初期化
     */
    async init() {
        try {
            console.log('Initializing Dashboard Application...');
            
            // DOMの準備完了まで待機
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.initializeComponents());
            } else {
                this.initializeComponents();
            }
            
        } catch (error) {
            console.error('Error initializing dashboard:', error);
            this.showError('Failed to initialize dashboard: ' + error.message);
        }
    }

    /**
     * コンポーネントを初期化
     */
    async initializeComponents() {
        try {
            // データモデルを初期化
            await this.dataModel.init();
            
            // チャート管理を初期化
            this.chartManager.init();
            
            // WebSocket管理を初期化
            this.socketManager.init(this.onDataUpdate.bind(this));
            
            // ビューコントローラーを初期化
            this.nextcloudController.init();
            this.proxmoxController.init();
            
            // イベントリスナーをセットアップ
            this.setupEventListeners();
            
            // 初期ビューを設定
            this.switchView('nextcloud');
            
            // 初期データ取得
            await this.loadInitialData();
            
            console.log('Dashboard Application initialized successfully');
            
        } catch (error) {
            console.error('Error initializing components:', error);
            this.showError('Failed to initialize components: ' + error.message);
        }
    }

    /**
     * イベントリスナーをセットアップ
     */
    setupEventListeners() {
        // ビュー切り替えボタン
        const nextcloudToggle = document.getElementById('nextcloud-toggle');
        const proxmoxToggle = document.getElementById('proxmox-toggle');
        
        if (nextcloudToggle) {
            nextcloudToggle.addEventListener('click', () => this.switchView('nextcloud'));
        }
        if (proxmoxToggle) {
            proxmoxToggle.addEventListener('click', () => this.switchView('proxmox'));
        }

        // ウィンドウリサイズハンドラー
        window.addEventListener('resize', () => {
            setTimeout(() => this.chartManager.resizeAllCharts(), 100);
        });

        // 詳細モード切り替えがあれば
        const detailButtons = document.querySelectorAll('.detail-toggle');
        detailButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const service = e.target.dataset.service;
                this.toggleDetailMode(service);
            });
        });
    }

    /**
     * ビューを切り替え
     */
    switchView(view) {
        this.currentView = view;
        
        // セクションを取得
        const nextcloudSection = document.querySelector('.nextcloud-section');
        const proxmoxSection = document.querySelector('.proxmox-section');
        
        // トグルボタンを取得
        const nextcloudToggle = document.getElementById('nextcloud-toggle');
        const proxmoxToggle = document.getElementById('proxmox-toggle');
        
        if (view === 'nextcloud') {
            // Nextcloudを表示、Proxmoxを非表示
            if (nextcloudSection) nextcloudSection.style.display = 'block';
            if (proxmoxSection) proxmoxSection.style.display = 'none';
            
            // ボタンの状態を更新
            if (nextcloudToggle) nextcloudToggle.classList.add('active');
            if (proxmoxToggle) proxmoxToggle.classList.remove('active');
            
            // Nextcloudデータを更新
            this.nextcloudController.updateDisplay(this.dataModel.getNextcloudData());
            
        } else if (view === 'proxmox') {
            // Proxmoxを表示、Nextcloudを非表示
            if (nextcloudSection) nextcloudSection.style.display = 'none';
            if (proxmoxSection) proxmoxSection.style.display = 'block';
            
            // ボタンの状態を更新
            if (nextcloudToggle) nextcloudToggle.classList.remove('active');
            if (proxmoxToggle) proxmoxToggle.classList.add('active');
            
            // Proxmoxデータを更新
            this.proxmoxController.updateDisplay(this.dataModel.getProxmoxData());
        }
        
        // チャートのリサイズ
        setTimeout(() => {
            this.chartManager.resizeAllCharts();
        }, 100);
    }

    /**
     * 初期データを読み込み
     */
    async loadInitialData() {
        try {
            // 各サービスのデータを並行取得
            await Promise.all([
                this.dataModel.fetchNextcloudData(),
                this.dataModel.fetchProxmoxData()
            ]);
            
            // データを更新
            this.updateAllDisplays();
            
        } catch (error) {
            console.error('Error loading initial data:', error);
            this.showError('Failed to load initial data: ' + error.message);
        }
    }

    /**
     * WebSocketデータ更新時のコールバック
     */
    onDataUpdate(data) {
        try {
            // データモデルを更新
            if (data.nextcloud) {
                this.dataModel.updateNextcloudData(data.nextcloud);
            }
            if (data.proxmox) {
                this.dataModel.updateProxmoxData(data.proxmox);
            }
            
            // 表示を更新
            this.updateAllDisplays();
            
            // 最終更新時刻を更新
            this.updateLastUpdateTime();
            
        } catch (error) {
            console.error('Error updating data:', error);
        }
    }

    /**
     * 全ての表示を更新
     */
    updateAllDisplays() {
        // ステータスインジケーターを更新
        this.updateStatusIndicators();
        
        // 現在のビューに応じてコントローラーを更新
        if (this.currentView === 'nextcloud') {
            this.nextcloudController.updateDisplay(this.dataModel.getNextcloudData());
        } else if (this.currentView === 'proxmox') {
            this.proxmoxController.updateDisplay(this.dataModel.getProxmoxData());
        }
    }

    /**
     * ステータスインジケーターを更新
     */
    updateStatusIndicators() {
        const nextcloudData = this.dataModel.getNextcloudData();
        const proxmoxData = this.dataModel.getProxmoxData();
        
        // Nextcloudステータス
        const nextcloudStatus = document.querySelector('#nextcloud-status .status-dot');
        if (nextcloudStatus) {
            nextcloudStatus.className = 'status-dot ' + 
                (nextcloudData && nextcloudData.data ? 'online' : 'offline');
        }
        
        // Proxmoxステータス
        const proxmoxStatus = document.querySelector('#proxmox-status .status-dot');
        if (proxmoxStatus) {
            proxmoxStatus.className = 'status-dot ' + 
                (proxmoxData && proxmoxData.data ? 'online' : 'offline');
        }
    }

    /**
     * 最終更新時刻を更新
     */
    updateLastUpdateTime() {
        const lastUpdateElement = document.getElementById('last-update-time');
        if (lastUpdateElement) {
            lastUpdateElement.textContent = new Date().toLocaleTimeString('ja-JP');
        }
    }

    /**
     * 詳細モードを切り替え
     */
    toggleDetailMode(service) {
        if (service === 'nextcloud') {
            this.nextcloudController.toggleDetailMode();
        } else if (service === 'proxmox') {
            this.proxmoxController.toggleDetailMode();
        }
    }

    /**
     * エラーメッセージを表示
     */
    showError(message) {
        console.error(message);
        
        // エラー表示用の要素があれば更新
        const errorElement = document.getElementById('error-message');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
            
            // 5秒後に非表示
            setTimeout(() => {
                errorElement.style.display = 'none';
            }, 5000);
        }
    }

    /**
     * 成功メッセージを表示
     */
    showSuccess(message) {
        console.log(message);
        
        // 成功表示用の要素があれば更新
        const successElement = document.getElementById('success-message');
        if (successElement) {
            successElement.textContent = message;
            successElement.style.display = 'block';
            
            // 3秒後に非表示
            setTimeout(() => {
                successElement.style.display = 'none';
            }, 3000);
        }
    }

    /**
     * アプリケーションを破棄
     */
    destroy() {
        // WebSocket接続を切断
        if (this.socketManager) {
            this.socketManager.disconnect();
        }
        
        // チャートを破棄
        if (this.chartManager) {
            this.chartManager.destroyAllCharts();
        }
        
        // 自動更新を停止
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
        }
        
        console.log('Dashboard Application destroyed');
    }
}

// グローバル関数（後方互換性のため）
function switchView(view) {
    if (window.dashboardApp) {
        window.dashboardApp.switchView(view);
    }
}
            
            // ソケットイベントをセットアップ
            this.setupSocketEvents();
            
            // 初期ビューを設定
            this.switchView('nextcloud');
            
            // 自動更新を開始
            this.startAutoRefresh();
            
            // 初期データを取得
            await this.loadInitialData();
            
            console.log('Dashboard initialization completed');
            
        } catch (error) {
            console.error('Error initializing components:', error);
            this.showError('Failed to initialize components: ' + error.message);
        }
    }

    /**
     * チャートを初期化
     */
    async initializeCharts() {
        try {
            this.chartManager.initializeAllCharts();
            console.log('Charts initialized successfully');
        } catch (error) {
            console.error('Error initializing charts:', error);
            throw error;
        }
    }

    /**
     * イベントリスナーをセットアップ
     */
    setupEventListeners() {
        // ビュー切り替えボタン
        const nextcloudToggle = document.getElementById('nextcloud-toggle');
        const proxmoxToggle = document.getElementById('proxmox-toggle');
        
        if (nextcloudToggle) {
            nextcloudToggle.addEventListener('click', () => this.switchView('nextcloud'));
        }
        
        if (proxmoxToggle) {
            proxmoxToggle.addEventListener('click', () => this.switchView('proxmox'));
        }

        // リフレッシュボタン
        const refreshButtons = document.querySelectorAll('[onclick*="refresh"]');
        refreshButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                if (button.onclick && button.onclick.toString().includes('Nextcloud')) {
                    this.refreshNextcloud();
                } else if (button.onclick && button.onclick.toString().includes('Proxmox')) {
                    this.refreshProxmox();
                }
            });
        });

        // 詳細表示切り替えボタン
        const detailToggle = document.querySelector('[onclick*="toggleDetailedView"]');
        if (detailToggle) {
            detailToggle.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleDetailedView();
            });
        }

        // ウィンドウリサイズ時のチャート調整
        window.addEventListener('resize', this.debounce(() => {
            this.chartManager.resizeAllCharts();
        }, 250));

        // ページ離脱時のクリーンアップ
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });

        // キーボードショートカット
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case '1':
                        e.preventDefault();
                        this.switchView('nextcloud');
                        break;
                    case '2':
                        e.preventDefault();
                        this.switchView('proxmox');
                        break;
                    case 'r':
                        e.preventDefault();
                        this.refreshCurrentView();
                        break;
                }
            }
        });
    }

    /**
     * ソケットイベントをセットアップ
     */
    setupSocketEvents() {
        // データ更新イベント
        this.socketManager.on('data-update', (data) => {
            this.handleDataUpdate(data);
            this.updateLastUpdateTime(data.timestamp);
        });

        // 接続ステータス更新
        this.socketManager.on('connection-status', (isConnected) => {
            this.updateConnectionStatus(isConnected);
        });

        // エラー処理
        this.socketManager.on('socket-error', (error) => {
            this.showError('Connection error: ' + error.message);
        });

        this.socketManager.on('connection-error', (error) => {
            console.error('Socket connection error:', error);
        });

        // 再接続失敗
        this.socketManager.on('all-reconnect-failed', () => {
            this.showError('Failed to reconnect to server. Please refresh the page.');
        });
    }

    /**
     * データ更新を処理
     */
    async handleDataUpdate(data) {
        try {
            if (data.nextcloud) {
                await this.nextcloudController.updateView(data.nextcloud);
            }
            
            if (data.proxmox) {
                await this.proxmoxController.updateView(data.proxmox);
            }
        } catch (error) {
            console.error('Error handling data update:', error);
        }
    }

    /**
     * 初期データを読み込み
     */
    async loadInitialData() {
        try {
            console.log('Loading initial data...');
            
            const [nextcloudData, proxmoxData] = await Promise.allSettled([
                this.dataModel.fetchNextcloudData(),
                this.dataModel.fetchProxmoxData()
            ]);

            if (nextcloudData.status === 'fulfilled') {
                await this.nextcloudController.updateView(nextcloudData.value);
            } else {
                console.error('Failed to load initial Nextcloud data:', nextcloudData.reason);
            }

            if (proxmoxData.status === 'fulfilled') {
                await this.proxmoxController.updateView(proxmoxData.value);
            } else {
                console.error('Failed to load initial Proxmox data:', proxmoxData.reason);
            }

            this.updateLastUpdateTime(new Date().toISOString());
            
        } catch (error) {
            console.error('Error loading initial data:', error);
            this.showError('Failed to load initial data');
        }
    }

    /**
     * ビューを切り替え
     */
    switchView(view) {
        this.currentView = view;
        
        const nextcloudSection = document.querySelector('.nextcloud-section');
        const proxmoxSection = document.querySelector('.proxmox-section');
        const nextcloudToggle = document.getElementById('nextcloud-toggle');
        const proxmoxToggle = document.getElementById('proxmox-toggle');
        
        if (view === 'nextcloud') {
            if (nextcloudSection) nextcloudSection.style.display = 'block';
            if (proxmoxSection) proxmoxSection.style.display = 'none';
            if (nextcloudToggle) nextcloudToggle.classList.add('active');
            if (proxmoxToggle) proxmoxToggle.classList.remove('active');
        } else if (view === 'proxmox') {
            if (nextcloudSection) nextcloudSection.style.display = 'none';
            if (proxmoxSection) proxmoxSection.style.display = 'block';
            if (nextcloudToggle) nextcloudToggle.classList.remove('active');
            if (proxmoxToggle) proxmoxToggle.classList.add('active');
        }
        
        // チャートリサイズ
        setTimeout(() => {
            this.chartManager.resizeAllCharts();
        }, 100);
    }

    /**
     * Nextcloudデータを手動リフレッシュ
     */
    async refreshNextcloud() {
        try {
            await this.nextcloudController.refresh();
        } catch (error) {
            console.error('Error refreshing Nextcloud:', error);
            this.showError('Failed to refresh Nextcloud data');
        }
    }

    /**
     * Proxmoxデータを手動リフレッシュ
     */
    async refreshProxmox() {
        try {
            await this.proxmoxController.refresh();
        } catch (error) {
            console.error('Error refreshing Proxmox:', error);
            this.showError('Failed to refresh Proxmox data');
        }
    }

    /**
     * 現在のビューをリフレッシュ
     */
    async refreshCurrentView() {
        if (this.currentView === 'nextcloud') {
            await this.refreshNextcloud();
        } else if (this.currentView === 'proxmox') {
            await this.refreshProxmox();
        }
    }

    /**
     * 詳細表示を切り替え
     */
    toggleDetailedView() {
        this.proxmoxController.toggleDetailedView();
    }

    /**
     * 自動更新を開始
     */
    startAutoRefresh() {
        this.stopAutoRefresh(); // 既存のタイマーを停止
        
        this.autoRefreshInterval = setInterval(async () => {
            try {
                await this.loadInitialData();
            } catch (error) {
                console.error('Error in auto refresh:', error);
            }
        }, this.autoRefreshDelay);
        
        console.log(`Auto refresh started (${this.autoRefreshDelay / 1000}s interval)`);
    }

    /**
     * 自動更新を停止
     */
    stopAutoRefresh() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = null;
        }
    }

    /**
     * 接続ステータスを更新
     */
    updateConnectionStatus(isConnected) {
        this.socketManager.updateConnectionIndicator(isConnected);
        
        if (!isConnected && this.autoRefreshInterval) {
            // 接続が切れた場合は自動更新を停止
            this.stopAutoRefresh();
        } else if (isConnected && !this.autoRefreshInterval) {
            // 接続が復旧したら自動更新を再開
            this.startAutoRefresh();
        }
    }

    /**
     * 最終更新時間を更新
     */
    updateLastUpdateTime(timestamp) {
        const date = new Date(timestamp);
        const element = document.getElementById('last-update-time');
        if (element) {
            element.textContent = date.toLocaleTimeString();
        }
    }

    /**
     * エラーメッセージを表示
     */
    showError(message) {
        console.error('Dashboard error:', message);
        
        // トースト通知を作成
        this.showToast(message, 'error');
    }

    /**
     * トースト通知を表示
     */
    showToast(message, type = 'info', duration = 5000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        // トーストコンテナを取得または作成
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        
        container.appendChild(toast);
        
        // アニメーション
        setTimeout(() => toast.classList.add('show'), 10);
        
        // 自動削除
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, duration);
    }

    /**
     * デバウンス機能
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * クリーンアップ
     */
    cleanup() {
        this.stopAutoRefresh();
        this.socketManager.disconnect();
        this.chartManager.destroyAllCharts();
        console.log('Dashboard cleanup completed');
    }

    /**
     * デバッグ情報を取得
     */
    getDebugInfo() {
        return {
            currentView: this.currentView,
            autoRefreshActive: !!this.autoRefreshInterval,
            autoRefreshDelay: this.autoRefreshDelay,
            socketInfo: this.socketManager.getDebugInfo(),
            chartCount: this.chartManager.charts.size,
            dataModelCache: this.dataModel.cache.size
        };
    }
}

// グローバル関数（後方互換性のため）
function switchView(view) {
    if (window.dashboardApp) {
        window.dashboardApp.switchView(view);
    }
}

function refreshNextcloud() {
    if (window.dashboardApp) {
        window.dashboardApp.refreshNextcloud();
    }
}

function refreshProxmox() {
    if (window.dashboardApp) {
        window.dashboardApp.refreshProxmox();
    }
}

function toggleDetailedView() {
    if (window.dashboardApp) {
        window.dashboardApp.toggleDetailedView();
    }
}

// アプリケーション初期化
document.addEventListener('DOMContentLoaded', () => {
    window.dashboardApp = new DashboardApp();
});
