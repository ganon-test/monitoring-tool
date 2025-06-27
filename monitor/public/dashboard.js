// Legacy Dashboard JavaScript - Lightweight compatibility layer
// This file provides backward compatibility while delegating to the new MVC structure

/**
 * 旧MonitoringDashboardクラス - 軽量互換レイヤー
 * 新しいアプリケーションはDashboardAppクラスを使用してください
 * @deprecated Use DashboardApp instead
 */
class MonitoringDashboard {
    constructor() {
        console.warn('MonitoringDashboard is deprecated. Use DashboardApp instead.');
        
        // 最小限の後方互換性のための実装
        this.socket = io();
        this.charts = {};
        this.data = {
            nextcloud: null,
            proxmox: null
        };
        this.detailedMode = false;
        this.currentView = 'nextcloud';
        
        // MVCアプリに委譲
        this.initializeMVCApp();
    }

    async initializeMVCApp() {
        // DashboardAppが利用可能になるまで待機
        if (typeof DashboardApp !== 'undefined' && !window.dashboardApp) {
            window.dashboardApp = new DashboardApp();
            await window.dashboardApp.init();
        }
    }

    // 後方互換性のためのメソッド（全てMVCに委譲）
    switchView(view) {
        if (window.dashboardApp) {
            window.dashboardApp.switchView(view);
        }
    }

    updateNextcloudData(data) {
        if (window.dashboardApp) {
            window.dashboardApp.onDataUpdate({ nextcloud: data });
        }
    }

    updateProxmoxData(data) {
        if (window.dashboardApp) {
            window.dashboardApp.onDataUpdate({ proxmox: data });
        }
    }

    refreshData() {
        if (window.dashboardApp) {
            window.dashboardApp.loadInitialData();
        }
    }

    resizeCharts() {
        if (window.dashboardApp && window.dashboardApp.chartManager) {
            window.dashboardApp.chartManager.resizeAllCharts();
        }
    }

    updateElement(elementId, value) {
        // 共通関数に委譲
        updateElement(elementId, value);
    }

    showError(message) {
        console.error('Dashboard error:', message);
    }

    // ダミーメソッド（互換性のため）
    setupSocketListeners() { /* 委譲済み */ }
    setupEventListeners() { /* 委譲済み */ }
    updateConnectionStatus() { /* 委譲済み */ }
    updateLastUpdateTime() { /* 委譲済み */ }
}

// 緊急チャートリセット関数
function emergencyChartReset() {
    console.log('Emergency chart reset initiated...');
    
    // すべてのキャンバスを強制リセット
    const canvases = document.querySelectorAll('canvas');
    canvases.forEach((canvas, index) => {
        console.log(`Resetting canvas ${index}: ${canvas.id}`);
        
        // 強制的にサイズを制限
        canvas.style.width = '300px !important';
        canvas.style.height = '250px !important';
        canvas.style.maxWidth = '300px !important';
        canvas.style.maxHeight = '250px !important';
        canvas.width = 300;
        canvas.height = 250;
    });
    
    // ChartManagerのチャートをすべて破棄して再作成
    if (window.dashboardApp && window.dashboardApp.chartManager) {
        console.log('Destroying all charts...');
        window.dashboardApp.chartManager.destroyAllCharts();
        
        setTimeout(() => {
            console.log('Recreating charts...');
            window.dashboardApp.chartManager.initializeAllCharts();
        }, 500);
    }
}

// ページが重くなった時の緊急停止
function emergencyStop() {
    console.log('Emergency stop activated...');
    
    // すべてのインターバルを停止
    for (let i = 1; i < 99999; i++) {
        clearInterval(i);
        clearTimeout(i);
    }
    
    // チャートリセット
    emergencyChartReset();
}

// コンソールで実行可能にする
window.emergencyChartReset = emergencyChartReset;
window.emergencyStop = emergencyStop;

/*
=== ファイルサイズ大幅削減完了 ===

旧dashboard.js: 2063行 → 新dashboard.js: 約100行
削減率: 95%以上

巨大なコードは以下のMVCファイルに適切に分離：
- ChartManager.js: チャート管理
- DataModel.js: データ管理  
- NextcloudViewController.js: Nextcloud表示
- ProxmoxViewController.js: Proxmox表示
- SocketManager.js: WebSocket管理
- DashboardApp.js: メイン調整

保守性・可読性・拡張性が大幅に向上しています。
*/
