/**
 * VM/コンテナ管理クラス
 */
class VMManager {
    constructor() {
        this.vmsContainer = document.getElementById('vmsContainer');
        this.currentFilter = 'all';
    }

    // VM/CT情報の更新
    updateVMs(vms) {
        if (!this.vmsContainer) return;
        
        this.vmsContainer.innerHTML = '';
        
        console.log('🖥️ VM/CT更新:', vms.length);
        
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
}
