/**
 * ノード管理クラス
 */
class NodeManager {
    constructor() {
        this.nodesOverviewContainer = document.getElementById('nodesOverviewContainer');
        this.nodesDetailContainer = document.getElementById('nodesContainer');
    }

    // ノード概要カードの更新
    updateNodesOverview(nodes) {
        if (!this.nodesOverviewContainer) return;
        
        this.nodesOverviewContainer.innerHTML = '';
        
        console.log('📊 ノード概要更新:', nodes.length);
        
        nodes.forEach(node => {
            const overviewCard = this.createNodeOverviewCard(node);
            this.nodesOverviewContainer.appendChild(overviewCard);
        });
    }

    // ノード詳細の更新
    updateNodesDetail(nodes) {
        if (!this.nodesDetailContainer) return;
        
        this.nodesDetailContainer.innerHTML = '';
        
        nodes.forEach(node => {
            const detailCard = this.createNodeDetailCard(node);
            this.nodesDetailContainer.appendChild(detailCard);
        });
    }

    // ノード概要カードの作成
    createNodeOverviewCard(node) {
        const card = document.createElement('div');
        card.className = 'node-overview-card';
        card.dataset.nodeName = node.name;
        
        const statusClass = node.status === 'online' ? 'online' : 'offline';
        const cpuUsage = node.cpu || 0;
        const memoryUsage = node.memory_percent || 0;
        
        // VM/CT統計（このノードの分のみ）
        const nodeVMs = (window.dashboard?.lastData?.vms || []).filter(vm => vm.node === node.name);
        const runningVMs = nodeVMs.filter(vm => vm.status === 'running');
        
        card.innerHTML = `
            <div class="node-overview-header">
                <div class="node-title">
                    <i class="fas fa-server"></i>
                    ${node.name}
                </div>
                <div class="status-badge ${statusClass}">${node.status}</div>
            </div>
            
            <div class="node-overview-stats">
                <div class="overview-stat cpu">
                    <div class="stat-icon">
                        <i class="fas fa-microchip"></i>
                    </div>
                    <div class="stat-info">
                        <div class="stat-label">CPU</div>
                        <div class="stat-value">${cpuUsage.toFixed(1)}%</div>
                        <div class="progress-bar mini">
                            <div class="progress-fill ${getProgressClass(cpuUsage)}" 
                                 style="width: ${Math.min(cpuUsage, 100)}%"></div>
                        </div>
                    </div>
                </div>
                
                <div class="overview-stat memory">
                    <div class="stat-icon">
                        <i class="fas fa-memory"></i>
                    </div>
                    <div class="stat-info">
                        <div class="stat-label">メモリ</div>
                        <div class="stat-value">${memoryUsage.toFixed(1)}%</div>
                        <div class="progress-bar mini">
                            <div class="progress-fill ${getProgressClass(memoryUsage)}" 
                                 style="width: ${Math.min(memoryUsage, 100)}%"></div>
                        </div>
                    </div>
                </div>
                
                <div class="overview-stat vms">
                    <div class="stat-icon">
                        <i class="fas fa-desktop"></i>
                    </div>
                    <div class="stat-info">
                        <div class="stat-label">VM/CT</div>
                        <div class="stat-value">${runningVMs.length}/${nodeVMs.length}</div>
                        <div class="stat-detail">稼働中</div>
                    </div>
                </div>
                
                <div class="overview-stat uptime">
                    <div class="stat-icon">
                        <i class="fas fa-clock"></i>
                    </div>
                    <div class="stat-info">
                        <div class="stat-label">アップタイム</div>
                        <div class="stat-value">${formatUptime(node.uptime || 0)}</div>
                    </div>
                </div>
            </div>
        `;
        
        return card;
    }

    // ノード詳細カードの作成
    createNodeDetailCard(node) {
        const card = document.createElement('div');
        card.className = 'node-detail-card';
        card.dataset.nodeName = node.name;
        
        try {
            const statusClass = node.status === 'online' ? 'online' : 'offline';
            const cpuUsage = node.cpu || 0;
            
            // メモリ使用率の正確な計算
            let memoryUsage = 0;
            let memoryText = '0 GB / 0 GB';
            
            if (node.memory_percent !== undefined) {
                memoryUsage = node.memory_percent;
            } else if (node.memory_total && node.memory_total > 0) {
                memoryUsage = (node.memory_used / node.memory_total) * 100;
            }
            
            if (node.memory_used && node.memory_total) {
                const usedGB = (node.memory_used / 1024 / 1024 / 1024).toFixed(1);
                const totalGB = (node.memory_total / 1024 / 1024 / 1024).toFixed(1);
                memoryText = `${usedGB} GB / ${totalGB} GB`;
            }
            
            // アップタイム計算
            const uptimeText = formatUptime(node.uptime || 0);
            
            // ロードアベレージ（安全な処理）
            let loadText = '0.00 / 0.00 / 0.00';
            if (node.loadavg) {
                if (Array.isArray(node.loadavg)) {
                    const [load1, load5, load15] = node.loadavg;
                    loadText = `${(load1 || 0).toFixed(2)} / ${(load5 || 0).toFixed(2)} / ${(load15 || 0).toFixed(2)}`;
                } else {
                    console.warn(`⚠️ ロードアベレージが配列ではありません: ${node.name}`, node.loadavg);
                }
            }
            
            console.log(`🖥️ ノード ${node.name}: CPU=${cpuUsage.toFixed(1)}%, メモリ=${memoryUsage.toFixed(1)}%`);
        
            card.innerHTML = `
                <div class="node-header">
                    <div class="node-info">
                        <div class="node-title">${node.name || node.node}</div>
                        <div class="node-subtitle">
                            ${node.source_host ? `データ元: ${node.source_host}` : ''}
                            ${uptimeText ? ` • アップタイム: ${uptimeText}` : ''}
                        </div>
                    </div>
                    <div class="status-badge ${statusClass}">${node.status}</div>
                </div>
                
                <div class="resource-grid">
                    <div class="resource-card cpu">
                        <div class="resource-header">
                            <div class="resource-icon">
                                <i class="fas fa-microchip"></i>
                            </div>
                            <div class="resource-title">CPU使用率</div>
                        </div>
                        <div class="resource-value">${cpuUsage.toFixed(1)}%</div>
                        <div class="progress-bar">
                            <div class="progress-fill ${getProgressClass(cpuUsage)}" 
                                 style="width: ${Math.min(cpuUsage, 100)}%"></div>
                        </div>
                    </div>
                    
                    <div class="resource-card memory">
                        <div class="resource-header">
                            <div class="resource-icon">
                                <i class="fas fa-memory"></i>
                            </div>
                            <div class="resource-title">メモリ使用率</div>
                        </div>
                        <div class="resource-value">${memoryUsage.toFixed(1)}%</div>
                        <div class="resource-detail">${memoryText}</div>
                        <div class="progress-bar">
                            <div class="progress-fill ${getProgressClass(memoryUsage)}" 
                                 style="width: ${Math.min(memoryUsage, 100)}%"></div>
                        </div>
                    </div>
                    
                    <div class="resource-card load">
                        <div class="resource-header">
                            <div class="resource-icon">
                                <i class="fas fa-chart-line"></i>
                            </div>
                            <div class="resource-title">ロードアベレージ</div>
                        </div>
                        <div class="resource-value load-values">${loadText}</div>
                        <div class="resource-detail">1分 / 5分 / 15分</div>
                    </div>
                </div>
            `;
            
        } catch (error) {
            console.error(`❌ ノードカード作成エラー (${node.name}):`, error);
            card.innerHTML = `
                <div class="node-header">
                    <div class="node-info">
                        <div class="node-title">${node.name || node.node}</div>
                        <div class="node-subtitle">エラー: カード作成に失敗</div>
                    </div>
                    <div class="status-badge offline">error</div>
                </div>
            `;
        }
        
        return card;
    }

    // ビュー切り替え
    toggleView(view) {
        if (this.nodesOverviewContainer) {
            this.nodesOverviewContainer.className = `nodes-overview-container ${view}-view`;
        }
    }
}
