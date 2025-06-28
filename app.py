"""
Proxmox監視ダッシュボード - Web API サーバー
"""
from flask import Flask, jsonify, render_template_string
from flask_socketio import SocketIO, emit
import asyncio
import threading
import json
from datetime import datetime
from monitoring_service import monitoring_service, ClusterStats
from dataclasses import asdict
import time

app = Flask(__name__)
app.config['SECRET_KEY'] = 'proxmox_monitoring_secret'
socketio = SocketIO(app, cors_allowed_origins="*")

# グローバル変数
latest_data_cache = None
last_update_time = None

def dataclass_to_dict(obj):
    """データクラスを辞書に変換（ネストされたオブジェクトも処理）"""
    if hasattr(obj, '__dataclass_fields__'):
        result = {}
        for field_name, field_value in asdict(obj).items():
            if isinstance(field_value, list):
                result[field_name] = [dataclass_to_dict(item) for item in field_value]
            else:
                result[field_name] = field_value
        return result
    return obj

@app.route('/')
def index():
    """メインダッシュボードページ"""
    return render_template_string(DASHBOARD_HTML)

@app.route('/api/proxmox/status')
def get_proxmox_status():
    """Proxmoxクラスター状態API"""
    global latest_data_cache, last_update_time
    
    try:
        latest_data = monitoring_service.get_latest_data()
        
        if latest_data:
            latest_data_cache = dataclass_to_dict(latest_data)
            last_update_time = datetime.now().isoformat()
            
            return jsonify({
                'status': 'success',
                'data': latest_data_cache,
                'timestamp': last_update_time
            })
        else:
            return jsonify({
                'status': 'error',
                'message': 'No data available',
                'data': None
            }), 503
            
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e),
            'data': None
        }), 500

@app.route('/api/proxmox/history')
def get_proxmox_history():
    """Proxmox履歴データAPI"""
    try:
        history = monitoring_service.get_history_data(24)
        
        return jsonify({
            'status': 'success',
            'data': history,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e),
            'data': []
        }), 500

@socketio.on('connect')
def handle_connect():
    """WebSocket接続時"""
    print('クライアント接続')
    
    # 最新データを送信
    if latest_data_cache:
        emit('proxmox_update', {
            'data': latest_data_cache,
            'timestamp': last_update_time
        })

@socketio.on('disconnect')
def handle_disconnect():
    """WebSocket切断時"""
    print('クライアント切断')

def broadcast_updates():
    """定期的にデータをブロードキャスト"""
    global latest_data_cache, last_update_time
    
    while True:
        try:
            latest_data = monitoring_service.get_latest_data()
            
            if latest_data:
                new_data = dataclass_to_dict(latest_data)
                new_timestamp = datetime.now().isoformat()
                
                # データが更新された場合のみブロードキャスト
                if new_data != latest_data_cache:
                    latest_data_cache = new_data
                    last_update_time = new_timestamp
                    
                    socketio.emit('proxmox_update', {
                        'data': latest_data_cache,
                        'timestamp': last_update_time
                    })
                    
                    print(f"データ更新ブロードキャスト: {new_timestamp}")
            
            time.sleep(5)  # 5秒間隔
            
        except Exception as e:
            print(f"ブロードキャストエラー: {e}")
            time.sleep(10)

def start_monitoring_service():
    """監視サービスを開始"""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    
    try:
        loop.run_until_complete(monitoring_service.start_monitoring())
    except Exception as e:
        print(f"監視サービスエラー: {e}")

# HTMLテンプレート
DASHBOARD_HTML = """
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🚀 Proxmox監視ダッシュボード</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdn.socket.io/4.7.2/socket.io.min.js"></script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #fff;
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
        }
        
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        
        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
            text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        
        .status-bar {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 20px;
            margin-bottom: 20px;
            background: rgba(255,255,255,0.1);
            padding: 15px;
            border-radius: 10px;
            backdrop-filter: blur(10px);
        }
        
        .status-item {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .status-dot {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: #22c55e;
            box-shadow: 0 0 10px rgba(34, 197, 94, 0.5);
            animation: pulse 2s infinite;
        }
        
        .status-dot.offline {
            background: #ef4444;
            box-shadow: 0 0 10px rgba(239, 68, 68, 0.5);
        }
        
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        
        .dashboard-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .card {
            background: rgba(255,255,255,0.1);
            backdrop-filter: blur(10px);
            border-radius: 15px;
            padding: 25px;
            border: 1px solid rgba(255,255,255,0.2);
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        
        .card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        }
        
        .card h3 {
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 1.2em;
        }
        
        .card i {
            color: #fbbf24;
        }
        
        .metric-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            margin-bottom: 20px;
        }
        
        .metric {
            text-align: center;
            padding: 15px;
            background: rgba(255,255,255,0.1);
            border-radius: 10px;
        }
        
        .metric-value {
            font-size: 2em;
            font-weight: bold;
            margin-bottom: 5px;
            color: #22c55e;
        }
        
        .metric-label {
            font-size: 0.9em;
            opacity: 0.8;
        }
        
        .node-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 15px;
        }
        
        .node-card {
            background: rgba(255,255,255,0.1);
            border-radius: 10px;
            padding: 15px;
            border-left: 4px solid #22c55e;
        }
        
        .node-card.offline {
            border-left-color: #ef4444;
        }
        
        .node-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }
        
        .node-name {
            font-weight: bold;
            font-size: 1.1em;
        }
        
        .node-status {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: #22c55e;
        }
        
        .node-status.offline {
            background: #ef4444;
        }
        
        .progress-bar {
            width: 100%;
            height: 8px;
            background: rgba(255,255,255,0.2);
            border-radius: 4px;
            overflow: hidden;
            margin: 5px 0;
        }
        
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #22c55e, #fbbf24);
            border-radius: 4px;
            transition: width 0.3s ease;
        }
        
        .vm-list {
            max-height: 300px;
            overflow-y: auto;
        }
        
        .vm-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px;
            margin-bottom: 8px;
            background: rgba(255,255,255,0.1);
            border-radius: 8px;
            border-left: 3px solid transparent;
        }
        
        .vm-item.running {
            border-left-color: #22c55e;
        }
        
        .vm-item.stopped {
            border-left-color: #ef4444;
        }
        
        .vm-name {
            font-weight: 500;
        }
        
        .vm-type {
            font-size: 0.8em;
            opacity: 0.8;
            text-transform: uppercase;
        }
        
        .vm-status {
            padding: 4px 8px;
            border-radius: 20px;
            font-size: 0.8em;
            font-weight: bold;
            text-transform: uppercase;
        }
        
        .vm-status.running {
            background: rgba(34, 197, 94, 0.3);
            color: #22c55e;
        }
        
        .vm-status.stopped {
            background: rgba(239, 68, 68, 0.3);
            color: #ef4444;
        }
        
        .chart-container {
            position: relative;
            height: 300px;
            margin-top: 20px;
        }
        
        .wide-card {
            grid-column: 1 / -1;
        }
        
        .refresh-btn {
            background: rgba(255,255,255,0.2);
            border: none;
            color: white;
            padding: 10px 20px;
            border-radius: 25px;
            cursor: pointer;
            transition: background 0.3s ease;
            margin-left: 10px;
        }
        
        .refresh-btn:hover {
            background: rgba(255,255,255,0.3);
        }
        
        .last-update {
            text-align: center;
            margin-top: 20px;
            opacity: 0.8;
            font-size: 0.9em;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1><i class="fas fa-server"></i> Proxmox監視ダッシュボード</h1>
            
            <div class="status-bar">
                <div class="status-item">
                    <div class="status-dot" id="connection-status"></div>
                    <span>接続状態</span>
                </div>
                <div class="status-item">
                    <i class="fas fa-clock"></i>
                    <span id="last-update">更新中...</span>
                </div>
                <button class="refresh-btn" onclick="refreshData()">
                    <i class="fas fa-sync-alt"></i> 更新
                </button>
            </div>
        </div>
        
        <div class="dashboard-grid">
            <!-- クラスター概要 -->
            <div class="card">
                <h3><i class="fas fa-sitemap"></i> クラスター概要</h3>
                <div class="metric-grid">
                    <div class="metric">
                        <div class="metric-value" id="total-nodes">0</div>
                        <div class="metric-label">ノード数</div>
                    </div>
                    <div class="metric">
                        <div class="metric-value" id="total-vms">0</div>
                        <div class="metric-label">VM/CT</div>
                    </div>
                    <div class="metric">
                        <div class="metric-value" id="running-vms">0</div>
                        <div class="metric-label">稼働中</div>
                    </div>
                    <div class="metric">
                        <div class="metric-value" id="cluster-status">オフライン</div>
                        <div class="metric-label">ステータス</div>
                    </div>
                </div>
            </div>
            
            <!-- リソース使用率 -->
            <div class="card">
                <h3><i class="fas fa-chart-pie"></i> リソース使用率</h3>
                <div class="chart-container">
                    <canvas id="resource-chart"></canvas>
                </div>
            </div>
            
            <!-- ノード一覧 -->
            <div class="card wide-card">
                <h3><i class="fas fa-server"></i> ノード状態</h3>
                <div class="node-grid" id="nodes-container">
                    <!-- ノード情報が動的に挿入される -->
                </div>
            </div>
            
            <!-- VM/コンテナ一覧 -->
            <div class="card wide-card">
                <h3><i class="fas fa-cubes"></i> VM・コンテナ一覧</h3>
                <div class="vm-list" id="vms-container">
                    <!-- VM情報が動的に挿入される -->
                </div>
            </div>
            
            <!-- パフォーマンス履歴 -->
            <div class="card wide-card">
                <h3><i class="fas fa-chart-line"></i> パフォーマンス履歴</h3>
                <div class="chart-container">
                    <canvas id="history-chart"></canvas>
                </div>
            </div>
        </div>
        
        <div class="last-update" id="footer-update">
            最終更新: <span id="last-update-time">-</span>
        </div>
    </div>

    <script>
        // WebSocket接続
        const socket = io();
        
        // チャート変数
        let resourceChart = null;
        let historyChart = null;
        
        // 接続状態管理
        socket.on('connect', function() {
            console.log('WebSocket接続成功');
            document.getElementById('connection-status').classList.remove('offline');
            updateStatus('接続済み');
        });
        
        socket.on('disconnect', function() {
            console.log('WebSocket接続切断');
            document.getElementById('connection-status').classList.add('offline');
            updateStatus('切断');
        });
        
        // Proxmoxデータ更新受信
        socket.on('proxmox_update', function(data) {
            console.log('データ更新受信:', data);
            updateDashboard(data.data);
            updateLastUpdate(data.timestamp);
        });
        
        // ダッシュボード更新
        function updateDashboard(data) {
            if (!data) return;
            
            // クラスター概要更新
            document.getElementById('total-nodes').textContent = data.nodes ? data.nodes.length : 0;
            document.getElementById('total-vms').textContent = data.vms ? data.vms.length : 0;
            
            const runningVMs = data.vms ? data.vms.filter(vm => vm.status === 'running').length : 0;
            document.getElementById('running-vms').textContent = runningVMs;
            document.getElementById('cluster-status').textContent = data.cluster_status || 'オフライン';
            
            // ノード更新
            updateNodes(data.nodes || []);
            
            // VM/コンテナ更新
            updateVMs(data.vms || []);
            
            // リソースチャート更新
            updateResourceChart(data);
        }
        
        // ノード表示更新
        function updateNodes(nodes) {
            const container = document.getElementById('nodes-container');
            container.innerHTML = '';
            
            nodes.forEach(node => {
                const nodeDiv = document.createElement('div');
                nodeDiv.className = `node-card ${node.status !== 'online' ? 'offline' : ''}`;
                
                const cpuPercent = (node.cpu_usage * 100).toFixed(1);
                const memPercent = ((node.memory_usage / node.memory_total) * 100).toFixed(1);
                
                nodeDiv.innerHTML = `
                    <div class="node-header">
                        <div class="node-name">${node.name}</div>
                        <div class="node-status ${node.status !== 'online' ? 'offline' : ''}"></div>
                    </div>
                    <div>
                        <div>CPU: ${cpuPercent}%</div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${cpuPercent}%"></div>
                        </div>
                    </div>
                    <div>
                        <div>Memory: ${memPercent}%</div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${memPercent}%"></div>
                        </div>
                    </div>
                    <div>Uptime: ${formatUptime(node.uptime)}</div>
                    ${node.temperature ? `<div>Temp: ${node.temperature.toFixed(1)}°C</div>` : ''}
                    ${node.power ? `<div>Power: ${node.power}W</div>` : ''}
                `;
                
                container.appendChild(nodeDiv);
            });
        }
        
        // VM/コンテナ表示更新
        function updateVMs(vms) {
            const container = document.getElementById('vms-container');
            container.innerHTML = '';
            
            vms.forEach(vm => {
                const vmDiv = document.createElement('div');
                vmDiv.className = `vm-item ${vm.status}`;
                
                vmDiv.innerHTML = `
                    <div>
                        <div class="vm-name">${vm.name}</div>
                        <div class="vm-type">${vm.type} (ID: ${vm.vmid})</div>
                    </div>
                    <div>
                        <div class="vm-status ${vm.status}">${vm.status}</div>
                    </div>
                `;
                
                container.appendChild(vmDiv);
            });
        }
        
        // リソースチャート更新
        function updateResourceChart(data) {
            const ctx = document.getElementById('resource-chart').getContext('2d');
            
            if (resourceChart) {
                resourceChart.destroy();
            }
            
            const nodes = data.nodes || [];
            const totalCPU = nodes.reduce((sum, node) => sum + (node.cpu_usage * 100), 0) / nodes.length;
            const totalMemory = nodes.reduce((sum, node) => sum + ((node.memory_usage / node.memory_total) * 100), 0) / nodes.length;
            
            resourceChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['CPU使用率', 'Memory使用率', '空き容量'],
                    datasets: [{
                        data: [totalCPU, totalMemory, 100 - ((totalCPU + totalMemory) / 2)],
                        backgroundColor: ['#ef4444', '#fbbf24', '#22c55e'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: { color: 'white' }
                        }
                    }
                }
            });
        }
        
        // 履歴チャート読み込み
        async function loadHistoryChart() {
            try {
                const response = await fetch('/api/proxmox/history');
                const result = await response.json();
                
                if (result.status === 'success') {
                    updateHistoryChart(result.data);
                }
            } catch (error) {
                console.error('履歴データ取得エラー:', error);
            }
        }
        
        // 履歴チャート更新
        function updateHistoryChart(historyData) {
            const ctx = document.getElementById('history-chart').getContext('2d');
            
            if (historyChart) {
                historyChart.destroy();
            }
            
            const labels = historyData.map(item => new Date(item.timestamp).toLocaleTimeString());
            const cpuData = historyData.map(item => item.cpu);
            const memoryData = historyData.map(item => item.memory);
            
            historyChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'CPU使用率',
                            data: cpuData,
                            borderColor: '#ef4444',
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            tension: 0.4
                        },
                        {
                            label: 'Memory使用率',
                            data: memoryData,
                            borderColor: '#fbbf24',
                            backgroundColor: 'rgba(251, 191, 36, 0.1)',
                            tension: 0.4
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: { color: 'rgba(255,255,255,0.1)' },
                            ticks: { color: 'white' }
                        },
                        x: {
                            grid: { color: 'rgba(255,255,255,0.1)' },
                            ticks: { color: 'white' }
                        }
                    },
                    plugins: {
                        legend: {
                            labels: { color: 'white' }
                        }
                    }
                }
            });
        }
        
        // ユーティリティ関数
        function formatUptime(seconds) {
            if (!seconds) return 'N/A';
            
            const days = Math.floor(seconds / 86400);
            const hours = Math.floor((seconds % 86400) / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            
            return `${days}d ${hours}h ${minutes}m`;
        }
        
        function updateStatus(status) {
            console.log('ステータス更新:', status);
        }
        
        function updateLastUpdate(timestamp) {
            const time = new Date(timestamp).toLocaleString('ja-JP');
            document.getElementById('last-update').textContent = time;
            document.getElementById('last-update-time').textContent = time;
        }
        
        // データ手動更新
        async function refreshData() {
            try {
                const response = await fetch('/api/proxmox/status');
                const result = await response.json();
                
                if (result.status === 'success') {
                    updateDashboard(result.data);
                    updateLastUpdate(result.timestamp);
                }
            } catch (error) {
                console.error('データ更新エラー:', error);
            }
        }
        
        // 初期化
        document.addEventListener('DOMContentLoaded', function() {
            console.log('ダッシュボード初期化');
            
            // 初期データ取得
            refreshData();
            
            // 履歴チャート読み込み
            loadHistoryChart();
            
            // 定期的な履歴更新
            setInterval(loadHistoryChart, 60000); // 1分ごと
        });
    </script>
</body>
</html>
"""

if __name__ == '__main__':
    # 監視サービスを別スレッドで開始
    monitoring_thread = threading.Thread(target=start_monitoring_service, daemon=True)
    monitoring_thread.start()
    
    # WebSocketブロードキャストを別スレッドで開始
    broadcast_thread = threading.Thread(target=broadcast_updates, daemon=True)
    broadcast_thread.start()
    
    print("🚀 Proxmox監視ダッシュボード開始...")
    print("📊 ダッシュボード: http://localhost:5000")
    print("🔗 API: http://localhost:5000/api/proxmox/status")
    
    # Flaskアプリ開始
    socketio.run(app, host='0.0.0.0', port=5000, debug=False)
