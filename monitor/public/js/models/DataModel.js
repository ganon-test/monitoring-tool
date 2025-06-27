/**
 * データモデル - APIからのデータ取得と管理
 */
class DataModel {
    constructor() {
        this.data = {
            nextcloud: null,
            proxmox: null,
            lastUpdate: null
        };
        this.cache = new Map();
        this.cacheTimeout = 30000; // 30秒
    }

    /**
     * 初期化メソッド
     */
    async init() {
        console.log('DataModel initialized');
        // 初期化時に必要な処理があればここに追加
    }

    /**
     * Nextcloudデータを更新
     */
    updateNextcloudData(data) {
        this.data.nextcloud = data;
        this.data.lastUpdate = new Date();
    }

    /**
     * Proxmoxデータを更新
     */
    updateProxmoxData(data) {
        this.data.proxmox = data;
        this.data.lastUpdate = new Date();
    }

    /**
     * Nextcloudデータを取得
     */
    getNextcloudData() {
        return this.data.nextcloud;
    }

    /**
     * Proxmoxデータを取得
     */
    getProxmoxData() {
        return this.data.proxmox;
    }

    /**
     * Nextcloudデータを取得
     */
    async fetchNextcloudData() {
        try {
            const response = await fetch('/api/nextcloud');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const data = await response.json();
            this.data.nextcloud = data;
            this.data.lastUpdate = new Date();
            return data;
        } catch (error) {
            console.error('Error fetching Nextcloud data:', error);
            return { error: error.message };
        }
    }

    /**
     * Proxmoxデータを取得
     */
    async fetchProxmoxData() {
        try {
            const response = await fetch('/api/proxmox');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const data = await response.json();
            this.data.proxmox = data;
            this.data.lastUpdate = new Date();
            return data;
        } catch (error) {
            console.error('Error fetching Proxmox data:', error);
            return { error: error.message };
        }
    }

    /**
     * Nextcloud履歴データを取得
     */
    async fetchNextcloudHistory() {
        const cacheKey = 'nextcloud-history';
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        try {
            const response = await fetch('/api/nextcloud/history');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const data = await response.json();
            this.setCache(cacheKey, data);
            return data;
        } catch (error) {
            console.error('Error fetching Nextcloud history:', error);
            return { error: error.message };
        }
    }

    /**
     * Proxmox履歴データを取得
     */
    async fetchProxmoxHistory() {
        const cacheKey = 'proxmox-history';
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        try {
            const response = await fetch('/api/proxmox/history');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const data = await response.json();
            this.setCache(cacheKey, data);
            return data;
        } catch (error) {
            console.error('Error fetching Proxmox history:', error);
            return { error: error.message };
        }
    }

    /**
     * Proxmox詳細データを取得
     */
    async fetchProxmoxDetails() {
        try {
            const response = await fetch('/api/proxmox/detailed');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching Proxmox details:', error);
            return { error: error.message };
        }
    }

    /**
     * キャッシュから取得
     */
    getFromCache(key) {
        const cached = this.cache.get(key);
        if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
            return cached.data;
        }
        return null;
    }

    /**
     * キャッシュに保存
     */
    setCache(key, data) {
        this.cache.set(key, {
            data: data,
            timestamp: Date.now()
        });
    }

    /**
     * 現在のデータを取得
     */
    getCurrentData() {
        return this.data;
    }

    /**
     * データをリセット
     */
    resetData() {
        this.data = {
            nextcloud: null,
            proxmox: null,
            lastUpdate: null
        };
        this.cache.clear();
    }
}
