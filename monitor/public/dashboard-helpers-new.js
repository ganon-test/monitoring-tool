// Dashboard Helper Functions - MVC Compatible

// Global helper functions
function updateElement(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = value;
    }
}

// Global functions for view switching
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

// Helper functions for formatting
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

// Legacy compatibility - wait for new dashboard to initialize
document.addEventListener('DOMContentLoaded', function() {
    console.log('Dashboard helpers loaded - waiting for MVC dashboard...');
    
    // Check if dashboard is ready
    const waitForDashboard = () => {
        if (window.dashboardApp && window.dashboardApp.isInitialized) {
            console.log('Dashboard helpers connected to MVC structure');
        } else {
            setTimeout(waitForDashboard, 100);
        }
    };
    
    setTimeout(waitForDashboard, 500);
});
