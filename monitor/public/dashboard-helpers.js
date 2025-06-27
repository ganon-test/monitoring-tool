// Dashboard Helper Functions

// Global helper functions
function updateElement(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = value;
    }
}

// Global functions for view switching
function switchView(view) {
    if (window.dashboard) {
        window.dashboard.switchView(view);
    }
}

function refreshNextcloud() {
    if (window.dashboard) {
        window.dashboard.refreshNextcloud();
    }
}

function refreshProxmox() {
    if (window.dashboard) {
        window.dashboard.refreshProxmox();
    }
}

function toggleDetailedView() {
    if (window.dashboard) {
        window.dashboard.toggleDetailedView();
    }
}

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', function() {
    window.dashboard = new MonitoringDashboard();
    
    // Add missing methods to the dashboard
    window.dashboard.updateElement = function(elementId, value) {
        updateElement(elementId, value);
    };

    window.dashboard.refreshNextcloud = function() {
        console.log('Refreshing Nextcloud data...');
        fetch('/api/nextcloud')
            .then(response => response.json())
            .then(data => this.updateNextcloudData(data))
            .catch(error => console.error('Failed to refresh Nextcloud:', error));
    };

    window.dashboard.refreshProxmox = function() {
        console.log('Refreshing Proxmox data...');
        fetch('/api/proxmox')
            .then(response => response.json())
            .then(data => this.updateProxmoxData(data))
            .catch(error => console.error('Failed to refresh Proxmox:', error));
    };

    window.dashboard.toggleDetailedView = function() {
        this.detailedMode = !this.detailedMode;
        
        const detailedSections = document.querySelectorAll('.detailed-section');
        const toggleText = document.getElementById('detail-toggle-text');
        
        detailedSections.forEach(section => {
            section.style.display = this.detailedMode ? 'block' : 'none';
        });
        
        if (toggleText) {
            toggleText.textContent = this.detailedMode ? 'Hide Details' : 'Show Details';
        }
        
        // Resize charts after toggle
        setTimeout(() => {
            this.resizeCharts();
        }, 100);
    };
});
