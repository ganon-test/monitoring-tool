// Dashboard Helper Functions - Updated for MVC structure

// Global helper functions
function updateElement(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = value;
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
    if (window.dashboardApp) {
        window.dashboardApp.dataModel.fetchProxmoxData();
    }
}

function toggleDetailedView() {
    if (window.dashboardApp) {
        window.dashboardApp.toggleDetailMode();
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
                
                // 定期的にチャートの異常成長をチェック
                setInterval(() => {
                    if (window.dashboardApp && typeof window.dashboardApp.preventChartOvergrowth === 'function') {
                        window.dashboardApp.preventChartOvergrowth();
                    }
                }, 5000); // 5秒ごと
                
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
    
    // 後方互換性のために旧クラスも作成
    setTimeout(() => {
        if (typeof MonitoringDashboard !== 'undefined' && !window.dashboard) {
            window.dashboard = new MonitoringDashboard();
        }
    }, 1000);
});

// Utility functions
function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

function formatUptime(seconds) {
    if (!seconds) return '-';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
}
