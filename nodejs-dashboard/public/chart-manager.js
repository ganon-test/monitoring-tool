/**
 * チャート管理クラス
 */
class ChartManager {
    constructor() {
        this.charts = {};
        this.initCharts();
    }

    initCharts() {
        // CPUチャート
        const cpuCtx = document.getElementById('cpuChart')?.getContext('2d');
        if (cpuCtx) {
            this.charts.cpu = new Chart(cpuCtx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'CPU使用率 (%)',
                        data: [],
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100,
                            grid: {
                                color: 'rgba(255, 255, 255, 0.1)'
                            },
                            ticks: {
                                callback: function(value) {
                                    return value + '%';
                                }
                            }
                        },
                        x: {
                            grid: {
                                color: 'rgba(255, 255, 255, 0.1)'
                            }
                        }
                    },
                    elements: {
                        point: {
                            radius: 0,
                            hoverRadius: 6
                        }
                    }
                }
            });
        }

        // メモリチャート
        const memoryCtx = document.getElementById('memoryChart')?.getContext('2d');
        if (memoryCtx) {
            this.charts.memory = new Chart(memoryCtx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'メモリ使用率 (%)',
                        data: [],
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100,
                            grid: {
                                color: 'rgba(255, 255, 255, 0.1)'
                            },
                            ticks: {
                                callback: function(value) {
                                    return value + '%';
                                }
                            }
                        },
                        x: {
                            grid: {
                                color: 'rgba(255, 255, 255, 0.1)'
                            }
                        }
                    },
                    elements: {
                        point: {
                            radius: 0,
                            hoverRadius: 6
                        }
                    }
                }
            });
        }
    }

    // チャートデータの更新
    updateCharts(historyData) {
        if (!historyData || historyData.length === 0) {
            console.warn('📈 履歴データが空です');
            return;
        }

        console.log('📈 チャート更新:', historyData.length + '件のデータ');

        const labels = historyData.map(item => {
            const date = new Date(item.time);
            return date.toLocaleTimeString('ja-JP', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
        });

        const cpuData = historyData.map(item => item.cpu || 0);
        const memoryData = historyData.map(item => item.memory || 0);

        // CPUチャート更新
        if (this.charts.cpu) {
            this.charts.cpu.data.labels = labels;
            this.charts.cpu.data.datasets[0].data = cpuData;
            this.charts.cpu.update('none');
        }

        // メモリチャート更新
        if (this.charts.memory) {
            this.charts.memory.data.labels = labels;
            this.charts.memory.data.datasets[0].data = memoryData;
            this.charts.memory.update('none');
        }
    }

    // 時間範囲の更新
    updateTimeRange(chartType, timeRange) {
        console.log(`📊 チャート時間範囲変更: ${chartType} -> ${timeRange}`);
        // 実装：時間範囲に応じてAPIからデータを再取得
        // 現在は24時間固定のため、将来の拡張用
    }
}
