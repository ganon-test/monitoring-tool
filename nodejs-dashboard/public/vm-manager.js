/**
 * VM/コンテナ管理クラス
 */
class VMManager {
    constructor() {
        this.vmsContainer = document.getElementById('vmsContainer');
        this.currentFilter = 'all';
        this.selectedVMId = null;
        this.vmData = new Map(); // VM詳細データを保存
        this.initEventListeners();
    }

    // イベントリスナーの初期化
    initEventListeners() {
        // VM詳細モーダルのイベント
        const vmDetailModal = document.getElementById('vmDetailModal');
        const vmDetailModalClose = document.getElementById('vmDetailModalClose');
        const vmDetailClose = document.getElementById('vmDetailClose');
        const vmDetailRefresh = document.getElementById('vmDetailRefresh');

        if (vmDetailModalClose) {
            vmDetailModalClose.addEventListener('click', () => this.closeVMDetail());
        }
        if (vmDetailClose) {
            vmDetailClose.addEventListener('click', () => this.closeVMDetail());
        }
        if (vmDetailRefresh) {
            vmDetailRefresh.addEventListener('click', () => this.refreshVMDetail());
        }

        // モーダル外クリックで閉じる
        if (vmDetailModal) {
            vmDetailModal.addEventListener('click', (e) => {
                if (e.target === vmDetailModal) {
                    this.closeVMDetail();
                }
            });
        }
    }

    // VM/CT情報の更新
    updateVMs(vms) {
        if (!this.vmsContainer) return;
        
        this.vmsContainer.innerHTML = '';
        
        console.log('🖥️ VM/CT更新:', vms.length);
        
        // VM詳細データを保存
        vms.forEach(vm => {
            this.vmData.set(vm.id, vm);
        });
        
        const filteredVMs = this.filterVMs(vms, this.currentFilter);
        
        filteredVMs.forEach(vm => {
            const vmCard = this.createVMCard(vm);
            this.vmsContainer.appendChild(vmCard);
        });
    }

    // VMカードの作成
    createVMCard(vm) {
        const card = document.createElement('div');
        card.className = 'vm-card';
        card.dataset.vmId = vm.id;
        card.dataset.status = vm.status;
        
        // クリックイベントを追加
        card.addEventListener('click', () => this.showVMDetail(vm.id));
        
        const statusClass = vm.status === 'running' ? 'running' : 'stopped';
        const typeIcon = vm.type === 'container' ? 'fa-cube' : 'fa-desktop';
        const typeLabel = vm.type === 'container' ? 'CT' : 'VM';
        
        const cpuUsage = vm.cpu || 0;
        const memoryUsage = vm.maxmem > 0 ? (vm.memory / vm.maxmem * 100) : 0;
        
        card.innerHTML = `
            <div class="vm-header">
                <div class="vm-info">
                    <div class="vm-type">
                        <i class="fas ${typeIcon}"></i>
                        ${typeLabel}
                    </div>
                    <div class="vm-title">${vm.name}</div>
                    <div class="vm-subtitle">ID: ${vm.id} • ノード: ${vm.node}</div>
                </div>
                <div class="status-badge ${statusClass}">${vm.status}</div>
            </div>
            
            ${vm.status === 'running' ? `
                <div class="vm-resources">
                    <div class="vm-resource cpu">
                        <div class="resource-label">
                            <i class="fas fa-microchip"></i>
                            CPU
                        </div>
                        <div class="resource-value">${cpuUsage.toFixed(1)}%</div>
                        <div class="progress-bar mini">
                            <div class="progress-fill ${getProgressClass(cpuUsage)}" 
                                 style="width: ${Math.min(cpuUsage, 100)}%"></div>
                        </div>
                    </div>
                    
                    <div class="vm-resource memory">
                        <div class="resource-label">
                            <i class="fas fa-memory"></i>
                            メモリ
                        </div>
                        <div class="resource-value">${memoryUsage.toFixed(1)}%</div>
                        <div class="resource-detail">
                            ${formatBytes(vm.memory)} / ${formatBytes(vm.maxmem)}
                        </div>
                        <div class="progress-bar mini">
                            <div class="progress-fill ${getProgressClass(memoryUsage)}" 
                                 style="width: ${Math.min(memoryUsage, 100)}%"></div>
                        </div>
                    </div>
                </div>
            ` : ''}
        `;
        
        return card;
    }

    // VMフィルタリング
    filterVMs(vms, filter) {
        switch (filter) {
            case 'running':
                return vms.filter(vm => vm.status === 'running');
            case 'stopped':
                return vms.filter(vm => vm.status === 'stopped');
            default:
                return vms;
        }
    }

    // フィルター設定
    setFilter(filter) {
        this.currentFilter = filter;
        
        // フィルターボタンの状態更新
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.filter === filter) {
                btn.classList.add('active');
            }
        });
        
        // 現在のデータを再フィルター
        if (window.dashboard && window.dashboard.lastData) {
            const allVMs = window.dashboard.lastData.vms || [];
            this.updateVMs(allVMs);
        }
    }

    // VM詳細表示
    showVMDetail(vmId) {
        const vm = this.vmData.get(vmId);
        if (!vm) return;

        this.selectedVMId = vmId;
        
        // モーダルのタイトル更新
        const title = document.getElementById('vmDetailTitle');
        const typeIcon = vm.type === 'container' ? 'fa-cube' : 'fa-desktop';
        const typeLabel = vm.type === 'container' ? 'CT' : 'VM';
        title.innerHTML = `<i class="fas ${typeIcon}"></i> ${typeLabel} ${vm.name} 詳細情報`;

        // 基本情報
        document.getElementById('vmDetailId').textContent = vm.id;
        document.getElementById('vmDetailName').textContent = vm.name;
        document.getElementById('vmDetailType').textContent = typeLabel;
        document.getElementById('vmDetailNode').textContent = vm.node;
        document.getElementById('vmDetailStatus').textContent = vm.status;
        document.getElementById('vmDetailUptime').textContent = vm.uptime ? formatUptime(vm.uptime) : '--';

        // リソース情報
        const cpuUsage = vm.cpu || 0;
        const memoryUsage = vm.maxmem > 0 ? (vm.memory / vm.maxmem * 100) : 0;
        
        document.getElementById('vmDetailCpuUsage').textContent = `${cpuUsage.toFixed(1)}%`;
        document.getElementById('vmDetailCpuCores').textContent = vm.cpus || '--';
        document.getElementById('vmDetailMemUsage').textContent = `${memoryUsage.toFixed(1)}% (${formatBytes(vm.memory)})`;
        document.getElementById('vmDetailMemMax').textContent = formatBytes(vm.maxmem);
        
        const diskUsage = vm.maxdisk > 0 ? (vm.disk / vm.maxdisk * 100) : 0;
        document.getElementById('vmDetailDiskUsage').textContent = `${diskUsage.toFixed(1)}% (${formatBytes(vm.disk || 0)})`;
        document.getElementById('vmDetailDiskMax').textContent = formatBytes(vm.maxdisk || 0);

        // ネットワーク情報（新しいnetioデータを使用）
        if (vm.netio) {
            document.getElementById('vmDetailNetOut').textContent = formatBytes(vm.netio.netout) + '/s';
            document.getElementById('vmDetailNetIn').textContent = formatBytes(vm.netio.netin) + '/s';
        } else {
            document.getElementById('vmDetailNetOut').textContent = '--';
            document.getElementById('vmDetailNetIn').textContent = '--';
        }

        // ディスクI/O情報（新しいdiskioデータを使用）
        if (vm.diskio) {
            document.getElementById('vmDetailDiskRead').textContent = formatBytes(vm.diskio.diskread) + '/s';
            document.getElementById('vmDetailDiskWrite').textContent = formatBytes(vm.diskio.diskwrite) + '/s';
        } else {
            document.getElementById('vmDetailDiskRead').textContent = '--';
            document.getElementById('vmDetailDiskWrite').textContent = '--';
        }

        // カードの選択状態を更新
        this.updateCardSelection(vmId);

        // モーダルを表示
        const modal = document.getElementById('vmDetailModal');
        modal.classList.add('show');
    }

    // VM詳細モーダルを閉じる
    closeVMDetail() {
        const modal = document.getElementById('vmDetailModal');
        modal.classList.remove('show');
        this.selectedVMId = null;
        
        // カード選択状態をクリア
        this.updateCardSelection(null);
    }

    // VM詳細情報を更新
    async refreshVMDetail() {
        if (this.selectedVMId && window.dashboard) {
            try {
                // ローディング表示
                window.dashboard.showLoading();
                
                // 最新データを取得してモーダルを更新
                await window.dashboard.loadInitialData();
                
                console.log('🔄 VM詳細情報更新完了');
            } catch (error) {
                console.error('❌ VM詳細情報更新エラー:', error);
                window.dashboard.showError('VM詳細情報の更新に失敗しました');
            } finally {
                // ローディング非表示
                window.dashboard.hideLoading();
            }
        }
    }

    // カード選択状態の更新
    updateCardSelection(selectedId) {
        document.querySelectorAll('.vm-card').forEach(card => {
            card.classList.remove('selected');
            if (selectedId && card.dataset.vmId === selectedId) {
                card.classList.add('selected');
            }
        });
    }
}
