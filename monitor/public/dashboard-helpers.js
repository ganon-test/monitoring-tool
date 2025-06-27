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
    
    // 新しいMVCアプリケーションを初期化
    if (typeof DashboardApp !== 'undefined') {
        window.dashboardApp = new DashboardApp();
        window.dashboardApp.init();
    } else {
        console.error('DashboardApp class not found. Make sure all MVC files are loaded.');
    }
    
    // 後方互換性のために旧クラスも作成
    if (typeof MonitoringDashboard !== 'undefined') {
        window.dashboard = new MonitoringDashboard();
    }
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
