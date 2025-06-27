/**
 * チャート管理クラス - Chart.jsインスタンスの作成と管理
 */
class ChartManager {
    constructor() {
        this.charts = new Map();
        this.chartConfigs = new Map();
    }

    /**
     * 全チャートを初期化
     */
    initializeAllCharts() {
        this.initializeNextcloudCharts();
        this.initializeProxmoxCharts();
    }

    /**
     * Nextcloudチャートを初期化
     */
    initializeNextcloudCharts() {
        this.createMemoryGauge();
        this.createCpuLoadChart();
        this.createStorageDonutChart();
        this.createUsersTimelineChart();
        this.createFileDistributionChart();
        this.createSharesChart();
        this.createNextcloudHistoryChart();
    }

    /**
     * Proxmoxチャートを初期化
     */
    initializeProxmoxCharts() {
        this.createClusterCpuGauge();
        this.createClusterMemoryGauge();
        this.createClusterStorageGauge();
        this.createNodePerformanceChart();
        this.createNetworkMiniChart();
        this.createProxmoxResourcesChart();
        this.createProxmoxHistoryChart();
    }

    /**
     * メモリゲージチャート作成
     */
    createMemoryGauge() {
        const ctx = document.getElementById('memory-gauge');
        if (!ctx) return;

        const config = {
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
        };

        this.charts.set('memoryGauge', new Chart(ctx, config));
        this.chartConfigs.set('memoryGauge', config);
    }

    /**
     * CPU負荷チャート作成
     */
    createCpuLoadChart() {
        const ctx = document.getElementById('cpu-load-chart');
        if (!ctx) return;

        const config = {
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
                    y: { beginAtZero: true, display: false }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false }
                }
            }
        };

        this.charts.set('cpuLoad', new Chart(ctx, config));
        this.chartConfigs.set('cpuLoad', config);
    }

    /**
     * ストレージドーナツチャート作成
     */
    createStorageDonutChart() {
        const ctx = document.getElementById('storage-donut-chart');
        if (!ctx) return;

        const config = {
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
        };

        this.charts.set('storageDonut', new Chart(ctx, config));
        this.chartConfigs.set('storageDonut', config);
    }

    /**
     * ユーザータイムラインチャート作成
     */
    createUsersTimelineChart() {
        const ctx = document.getElementById('users-timeline-chart');
        if (!ctx) return;

        const config = {
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
                    legend: { labels: { color: '#ffffff' } }
                }
            }
        };

        this.charts.set('usersTimeline', new Chart(ctx, config));
        this.chartConfigs.set('usersTimeline', config);
    }

    /**
     * ファイル分布チャート作成
     */
    createFileDistributionChart() {
        const ctx = document.getElementById('file-distribution-chart');
        if (!ctx) return;

        const config = {
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
        };

        this.charts.set('fileDistribution', new Chart(ctx, config));
        this.chartConfigs.set('fileDistribution', config);
    }

    /**
     * 共有チャート作成
     */
    createSharesChart() {
        const ctx = document.getElementById('shares-chart');
        if (!ctx) return;

        const config = {
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
                    legend: { labels: { color: '#ffffff' } }
                }
            }
        };

        this.charts.set('shares', new Chart(ctx, config));
        this.chartConfigs.set('shares', config);
    }

    /**
     * Nextcloud履歴チャート作成
     */
    createNextcloudHistoryChart() {
        const ctx = document.getElementById('nextcloud-history-chart');
        if (!ctx) return;

        const config = {
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
                    legend: { labels: { color: '#ffffff' } }
                }
            }
        };

        this.charts.set('nextcloudHistory', new Chart(ctx, config));
        this.chartConfigs.set('nextcloudHistory', config);
    }

    /**
     * クラスターCPUゲージ作成
     */
    createClusterCpuGauge() {
        const ctx = document.getElementById('cluster-cpu-gauge');
        if (!ctx) return;

        const config = {
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
        };

        this.charts.set('clusterCpuGauge', new Chart(ctx, config));
        this.chartConfigs.set('clusterCpuGauge', config);
    }

    /**
     * クラスターメモリゲージ作成
     */
    createClusterMemoryGauge() {
        const ctx = document.getElementById('cluster-memory-gauge');
        if (!ctx) return;

        const config = {
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
        };

        this.charts.set('clusterMemoryGauge', new Chart(ctx, config));
        this.chartConfigs.set('clusterMemoryGauge', config);
    }

    /**
     * クラスターストレージゲージ作成
     */
    createClusterStorageGauge() {
        const ctx = document.getElementById('cluster-storage-gauge');
        if (!ctx) return;

        const config = {
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
        };

        this.charts.set('clusterStorageGauge', new Chart(ctx, config));
        this.chartConfigs.set('clusterStorageGauge', config);
    }

    /**
     * ノードパフォーマンスチャート作成
     */
    createNodePerformanceChart() {
        const ctx = document.getElementById('node-performance-chart');
        if (!ctx) return;

        const config = {
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
        };

        this.charts.set('nodePerformance', new Chart(ctx, config));
        this.chartConfigs.set('nodePerformance', config);
    }

    /**
     * ネットワークミニチャート作成
     */
    createNetworkMiniChart() {
        const ctx = document.getElementById('network-mini-chart');
        if (!ctx) return;

        const config = {
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
                    y: { display: false, beginAtZero: true }
                },
                elements: {
                    point: { radius: 0 }
                }
            }
        };

        this.charts.set('networkMini', new Chart(ctx, config));
        this.chartConfigs.set('networkMini', config);
    }

    /**
     * Proxmoxリソースチャート作成
     */
    createProxmoxResourcesChart() {
        const ctx = document.getElementById('proxmox-resources-chart');
        if (!ctx) return;

        const config = {
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
        };

        this.charts.set('proxmoxResources', new Chart(ctx, config));
        this.chartConfigs.set('proxmoxResources', config);
    }

    /**
     * Proxmox履歴チャート作成
     */
    createProxmoxHistoryChart() {
        const ctx = document.getElementById('proxmox-history-chart');
        if (!ctx) return;

        const config = {
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
                    legend: { labels: { color: '#ffffff' } }
                }
            }
        };

        this.charts.set('proxmoxHistory', new Chart(ctx, config));
        this.chartConfigs.set('proxmoxHistory', config);
    }

    /**
     * チャートを取得
     */
    getChart(name) {
        return this.charts.get(name);
    }

    /**
     * 全チャートをリサイズ
     */
    resizeAllCharts() {
        this.charts.forEach(chart => {
            if (chart && typeof chart.resize === 'function') {
                chart.resize();
            }
        });
    }

    /**
     * チャートを破棄
     */
    destroyChart(name) {
        const chart = this.charts.get(name);
        if (chart) {
            chart.destroy();
            this.charts.delete(name);
            this.chartConfigs.delete(name);
        }
    }

    /**
     * 全チャートを破棄
     */
    destroyAllCharts() {
        this.charts.forEach((chart, name) => {
            this.destroyChart(name);
        });
    }
}
