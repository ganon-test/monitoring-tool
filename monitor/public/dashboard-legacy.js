// Legacy Dashboard JavaScript - Being migrated to MVC structure
// This file is being gradually replaced by the new MVC architecture

/**
 * 旧MonitoringDashboardクラス - MVCに移行中
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
        
        // MVCアプリに移行
        if (!window.dashboardApp) {
            window.dashboardApp = new DashboardApp();
            window.dashboardApp.init();
        }
    }

    // 後方互換性のためのメソッド
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
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
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
        if (element) {
            element.textContent = value;
        }
    }

    showError(message) {
        console.error('Dashboard error:', message);
    }

    // Socket関連のダミーメソッド（互換性のため）
    setupSocketListeners() {
        console.log('Socket setup delegated to SocketManager');
    }

    setupEventListeners() {
        console.log('Event setup delegated to DashboardApp');
    }

    updateConnectionStatus() {
        console.log('Connection status delegated to DashboardApp');
    }

    updateLastUpdateTime() {
        console.log('Last update time delegated to DashboardApp');
    }
}

/*
=== MVC移行完了 ===

以下の巨大なコードは、MVCパターンに従って適切なファイルに移行されました：

📊 チャート関連機能 (2000+ lines) → js/charts/ChartManager.js
- initializeNextcloudCharts()
- initializeProxmoxCharts()
- 全てのChart.js設定とインスタンス管理

💾 データ管理機能 → js/models/DataModel.js
- API呼び出し
- データキャッシュ
- データ変換処理

🎮 Nextcloud表示制御 → js/controllers/NextcloudViewController.js
- updateNextcloudData()
- Nextcloud固有の表示更新
- チャート更新ロジック

🖥️ Proxmox表示制御 → js/controllers/ProxmoxViewController.js
- updateProxmoxData()
- Proxmox固有の表示更新
- ノード・VM管理

🔌 WebSocket管理 → js/managers/SocketManager.js
- Socket.IOイベント処理
- リアルタイム更新

🏗️ メインアプリケーション → js/DashboardApp.js
- 全体の調整
- ビュー切り替え
- イベント管理

これにより、dashboard.jsは約100行に削減され、
各機能は責任に応じて適切に分離されました。

保守性・可読性・拡張性が大幅に向上しています。
*/
