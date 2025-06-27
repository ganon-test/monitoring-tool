/**
 * チャート管理クラス - Chart.jsの統合管理
 */
class ChartManager {
    constructor() {
        this.charts = new Map();
        this.chartConfigs = new Map();
        this.isResizing = false; // リサイズの無限ループ防止フラグ
    }

    /**
     * 初期化
     */
    init() {
        console.log('ChartManager initialized');
        this.initializeAllCharts();
    }

    /**
     * 全チャートを初期化
     */
    initializeAllCharts() {
        try {
            // Nextcloudチャート
            this.createActiveUsersChart();
            this.createStorageDonutChart();
            this.createCpuLoadChart();
            this.createMemoryGaugeChart();
            this.createUsersTimelineChart();
            this.createFileDistributionChart();
            this.createSharesChart();
            this.createNextcloudHistoryChart();

            // Proxmoxチャート
            this.createClusterCpuGauge();
            this.createClusterMemoryGauge();
            this.createClusterStorageGauge();
            this.createNodePerformanceChart();
            this.createNetworkMiniChart();
            this.createProxmoxResourcesChart();
            this.createProxmoxHistoryChart();

            console.log('All charts initialized successfully');
        } catch (error) {
            console.error('Error initializing charts:', error);
        }
    }

    /**
     * チャートを安全に作成
     */
    createChartSafely(canvasId, chartName, config) {
        try {
            const ctx = document.getElementById(canvasId);
            if (!ctx) {
                console.warn(`Canvas element ${canvasId} not found`);
                return;
            }

            // 既存のチャートを破棄
            if (this.charts.has(chartName)) {
                this.destroyChart(chartName);
            }

            const chart = new Chart(ctx, config);
            this.charts.set(chartName, chart);
            this.chartConfigs.set(chartName, config);
            console.log(`Chart ${chartName} created successfully`);
        } catch (error) {
            console.error(`Error creating chart ${chartName}:`, error);
        }
    }

    /**
     * アクティブユーザーチャート作成
     */
    createActiveUsersChart() {
        const config = {
            type: 'bar',
            data: {
                labels: ['Online', 'Away', 'Offline'],
                datasets: [{
                    data: [0, 0, 0],
                    backgroundColor: ['#00d4ff', '#ffd700', '#6b7280'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: { display: false },
                    y: { display: false, beginAtZero: true }
                }
            }
        };

        this.createChartSafely('active-users-chart', 'activeUsers', config);
    }

    /**
     * ストレージドーナツチャート作成
     */
    createStorageDonutChart() {
        const config = {
            type: 'doughnut',
            data: {
                labels: ['Used', 'Free'],
                datasets: [{
                    data: [0, 100],
                    backgroundColor: ['#f97316', 'rgba(255, 255, 255, 0.1)'],
                    borderWidth: 0,
                    cutout: '70%'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 1,
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false }
                },
                layout: { padding: 10 }
            }
        };

        this.createChartSafely('storage-donut-chart', 'storageDonut', config);
    }

    /**
     * CPU負荷チャート作成
     */
    createCpuLoadChart() {
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
                aspectRatio: 3,
                scales: {
                    x: { display: false },
                    y: { beginAtZero: true, display: false }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false }
                },
                layout: { padding: 5 }
            }
        };

        this.createChartSafely('cpu-load-chart', 'cpuLoad', config);
    }

    /**
     * メモリゲージチャート作成
     */
    createMemoryGaugeChart() {
        const config = {
            type: 'doughnut',
            data: {
                datasets: [{
                    data: [0, 100],
                    backgroundColor: ['#8b5cf6', 'rgba(255, 255, 255, 0.1)'],
                    borderWidth: 0,
                    cutout: '75%'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 1,
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false }
                },
                layout: { padding: 10 }
            }
        };

        this.createChartSafely('memory-gauge', 'memoryGauge', config);
    }

    /**
     * ユーザータイムラインチャート作成
     */
    createUsersTimelineChart() {
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
                aspectRatio: 3,
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
                },
                layout: { padding: 10 }
            }
        };

        this.createChartSafely('users-timeline-chart', 'usersTimeline', config);
    }

    /**
     * ファイル分布チャート作成
     */
    createFileDistributionChart() {
        const config = {
            type: 'bar',
            data: {
                labels: ['Documents', 'Images', 'Videos', 'Others'],
                datasets: [{
                    data: [0, 0, 0, 0],
                    backgroundColor: ['#f97316', '#10b981', '#8b5cf6', '#6b7280']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
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
                }
            }
        };

        this.createChartSafely('file-distribution-chart', 'fileDistribution', config);
    }

    /**
     * 共有チャート作成
     */
    createSharesChart() {
        const config = {
            type: 'doughnut',
            data: {
                labels: ['Public', 'Private', 'Group'],
                datasets: [{
                    data: [0, 0, 0],
                    backgroundColor: ['#00d4ff', '#f97316', '#8b5cf6'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: '#ffffff' } }
                }
            }
        };

        this.createChartSafely('shares-chart', 'shares', config);
    }

    /**
     * Nextcloud履歴チャート作成
     */
    createNextcloudHistoryChart() {
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
                aspectRatio: 2.5,
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
                },
                layout: { padding: 10 }
            }
        };

        this.createChartSafely('nextcloud-history-chart', 'nextcloudHistory', config);
    }

    /**
     * クラスターCPUゲージ作成
     */
    createClusterCpuGauge() {
        const config = {
            type: 'doughnut',
            data: {
                datasets: [{
                    data: [0, 100],
                    backgroundColor: ['#f97316', 'rgba(255, 255, 255, 0.1)'],
                    borderWidth: 0,
                    cutout: '75%'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 1,
                layout: { padding: 10 },
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false }
                }
            }
        };

        this.createChartSafely('cluster-cpu-gauge', 'clusterCpuGauge', config);
    }

    /**
     * クラスターメモリゲージ作成
     */
    createClusterMemoryGauge() {
        const config = {
            type: 'doughnut',
            data: {
                datasets: [{
                    data: [0, 100],
                    backgroundColor: ['#8b5cf6', 'rgba(255, 255, 255, 0.1)'],
                    borderWidth: 0,
                    cutout: '75%'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 1,
                layout: { padding: 10 },
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false }
                }
            }
        };

        this.createChartSafely('cluster-memory-gauge', 'clusterMemoryGauge', config);
    }

    /**
     * クラスターストレージゲージ作成
     */
    createClusterStorageGauge() {
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
                maintainAspectRatio: true,
                aspectRatio: 1,
                layout: { padding: 10 },
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false }
                }
            }
        };

        this.createChartSafely('cluster-storage-gauge', 'clusterStorageGauge', config);
    }

    /**
     * ノードパフォーマンスチャート作成
     */
    createNodePerformanceChart() {
        const config = {
            type: 'bar',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'CPU Usage (%)',
                        data: [],
                        backgroundColor: '#f97316',
                        borderColor: '#f97316',
                        borderWidth: 1
                    },
                    {
                        label: 'Memory Usage (%)',
                        data: [],
                        backgroundColor: '#8b5cf6',
                        borderColor: '#8b5cf6',
                        borderWidth: 1
                    },
                    {
                        label: 'Storage Usage (%)',
                        data: [],
                        backgroundColor: '#10b981',
                        borderColor: '#10b981',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: '#ffffff' } }
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

        this.createChartSafely('node-performance-chart', 'nodePerformance', config);
    }

    /**
     * ネットワークミニチャート作成
     */
    createNetworkMiniChart() {
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
                aspectRatio: 3,
                scales: {
                    x: { display: false },
                    y: { display: false, beginAtZero: true }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false }
                },
                layout: { padding: 5 }
            }
        };

        this.createChartSafely('network-mini-chart', 'networkMini', config);
    }

    /**
     * Proxmoxリソースチャート作成
     */
    createProxmoxResourcesChart() {
        const config = {
            type: 'doughnut',
            data: {
                labels: ['CPU', 'Memory', 'Storage'],
                datasets: [{
                    data: [30, 50, 20],
                    backgroundColor: ['#f97316', '#8b5cf6', '#10b981'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: '#ffffff' } }
                }
            }
        };

        this.createChartSafely('proxmox-resources-chart', 'proxmoxResources', config);
    }

    /**
     * Proxmox履歴チャート作成
     */
    createProxmoxHistoryChart() {
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
                aspectRatio: 2.5,
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
                },
                layout: { padding: 10 }
            }
        };

        this.createChartSafely('proxmox-history-chart', 'proxmoxHistory', config);
    }

    /**
     * チャートを取得
     */
    getChart(name) {
        return this.charts.get(name);
    }

    /**
     * グラフのサイズを調整
     */
    resizeAllCharts() {
        this.charts.forEach((chart, name) => {
            try {
                const canvas = chart.canvas;
                const isGaugeChart = name.includes('gauge') || name.includes('donut');

                if (canvas) {
                    if (isGaugeChart) {
                        canvas.style.width = '250px';
                        canvas.style.height = '250px';
                        canvas.style.maxWidth = '250px';
                        canvas.style.maxHeight = '250px';
                    } else {
                        canvas.style.width = '100%';
                        canvas.style.height = '350px';
                        canvas.style.maxWidth = 'none';
                        canvas.style.maxHeight = '350px';
                    }
                }
                chart.resize();
            } catch (error) {
                console.error(`Error resizing chart ${name}:`, error);
            }
        });
    }

    /**
     * 特定のチャートを破棄
     */
    destroyChart(name) {
        const chart = this.charts.get(name);
        if (chart) {
            try {
                chart.destroy();
            } catch (error) {
                console.error(`Error destroying chart ${name}:`, error);
            }
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
