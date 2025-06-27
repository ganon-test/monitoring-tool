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
        this.currentView = 'nextcloud'; // Default view
        
        this.initializeCharts();
        this.setupSocketListeners();
        this.setupEventListeners();
        this.initializeViewToggle();
    }

    initializeViewToggle() {
        // Show default view (Nextcloud) and hide Proxmox
        this.switchView('nextcloud');
    }

    switchView(view) {
        this.currentView = view;
        
        // Get sections
        const nextcloudSection = document.querySelector('.nextcloud-section');
        const proxmoxSection = document.querySelector('.proxmox-section');
        
        // Get toggle buttons
        const nextcloudToggle = document.getElementById('nextcloud-toggle');
        const proxmoxToggle = document.getElementById('proxmox-toggle');
        
        if (view === 'nextcloud') {
            // Show Nextcloud, hide Proxmox
            nextcloudSection.style.display = 'block';
            proxmoxSection.style.display = 'none';
            
            // Update button states
            nextcloudToggle.classList.add('active');
            proxmoxToggle.classList.remove('active');
        } else if (view === 'proxmox') {
            // Show Proxmox, hide Nextcloud
            nextcloudSection.style.display = 'none';
            proxmoxSection.style.display = 'block';
            
            // Update button states
            nextcloudToggle.classList.remove('active');
            proxmoxToggle.classList.add('active');
        }
        
        // Update charts if needed
        setTimeout(() => {
            this.resizeCharts();
        }, 100);
    }

    resizeCharts() {
        // Resize all charts to fit the new layout
        Object.values(this.charts).forEach(chart => {
            if (chart && typeof chart.resize === 'function') {
                chart.resize();
            }
        });
    }

    initializeCharts() {
        // Nextcloud Charts
        this.initializeNextcloudCharts();
        
        // Proxmox Charts
        this.initializeProxmoxCharts();
    }

    initializeNextcloudCharts() {
        // Memory Gauge Chart
        const memoryCtx = document.getElementById('memory-gauge');
        if (memoryCtx) {
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
        }

        // CPU Load Chart
        const cpuLoadCtx = document.getElementById('cpu-load-chart');
        if (cpuLoadCtx) {
            this.charts.cpuLoad = new Chart(cpuLoadCtx, {
                type: 'line',
                data: {
                    labels: Array(20).fill(''),
                    datasets: [{
                        label: 'CPU Load',
                        data: Array(20).fill(0),
                        borderColor: '#00d4ff',
                        backgroundColor: 'rgba(0, 212, 255, 0.1)',
                        tension: 0.4,
                        fill: true,
                        pointRadius: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: { display: false },
                        y: { 
                            beginAtZero: true,
                            display: false
                        }
                    },
                    plugins: {
                        legend: { display: false },
                        tooltip: { enabled: false }
                    }
                }
            });
        }

        // Storage Donut Chart
        const storageDonutCtx = document.getElementById('storage-donut-chart');
        if (storageDonutCtx) {
            this.charts.storageDonut = new Chart(storageDonutCtx, {
                type: 'doughnut',
                data: {
                    datasets: [{
                        data: [0, 100],
                        backgroundColor: ['#10b981', 'rgba(255, 255, 255, 0.1)'],
                        borderWidth: 0,
                        cutout: '75%'
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
        }

        // Users Timeline Chart
        const usersTimelineCtx = document.getElementById('users-timeline-chart');
        if (usersTimelineCtx) {
            this.charts.usersTimeline = new Chart(usersTimelineCtx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Active Users',
                        data: [],
                        borderColor: '#8b5cf6',
                        backgroundColor: 'rgba(139, 92, 246, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
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
                            ticks: { color: '#b0b0b0' },
                            beginAtZero: true
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

        // File Distribution Chart
        const fileDistributionCtx = document.getElementById('file-distribution-chart');
        if (fileDistributionCtx) {
            this.charts.fileDistribution = new Chart(fileDistributionCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Documents', 'Images', 'Videos', 'Other'],
                    datasets: [{
                        data: [30, 25, 20, 25],
                        backgroundColor: ['#00d4ff', '#8b5cf6', '#10b981', '#f97316'],
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
        }

        // Shares Chart
        const sharesCtx = document.getElementById('shares-chart');
        if (sharesCtx) {
            this.charts.shares = new Chart(sharesCtx, {
                type: 'bar',
                data: {
                    labels: ['Public Links', 'User Shares', 'Group Shares', 'Federated'],
                    datasets: [{
                        label: 'Active Shares',
                        data: [0, 0, 0, 0],
                        backgroundColor: ['#00d4ff', '#8b5cf6', '#10b981', '#f97316'],
                        borderWidth: 1
                    }]
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
                            ticks: { color: '#b0b0b0' },
                            beginAtZero: true
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

        // Nextcloud History Chart
        const ncHistoryCtx = document.getElementById('nextcloud-history-chart');
        if (ncHistoryCtx) {
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
        }

        // Initialize Proxmox Resource Chart here too
        const proxmoxResourcesCtx = document.getElementById('proxmox-resources-chart');
        if (proxmoxResourcesCtx) {
            this.charts.proxmoxResources = new Chart(proxmoxResourcesCtx, {
                type: 'pie',
                data: {
                    labels: ['Running VMs', 'Stopped VMs', 'Containers', 'Available'],
                    datasets: [{
                        data: [0, 0, 0, 100],
                        backgroundColor: [
                            '#10b981',
                            '#ef4444',
                            '#f59e0b',
                            'rgba(255, 255, 255, 0.1)'
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
        }

        // Proxmox History Chart
        const proxmoxHistoryCtx = document.getElementById('proxmox-history-chart');
        if (proxmoxHistoryCtx) {
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
    }

    initializeProxmoxCharts() {
        // Cluster CPU Gauge
        const clusterCpuCtx = document.getElementById('cluster-cpu-gauge');
        if (clusterCpuCtx) {
            this.charts.clusterCpuGauge = new Chart(clusterCpuCtx, {
                type: 'doughnut',
                data: {
                    datasets: [{
                        data: [0, 100],
                        backgroundColor: ['#f97316', 'rgba(255, 255, 255, 0.1)'],
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
        }

        // Cluster Memory Gauge
        const clusterMemoryCtx = document.getElementById('cluster-memory-gauge');
        if (clusterMemoryCtx) {
            this.charts.clusterMemoryGauge = new Chart(clusterMemoryCtx, {
                type: 'doughnut',
                data: {
                    datasets: [{
                        data: [0, 100],
                        backgroundColor: ['#8b5cf6', 'rgba(255, 255, 255, 0.1)'],
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
        }

        // Cluster Storage Gauge
        const clusterStorageCtx = document.getElementById('cluster-storage-gauge');
        if (clusterStorageCtx) {
            this.charts.clusterStorageGauge = new Chart(clusterStorageCtx, {
                type: 'doughnut',
                data: {
                    datasets: [{
                        data: [0, 100],
                        backgroundColor: ['#10b981', 'rgba(255, 255, 255, 0.1)'],
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
        }

        // Node Performance Chart
        const nodePerformanceCtx = document.getElementById('node-performance-chart');
        if (nodePerformanceCtx) {
            this.charts.nodePerformance = new Chart(nodePerformanceCtx, {
                type: 'bar',
                data: {
                    labels: [],
                    datasets: [
                        {
                            label: 'CPU Usage (%)',
                            data: [],
                            backgroundColor: 'rgba(249, 115, 22, 0.7)',
                            borderColor: '#f97316',
                            borderWidth: 1
                        },
                        {
                            label: 'Memory Usage (%)',
                            data: [],
                            backgroundColor: 'rgba(139, 92, 246, 0.7)',
                            borderColor: '#8b5cf6',
                            borderWidth: 1
                        },
                        {
                            label: 'Storage Usage (%)',
                            data: [],
                            backgroundColor: 'rgba(16, 185, 129, 0.7)',
                            borderColor: '#10b981',
                            borderWidth: 1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top',
                            labels: { color: '#ffffff' }
                        }
                    },
                    scales: {
                        x: {
                            ticks: { color: '#b0b0b0' },
                            grid: { color: 'rgba(255, 255, 255, 0.1)' }
                        },
                        y: {
                            beginAtZero: true,
                            max: 100,
                            ticks: { 
                                color: '#b0b0b0',
                                callback: function(value) {
                                    return value + '%';
                                }
                            },
                            grid: { color: 'rgba(255, 255, 255, 0.1)' }
                        }
                    }
                }
            });
        }

        // Network Mini Chart
        const networkMiniCtx = document.getElementById('network-mini-chart');
        if (networkMiniCtx) {
            this.charts.networkMini = new Chart(networkMiniCtx, {
                type: 'line',
                data: {
                    labels: Array(20).fill(''),
                    datasets: [
                        {
                            label: 'RX',
                            data: Array(20).fill(0),
                            borderColor: '#00d4ff',
                            backgroundColor: 'rgba(0, 212, 255, 0.1)',
                            fill: true,
                            tension: 0.4,
                            pointRadius: 0,
                            borderWidth: 2
                        },
                        {
                            label: 'TX',
                            data: Array(20).fill(0),
                            borderColor: '#f97316',
                            backgroundColor: 'rgba(249, 115, 22, 0.1)',
                            fill: true,
                            tension: 0.4,
                            pointRadius: 0,
                            borderWidth: 2
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: { enabled: false }
                    },
                    scales: {
                        x: { display: false },
                        y: { 
                            display: false,
                            beginAtZero: true
                        }
                    },
                    elements: {
                        point: { radius: 0 }
                    }
                }
            });
        }
    }

    setupSocketListeners() {
        this.socket.on('data-update', (data) => {
            console.log('Received data update:', data);
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
        // Auto-refresh every 10 seconds
        setInterval(() => {
            this.refreshData();
        }, 10000);
    }

    updateNextcloudData(response) {
        console.log('Updating Nextcloud data:', response);
        // 新しいレスポンス形式に対応
        const data = response.data || response;
        
        if (data.error || response.error) {
            console.error('Nextcloud error:', data.error || response.error);
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

    updateProxmoxData(response) {
        console.log('Updating Proxmox data:', response);
        // 新しいレスポンス形式に対応
        const data = response.data || response;
        
        if (data.error || response.error) {
            console.error('Proxmox error:', data.error || response.error);
            this.updateServiceStatus('proxmox', false);
            return;
        }

        this.updateServiceStatus('proxmox', true);

        // Update cluster nodes
        if (data.nodes) {
            console.log('Updating cluster nodes:', data.nodes);
            this.updateClusterNodes(data.nodes);
        }

        // Update new Proxmox charts and metrics
        this.updateProxmoxGauges(data);
        this.updateVMStatistics(data);
        this.updateNodePerformanceChart(data);
        this.updateNetworkStatistics(data);
        this.updateClusterHealth(data);
        this.updateHardwareMonitoring(data);

        // Update resource distribution - 新しい形式に対応
        if (data.nodes && data.vms && data.containers) {
            console.log('Updating resource distribution');
            this.updateResourceDistributionNew(data);
        }

        // Update VM status - 新しい形式に対応
        if (data.vms && data.containers) {
            console.log('Updating VM status');
            this.updateVMStatusNew(data.vms, data.containers);
        }

        // Load historical data
        this.loadProxmoxHistory();
    }

    updateClusterNodes(nodes) {
        const container = document.getElementById('cluster-nodes');
        container.innerHTML = '';

        nodes.forEach(node => {
            const nodeCard = document.createElement('div');
            nodeCard.className = 'node-card';
            
            const statusClass = node.status === 'online' ? 'online' : 'offline';
            const cpuPercent = node.cpu ? (node.cpu * 100).toFixed(1) : '0';
            
            // 新しいメモリ形式に対応
            let memPercent = '0';
            if (node.memory && node.memory.percentage) {
                memPercent = node.memory.percentage.toFixed(1);
            } else if (node.mem && node.maxmem) {
                memPercent = ((node.mem / node.maxmem) * 100).toFixed(1);
            }

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

    updateResourceDistributionNew(data) {
        const runningVMs = data.vms.filter(vm => vm.status === 'running').length;
        const stoppedVMs = data.vms.filter(vm => vm.status === 'stopped').length;
        const containers = data.containers.length;
        const storage = 0; // ストレージ情報は基本APIでは含まれない

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

    updateVMStatusNew(vms, containers) {
        const container = document.getElementById('vm-status');
        container.innerHTML = '';

        const allVMs = [...vms, ...containers].slice(0, 10);

        allVMs.forEach(vm => {
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
            const historyResponse = await response.json();
            
            // 新しいレスポンス形式に対応
            const history = historyResponse.data || historyResponse;
            
            if (history && history.length > 0) {
                const labels = [];
                const cpuData = [];
                const memData = [];

                history.slice(-20).forEach(item => {
                    const date = new Date(item.timestamp);
                    labels.push(date.toLocaleTimeString());
                    
                    const data = item.data;
                    if (data.ocs && data.ocs.data.nextcloud && data.ocs.data.nextcloud.system) {
                        const system = data.ocs.data.nextcloud.system;
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
            const historyResponse = await response.json();
            
            // 新しいレスポンス形式に対応
            const history = historyResponse.data || historyResponse;
            
            if (history && history.length > 0) {
                const labels = [];
                const cpuData = [];
                const memData = [];

                history.slice(-20).forEach(item => {
                    const date = new Date(item.timestamp);
                    labels.push(date.toLocaleTimeString());
                    
                    const data = item.data;
                    if (data.nodes && data.nodes.length > 0) {
                        let totalCpu = 0, totalMem = 0, totalMaxMem = 0, nodeCount = 0;
                        
                        data.nodes.forEach(node => {
                            totalCpu += node.cpu || 0;
                            if (node.memory && node.memory.used && node.memory.total) {
                                totalMem += node.memory.used;
                                totalMaxMem += node.memory.total;
                            }
                            nodeCount++;
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
        console.log('Manual refresh triggered');
        // Trigger a manual refresh
        this.socket.emit('refresh-request');
        
        // Also fetch data directly
        this.fetchDataDirectly();
    }

    async fetchDataDirectly() {
        try {
            console.log('Fetching data directly from APIs...');
            const [nextcloudResponse, proxmoxResponse] = await Promise.all([
                fetch('/api/nextcloud').catch(() => ({ json: () => ({ error: 'Nextcloud unavailable' }) })),
                fetch('/api/proxmox').catch(() => ({ json: () => ({ error: 'Proxmox unavailable' }) }))
            ]);

            const nextcloudData = await nextcloudResponse.json();
            const proxmoxData = await proxmoxResponse.json();

            console.log('Direct fetch - Nextcloud:', nextcloudData);
            console.log('Direct fetch - Proxmox:', proxmoxData);

            this.updateNextcloudData(nextcloudData);
            this.updateProxmoxData(proxmoxData);
            this.updateLastUpdateTime(new Date().toISOString());
        } catch (error) {
            console.error('Error in direct fetch:', error);
        }
    }

    updateNextcloudCharts(data) {
        // Update CPU Load Chart
        if (this.charts.cpuLoad && data.system) {
            const cpuValue = parseFloat(data.system.load || 0);
            this.charts.cpuLoad.data.datasets[0].data.shift();
            this.charts.cpuLoad.data.datasets[0].data.push(cpuValue);
            this.charts.cpuLoad.update('none');
        }

        // Update Storage Donut Chart
        if (this.charts.storageDonut && data.system && data.system.disk) {
            const used = parseFloat(data.system.disk.used) || 0;
            const total = parseFloat(data.system.disk.total) || 1;
            const usedPercent = Math.round((used / total) * 100);
            
            this.charts.storageDonut.data.datasets[0].data = [usedPercent, 100 - usedPercent];
            this.charts.storageDonut.update('none');
            
            // Update center label
            this.updateElement('storage-percent-label', `${usedPercent}%`);
        }

        // Update Users Timeline Chart
        if (this.charts.usersTimeline && data.stats) {
            const activeUsers = parseInt(data.stats.active_users) || 0;
            
            // Add new data point
            const now = new Date();
            const timeLabel = now.getHours() + ':' + String(now.getMinutes()).padStart(2, '0');
            
            if (this.charts.usersTimeline.data.labels.length >= 20) {
                this.charts.usersTimeline.data.labels.shift();
                this.charts.usersTimeline.data.datasets[0].data.shift();
            }
            
            this.charts.usersTimeline.data.labels.push(timeLabel);
            this.charts.usersTimeline.data.datasets[0].data.push(activeUsers);
            this.charts.usersTimeline.update('none');
        }

        // Update PHP Performance Meters
        this.updatePHPPerformanceMeters(data);

        // Update Shares Chart
        if (this.charts.shares && data.stats) {
            const sharesData = [
                parseInt(data.stats.shares || 0),
                parseInt(data.stats.user_shares || 0),
                parseInt(data.stats.group_shares || 0),
                parseInt(data.stats.federated_shares || 0)
            ];
            
            this.charts.shares.data.datasets[0].data = sharesData;
            this.charts.shares.update('none');
        }

        // Update Database Metrics
        this.updateDatabaseMetrics(data);
    }

    updatePHPPerformanceMeters(data) {
        // OPcache Hit Rate
        const opcacheHitRate = data.php && data.php.opcache_hit_rate ? 
            parseFloat(data.php.opcache_hit_rate) : Math.random() * 30 + 70; // Simulate 70-100%
        this.updateCircularProgress('opcache', opcacheHitRate);

        // PHP Memory Usage
        const phpMemoryUsage = data.php && data.php.memory_usage_percent ? 
            parseFloat(data.php.memory_usage_percent) : Math.random() * 40 + 20; // Simulate 20-60%
        this.updateCircularProgress('php-memory', phpMemoryUsage);

        // Cache Efficiency
        const cacheEfficiency = data.cache && data.cache.efficiency ? 
            parseFloat(data.cache.efficiency) : Math.random() * 20 + 80; // Simulate 80-100%
        this.updateCircularProgress('cache', cacheEfficiency);
    }

    updateCircularProgress(id, percentage) {
        const circle = document.getElementById(`${id}-circle`);
        const percentageElement = document.getElementById(`${id}-percentage`);
        
        if (circle && percentageElement) {
            const circumference = 2 * Math.PI * 40; // radius = 40
            const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
            
            circle.style.strokeDasharray = strokeDasharray;
            circle.style.transform = 'rotate(-90deg)';
            circle.style.transformOrigin = '50% 50%';
            
            percentageElement.textContent = `${Math.round(percentage)}%`;
        }
    }

    updateDatabaseMetrics(data) {
        // Database Size
        const dbSize = data.database && data.database.size ? 
            parseFloat(data.database.size) : Math.random() * 200 + 50; // Simulate 50-250 MB
        
        this.updateElement('db-size-value', `${Math.round(dbSize)} MB`);
        
        const dbProgress = document.getElementById('db-size-progress');
        if (dbProgress) {
            const maxSize = 500; // MB
            const progressPercent = Math.min((dbSize / maxSize) * 100, 100);
            dbProgress.style.width = `${progressPercent}%`;
        }

        // Database Status
        const dbStatus = data.database && data.database.connected !== undefined ? 
            data.database.connected : true;
        
        const statusElement = document.getElementById('db-status');
        if (statusElement) {
            const dot = statusElement.querySelector('.status-dot');
            const text = statusElement.querySelector('span');
            
            if (dbStatus) {
                dot.className = 'status-dot online';
                text.textContent = 'MySQL Connected';
            } else {
                dot.className = 'status-dot offline';
                text.textContent = 'MySQL Disconnected';
            }
        }
    }

    setupEventListeners() {
        // Auto-refresh every 10 seconds
        setInterval(() => {
            this.refreshData();
        }, 10000);
    }

    updateNextcloudData(response) {
        console.log('Updating Nextcloud data:', response);
        // 新しいレスポンス形式に対応
        const data = response.data || response;
        
        if (data.error || response.error) {
            console.error('Nextcloud error:', data.error || response.error);
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

    updateProxmoxData(response) {
        console.log('Updating Proxmox data:', response);
        // 新しいレスポンス形式に対応
        const data = response.data || response;
        
        if (data.error || response.error) {
            console.error('Proxmox error:', data.error || response.error);
            this.updateServiceStatus('proxmox', false);
            return;
        }

        this.updateServiceStatus('proxmox', true);

        // Update cluster nodes
        if (data.nodes) {
            console.log('Updating cluster nodes:', data.nodes);
            this.updateClusterNodes(data.nodes);
        }

        // Update new Proxmox charts and metrics
        this.updateProxmoxGauges(data);
        this.updateVMStatistics(data);
        this.updateNodePerformanceChart(data);
        this.updateNetworkStatistics(data);
        this.updateClusterHealth(data);
        this.updateHardwareMonitoring(data);

        // Update resource distribution - 新しい形式に対応
        if (data.nodes && data.vms && data.containers) {
            console.log('Updating resource distribution');
            this.updateResourceDistributionNew(data);
        }

        // Update VM status - 新しい形式に対応
        if (data.vms && data.containers) {
            console.log('Updating VM status');
            this.updateVMStatusNew(data.vms, data.containers);
        }

        // Load historical data
        this.loadProxmoxHistory();
    }

    updateClusterNodes(nodes) {
        const container = document.getElementById('cluster-nodes');
        container.innerHTML = '';

        nodes.forEach(node => {
            const nodeCard = document.createElement('div');
            nodeCard.className = 'node-card';
            
            const statusClass = node.status === 'online' ? 'online' : 'offline';
            const cpuPercent = node.cpu ? (node.cpu * 100).toFixed(1) : '0';
            
            // 新しいメモリ形式に対応
            let memPercent = '0';
            if (node.memory && node.memory.percentage) {
                memPercent = node.memory.percentage.toFixed(1);
            } else if (node.mem && node.maxmem) {
                memPercent = ((node.mem / node.maxmem) * 100).toFixed(1);
            }

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

    updateResourceDistributionNew(data) {
        const runningVMs = data.vms.filter(vm => vm.status === 'running').length;
        const stoppedVMs = data.vms.filter(vm => vm.status === 'stopped').length;
        const containers = data.containers.length;
        const storage = 0; // ストレージ情報は基本APIでは含まれない

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

    updateVMStatusNew(vms, containers) {
        const container = document.getElementById('vm-status');
        container.innerHTML = '';

        const allVMs = [...vms, ...containers].slice(0, 10);

        allVMs.forEach(vm => {
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
            const historyResponse = await response.json();
            
            // 新しいレスポンス形式に対応
            const history = historyResponse.data || historyResponse;
            
            if (history && history.length > 0) {
                const labels = [];
                const cpuData = [];
                const memData = [];

                history.slice(-20).forEach(item => {
                    const date = new Date(item.timestamp);
                    labels.push(date.toLocaleTimeString());
                    
                    const data = item.data;
                    if (data.ocs && data.ocs.data.nextcloud && data.ocs.data.nextcloud.system) {
                        const system = data.ocs.data.nextcloud.system;
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
            const historyResponse = await response.json();
            
            // 新しいレスポンス形式に対応
            const history = historyResponse.data || historyResponse;
            
            if (history && history.length > 0) {
                const labels = [];
                const cpuData = [];
                const memData = [];

                history.slice(-20).forEach(item => {
                    const date = new Date(item.timestamp);
                    labels.push(date.toLocaleTimeString());
                    
                    const data = item.data;
                    if (data.nodes && data.nodes.length > 0) {
                        let totalCpu = 0, totalMem = 0, totalMaxMem = 0, nodeCount = 0;
                        
                        data.nodes.forEach(node => {
                            totalCpu += node.cpu || 0;
                            if (node.memory && node.memory.used && node.memory.total) {
                                totalMem += node.memory.used;
                                totalMaxMem += node.memory.total;
                            }
                            nodeCount++;
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
        console.log('Manual refresh triggered');
        // Trigger a manual refresh
        this.socket.emit('refresh-request');
        
        // Also fetch data directly
        this.fetchDataDirectly();
    }

    async fetchDataDirectly() {
        try {
            console.log('Fetching data directly from APIs...');
            const [nextcloudResponse, proxmoxResponse] = await Promise.all([
                fetch('/api/nextcloud').catch(() => ({ json: () => ({ error: 'Nextcloud unavailable' }) })),
                fetch('/api/proxmox').catch(() => ({ json: () => ({ error: 'Proxmox unavailable' }) }))
            ]);

            const nextcloudData = await nextcloudResponse.json();
            const proxmoxData = await proxmoxResponse.json();

            console.log('Direct fetch - Nextcloud:', nextcloudData);
            console.log('Direct fetch - Proxmox:', proxmoxData);

            this.updateNextcloudData(nextcloudData);
            this.updateProxmoxData(proxmoxData);
            this.updateLastUpdateTime(new Date().toISOString());
        } catch (error) {
            console.error('Error in direct fetch:', error);
        }
    }

    updateNextcloudCharts(data) {
        // Update CPU Load Chart
        if (this.charts.cpuLoad && data.system) {
            const cpuValue = parseFloat(data.system.load || 0);
            this.charts.cpuLoad.data.datasets[0].data.shift();
            this.charts.cpuLoad.data.datasets[0].data.push(cpuValue);
            this.charts.cpuLoad.update('none');
        }

        // Update Storage Donut Chart
        if (this.charts.storageDonut && data.system && data.system.disk) {
            const used = parseFloat(data.system.disk.used) || 0;
            const total = parseFloat(data.system.disk.total) || 1;
            const usedPercent = Math.round((used / total) * 100);
            
            this.charts.storageDonut.data.datasets[0].data = [usedPercent, 100 - usedPercent];
            this.charts.storageDonut.update('none');
            
            // Update center label
            this.updateElement('storage-percent-label', `${usedPercent}%`);
        }

        // Update Users Timeline Chart
        if (this.charts.usersTimeline && data.stats) {
            const activeUsers = parseInt(data.stats.active_users) || 0;
            
            // Add new data point
            const now = new Date();
            const timeLabel = now.getHours() + ':' + String(now.getMinutes()).padStart(2, '0');
            
            if (this.charts.usersTimeline.data.labels.length >= 20) {
                this.charts.usersTimeline.data.labels.shift();
                this.charts.usersTimeline.data.datasets[0].data.shift();
            }
            
            this.charts.usersTimeline.data.labels.push(timeLabel);
            this.charts.usersTimeline.data.datasets[0].data.push(activeUsers);
            this.charts.usersTimeline.update('none');
        }

        // Update PHP Performance Meters
        this.updatePHPPerformanceMeters(data);

        // Update Shares Chart
        if (this.charts.shares && data.stats) {
            const sharesData = [
                parseInt(data.stats.shares || 0),
                parseInt(data.stats.user_shares || 0),
                parseInt(data.stats.group_shares || 0),
                parseInt(data.stats.federated_shares || 0)
            ];
            
            this.charts.shares.data.datasets[0].data = sharesData;
            this.charts.shares.update('none');
        }

        // Update Database Metrics
        this.updateDatabaseMetrics(data);
    }

    updatePHPPerformanceMeters(data) {
        // OPcache Hit Rate
        const opcacheHitRate = data.php && data.php.opcache_hit_rate ? 
            parseFloat(data.php.opcache_hit_rate) : Math.random() * 30 + 70; // Simulate 70-100%
        this.updateCircularProgress('opcache', opcacheHitRate);

        // PHP Memory Usage
        const phpMemoryUsage = data.php && data.php.memory_usage_percent ? 
            parseFloat(data.php.memory_usage_percent) : Math.random() * 40 + 20; // Simulate 20-60%
        this.updateCircularProgress('php-memory', phpMemoryUsage);

        // Cache Efficiency
        const cacheEfficiency = data.cache && data.cache.efficiency ? 
            parseFloat(data.cache.efficiency) : Math.random() * 20 + 80; // Simulate 80-100%
        this.updateCircularProgress('cache', cacheEfficiency);
    }

    updateCircularProgress(id, percentage) {
        const circle = document.getElementById(`${id}-circle`);
        const percentageElement = document.getElementById(`${id}-percentage`);
        
        if (circle && percentageElement) {
            const circumference = 2 * Math.PI * 40; // radius = 40
            const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
            
            circle.style.strokeDasharray = strokeDasharray;
            circle.style.transform = 'rotate(-90deg)';
            circle.style.transformOrigin = '50% 50%';
            
            percentageElement.textContent = `${Math.round(percentage)}%`;
        }
    }

    updateDatabaseMetrics(data) {
        // Database Size
        const dbSize = data.database && data.database.size ? 
            parseFloat(data.database.size) : Math.random() * 200 + 50; // Simulate 50-250 MB
        
        this.updateElement('db-size-value', `${Math.round(dbSize)} MB`);
        
        const dbProgress = document.getElementById('db-size-progress');
        if (dbProgress) {
            const maxSize = 500; // MB
            const progressPercent = Math.min((dbSize / maxSize) * 100, 100);
            dbProgress.style.width = `${progressPercent}%`;
        }

        // Database Status
        const dbStatus = data.database && data.database.connected !== undefined ? 
            data.database.connected : true;
        
        const statusElement = document.getElementById('db-status');
        if (statusElement) {
            const dot = statusElement.querySelector('.status-dot');
            const text = statusElement.querySelector('span');
            
            if (dbStatus) {
                dot.className = 'status-dot online';
                text.textContent = 'MySQL Connected';
            } else {
                dot.className = 'status-dot offline';
                text.textContent = 'MySQL Disconnected';
            }
        }
    }

    setupEventListeners() {
        // Auto-refresh every 10 seconds
        setInterval(() => {
            this.refreshData();
        }, 10000);
    }

    updateNextcloudData(response) {
        console.log('Updating Nextcloud data:', response);
        // 新しいレスポンス形式に対応
        const data = response.data || response;
        
        if (data.error || response.error) {
            console.error('Nextcloud error:', data.error || response.error);
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

    updateProxmoxData(response) {
        console.log('Updating Proxmox data:', response);
        // 新しいレスポンス形式に対応
        const data = response.data || response;
        
        if (data.error || response.error) {
            console.error('Proxmox error:', data.error || response.error);
            this.updateServiceStatus('proxmox', false);
            return;
        }

        this.updateServiceStatus('proxmox', true);

        // Update cluster nodes
        if (data.nodes) {
            console.log('Updating cluster nodes:', data.nodes);
            this.updateClusterNodes(data.nodes);
        }

        // Update new Proxmox charts and metrics
        this.updateProxmoxGauges(data);
        this.updateVMStatistics(data);
        this.updateNodePerformanceChart(data);
        this.updateNetworkStatistics(data);
        this.updateClusterHealth(data);
        this.updateHardwareMonitoring(data);

        // Update resource distribution - 新しい形式に対応
        if (data.nodes && data.vms && data.containers) {
            console.log('Updating resource distribution');
            this.updateResourceDistributionNew(data);
        }

        // Update VM status - 新しい形式に対応
        if (data.vms && data.containers) {
            console.log('Updating VM status');
            this.updateVMStatusNew(data.vms, data.containers);
        }

        // Load historical data
        this.loadProxmoxHistory();
    }

    updateClusterNodes(nodes) {
        const container = document.getElementById('cluster-nodes');
        container.innerHTML = '';

        nodes.forEach(node => {
            const nodeCard = document.createElement('div');
            nodeCard.className = 'node-card';
            
            const statusClass = node.status === 'online' ? 'online' : 'offline';
            const cpuPercent = node.cpu ? (node.cpu * 100).toFixed(1) : '0';
            
            // 新しいメモリ形式に対応
            let memPercent = '0';
            if (node.memory && node.memory.percentage) {
                memPercent = node.memory.percentage.toFixed(1);
            } else if (node.mem && node.maxmem) {
                memPercent = ((node.mem / node.maxmem) * 100).toFixed(1);
            }

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

    updateResourceDistributionNew(data) {
        const runningVMs = data.vms.filter(vm => vm.status === 'running').length;
        const stoppedVMs = data.vms.filter(vm => vm.status === 'stopped').length;
        const containers = data.containers.length;
        const storage = 0; // ストレージ情報は基本APIでは含まれない

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

    updateVMStatusNew(vms, containers) {
        const container = document.getElementById('vm-status');
        container.innerHTML = '';

        const allVMs = [...vms, ...containers].slice(0, 10);

        allVMs.forEach(vm => {
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
            const historyResponse = await response.json();
            
            // 新しいレスポンス形式に対応
            const history = historyResponse.data || historyResponse;
            
            if (history && history.length > 0) {
                const labels = [];
                const cpuData = [];
                const memData = [];

                history.slice(-20).forEach(item => {
                    const date = new Date(item.timestamp);
                    labels.push(date.toLocaleTimeString());
                    
                    const data = item.data;
                    if (data.ocs && data.ocs.data.nextcloud && data.ocs.data.nextcloud.system) {
                        const system = data.ocs.data.nextcloud.system;
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
            const historyResponse = await response.json();
            
            // 新しいレスポンス形式に対応
            const history = historyResponse.data || historyResponse;
            
            if (history && history.length > 0) {
                const labels = [];
                const cpuData = [];
                const memData = [];

                history.slice(-20).forEach(item => {
                    const date = new Date(item.timestamp);
                    labels.push(date.toLocaleTimeString());
                    
                    const data = item.data;
                    if (data.nodes && data.nodes.length > 0) {
                        let totalCpu = 0, totalMem = 0, totalMaxMem = 0, nodeCount = 0;
                        
                        data.nodes.forEach(node => {
                            totalCpu += node.cpu || 0;
                            if (node.memory && node.memory.used && node.memory.total) {
                                totalMem += node.memory.used;
                                totalMaxMem += node.memory.total;
                            }
                            nodeCount++;
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
        console.log('Manual refresh triggered');
        // Trigger a manual refresh
        this.socket.emit('refresh-request');
        
        // Also fetch data directly
        this.fetchDataDirectly();
    }

    async fetchDataDirectly() {
        try {
            console.log('Fetching data directly from APIs...');
            const [nextcloudResponse, proxmoxResponse] = await Promise.all([
                fetch('/api/nextcloud').catch(() => ({ json: () => ({ error: 'Nextcloud unavailable' }) })),
                fetch('/api/proxmox').catch(() => ({ json: () => ({ error: 'Proxmox unavailable' }) }))
            ]);

            const nextcloudData = await nextcloudResponse.json();
            const proxmoxData = await proxmoxResponse.json();

            console.log('Direct fetch - Nextcloud:', nextcloudData);
            console.log('Direct fetch - Proxmox:', proxmoxData);

            this.updateNextcloudData(nextcloudData);
            this.updateProxmoxData(proxmoxData);
            this.updateLastUpdateTime(new Date().toISOString());
        } catch (error) {
            console.error('Error in direct fetch:', error);
        }
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
            console.log('Loading Proxmox details...');
            const response = await fetch('/api/proxmox/detailed');
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${