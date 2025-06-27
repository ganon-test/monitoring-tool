/**
 * WebSocket接続とリアルタイムデータ更新を管理
 */
class SocketManager {
    constructor() {
        this.socket = null;
        this.connectionStatus = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.listeners = new Map();
        
        this.initializeSocket();
    }

    /**
     * ソケット接続を初期化
     */
    initializeSocket() {
        try {
            this.socket = io();
            this.setupSocketListeners();
        } catch (error) {
            console.error('Error initializing socket:', error);
            this.handleConnectionError(error);
        }
    }

    /**
     * ソケットリスナーをセットアップ
     */
    setupSocketListeners() {
        if (!this.socket) return;

        this.socket.on('connect', () => {
            console.log('Connected to server');
            this.connectionStatus = true;
            this.reconnectAttempts = 0;
            this.emit('connection-status', true);
        });

        this.socket.on('disconnect', (reason) => {
            console.log('Disconnected from server:', reason);
            this.connectionStatus = false;
            this.emit('connection-status', false);
            
            // 自動再接続を試行
            if (reason === 'io server disconnect') {
                // サーバーが切断した場合は手動で再接続
                this.attemptReconnect();
            }
        });

        this.socket.on('data-update', (data) => {
            console.log('Received data update:', data);
            this.emit('data-update', data);
        });

        this.socket.on('error', (error) => {
            console.error('Socket error:', error);
            this.emit('socket-error', error);
            this.handleConnectionError(error);
        });

        this.socket.on('connect_error', (error) => {
            console.error('Connection error:', error);
            this.handleConnectionError(error);
        });

        this.socket.on('reconnect', (attemptNumber) => {
            console.log('Reconnected after', attemptNumber, 'attempts');
            this.connectionStatus = true;
            this.reconnectAttempts = 0;
            this.emit('connection-status', true);
        });

        this.socket.on('reconnect_error', (error) => {
            console.error('Reconnection error:', error);
            this.handleReconnectError(error);
        });

        this.socket.on('reconnect_failed', () => {
            console.error('Failed to reconnect');
            this.emit('reconnect-failed');
        });
    }

    /**
     * 再接続を試行
     */
    attemptReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Max reconnection attempts reached');
            this.emit('max-reconnect-attempts');
            return;
        }

        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // 指数バックオフ

        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`);
        
        setTimeout(() => {
            if (this.socket) {
                this.socket.connect();
            }
        }, delay);
    }

    /**
     * 接続エラーを処理
     */
    handleConnectionError(error) {
        this.connectionStatus = false;
        this.emit('connection-error', error);
        
        // UI更新: 接続エラー表示
        this.updateConnectionIndicator(false);
    }

    /**
     * 再接続エラーを処理
     */
    handleReconnectError(error) {
        this.reconnectAttempts++;
        
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            console.log(`Reconnection attempt ${this.reconnectAttempts} failed, retrying...`);
        } else {
            console.error('All reconnection attempts failed');
            this.emit('all-reconnect-failed');
        }
    }

    /**
     * イベントリスナーを追加
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    /**
     * イベントリスナーを削除
     */
    off(event, callback) {
        if (this.listeners.has(event)) {
            const listeners = this.listeners.get(event);
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    /**
     * イベントを発火
     */
    emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event listener for ${event}:`, error);
                }
            });
        }
    }

    /**
     * サーバーにメッセージを送信
     */
    send(event, data) {
        if (this.socket && this.connectionStatus) {
            this.socket.emit(event, data);
        } else {
            console.warn('Socket not connected, cannot send message');
        }
    }

    /**
     * 手動リフレッシュを要求
     */
    requestRefresh() {
        this.send('refresh-request');
    }

    /**
     * 接続ステータスを取得
     */
    isConnected() {
        return this.connectionStatus;
    }

    /**
     * 接続インジケーターを更新
     */
    updateConnectionIndicator(isConnected) {
        const indicator = document.querySelector('.connection-indicator');
        if (indicator) {
            if (isConnected) {
                indicator.classList.remove('disconnected');
                indicator.classList.add('connected');
                indicator.title = 'Connected to server';
            } else {
                indicator.classList.remove('connected');
                indicator.classList.add('disconnected');
                indicator.title = 'Disconnected from server';
            }
        }

        // ヘッダーの最終更新時間部分の色を変更
        const lastUpdateElement = document.getElementById('last-update-time');
        if (lastUpdateElement) {
            if (isConnected) {
                lastUpdateElement.style.color = '#10b981'; // green
            } else {
                lastUpdateElement.style.color = '#ef4444'; // red
                lastUpdateElement.textContent = 'Disconnected';
            }
        }
    }

    /**
     * 接続を閉じる
     */
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.connectionStatus = false;
        this.listeners.clear();
    }

    /**
     * ハートビートを開始（接続チェック）
     */
    startHeartbeat(interval = 30000) {
        setInterval(() => {
            if (this.socket && this.connectionStatus) {
                this.socket.emit('ping');
            }
        }, interval);
    }

    /**
     * 接続品質を監視
     */
    monitorConnectionQuality() {
        let latencySum = 0;
        let latencyCount = 0;
        let lastPingTime = 0;

        this.socket.on('ping', () => {
            lastPingTime = Date.now();
            this.socket.emit('pong');
        });

        this.socket.on('pong', () => {
            const latency = Date.now() - lastPingTime;
            latencySum += latency;
            latencyCount++;
            
            const averageLatency = latencySum / latencyCount;
            this.emit('latency-update', { current: latency, average: averageLatency });
        });
    }

    /**
     * デバッグ情報を取得
     */
    getDebugInfo() {
        return {
            connected: this.connectionStatus,
            reconnectAttempts: this.reconnectAttempts,
            maxReconnectAttempts: this.maxReconnectAttempts,
            socketId: this.socket ? this.socket.id : null,
            transport: this.socket && this.socket.io ? this.socket.io.engine.transport.name : null,
            listeners: Array.from(this.listeners.keys())
        };
    }

    /**
     * 初期化メソッド（データコールバック付き）
     */
    init(dataCallback) {
        console.log('SocketManager initialized with data callback');
        
        // データ更新コールバックを設定
        this.dataCallback = dataCallback;
        
        // データ更新イベントをリッスン
        if (this.socket) {
            this.socket.on('data-update', (data) => {
                if (this.dataCallback) {
                    this.dataCallback(data);
                }
            });
        }
    }
}
