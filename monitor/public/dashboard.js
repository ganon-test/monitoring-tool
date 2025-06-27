// Dashboard JavaScript
class MonitoringDashboard {
    constructor() {
        this.socket = io();
        this.charts = {};
        this.data = {
            nextcloud: null,
            proxmox: null
        };
        this.detailedMode = false;
        
        this.initializeCharts();
        this.setupSocketListeners();
        this.setupEventListeners();
    }

    initializeCharts() {
        // Memory Gauge Chart
        const memoryCtx = document.getElementById('memory-gauge');
        this.charts.memoryGauge = new Chart(memoryCtx, {
            type: 'doughnut',
            data: {
                datasets: [{
                    data: [0, 100],
                    backgroundColor: ['#00d4ff', 'rgba(255, 255, 255, 0.1)'],
                    borderWidth: 0,
                    cutout: '80%'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false }
                }
            }
        });

        // Nextcloud History Chart
        const ncHistoryCtx = document.getElementById('nextcloud-history-chart');
        this.charts.nextcloudHistory = new Chart(ncHistoryCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'CPU Load',
                        data: [],
                        borderColor: '#00d4ff',
                        backgroundColor: 'rgba(0, 212, 255, 0.1)',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Memory Usage %',
                        data: [],
                        borderColor: '#8b5cf6',
                        backgroundColor: 'rgba(139, 92, 246, 0.1)',
                        tension: 0.4,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { 
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        ticks: { color: '#b0b0b0' }
                    },
                    y: { 
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        ticks: { color: '#b0b0b0' }
                    }
                },
                plugins: {
                    legend: {
                        labels: { color: '#ffffff' }
                    }
                }
            }
        });

        // Proxmox Resources Chart
        const proxmoxResourcesCtx = document.getElementById('proxmox-resources-chart');
        this.charts.proxmoxResources = new Chart(proxmoxResourcesCtx, {
            type: 'pie',
            data: {
                labels: ['Running VMs', 'Stopped VMs', 'Containers', 'Storage'],
                datasets: [{
                    data: [0, 0, 0, 0],
                    backgroundColor: [
                        '#10b981',
                        '#ef4444',
                        '#f59e0b',
                        '#8b5cf6'
                    ],
                    borderWidth: 2,
                    borderColor: '#1a1a1a'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: '#ffffff' }
                    }
                }
            }
        });

        // Proxmox History Chart
        const proxmoxHistoryCtx = document.getElementById('proxmox-history-chart');
        this.charts.proxmoxHistory = new Chart(proxmoxHistoryCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Cluster CPU %',
                        data: [],
                        borderColor: '#f97316',
                        backgroundColor: 'rgba(249, 115, 22, 0.1)',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Cluster Memory %',
                        data: [],
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        tension: 0.4,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { 
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        ticks: { color: '#b0b0b0' }
                    },
                    y: { 
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        ticks: { color: '#b0b0b0' }
                    }
                },
                plugins: {
                    legend: {
                        labels: { color: '#ffffff' }
                    }
                }
            }
        });
    }

    setupSocketListeners() {
        this.socket.on('data-update', (data) => {
            this.data = data;
            this.updateNextcloudData(data.nextcloud);
            this.updateProxmoxData(data.proxmox);
            this.updateLastUpdateTime(data.timestamp);
        });

        this.socket.on('error', (error) => {
            console.error('Socket error:', error);
            this.showError(error.message);
        });

        this.socket.on('connect', () => {
            console.log('Connected to server');
            this.updateConnectionStatus(true);
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            this.updateConnectionStatus(false);
        });
    }

    setupEventListeners() {
        // Auto-refresh every 30 seconds
        setInterval(() => {
            this.refreshData();
        }, 30000);
    }

    updateNextcloudData(data) {
        if (data.error) {
            this.updateServiceStatus('nextcloud', false);
            return;
        }

        this.updateServiceStatus('nextcloud', true);

        if (data.ocs && data.ocs.data) {
            const ncData = data.ocs.data;
            
            // Update system overview
            if (ncData.nextcloud && ncData.nextcloud.system) {
                const system = ncData.nextcloud.system;
                document.getElementById('nc-version').textContent = system.version || '-';
                
                // Update memory gauge
                if (system.mem_total && system.mem_free) {
                    const memUsed = system.mem_total - system.mem_free;
                    const memPercent = (memUsed / system.mem_total * 100).toFixed(1);
                    
                    this.charts.memoryGauge.data.datasets[0].data = [memPercent, 100 - memPercent];
                    this.charts.memoryGauge.update();
                    
                    document.getElementById('memory-percent').textContent = `${memPercent}%`;
                    document.getElementById('memory-details').textContent = 
                        `${this.formatBytes(memUsed * 1024)} / ${this.formatBytes(system.mem_total * 1024)}`;
                }

                // Update CPU load
                if (system.cpuload && Array.isArray(system.cpuload)) {
                    const loads = system.cpuload;
                    const cpuNum = system.cpunum || 1;
                    
                    if (loads[0] !== undefined) {
                        const load1Percent = Math.min((loads[0] / cpuNum) * 100, 100);
                        document.getElementById('cpu-1m').style.width = `${load1Percent}%`;
                        document.getElementById('cpu-1m-val').textContent = loads[0].toFixed(2);
                    }
                    
                    if (loads[1] !== undefined) {
                        const load5Percent = Math.min((loads[1] / cpuNum) * 100, 100);
                        document.getElementById('cpu-5m').style.width = `${load5Percent}%`;
                        document.getElementById('cpu-5m-val').textContent = loads[1].toFixed(2);
                    }
                    
                    if (loads[2] !== undefined) {
                        const load15Percent = Math.min((loads[2] / cpuNum) * 100, 100);
                        document.getElementById('cpu-15m').style.width = `${load15Percent}%`;
                        document.getElementById('cpu-15m-val').textContent = loads[2].toFixed(2);
                    }
                }

                // Update storage
                if (system.freespace) {
                    const freeGB = (system.freespace / (1024 * 1024 * 1024)).toFixed(1);
                    document.getElementById('storage-free').textContent = `${freeGB} GB`;
                    
                    // Estimate total storage (this would need to be calculated differently in real scenario)
                    const totalGB = parseFloat(freeGB) + 100; // Placeholder
                    const usedPercent = ((totalGB - parseFloat(freeGB)) / totalGB * 100);
                    
                    document.getElementById('storage-total').textContent = `${totalGB.toFixed(1)} GB`;
                    document.getElementById('storage-used').style.width = `${usedPercent}%`;
                }
            }

            // Update active users
            if (ncData.activeUsers) {
                document.getElementById('nc-active-users').textContent = ncData.activeUsers.last24hours || '-';
            }

            // Update file count
            if (ncData.nextcloud && ncData.nextcloud.storage) {
                const numFiles = ncData.nextcloud.storage.num_files;
                document.getElementById('nc-files').textContent = this.formatNumber(numFiles);
            }
        }

        // Load historical data
        this.loadNextcloudHistory();
    }

    updateProxmoxData(data) {
        if (data.error) {
            this.updateServiceStatus('proxmox', false);
            return;
        }

        this.updateServiceStatus('proxmox', true);

        // Update cluster nodes
        if (data.nodes && data.nodes.data) {
            this.updateClusterNodes(data.nodes.data);
        }

        // Update resource distribution
        if (data.cluster_resources && data.cluster_resources.data) {
            this.updateResourceDistribution(data.cluster_resources.data);
        }

        // Update VM status
        if (data.cluster_resources && data.cluster_resources.data) {
            this.updateVMStatus(data.cluster_resources.data);
        }

        // Load historical data
        this.loadProxmoxHistory();
    }

    updateClusterNodes(nodes) {
        const container = document.getElementById('cluster-nodes');
        container.innerHTML = '';

        nodes.forEach(node => {
            if (node.type === 'node') {
                const nodeCard = document.createElement('div');
                nodeCard.className = 'node-card';
                
                const statusClass = node.status === 'online' ? 'online' : 'offline';
                const cpuPercent = node.cpu ? (node.cpu * 100).toFixed(1) : '0';
                const memPercent = node.mem && node.maxmem ? 
                    ((node.mem / node.maxmem) * 100).toFixed(1) : '0';

                nodeCard.innerHTML = `
                    <div class="node-header">
                        <div class="node-name">${node.node}</div>
                        <div class="node-status ${statusClass}"></div>
                    </div>
                    <div class="node-details">
                        <div>CPU: ${cpuPercent}%</div>
                        <div>Memory: ${memPercent}%</div>
                        <div>Uptime: ${this.formatUptime(node.uptime)}</div>
                    </div>
                `;

                container.appendChild(nodeCard);
            }
        });
    }

    updateResourceDistribution(resources) {
        let runningVMs = 0, stoppedVMs = 0, containers = 0, storage = 0;

        resources.forEach(resource => {
            if (resource.type === 'qemu') {
                if (resource.status === 'running') runningVMs++;
                else stoppedVMs++;
            } else if (resource.type === 'lxc') {
                containers++;
            } else if (resource.type === 'storage') {
                storage++;
            }
        });

        this.charts.proxmoxResources.data.datasets[0].data = [runningVMs, stoppedVMs, containers, storage];
        this.charts.proxmoxResources.update();
    }

    updateVMStatus(resources) {
        const container = document.getElementById('vm-status');
        container.innerHTML = '';

        const vms = resources.filter(r => r.type === 'qemu' || r.type === 'lxc').slice(0, 10);

        vms.forEach(vm => {
            const vmItem = document.createElement('div');
            vmItem.className = 'vm-item';
            
            const statusClass = vm.status === 'running' ? 'running' : 'stopped';
            
            vmItem.innerHTML = `
                <div class="vm-name">${vm.name || vm.vmid}</div>
                <div class="vm-status-badge ${statusClass}">${vm.status}</div>
            `;

            container.appendChild(vmItem);
        });
    }

    async loadNextcloudHistory() {
        try {
            const response = await fetch('/api/nextcloud/history');
            const history = await response.json();
            
            if (history && history.length > 0) {
                const labels = [];
                const cpuData = [];
                const memData = [];

                history.slice(-20).forEach(item => {
                    const date = new Date(item.timestamp);
                    labels.push(date.toLocaleTimeString());
                    
                    if (item.data.ocs && item.data.ocs.data.nextcloud && item.data.ocs.data.nextcloud.system) {
                        const system = item.data.ocs.data.nextcloud.system;
                        const cpuLoad = system.cpuload ? system.cpuload[0] : 0;
                        const memUsage = system.mem_total && system.mem_free ? 
                            ((system.mem_total - system.mem_free) / system.mem_total * 100) : 0;
                        
                        cpuData.push(cpuLoad);
                        memData.push(memUsage);
                    } else {
                        cpuData.push(0);
                        memData.push(0);
                    }
                });

                this.charts.nextcloudHistory.data.labels = labels;
                this.charts.nextcloudHistory.data.datasets[0].data = cpuData;
                this.charts.nextcloudHistory.data.datasets[1].data = memData;
                this.charts.nextcloudHistory.update();
            }
        } catch (error) {
            console.error('Error loading Nextcloud history:', error);
        }
    }

    async loadProxmoxHistory() {
        try {
            const response = await fetch('/api/proxmox/history');
            const history = await response.json();
            
            if (history && history.length > 0) {
                const labels = [];
                const cpuData = [];
                const memData = [];

                history.slice(-20).forEach(item => {
                    const date = new Date(item.timestamp);
                    labels.push(date.toLocaleTimeString());
                    
                    if (item.data.cluster_resources && item.data.cluster_resources.data) {
                        let totalCpu = 0, totalMem = 0, totalMaxMem = 0, nodeCount = 0;
                        
                        item.data.cluster_resources.data.forEach(resource => {
                            if (resource.type === 'node') {
                                totalCpu += resource.cpu || 0;
                                totalMem += resource.mem || 0;
                                totalMaxMem += resource.maxmem || 0;
                                nodeCount++;
                            }
                        });

                        const avgCpu = nodeCount > 0 ? (totalCpu / nodeCount) * 100 : 0;
                        const avgMem = totalMaxMem > 0 ? (totalMem / totalMaxMem) * 100 : 0;
                        
                        cpuData.push(avgCpu);
                        memData.push(avgMem);
                    } else {
                        cpuData.push(0);
                        memData.push(0);
                    }
                });

                this.charts.proxmoxHistory.data.labels = labels;
                this.charts.proxmoxHistory.data.datasets[0].data = cpuData;
                this.charts.proxmoxHistory.data.datasets[1].data = memData;
                this.charts.proxmoxHistory.update();
            }
        } catch (error) {
            console.error('Error loading Proxmox history:', error);
        }
    }

    updateServiceStatus(service, isOnline) {
        const statusElement = document.getElementById(`${service}-status`);
        const dot = statusElement.querySelector('.status-dot');
        
        if (isOnline) {
            dot.classList.remove('offline');
            dot.classList.add('online');
        } else {
            dot.classList.remove('online');
            dot.classList.add('offline');
        }
    }

    updateConnectionStatus(isConnected) {
        // Update connection indicators
    }

    updateLastUpdateTime(timestamp) {
        const date = new Date(timestamp);
        document.getElementById('last-update-time').textContent = date.toLocaleTimeString();
    }

    refreshData() {
        // Trigger a manual refresh
        this.socket.emit('refresh-request');
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    formatUptime(seconds) {
        if (!seconds) return '-';
        
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        
        return `${days}d ${hours}h ${minutes}m`;
    }

    showError(message) {
        // Show error notification
        console.error('Dashboard error:', message);
    }

    async loadProxmoxDetails() {
        try {
            const response = await fetch('/api/proxmox/detailed');
            const detailedData = await response.json();
            
            if (detailedData && !detailedData.error) {
                this.updateStorageOverview(detailedData.storage);
                this.updateDetailedNodes(detailedData.nodes);
                this.updateDetailedVMs(detailedData.vms, detailedData.containers);
            }
        } catch (error) {
            console.error('Error loading Proxmox details:', error);
        }
    }

    updateStorageOverview(storageData) {
        const container = document.getElementById('storage-overview');
        container.innerHTML = '';

        if (!storageData || storageData.length === 0) {
            container.innerHTML = '<div class="no-data">No storage data available</div>';
            return;
        }

        storageData.forEach(storage => {
            const storageItem = document.createElement('div');
            storageItem.className = 'storage-item';
            
            const usedPercent = storage.maxdisk && storage.disk ? 
                ((storage.disk / storage.maxdisk) * 100).toFixed(1) : 0;
            
            const usedGB = storage.disk ? (storage.disk / (1024**3)).toFixed(1) : 0;
            const totalGB = storage.maxdisk ? (storage.maxdisk / (1024**3)).toFixed(1) : 0;

            storageItem.innerHTML = `
                <div class="storage-header">
                    <div class="storage-name">${storage.storage || storage.id || 'Unknown'}</div>
                    <div class="storage-type">${storage.type || 'unknown'}</div>
                </div>
                <div class="storage-usage">
                    <div class="storage-bar">
                        <div class="storage-fill" style="width: ${usedPercent}%"></div>
                    </div>
                    <div class="storage-details">
                        <span>${usedGB} GB used</span>
                        <span>${totalGB} GB total</span>
                    </div>
                </div>
                <div class="storage-status">
                    <small>Node: ${storage.node || 'N/A'}</small>
                </div>
            `;

            container.appendChild(storageItem);
        });
    }

    updateDetailedNodes(nodesData) {
        const container = document.getElementById('detailed-nodes-content');
        container.innerHTML = '';

        if (!nodesData || nodesData.length === 0) {
            container.innerHTML = '<div class="no-data">No node data available</div>';
            return;
        }

        nodesData.forEach(node => {
            const nodeCard = document.createElement('div');
            nodeCard.className = 'detailed-node-card';
            
            const statusClass = node.status === 'online' ? 'online' : 'offline';
            const cpuPercent = node.cpu ? (node.cpu * 100).toFixed(1) : '0';
            const memPercent = node.mem && node.maxmem ? 
                ((node.mem / node.maxmem) * 100).toFixed(1) : '0';
            const diskPercent = node.disk && node.maxdisk ? 
                ((node.disk / node.maxdisk) * 100).toFixed(1) : '0';

            // サービス情報を取得
            let servicesHtml = '';
            if (node.details && node.details.services && node.details.services.data) {
                const services = node.details.services.data.slice(0, 10); // 最初の10サービスのみ表示
                servicesHtml = services.map(service => {
                    const statusClass = service.state === 'running' ? 'running' : 'stopped';
                    return `<span class="service-item ${statusClass}">${service.service}</span>`;
                }).join('');
            }

            nodeCard.innerHTML = `
                <div class="detailed-node-header">
                    <div class="detailed-node-name">${node.node}</div>
                    <div class="node-status ${statusClass}"></div>
                </div>
                <div class="detailed-node-metrics">
                    <div class="detailed-metric">
                        <div class="detailed-metric-value">${cpuPercent}%</div>
                        <div class="detailed-metric-label">CPU</div>
                    </div>
                    <div class="detailed-metric">
                        <div class="detailed-metric-value">${memPercent}%</div>
                        <div class="detailed-metric-label">Memory</div>
                    </div>
                    <div class="detailed-metric">
                        <div class="detailed-metric-value">${diskPercent}%</div>
                        <div class="detailed-metric-label">Disk</div>
                    </div>
                    <div class="detailed-metric">
                        <div class="detailed-metric-value">${this.formatUptime(node.uptime)}</div>
                        <div class="detailed-metric-label">Uptime</div>
                    </div>
                </div>
                ${servicesHtml ? `
                    <div class="detailed-node-services">
                        <h4>Services</h4>
                        <div class="service-list">${servicesHtml}</div>
                    </div>
                ` : ''}
            `;

            container.appendChild(nodeCard);
        });
    }

    updateDetailedVMs(vmsData, containersData) {
        const container = document.getElementById('detailed-vms-content');
        container.innerHTML = '';

        const allVMs = [...(vmsData || []), ...(containersData || [])];

        if (allVMs.length === 0) {
            container.innerHTML = '<div class="no-data">No VM/Container data available</div>';
            return;
        }

        allVMs.forEach(vm => {
            const vmCard = document.createElement('div');
            vmCard.className = 'detailed-vm-card';
            
            const statusClass = vm.status === 'running' ? 'running' : 'stopped';
            const typeClass = vm.type === 'qemu' ? 'qemu' : 'lxc';
            const cpuPercent = vm.cpu ? (vm.cpu * 100).toFixed(1) : '0';
            const memPercent = vm.mem && vm.maxmem ? 
                ((vm.mem / vm.maxmem) * 100).toFixed(1) : '0';
            const diskPercent = vm.disk && vm.maxdisk ? 
                ((vm.disk / vm.maxdisk) * 100).toFixed(1) : '0';

            vmCard.innerHTML = `
                <div class="detailed-vm-header">
                    <div class="detailed-vm-name">${vm.name || vm.vmid}</div>
                    <div class="detailed-vm-type ${typeClass}">${vm.type}</div>
                </div>
                <div class="vm-status-badge ${statusClass}">${vm.status}</div>
                <div class="detailed-vm-specs">
                    <div class="detailed-vm-spec">
                        <div>CPU: ${cpuPercent}%</div>
                    </div>
                    <div class="detailed-vm-spec">
                        <div>RAM: ${memPercent}%</div>
                    </div>
                    <div class="detailed-vm-spec">
                        <div>Disk: ${diskPercent}%</div>
                    </div>
                </div>
                <div class="vm-node-info">
                    <small>Node: ${vm.node || 'N/A'} | ID: ${vm.vmid || 'N/A'}</small>
                </div>
            `;

            container.appendChild(vmCard);
        });
    }
}

// Global functions
function refreshNextcloud() {
    dashboard.refreshData();
}

function refreshProxmox() {
    dashboard.refreshData();
    if (dashboard.detailedMode) {
        dashboard.loadProxmoxDetails();
    }
}

function toggleDetailedView() {
    dashboard.detailedMode = !dashboard.detailedMode;
    const detailedSections = document.querySelectorAll('.detailed-section');
    const toggleText = document.getElementById('detail-toggle-text');
    
    if (dashboard.detailedMode) {
        detailedSections.forEach(section => section.style.display = 'block');
        toggleText.textContent = 'Hide Details';
        dashboard.loadProxmoxDetails();
    } else {
        detailedSections.forEach(section => section.style.display = 'none');
        toggleText.textContent = 'Show Details';
    }
}

// Initialize dashboard when page loads
let dashboard;
document.addEventListener('DOMContentLoaded', () => {
    dashboard = new MonitoringDashboard();
});
