/**
 * ノード管理クラス
 */
class NodeManager {
    constructor() {
        this.nodesDetailContainer = document.getElementById('nodesContainer');
        this.currentView = 'grid'; // デフォルトはグリッドビュー
    }

    // ノード詳細の更新（概要機能を統合）
    updateNodesDetail(nodes) {
        if (!this.nodesDetailContainer) return;
        
        this.nodesDetailContainer.innerHTML = '';
        
        console.log('📊 ノード詳細更新:', nodes.length);
        
        nodes.forEach(node => {
            const detailCard = this.createNodeDetailCard(node);
            this.nodesDetailContainer.appendChild(detailCard);
        });
    }

    // ビュー切り替え
    toggleView(view) {
        this.currentView = view;
        if (this.nodesDetailContainer) {
            this.nodesDetailContainer.className = `nodes-container ${view}-view`;
        }
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
                    // 各値が数値かチェックして安全に処理
                    const safeLoad1 = (typeof load1 === 'number' && !isNaN(load1)) ? load1 : 0;
                    const safeLoad5 = (typeof load5 === 'number' && !isNaN(load5)) ? load5 : 0;
                    const safeLoad15 = (typeof load15 === 'number' && !isNaN(load15)) ? load15 : 0;
                    loadText = `${safeLoad1.toFixed(2)} / ${safeLoad5.toFixed(2)} / ${safeLoad15.toFixed(2)}`;
                } else {
                    console.warn(`⚠️ ロードアベレージが配列ではありません: ${node.name}`, node.loadavg);
                }
            }
            
            console.log(`🖥️ ノード ${node.name}: CPU=${cpuUsage.toFixed(1)}%, メモリ=${memoryUsage.toFixed(1)}%`);
            
            // ネットワーク統計のデバッグ出力
            if (node.network) {
                console.log(`🔍 ノード ${node.name} ネットワーク統計:`, {
                    interfaces: node.network.interfaces,
                    rx_rate: node.network.rx_rate,
                    tx_rate: node.network.tx_rate,
                    total: (node.network.rx_rate || 0) + (node.network.tx_rate || 0)
                });
            } else {
                console.log(`⚠️ ノード ${node.name} ネットワーク統計なし`);
            }

            // そのノード上のVM/CTのネットワーク活動を集計
            let vmNetworkActivity = 0;
            let vmNetworkDetails = [];
            if (window.dashboard && window.dashboard.lastData && window.dashboard.lastData.vms) {
                const nodeVMs = window.dashboard.lastData.vms.filter(vm => vm.node === node.name);
                vmNetworkActivity = nodeVMs.reduce((total, vm) => {
                    if (vm.netio) {
                        const vmTotal = (vm.netio.netin || 0) + (vm.netio.netout || 0);
                        if (vmTotal > 0) {
                            vmNetworkDetails.push({
                                name: vm.name,
                                id: vm.id,
                                type: vm.type,
                                activity: vmTotal
                            });
                        }
                        return total + vmTotal;
                    }
                    return total;
                }, 0);
                
                if (vmNetworkActivity > 0) {
                    console.log(`🔍 ノード ${node.name} VM/CT合計ネットワーク活動: ${(vmNetworkActivity/1024).toFixed(1)}KB/s`);
                    console.log(`🔍 活動中のVM/CT:`, vmNetworkDetails.map(vm => 
                        `${vm.type.toUpperCase()} ${vm.id} (${vm.name}): ${(vm.activity/1024).toFixed(1)}KB/s`
                    ));
                }
            }
        
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
                    
                    <div class="resource-card network">
                        <div class="resource-header">
                            <div class="resource-icon">
                                <i class="fas fa-network-wired"></i>
                            </div>
                            <div class="resource-title">ネットワーク</div>
                        </div>
                        ${node.network ? `
                            <div class="resource-value">
                                ${(() => {
                                    const rxRate = node.network.rx_rate || 0;
                                    const txRate = node.network.tx_rate || 0;
                                    const totalRate = rxRate + txRate;
                                    
                                    if (totalRate > 0) {
                                        // ホストレベルの統計が取得できている場合
                                        return formatSpeed(totalRate);
                                    } else if (vmNetworkActivity > 0) {
                                        // ホスト統計は0だが、VM/CT活動がある場合
                                        return `VM/CT: ${formatSpeed(vmNetworkActivity)}`;
                                    } else if (node.network.interfaces > 0) {
                                        // インターフェースはあるが活動なし
                                        return `${node.network.interfaces}IF アイドル`;
                                    } else {
                                        return 'データ取得中';
                                    }
                                })()}
                            </div>
                            <div class="resource-detail">
                                <div class="network-stats">
                                    ${(() => {
                                        const hostRx = node.network.rx_rate || 0;
                                        const hostTx = node.network.tx_rate || 0;
                                        const hostTotal = hostRx + hostTx;
                                        
                                        if (hostTotal > 0) {
                                            // ホスト統計が利用可能
                                            return `
                                                <div><i class="fas fa-download"></i> 受信: ${formatSpeed(hostRx)}</div>
                                                <div><i class="fas fa-upload"></i> 送信: ${formatSpeed(hostTx)}</div>
                                                <div><i class="fas fa-ethernet"></i> ${node.network.interfaces}インターフェース</div>
                                            `;
                                        } else {
                                            // ホスト統計が0の場合はVM/CT活動を表示
                                            return `
                                                <div><i class="fas fa-server"></i> ホスト統計: 取得中</div>
                                                <div><i class="fas fa-cubes"></i> VM/CT合計: ${formatSpeed(vmNetworkActivity)}</div>
                                                <div><i class="fas fa-ethernet"></i> ${node.network.interfaces}インターフェース</div>
                                            `;
                                        }
                                    })()}
                                    ${(() => {
                                        const hostTotal = (node.network.rx_rate || 0) + (node.network.tx_rate || 0);
                                        if (hostTotal === 0 && vmNetworkActivity > 0) {
                                            return '<div style="color: var(--info-color); font-style: italic;"><i class="fas fa-info-circle"></i> ホストレベル統計は取得中ですが、VM/CTは活動しています</div>';
                                        } else if (hostTotal === 0 && vmNetworkActivity === 0) {
                                            return '<div style="color: var(--text-muted); font-style: italic;"><i class="fas fa-pause-circle"></i> 現在ネットワーク活動はありません</div>';
                                        }
                                        return '';
                                    })()}
                                </div>
                            </div>
                        ` : `
                            <div class="resource-value">データなし</div>
                            <div class="resource-detail">ネットワーク統計取得不可</div>
                        `}
                    </div>
                    
                    <div class="resource-card disk">
                        <div class="resource-header">
                            <div class="resource-icon">
                                <i class="fas fa-hdd"></i>
                            </div>
                            <div class="resource-title">ディスク使用率</div>
                        </div>
                        ${node.disk && node.disk.usage_percent !== null && node.disk.usage_percent !== undefined ? `
                            <div class="resource-value">${node.disk.usage_percent.toFixed(1)}%</div>
                            <div class="resource-detail">
                                <div class="disk-stats">
                                    <div><i class="fas fa-database"></i> 使用: ${formatBytes(node.disk.total_used || 0)}</div>
                                    <div><i class="fas fa-hdd"></i> 総容量: ${formatBytes(node.disk.total_size || 0)}</div>
                                    <div><i class="fas fa-server"></i> ${node.disk.disks_count || 0}台のディスク</div>
                                </div>
                            </div>
                            <div class="progress-bar">
                                <div class="progress-fill ${getProgressClass(node.disk.usage_percent)}" 
                                     style="width: ${Math.min(node.disk.usage_percent, 100)}%"></div>
                            </div>
                        ` : `
                            <div class="resource-value">データなし</div>
                            <div class="resource-detail">ディスク統計取得不可</div>
                        `}
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
}
