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
                await this.initializeComponents();
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
            console.log('Initializing components...');
            
            // データモデルを初期化
            if (this.dataModel && typeof this.dataModel.init === 'function') {
                await this.dataModel.init();
            }
            
            // チャート管理を初期化
            if (this.chartManager) {
                if (typeof this.chartManager.init === 'function') {
                    this.chartManager.init();
                } else if (typeof this.chartManager.initializeAllCharts === 'function') {
                    this.chartManager.initializeAllCharts();
                }
            }
            
            // WebSocket管理を初期化
            if (this.socketManager && typeof this.socketManager.init === 'function') {
                this.socketManager.init(this.onDataUpdate.bind(this));
            }
            
            // ビューコントローラーを初期化
            if (this.nextcloudController && typeof this.nextcloudController.init === 'function') {
                this.nextcloudController.init();
            }
            if (this.proxmoxController && typeof this.proxmoxController.init === 'function') {
                this.proxmoxController.init();
            }
            
            // イベントリスナーをセットアップ
            this.setupEventListeners();
            
            // 初期ビューを設定
            this.switchView('nextcloud');
              // 初期データ取得
            await this.loadInitialData();
            
            // チャートの異常成長を防ぐ初期チェック
            setTimeout(() => this.preventChartOvergrowth(), 500);

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

        // ウィンドウリサイズハンドラー（デバウンス付き）
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.resizeCharts();
                this.preventChartOvergrowth();
            }, 150);
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
            if (this.nextcloudController && typeof this.nextcloudController.updateDisplay === 'function') {
                const data = this.dataModel.getNextcloudData ? this.dataModel.getNextcloudData() : null;
                if (data) this.nextcloudController.updateDisplay(data);
            }
            
        } else if (view === 'proxmox') {
            // Proxmoxを表示、Nextcloudを非表示
            if (nextcloudSection) nextcloudSection.style.display = 'none';
            if (proxmoxSection) proxmoxSection.style.display = 'block';
            
            // ボタンの状態を更新
            if (nextcloudToggle) nextcloudToggle.classList.remove('active');
            if (proxmoxToggle) proxmoxToggle.classList.add('active');
            
            // Proxmoxデータを更新
            if (this.proxmoxController && typeof this.proxmoxController.updateDisplay === 'function') {
                const data = this.dataModel.getProxmoxData ? this.dataModel.getProxmoxData() : null;
                if (data) this.proxmoxController.updateDisplay(data);
            }
        }
        
        // チャートのリサイズ
        setTimeout(() => {
            this.resizeCharts();
        }, 100);
    }

    /**
     * 初期データを読み込み
     */
    async loadInitialData() {
        try {
            console.log('Loading initial data...');
            
            // 各サービスのデータを並行取得
            const promises = [];
            
            if (this.dataModel.fetchNextcloudData) {
                promises.push(this.dataModel.fetchNextcloudData().catch(err => {
                    console.error('Failed to fetch Nextcloud data:', err);
                    return { error: err.message };
                }));
            }
            if (this.dataModel.fetchProxmoxData) {
                promises.push(this.dataModel.fetchProxmoxData().catch(err => {
                    console.error('Failed to fetch Proxmox data:', err);
                    return { error: err.message };
                }));
            }
            
            if (promises.length > 0) {
                await Promise.all(promises);
                
                // データを更新
                this.updateAllDisplays();
            }
            
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
            console.log('Received data update:', data);
            
            // データモデルを更新
            if (data.nextcloud && this.dataModel.updateNextcloudData) {
                this.dataModel.updateNextcloudData(data.nextcloud);
            }
            if (data.proxmox && this.dataModel.updateProxmoxData) {
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
        console.log('Updating all displays for view:', this.currentView);
        
        // ステータスインジケーターを更新
        this.updateStatusIndicators();
        
        // 現在のビューに応じてコントローラーを更新
        if (this.currentView === 'nextcloud' && this.nextcloudController) {
            const data = this.dataModel.getNextcloudData ? this.dataModel.getNextcloudData() : null;
            console.log('Nextcloud data:', data);
            if (data && this.nextcloudController.updateDisplay) {
                this.nextcloudController.updateDisplay(data);
            } else {
                console.warn('No Nextcloud data available or updateDisplay method missing');
            }
        } else if (this.currentView === 'proxmox' && this.proxmoxController) {
            const data = this.dataModel.getProxmoxData ? this.dataModel.getProxmoxData() : null;
            console.log('Proxmox data:', data);
            if (data && this.proxmoxController.updateDisplay) {
                this.proxmoxController.updateDisplay(data);
            } else {
                console.warn('No Proxmox data available or updateDisplay method missing');
                
                // 代替手段：データを新たに取得
                if (this.dataModel.fetchProxmoxData) {
                    console.log('Attempting to fetch fresh Proxmox data...');
                    this.dataModel.fetchProxmoxData().then(freshData => {
                        if (freshData && this.proxmoxController.updateDisplay) {
                            this.proxmoxController.updateDisplay(freshData);
                        }
                    });
                }
            }
        }
    }

    /**
     * ステータスインジケーターを更新
     */
    updateStatusIndicators() {
        const nextcloudData = this.dataModel.getNextcloudData ? this.dataModel.getNextcloudData() : null;
        const proxmoxData = this.dataModel.getProxmoxData ? this.dataModel.getProxmoxData() : null;
        
        // Nextcloudステータス
        const nextcloudStatus = document.querySelector('#nextcloud-status .status-dot');
        if (nextcloudStatus) {
            nextcloudStatus.className = 'status-dot ' + 
                (nextcloudData && !nextcloudData.error ? 'online' : 'offline');
        }
        
        // Proxmoxステータス
        const proxmoxStatus = document.querySelector('#proxmox-status .status-dot');
        if (proxmoxStatus) {
            proxmoxStatus.className = 'status-dot ' + 
                (proxmoxData && !proxmoxData.error ? 'online' : 'offline');
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
     * チャートをリサイズ
     */
    resizeCharts() {
        if (this.chartManager && typeof this.chartManager.resizeAllCharts === 'function') {
            this.chartManager.resizeAllCharts();
        }
    }

    /**
     * チャートの異常成長を防ぐ（強化版）
     */
    preventChartOvergrowth() {
        // 全キャンバス要素をチェック
        const canvases = document.querySelectorAll('canvas');
        canvases.forEach(canvas => {
            const rect = canvas.getBoundingClientRect();
            
            // より厳しい制限（500px超過で即リセット）
            if (rect.width > 500 || rect.height > 400) {
                console.warn(`Canvas ${canvas.id} is too large: ${rect.width}x${rect.height}, emergency reset...`);
                
                // 強制的にサイズをリセット
                canvas.style.width = '300px !important';
                canvas.style.height = '250px !important';
                canvas.style.maxWidth = '300px !important';
                canvas.style.maxHeight = '250px !important';
                
                // キャンバス自体のサイズも制限
                canvas.width = 300;
                canvas.height = 250;
                
                // Chart.jsインスタンスを強制リサイズ
                if (this.chartManager && this.chartManager.charts) {
                    this.chartManager.charts.forEach(chart => {
                        if (chart.canvas === canvas && typeof chart.resize === 'function') {
                            try {
                                chart.resize(300, 250);
                            } catch (error) {
                                console.error('Error force resizing chart:', error);
                                // 最後の手段：チャートを破棄して再作成
                                this.chartManager.charts.forEach((chartInstance, name) => {
                                    if (chartInstance.canvas === canvas) {
                                        console.warn(`Destroying and recreating chart: ${name}`);
                                        this.chartManager.destroyChart(name);
                                    }
                                });
                            }
                        }
                    });
                }
            }
            
            // さらに小さい制限も設定
            if (rect.width > 300 || rect.height > 250) {
                canvas.style.maxWidth = '300px';
                canvas.style.maxHeight = '250px';
            }
        });
        
        // 問題のあるチャートを特定して個別対応
        const problematicCharts = ['storage-donut-chart', 'memory-gauge', 'cluster-memory-gauge'];
        problematicCharts.forEach(chartId => {
            const canvas = document.getElementById(chartId);
            if (canvas) {
                const rect = canvas.getBoundingClientRect();
                if (rect.width > 300 || rect.height > 300) {
                    canvas.style.width = '250px !important';
                    canvas.style.height = '250px !important';
                    canvas.style.maxWidth = '250px !important';
                    canvas.style.maxHeight = '250px !important';
                }
            }
        });
    }

    /**
     * 詳細モードを切り替え
     */
    toggleDetailMode(service) {
        if (service === 'nextcloud' && this.nextcloudController && this.nextcloudController.toggleDetailMode) {
            this.nextcloudController.toggleDetailMode();
        } else if (service === 'proxmox' && this.proxmoxController && this.proxmoxController.toggleDetailMode) {
            this.proxmoxController.toggleDetailMode();
        }
    }

    /**
     * エラーメッセージを表示
     */
    showError(message) {
        if (typeof DashboardUtils !== 'undefined' && DashboardUtils.showError) {
            DashboardUtils.showError(message);
        } else {
            console.error('Dashboard error:', message);
        }
        
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
        console.log('Dashboard success:', message);
        
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
        if (this.socketManager && this.socketManager.disconnect) {
            this.socketManager.disconnect();
        }
        
        // チャートを破棄
        if (this.chartManager && this.chartManager.destroyAllCharts) {
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
