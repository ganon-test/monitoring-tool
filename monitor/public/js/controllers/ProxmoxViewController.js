/**
 * Proxmoxビューコントローラー - Proxmox関連のUIの更新とロジック
 */
class ProxmoxViewController {
    constructor(chartManager, dataModel) {
        this.chartManager = chartManager;
        this.dataModel = dataModel;
        this.updateQueue = [];
        this.isUpdating = false;
        this.detailedMode = false;
    }

    /**
     * Proxmoxデータでビューを更新
     */
    async updateView(data) {
        if (this.isUpdating) {
            this.updateQueue.push(data);
            return;
        }

        this.isUpdating = true;

        try {
            console.log('ProxmoxViewController updating view with data:', data);
            
            const responseData = data.data || data;
            if (responseData.error || data.error) {
                this.handleError(responseData.error || data.error);
                return;
            }

            // 接続ステータスを更新
            this.updateServiceStatus(true);

            // データが存在するかチェック
            if (!responseData || typeof responseData !== 'object') {
                console.warn('No valid Proxmox data received:', responseData);
                this.updateServiceStatus(false);
                return;
            }

            await Promise.all([
                this.updateClusterNodes(responseData.nodes),
                this.updateResourceGauges(responseData),
                this.updateVMStatistics(responseData),
                this.updateNodePerformanceChart(responseData),
                this.updateNetworkStatistics(responseData),
                this.updateClusterHealth(responseData),
                this.updateHardwareMonitoring(responseData),
                this.updateResourceDistribution(responseData),
                this.updateVMStatus(responseData)
            ]);

            // 履歴データを読み込み
            await this.loadHistoryData();

        } catch (error) {
            console.error('Error updating Proxmox view:', error);
            this.handleError(error.message);
        } finally {
            this.isUpdating = false;
            
            if (this.updateQueue.length > 0) {
                const nextUpdate = this.updateQueue.shift();
                this.updateView(nextUpdate);
            }
        }
    }

    /**
     * クラスターノードを更新
     */
    updateClusterNodes(nodes) {
        if (!nodes) return;

        const container = document.getElementById('cluster-nodes');
        if (!container) return;

        container.innerHTML = '';

        nodes.forEach(node => {
            const nodeCard = document.createElement('div');
            nodeCard.className = 'node-card';
            
            const statusClass = node.status === 'online' ? 'online' : 'offline';
            const cpuPercent = node.cpu ? (node.cpu * 100).toFixed(1) : '0';
            
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

    /**
     * リソースゲージを更新
     */
    updateResourceGauges(data) {
        console.log('Updating Proxmox resource gauges with data:', data);
        
        if (!data || !data.nodes) {
            console.warn('No nodes data available for resource gauges');
            // デフォルト値を表示
            this.setDefaultGaugeValues();
            return;
        }

        let totalCpu = 0, usedCpu = 0;
        let totalMemory = 0, usedMemory = 0;
        let totalStorage = 0, usedStorage = 0;
        let nodeCount = 0;

        data.nodes.forEach(node => {
            console.log('Processing node:', node);
            if (node.status === 'online') {
                nodeCount++;
                
                // CPU計算の改善
                const maxCpu = node.maxcpu || node.cores || 1;
                const currentCpu = node.cpu || 0;
                totalCpu += maxCpu;
                usedCpu += (currentCpu * maxCpu);
                
                // Memory計算（バイト単位で処理）
                const maxMem = node.maxmem || 0;
                const usedMem = node.mem || 0;
                totalMemory += maxMem;
                usedMemory += usedMem;
            }
        });

        // ストレージ情報を処理
        if (data.storage && Array.isArray(data.storage)) {
            data.storage.forEach(storage => {
                if (storage.enabled !== false) {
                    totalStorage += (storage.total || 0);
                    usedStorage += (storage.used || 0);
                }
            });
        }

        console.log('Calculated values:', {
            cpu: { used: usedCpu, total: totalCpu },
            memory: { used: usedMemory, total: totalMemory },
            storage: { used: usedStorage, total: totalStorage },
            nodeCount
        });

        // CPU ゲージ更新
        const cpuPercent = totalCpu > 0 ? Math.round((usedCpu / totalCpu) * 100) : 0;
        this.updateGauge('clusterCpuGauge', cpuPercent);
        this.updateElement('cluster-cpu-percent', `${cpuPercent}%`);
        this.updateElement('cluster-cpu-details', `${Math.round(usedCpu * 10) / 10} / ${totalCpu} cores`);

        // Memory ゲージ更新（GB単位に変換）
        const memoryGB = {
            used: totalMemory > 0 ? usedMemory / (1024 * 1024 * 1024) : 0,
            total: totalMemory > 0 ? totalMemory / (1024 * 1024 * 1024) : 0
        };
        const memoryPercent = memoryGB.total > 0 ? Math.round((memoryGB.used / memoryGB.total) * 100) : 0;
        this.updateGauge('clusterMemoryGauge', memoryPercent);
        this.updateElement('cluster-memory-percent', `${memoryPercent}%`);
        this.updateElement('cluster-memory-details', `${Math.round(memoryGB.used * 10) / 10} GB / ${Math.round(memoryGB.total * 10) / 10} GB`);

        // Storage ゲージ更新（TB単位に変換）
        const storageGB = {
            used: totalStorage > 0 ? usedStorage / (1024 * 1024 * 1024) : 0,
            total: totalStorage > 0 ? totalStorage / (1024 * 1024 * 1024) : 0
        };
        const storagePercent = storageGB.total > 0 ? Math.round((storageGB.used / storageGB.total) * 100) : 0;
        this.updateGauge('clusterStorageGauge', storagePercent);
        this.updateElement('cluster-storage-percent', `${storagePercent}%`);
        this.updateElement('cluster-storage-details', `${Math.round(storageGB.used * 10) / 10} GB / ${Math.round(storageGB.total * 10) / 10} GB`);
    }

    /**
     * ゲージチャートを安全に更新
     */
    updateGauge(chartName, percent) {
        try {
            const chart = this.chartManager.getChart(chartName);
            if (chart && chart.data && chart.data.datasets && chart.data.datasets[0]) {
                chart.data.datasets[0].data = [percent, 100 - percent];
                chart.update('none');
                console.log(`Updated gauge ${chartName} to ${percent}%`);
            } else {
                console.warn(`Chart ${chartName} not found or not properly initialized`);
            }
        } catch (error) {
            console.error(`Error updating gauge ${chartName}:`, error);
        }
    }

    /**
     * デフォルトのゲージ値を設定
     */
    setDefaultGaugeValues() {
        this.updateGauge('clusterCpuGauge', 0);
        this.updateGauge('clusterMemoryGauge', 0);
        this.updateGauge('clusterStorageGauge', 0);
        
        this.updateElement('cluster-cpu-percent', '0%');
        this.updateElement('cluster-cpu-details', 'No data');
        this.updateElement('cluster-memory-percent', '0%');
        this.updateElement('cluster-memory-details', 'No data');
        this.updateElement('cluster-storage-percent', '0%');
        this.updateElement('cluster-storage-details', 'No data');
    }

    /**
     * VM統計を更新
     */
    updateVMStatistics(data) {
        console.log('Updating VM statistics with data:', data);
        
        if (!data) {
            console.warn('No data available for VM statistics');
            this.setDefaultVMValues();
            return;
        }

        let runningVMs = 0, stoppedVMs = 0, totalVMs = 0;
        let totalContainers = 0, runningContainers = 0;

        // VMsデータを処理
        if (data.vms && Array.isArray(data.vms)) {
            data.vms.forEach(vm => {
                console.log('Processing VM:', vm);
                if (vm.type === 'qemu' || vm.template === 0) { // QEMU VMs
                    totalVMs++;
                    if (vm.status === 'running') runningVMs++;
                    else stoppedVMs++;
                } else if (vm.type === 'lxc') { // LXC Containers
                    totalContainers++;
                    if (vm.status === 'running') runningContainers++;
                }
            });
        }

        // 代替データソースを確認（nodes内のVM情報）
        if (data.nodes && Array.isArray(data.nodes)) {
            data.nodes.forEach(node => {
                if (node.vmlist) {
                    node.vmlist.forEach(vm => {
                        if (vm.type === 'qemu') {
                            totalVMs++;
                            if (vm.status === 'running') runningVMs++;
                            else stoppedVMs++;
                        } else if (vm.type === 'lxc') {
                            totalContainers++;
                            if (vm.status === 'running') runningContainers++;
                        }
                    });
                }
            });
        }

        console.log('VM Statistics:', {
            totalVMs, runningVMs, stoppedVMs,
            totalContainers, runningContainers
        });

        // DOM要素を更新
        this.updateElement('vm-running-count', runningVMs);
        this.updateElement('vm-stopped-count', stoppedVMs);
        this.updateElement('vm-total-count', totalVMs);
        this.updateElement('ct-total-count', totalContainers);
        
        // 追加の統計情報
        this.updateElement('vm-running-containers', runningContainers);
    }

    /**
     * デフォルトのVM値を設定
     */
    setDefaultVMValues() {
        this.updateElement('vm-running-count', 0);
        this.updateElement('vm-stopped-count', 0);
        this.updateElement('vm-total-count', 0);
        this.updateElement('ct-total-count', 0);
        this.updateElement('vm-running-containers', 0);
    }

    /**
     * ノードパフォーマンスチャートを更新
     */
    updateNodePerformanceChart(data) {
        if (!data || !data.nodes) return;

        const nodePerformance = this.chartManager.getChart('nodePerformance');
        if (!nodePerformance) return;

        const onlineNodes = data.nodes.filter(node => node.status === 'online');
        const labels = onlineNodes.map(node => node.node || 'Unknown');
        const cpuData = onlineNodes.map(node => Math.round(node.cpu || 0));
        const memoryData = onlineNodes.map(node => Math.round(((node.mem || 0) / (node.maxmem || 1)) * 100));
        const storageData = onlineNodes.map(node => Math.round(Math.random() * 50 + 20));

        nodePerformance.data.labels = labels;
        nodePerformance.data.datasets[0].data = cpuData;
        nodePerformance.data.datasets[1].data = memoryData;
        nodePerformance.data.datasets[2].data = storageData;
        nodePerformance.update('none');
    }

    /**
     * ネットワーク統計を更新
     */
    updateNetworkStatistics(data) {
        if (!data || !data.nodes) return;

        let totalRx = 0, totalTx = 0;
        data.nodes.forEach(node => {
            if (node.status === 'online') {
                totalRx += Math.random() * 100;
                totalTx += Math.random() * 80;
            }
        });

        this.updateElement('network-rx-rate', `${Math.round(totalRx)} MB/s`);
        this.updateElement('network-tx-rate', `${Math.round(totalTx)} MB/s`);

        // ネットワークミニチャートを更新
        const networkMini = this.chartManager.getChart('networkMini');
        if (networkMini) {
            networkMini.data.datasets[0].data.shift();
            networkMini.data.datasets[0].data.push(totalRx);
            networkMini.data.datasets[1].data.shift();
            networkMini.data.datasets[1].data.push(totalTx);
            networkMini.update('none');
        }
    }

    /**
     * クラスターヘルスを更新
     */
    updateClusterHealth(data) {
        if (!data) return;

        // クラスターステータス更新
        const clusterStatus = data.nodes && data.nodes.some(node => node.status === 'online') ? 'online' : 'offline';
        const statusIcon = document.getElementById('cluster-status-icon');
        const statusText = document.getElementById('cluster-status-text');
        
        if (statusIcon && statusText) {
            if (clusterStatus === 'online') {
                statusIcon.className = 'health-icon';
                statusIcon.innerHTML = '<i class="fas fa-check-circle"></i>';
                statusText.textContent = 'Online';
            } else {
                statusIcon.className = 'health-icon error';
                statusIcon.innerHTML = '<i class="fas fa-exclamation-circle"></i>';
                statusText.textContent = 'Offline';
            }
        }

        this.updateElement('ha-status-text', 'Active');
        this.updateElement('backup-status-text', 'Today 02:00');
    }

    /**
     * ハードウェアモニタリングを更新
     */
    updateHardwareMonitoring(data) {
        if (!data || !data.nodes) return;

        // 平均温度（プレースホルダー）
        const avgTemp = 35 + Math.random() * 20;
        this.updateElement('avg-cpu-temp', `${Math.round(avgTemp)}°C`);
        
        const tempBar = document.getElementById('temp-bar-fill');
        if (tempBar) {
            const tempPercent = Math.min((avgTemp - 20) / 60 * 100, 100);
            tempBar.style.width = `${tempPercent}%`;
        }

        // 消費電力（プレースホルダー）
        this.updateElement('power-consumption', `${Math.round(150 + Math.random() * 100)}W`);
        
        // クラスターアップタイム（プレースホルダー）
        const uptimeDays = Math.floor(Math.random() * 100 + 30);
        this.updateElement('cluster-uptime', `${uptimeDays} days`);
    }

    /**
     * リソース分布を更新
     */
    updateResourceDistribution(data) {
        if (!data.vms || !data.containers) return;

        const runningVMs = data.vms.filter(vm => vm.status === 'running').length;
        const stoppedVMs = data.vms.filter(vm => vm.status === 'stopped').length;
        const containers = data.containers.length;
        const available = Math.max(0, 100 - runningVMs - stoppedVMs - containers);

        const proxmoxResources = this.chartManager.getChart('proxmoxResources');
        if (proxmoxResources) {
            proxmoxResources.data.datasets[0].data = [runningVMs, stoppedVMs, containers, available];
            proxmoxResources.update('none');
        }
    }

    /**
     * VMステータスを更新
     */
    updateVMStatus(data) {
        if (!data.vms || !data.containers) return;

        const container = document.getElementById('vm-status');
        if (!container) return;

        container.innerHTML = '';

        const allVMs = [...data.vms, ...data.containers].slice(0, 10);

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

    /**
     * 履歴データを読み込み
     */
    async loadHistoryData() {
        try {
            const historyResponse = await this.dataModel.fetchProxmoxHistory();
            const history = historyResponse.data || historyResponse;
            
            if (history && history.length > 0) {
                this.updateHistoryChart(history);
            }
        } catch (error) {
            console.error('Error loading Proxmox history:', error);
        }
    }

    /**
     * 履歴チャートを更新
     */
    updateHistoryChart(history) {
        const proxmoxHistory = this.chartManager.getChart('proxmoxHistory');
        if (!proxmoxHistory) return;

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

        proxmoxHistory.data.labels = labels;
        proxmoxHistory.data.datasets[0].data = cpuData;
        proxmoxHistory.data.datasets[1].data = memData;
        proxmoxHistory.update('none');
    }

    /**
     * 詳細表示の切り替え
     */
    toggleDetailedView() {
        this.detailedMode = !this.detailedMode;
        
        const detailedSections = document.querySelectorAll('.detailed-section');
        const toggleText = document.getElementById('detail-toggle-text');
        
        detailedSections.forEach(section => {
            section.style.display = this.detailedMode ? 'block' : 'none';
        });
        
        if (toggleText) {
            toggleText.textContent = this.detailedMode ? 'Hide Details' : 'Show Details';
        }
        
        // チャートリサイズ
        setTimeout(() => {
            this.chartManager.resizeAllCharts();
        }, 100);
    }

    /**
     * サービスステータスを更新
     */
    updateServiceStatus(isOnline) {
        const statusElement = document.getElementById('proxmox-status');
        if (statusElement) {
            const dot = statusElement.querySelector('.status-dot');
            
            if (isOnline) {
                dot.classList.remove('offline');
                dot.classList.add('online');
            } else {
                dot.classList.remove('online');
                dot.classList.add('offline');
            }
        }
    }

    /**
     * エラーハンドリング
     */
    handleError(error) {
        console.error('Proxmox error:', error);
        this.updateServiceStatus(false);
    }

    /**
     * DOM要素を更新
     */
    updateElement(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
            return true;
        }
        console.warn(`Element ${elementId} not found`);
        return false;
    }

    /**
     * アップタイムをフォーマット
     */
    formatUptime(seconds) {
        if (!seconds) return '-';
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${days}d ${hours}h ${minutes}m`;
    }

    /**
     * 手動リフレッシュ
     */
    async refresh() {
        try {
            const data = await this.dataModel.fetchProxmoxData();
            await this.updateView(data);
        } catch (error) {
            console.error('Error refreshing Proxmox data:', error);
            this.handleError(error.message);
        }
    }

    /**
     * 初期化メソッド
     */
    init() {
        console.log('ProxmoxViewController initialized');
        
        // イベントリスナーを設定
        this.setupEventListeners();
    }

    /**
     * イベントリスナーを設定
     */
    setupEventListeners() {
        // Show Details ボタンの処理
        const detailToggleBtn = document.querySelector('.proxmox-section .btn-secondary');
        if (detailToggleBtn) {
            detailToggleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleDetailedView();
            });
        }
        
        // Refresh ボタンの処理
        const refreshBtn = document.querySelector('.proxmox-section .btn-primary');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (this.dataModel && this.dataModel.fetchProxmoxData) {
                    this.dataModel.fetchProxmoxData();
                }
            });
        }
    }

    /**
     * 表示を更新
     */
    updateDisplay(data) {
        this.updateView(data);
    }
}
