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
                // this.updateHardwareMonitoring(responseData), // removed for per-node display
                this.updateResourceDistribution(responseData),
                this.updateVMStatus(responseData),
                this.updateStorageOverview(responseData)
            ]);

            // 詳細モード用コンテンツを更新
            this.updateDetailedNodes(responseData.nodes);
            this.updateDetailedVMs(responseData.vms || [], responseData.containers || []);

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

            // 温度・電力・アップタイムをノード単位で表示
            const temp = node.temp !== undefined ? node.temp.toFixed(1) : 'N/A';
            const power = node.power !== undefined ? node.power : 'N/A';
            nodeCard.innerHTML = `
                <div class="node-header">
                    <div class="node-name">${node.node}</div>
                    <div class="node-status ${statusClass}"></div>
                </div>
                <div class="node-details">
                    <div>CPU: ${cpuPercent}%</div>
                    <div>Memory: ${memPercent}%</div>
                    <div>Uptime: ${this.formatUptime(node.uptime)}</div>
                    <div>Temperature: ${temp}°C</div>
                    <div>Power: ${power} W</div>
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
                let maxMem = 0, usedMem = 0;

                if (node.memory && typeof node.memory === 'object') {
                    // 新しい形式: {used: bytes, total: bytes}
                    maxMem = node.memory.total || 0;
                    usedMem = node.memory.used || 0;
                } else if (node.maxmem && node.mem) {
                    // 古い形式: maxmem, mem
                    maxMem = node.maxmem;
                    usedMem = node.mem;
                }

                totalMemory += maxMem;
                usedMemory += usedMem;

                console.log(`Node ${node.node} memory: ${usedMem}/${maxMem} bytes`);
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

        // VMsデータを処理（data.vms配列）
        if (data.vms && Array.isArray(data.vms)) {
            data.vms.forEach(vm => {
                console.log('Processing VM:', vm);
                totalVMs++;
                if (vm.status === 'running') runningVMs++;
                else stoppedVMs++;
            });
        }

        // Containersデータを処理（data.containers配列）
        if (data.containers && Array.isArray(data.containers)) {
            data.containers.forEach(container => {
                console.log('Processing Container:', container);
                totalContainers++;
                if (container.status === 'running') runningContainers++;
            });
        }

        // 代替データソースを確認（nodes内のVM情報）
        if (data.nodes && Array.isArray(data.nodes)) {
            data.nodes.forEach(node => {
                if (node.vmlist && Array.isArray(node.vmlist)) {
                    node.vmlist.forEach(vm => {
                        console.log('Processing VM from node:', vm);
                        if (vm.type === 'qemu') {
                            // VMsが既にカウントされていない場合のみ追加
                            if (!data.vms || data.vms.length === 0) {
                                totalVMs++;
                                if (vm.status === 'running') runningVMs++;
                                else stoppedVMs++;
                            }
                        } else if (vm.type === 'lxc') {
                            // Containersが既にカウントされていない場合のみ追加
                            if (!data.containers || data.containers.length === 0) {
                                totalContainers++;
                                if (vm.status === 'running') runningContainers++;
                            }
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

        // Container統計（要素が存在しない場合は警告のみ）
        if (!this.updateElement('vm-running-containers', runningContainers)) {
            // 代替要素名を試行
            this.updateElement('container-running-count', runningContainers);
            this.updateElement('containers-running', runningContainers);
        }
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
        console.log('Updating VM Status with data:', data);

        const container = document.getElementById('vm-status');
        if (!container) {
            console.warn('VM status container not found');
            return;
        }

        container.innerHTML = '';

        let allVMs = [];

        // 複数のデータソースからVMを収集
        if (data.vms && Array.isArray(data.vms)) {
            allVMs = allVMs.concat(data.vms);
        }
        if (data.containers && Array.isArray(data.containers)) {
            allVMs = allVMs.concat(data.containers);
        }

        // ノード内のVMリストも確認
        if (data.nodes && Array.isArray(data.nodes)) {
            data.nodes.forEach(node => {
                if (node.vmlist && Array.isArray(node.vmlist)) {
                    allVMs = allVMs.concat(node.vmlist);
                }
            });
        }

        // 重複を除去（VMIDベース）
        const uniqueVMs = [];
        const seenVMIds = new Set();

        allVMs.forEach(vm => {
            const vmid = vm.vmid || vm.id || vm.name;
            if (vmid && !seenVMIds.has(vmid)) {
                seenVMIds.add(vmid);
                uniqueVMs.push(vm);
            }
        });

        console.log(`Found ${uniqueVMs.length} unique VMs/Containers`);

        if (uniqueVMs.length === 0) {
            container.innerHTML = '<div class="vm-item">No VMs found</div>';
            return;
        }

        // 最大10個まで表示
        uniqueVMs.slice(0, 10).forEach(vm => {
            const vmItem = document.createElement('div');
            vmItem.className = 'vm-item';

            const status = vm.status || 'unknown';
            const statusClass = status === 'running' ? 'running' : 'stopped';
            const vmName = vm.name || vm.vmid || vm.id || 'Unknown';
            const vmType = vm.type || (vm.template ? 'template' : 'vm');

            vmItem.innerHTML = `
                <div class="vm-info">
                    <div class="vm-name">${vmName}</div>
                    <div class="vm-type">${vmType.toUpperCase()}</div>
                </div>
                <div class="vm-status-badge ${statusClass}">${status}</div>
            `;

            container.appendChild(vmItem);
        });
    }

    /**
     * ストレージオーバービューを更新
     */
    updateStorageOverview(data) {
        console.log('Updating Storage Overview with data:', data);

        const container = document.getElementById('storage-overview');
        if (!container) {
            console.warn('Storage overview container not found');
            return;
        }

        container.innerHTML = '';

        // 直接のストレージデータを確認
        let storageData = [];
        if (data && data.storage && Array.isArray(data.storage)) {
            storageData = data.storage;
        }

        // ノードからストレージ情報を抽出（代替手段）
        if (storageData.length === 0 && data.nodes && Array.isArray(data.nodes)) {
            data.nodes.forEach(node => {
                if (node.storage && Array.isArray(node.storage)) {
                    storageData = storageData.concat(node.storage);
                }

                // ノードのルートディスクも追加
                if (node.disk && node.maxdisk) {
                    storageData.push({
                        storage: `${node.node}-rootfs`,
                        type: 'local',
                        used: node.disk,
                        total: node.maxdisk,
                        enabled: true
                    });
                }
            });
        }

        // テストデータを生成（実際のデータがない場合）
        if (storageData.length === 0) {
            console.log('No storage data found, generating test data');
            storageData = [
                {
                    storage: 'local-zfs',
                    type: 'zfspool',
                    used: 800 * 1024 * 1024 * 1024, // 800GB
                    total: 2 * 1024 * 1024 * 1024 * 1024, // 2TB
                    enabled: true
                },
                {
                    storage: 'backup-nfs',
                    type: 'nfs',
                    used: 1.2 * 1024 * 1024 * 1024 * 1024, // 1.2TB
                    total: 5 * 1024 * 1024 * 1024 * 1024, // 5TB
                    enabled: true
                }
            ];
        }

        storageData.forEach(storage => {
            if (storage.enabled !== false) {
                const storageItem = document.createElement('div');
                storageItem.className = 'storage-item';

                const usedGB = storage.used ? (storage.used / (1024 * 1024 * 1024)).toFixed(1) : '0';
                const totalGB = storage.total ? (storage.total / (1024 * 1024 * 1024)).toFixed(1) : '0';
                const percent = storage.total > 0 ? Math.round((storage.used / storage.total) * 100) : 0;

                storageItem.innerHTML = `
                    <div class="storage-header">
                        <div class="storage-name">${storage.storage || storage.node || 'Unknown'}</div>
                        <div class="storage-type">${storage.type || 'Unknown'}</div>
                    </div>
                    <div class="storage-usage">
                        <div class="usage-bar">
                            <div class="usage-fill" style="width: ${percent}%"></div>
                        </div>
                        <div class="usage-text">${usedGB} GB / ${totalGB} GB (${percent}%)</div>
                    </div>
                `;

                container.appendChild(storageItem);
            }
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
     * テストデータでビューを初期化（開発用）
     */
    initializeWithTestData() {
        console.log('Initializing Proxmox view with test data...');

        const testData = {
            nodes: [
                {
                    node: 'proxmox-01',
                    status: 'online',
                    cpu: 0.25,
                    maxcpu: 8,
                    cores: 8,
                    mem: 8 * 1024 * 1024 * 1024, // 8GB in bytes
                    maxmem: 32 * 1024 * 1024 * 1024, // 32GB in bytes
                    uptime: 2592000, // 30 days
                    vmlist: [
                        { vmid: 100, name: 'WebServer', type: 'qemu', status: 'running' },
                        { vmid: 101, name: 'Database', type: 'qemu', status: 'running' },
                        { vmid: 102, name: 'TestVM', type: 'qemu', status: 'stopped' },
                        { vmid: 200, name: 'Container-1', type: 'lxc', status: 'running' }
                    ]
                },
                {
                    node: 'proxmox-02',
                    status: 'online',
                    cpu: 0.15,
                    maxcpu: 6,
                    cores: 6,
                    mem: 6 * 1024 * 1024 * 1024,
                    maxmem: 24 * 1024 * 1024 * 1024,
                    uptime: 1728000, // 20 days
                    vmlist: [
                        { vmid: 103, name: 'BackupServer', type: 'qemu', status: 'running' },
                        { vmid: 201, name: 'Container-2', type: 'lxc', status: 'stopped' }
                    ]
                }
            ],
            storage: [
                {
                    storage: 'local-zfs',
                    type: 'zfspool',
                    total: 2 * 1024 * 1024 * 1024 * 1024, // 2TB
                    used: 800 * 1024 * 1024 * 1024, // 800GB
                    enabled: true
                },
                {
                    storage: 'nfs-storage',
                    type: 'nfs',
                    total: 5 * 1024 * 1024 * 1024 * 1024, // 5TB
                    used: 2.5 * 1024 * 1024 * 1024 * 1024, // 2.5TB
                    enabled: true
                }
            ],
            vms: [
                { vmid: 100, name: 'WebServer', type: 'qemu', status: 'running' },
                { vmid: 101, name: 'Database', type: 'qemu', status: 'running' },
                { vmid: 102, name: 'TestVM', type: 'qemu', status: 'stopped' },
                { vmid: 103, name: 'BackupServer', type: 'qemu', status: 'running' }
            ],
            containers: [
                { vmid: 200, name: 'Container-1', type: 'lxc', status: 'running' },
                { vmid: 201, name: 'Container-2', type: 'lxc', status: 'stopped' }
            ]
        };

        this.updateView(testData);
    }

    /**
     * 初期化メソッド
     */
    init() {
        console.log('ProxmoxViewController initialized');
        // 実際のデータが利用できない場合はテストデータを使用
        setTimeout(() => {
            const data = this.dataModel ? this.dataModel.getProxmoxData() : null;
            if (!data || Object.keys(data).length === 0) {
                console.log('No real data available, using test data');
                this.initializeWithTestData();
            }
        }, 1000);
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

    /**
     * 詳細ノード情報を表示
     */
    updateDetailedNodes(nodes) {
        const container = document.getElementById('detailed-nodes-content');
        if (!container) return;
        container.innerHTML = '';
        nodes.forEach(node => {
            const div = document.createElement('div');
            div.className = 'detail-node';
            const cpu = (node.cpu * 100).toFixed(1);
            const memPerc = node.memory && node.memory.percentage !== undefined
                ? node.memory.percentage.toFixed(1)
                : ((node.mem / node.maxmem) * 100).toFixed(1);
            div.innerHTML = `
                <h4>${node.node} <span class="status-dot ${node.status}"></span></h4>
                <p>CPU Usage: ${cpu}%</p>
                <p>Memory Usage: ${memPerc}%</p>
                <p>Uptime: ${this.formatUptime(node.uptime)}</p>
            `;
            container.appendChild(div);
        });
    }

    /**
     * 詳細VM/コンテナ情報を表示
     */
    updateDetailedVMs(vms, containers) {
        const vmContainer = document.getElementById('detailed-vms-content');
        if (!vmContainer) return;
        vmContainer.innerHTML = '';
        const all = vms.concat(containers);
        all.forEach(item => {
            const div = document.createElement('div');
            div.className = 'detail-vm';
            const typeStr = item.type ? item.type.toUpperCase() : 'UNKNOWN';
            div.innerHTML = `
                <h4>${item.name} (${typeStr})</h4>
                <p>ID: ${item.vmid} - Status: ${item.status}</p>
            `;
            vmContainer.appendChild(div);
        });
    }
}
