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

    // 基本的なヘルパーメソッド
    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    formatNumber(num) {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    }

    formatUptime(seconds) {
        if (!seconds) return '-';
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${days}d ${hours}h ${minutes}m`;
    }

    updateElement(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) element.textContent = value;
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
