// Dashboard Helper Functions - Updated for MVC structure

/**
 * 共通ユーティリティ関数群
 */
const DashboardUtils = {
    // DOM操作
    updateElement(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
        }
    },

    updateElementHtml(elementId, html) {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = html;
        }
    },

    // データフォーマット
    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    formatNumber(num) {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    },

    formatUptime(seconds) {
        if (!seconds) return '-';
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${days}d ${hours}h ${minutes}m`;
    },

    formatPercentage(value, total) {
        if (!total || total === 0) return '0%';
        return Math.round((value / total) * 100) + '%';
    },

    formatTime(timestamp) {
        return new Date(timestamp).toLocaleTimeString();
    },

    // チャート最適化
    optimizeChartCanvas(canvas) {
        if (!canvas) return;
        
        const parent = canvas.parentElement;
        if (parent) {
            const parentRect = parent.getBoundingClientRect();
            if (parentRect.width > 0 && parentRect.height > 0) {
                canvas.style.width = '100%';
                canvas.style.height = '100%';
            }
        }
    },

    // エラーハンドリング
    showError(message, elementId = null) {
        console.error('Dashboard error:', message);
        if (elementId) {
            this.updateElement(elementId, 'Error: ' + message);
        }
    },

    // 状態管理
    updateConnectionStatus(service, isConnected) {
        const statusElement = document.getElementById(`${service}-status`);
        if (statusElement) {
            const dot = statusElement.querySelector('.status-dot');
            if (dot) {
                dot.className = isConnected ? 'status-dot online' : 'status-dot offline';
            }
        }
    }
};

// Global helper functions (backward compatibility)
function updateElement(elementId, value) {
    DashboardUtils.updateElement(elementId, value);
}

function formatBytes(bytes) {
    return DashboardUtils.formatBytes(bytes);
}

function formatNumber(num) {
    return DashboardUtils.formatNumber(num);
}

function formatUptime(seconds) {
    return DashboardUtils.formatUptime(seconds);
}

// Global functions for view switching (delegates to DashboardApp)
function switchView(view) {
    if (window.dashboardApp) {
        window.dashboardApp.switchView(view);
    }
}

function refreshNextcloud() {
    if (window.dashboardApp) {
        window.dashboardApp.dataModel.fetchNextcloudData();
    }
}

// Global functions for view switching (delegates to DashboardApp)
function switchView(view) {
    if (window.dashboardApp) {
        window.dashboardApp.switchView(view);
    }
}

function refreshNextcloud() {
    if (window.dashboardApp) {
        window.dashboardApp.dataModel.fetchNextcloudData();
    }
}

function refreshProxmox() {
    console.log('Refreshing Proxmox data...');
    if (window.dashboardApp && window.dashboardApp.dataModel) {
        window.dashboardApp.dataModel.fetchProxmoxData().then(data => {
            console.log('Fresh Proxmox data received:', data);
            if (window.dashboardApp.proxmoxController && data) {
                window.dashboardApp.proxmoxController.updateView(data);
            }
        }).catch(error => {
            console.error('Failed to refresh Proxmox data:', error);
        });
    } else {
        console.error('DashboardApp or DataModel not available');
    }
}

function toggleDetailedView() {
    if (window.dashboardApp) {
        const currentView = window.dashboardApp.currentView;
        
        if (currentView === 'proxmox' && window.dashboardApp.proxmoxController) {
            window.dashboardApp.proxmoxController.toggleDetailedView();
        } else if (currentView === 'nextcloud' && window.dashboardApp.nextcloudController) {
            window.dashboardApp.nextcloudController.toggleDetailedView();
        } else {
            console.warn('No controller available for current view:', currentView);
        }
    } else {
        console.error('DashboardApp not available');
    }
}

// Initialize dashboard when page loads - Updated for MVC
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing MVC Dashboard...');
    
    // DashboardAppクラスが利用可能になるまで待機
    let attempts = 0;
    const maxAttempts = 50; // 5秒間試行
    
    function initializeDashboard() {
        attempts++;
        
        if (typeof DashboardApp !== 'undefined') {
            window.dashboardApp = new DashboardApp();
            window.dashboardApp.init().then(() => {
                console.log('DashboardApp initialized successfully');
                
                // 定期的にチャートのリサイズを実行（2秒ごと）
                setInterval(() => {
                    if (window.dashboardApp) {
                        window.dashboardApp.resizeCharts();
                    }
                }, 2000);
                
                // キャンバス最適化を実行
                setTimeout(() => {
                    const canvases = document.querySelectorAll('canvas');
                    canvases.forEach(canvas => DashboardUtils.optimizeChartCanvas(canvas));
                }, 1000);
                
            }).catch(error => {
                console.error('Failed to initialize DashboardApp:', error);
            });
        } else if (attempts < maxAttempts) {
            console.log(`DashboardApp not yet available, retrying... (${attempts}/${maxAttempts})`);
            setTimeout(initializeDashboard, 100);
        } else {
            console.error('DashboardApp failed to load after maximum attempts');
        }
    }
    
    // 少し遅延させてすべてのJSファイルが読み込まれるのを待つ
    setTimeout(initializeDashboard, 200);
    
    // 後方互換性のために旧クラスエイリアスを作成（非推奨）
    setTimeout(() => {
        if (typeof DashboardApp !== 'undefined' && !window.MonitoringDashboard && !window.dashboard) {
            // 非推奨警告を抑制しつつエイリアスを作成
            window.MonitoringDashboard = DashboardApp;
            console.warn('MonitoringDashboard is deprecated. Use DashboardApp instead.');
        }
    }, 1000);
});


