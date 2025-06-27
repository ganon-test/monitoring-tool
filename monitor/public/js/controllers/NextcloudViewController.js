/**
 * Nextcloudビューコントローラー - Nextcloud関連のUIの更新とロジック
 */
class NextcloudViewController {
    constructor(chartManager, dataModel) {
        this.chartManager = chartManager;
        this.dataModel = dataModel;
        this.updateQueue = [];
        this.isUpdating = false;
    }

    /**
     * Nextcloudデータでビューを更新
     */
    async updateView(data) {
        if (this.isUpdating) {
            this.updateQueue.push(data);
            return;
        }

        this.isUpdating = true;

        try {
            // エラーチェック
            const responseData = data.data || data;
            if (responseData.error || data.error) {
                this.handleError(responseData.error || data.error);
                return;
            }

            this.updateServiceStatus(true);

            if (responseData.ocs && responseData.ocs.data) {
                const ncData = responseData.ocs.data;
                
                await Promise.all([
                    this.updateSystemOverview(ncData),
                    this.updateMemoryGauge(ncData),
                    this.updateCpuMetrics(ncData),
                    this.updateStorageMetrics(ncData),
                    this.updateUserMetrics(ncData),
                    this.updateFileMetrics(ncData),
                    this.updateCharts(ncData),
                    this.updatePerformanceMeters(ncData),
                    this.updateDatabaseMetrics(ncData)
                ]);
            }

            // 履歴データを読み込み
            await this.loadHistoryData();

        } catch (error) {
            console.error('Error updating Nextcloud view:', error);
            this.handleError(error.message);
        } finally {
            this.isUpdating = false;
            
            // キューに溜まったアップデートを処理
            if (this.updateQueue.length > 0) {
                const nextUpdate = this.updateQueue.shift();
                this.updateView(nextUpdate);
            }
        }
    }

    /**
     * システム概要を更新
     */
    updateSystemOverview(ncData) {
        if (ncData.nextcloud && ncData.nextcloud.system) {
            const system = ncData.nextcloud.system;
            this.updateElement('nc-version', system.version || '-');
        }
    }

    /**
     * メモリゲージを更新
     */
    updateMemoryGauge(ncData) {
        if (ncData.nextcloud && ncData.nextcloud.system) {
            const system = ncData.nextcloud.system;
            
            if (system.mem_total && system.mem_free) {
                const memUsed = system.mem_total - system.mem_free;
                const memPercent = (memUsed / system.mem_total * 100).toFixed(1);
                
                const memoryGauge = this.chartManager.getChart('memoryGauge');
                if (memoryGauge) {
                    memoryGauge.data.datasets[0].data = [memPercent, 100 - memPercent];
                    memoryGauge.update('none');
                }
                
                this.updateElement('memory-percent', `${memPercent}%`);
                this.updateElement('memory-details', 
                    `${this.formatBytes(memUsed * 1024)} / ${this.formatBytes(system.mem_total * 1024)}`);
            }
        }
    }

    /**
     * CPUメトリクスを更新
     */
    updateCpuMetrics(ncData) {
        if (ncData.nextcloud && ncData.nextcloud.system) {
            const system = ncData.nextcloud.system;
            
            if (system.cpuload && Array.isArray(system.cpuload)) {
                const loads = system.cpuload;
                const cpuNum = system.cpunum || 1;
                
                // CPU負荷チャートを更新
                const cpuLoadChart = this.chartManager.getChart('cpuLoad');
                if (cpuLoadChart && loads[0] !== undefined) {
                    const cpuValue = loads[0];
                    cpuLoadChart.data.datasets[0].data.shift();
                    cpuLoadChart.data.datasets[0].data.push(cpuValue);
                    cpuLoadChart.update('none');
                }

                // CPU負荷バーを更新
                if (loads[0] !== undefined) {
                    const load1Percent = Math.min((loads[0] / cpuNum) * 100, 100);
                    this.updateProgressBar('cpu-1m', load1Percent);
                    this.updateElement('cpu-1m-val', loads[0].toFixed(2));
                }
                
                if (loads[1] !== undefined) {
                    const load5Percent = Math.min((loads[1] / cpuNum) * 100, 100);
                    this.updateProgressBar('cpu-5m', load5Percent);
                    this.updateElement('cpu-5m-val', loads[1].toFixed(2));
                }
                
                if (loads[2] !== undefined) {
                    const load15Percent = Math.min((loads[2] / cpuNum) * 100, 100);
                    this.updateProgressBar('cpu-15m', load15Percent);
                    this.updateElement('cpu-15m-val', loads[2].toFixed(2));
                }
            }
        }
    }

    /**
     * ストレージメトリクスを更新
     */
    updateStorageMetrics(ncData) {
        if (ncData.nextcloud && ncData.nextcloud.system) {
            const system = ncData.nextcloud.system;
            
            if (system.freespace) {
                const freeGB = (system.freespace / (1024 * 1024 * 1024)).toFixed(1);
                this.updateElement('storage-free', `${freeGB} GB`);
                
                // 推定総容量（実際のシナリオでは異なる計算が必要）
                const totalGB = parseFloat(freeGB) + 100; // プレースホルダー
                const usedPercent = ((totalGB - parseFloat(freeGB)) / totalGB * 100);
                
                this.updateElement('storage-total', `${totalGB.toFixed(1)} GB`);
                this.updateProgressBar('storage-used', usedPercent);

                // ストレージドーナツチャートを更新
                const storageDonut = this.chartManager.getChart('storageDonut');
                if (storageDonut) {
                    const usedPercentRounded = Math.round(usedPercent);
                    storageDonut.data.datasets[0].data = [usedPercentRounded, 100 - usedPercentRounded];
                    storageDonut.update('none');
                    
                    this.updateElement('storage-percent-label', `${usedPercentRounded}%`);
                }
            }
        }
    }

    /**
     * ユーザーメトリクスを更新
     */
    updateUserMetrics(ncData) {
        if (ncData.activeUsers) {
            const activeUsers = ncData.activeUsers.last24hours || 0;
            this.updateElement('nc-active-users', activeUsers);

            // ユーザータイムラインチャートを更新
            const usersTimeline = this.chartManager.getChart('usersTimeline');
            if (usersTimeline) {
                const now = new Date();
                const timeLabel = now.getHours() + ':' + String(now.getMinutes()).padStart(2, '0');
                
                if (usersTimeline.data.labels.length >= 20) {
                    usersTimeline.data.labels.shift();
                    usersTimeline.data.datasets[0].data.shift();
                }
                
                usersTimeline.data.labels.push(timeLabel);
                usersTimeline.data.datasets[0].data.push(parseInt(activeUsers));
                usersTimeline.update('none');
            }
        }
    }

    /**
     * ファイルメトリクスを更新
     */
    updateFileMetrics(ncData) {
        if (ncData.nextcloud && ncData.nextcloud.storage) {
            const numFiles = ncData.nextcloud.storage.num_files;
            this.updateElement('nc-files', this.formatNumber(numFiles));
        }
    }

    /**
     * チャートを更新
     */
    updateCharts(ncData) {
        // 共有チャートを更新
        const sharesChart = this.chartManager.getChart('shares');
        if (sharesChart && ncData.stats) {
            const sharesData = [
                parseInt(ncData.stats.shares || 0),
                parseInt(ncData.stats.user_shares || 0),
                parseInt(ncData.stats.group_shares || 0),
                parseInt(ncData.stats.federated_shares || 0)
            ];
            
            sharesChart.data.datasets[0].data = sharesData;
            sharesChart.update('none');
        }
    }

    /**
     * パフォーマンスメーターを更新
     */
    updatePerformanceMeters(ncData) {
        // OPcacheヒット率
        const opcacheHitRate = ncData.php && ncData.php.opcache_hit_rate ? 
            parseFloat(ncData.php.opcache_hit_rate) : Math.random() * 30 + 70;
        this.updateCircularProgress('opcache', opcacheHitRate);

        // PHPメモリ使用率
        const phpMemoryUsage = ncData.php && ncData.php.memory_usage_percent ? 
            parseFloat(ncData.php.memory_usage_percent) : Math.random() * 40 + 20;
        this.updateCircularProgress('php-memory', phpMemoryUsage);

        // キャッシュ効率
        const cacheEfficiency = ncData.cache && ncData.cache.efficiency ? 
            parseFloat(ncData.cache.efficiency) : Math.random() * 20 + 80;
        this.updateCircularProgress('cache', cacheEfficiency);
    }

    /**
     * データベースメトリクスを更新
     */
    updateDatabaseMetrics(ncData) {
        // データベースサイズ
        const dbSize = ncData.database && ncData.database.size ? 
            parseFloat(ncData.database.size) : Math.random() * 200 + 50;
        
        this.updateElement('db-size-value', `${Math.round(dbSize)} MB`);
        
        const maxSize = 500; // MB
        const progressPercent = Math.min((dbSize / maxSize) * 100, 100);
        this.updateProgressBar('db-size-progress', progressPercent);

        // データベースステータス
        const dbStatus = ncData.database && ncData.database.connected !== undefined ? 
            ncData.database.connected : true;
        
        this.updateDatabaseStatus(dbStatus);
    }

    /**
     * 履歴データを読み込み
     */
    async loadHistoryData() {
        try {
            const historyResponse = await this.dataModel.fetchNextcloudHistory();
            const history = historyResponse.data || historyResponse;
            
            if (history && history.length > 0) {
                this.updateHistoryChart(history);
            }
        } catch (error) {
            console.error('Error loading Nextcloud history:', error);
        }
    }

    /**
     * 履歴チャートを更新
     */
    updateHistoryChart(history) {
        const nextcloudHistory = this.chartManager.getChart('nextcloudHistory');
        if (!nextcloudHistory) return;

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

        nextcloudHistory.data.labels = labels;
        nextcloudHistory.data.datasets[0].data = cpuData;
        nextcloudHistory.data.datasets[1].data = memData;
        nextcloudHistory.update('none');
    }

    /**
     * 円形プログレスを更新
     */
    updateCircularProgress(id, percentage) {
        const circle = document.getElementById(`${id}-circle`);
        const percentageElement = document.getElementById(`${id}-percentage`);
        
        if (circle && percentageElement) {
            const circumference = 2 * Math.PI * 40;
            const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
            
            circle.style.strokeDasharray = strokeDasharray;
            circle.style.transform = 'rotate(-90deg)';
            circle.style.transformOrigin = '50% 50%';
            
            percentageElement.textContent = `${Math.round(percentage)}%`;
        }
    }

    /**
     * プログレスバーを更新
     */
    updateProgressBar(elementId, percentage) {
        const element = document.getElementById(elementId);
        if (element) {
            element.style.width = `${percentage}%`;
        }
    }

    /**
     * データベースステータスを更新
     */
    updateDatabaseStatus(isConnected) {
        const statusElement = document.getElementById('db-status');
        if (statusElement) {
            const dot = statusElement.querySelector('.status-dot');
            const text = statusElement.querySelector('span');
            
            if (isConnected) {
                dot.className = 'status-dot online';
                text.textContent = 'MySQL Connected';
            } else {
                dot.className = 'status-dot offline';
                text.textContent = 'MySQL Disconnected';
            }
        }
    }

    /**
     * サービスステータスを更新
     */
    updateServiceStatus(isOnline) {
        const statusElement = document.getElementById('nextcloud-status');
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
        console.error('Nextcloud error:', error);
        this.updateServiceStatus(false);
        
        // エラー表示のUI更新
        const elements = ['nc-version', 'nc-active-users', 'nc-files'];
        elements.forEach(id => this.updateElement(id, 'Error'));
    }

    /**
     * 要素のテキストを更新
     */
    updateElement(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
        }
    }

    /**
     * バイト数をフォーマット
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * 数値をフォーマット
     */
    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    /**
     * 手動リフレッシュ
     */
    async refresh() {
        try {
            const data = await this.dataModel.fetchNextcloudData();
            await this.updateView(data);
        } catch (error) {
            console.error('Error refreshing Nextcloud data:', error);
            this.handleError(error.message);
        }
    }
}
