"""
シンプルProxmox監視システム - バックエンド
"""
import asyncio
import aiohttp
import yaml
import ssl
import json
import time
import sqlite3
from datetime import datetime
from flask import Flask, jsonify, render_template
from flask_socketio import SocketIO, emit
import threading
from typing import Dict, List, Optional

class ProxmoxClient:
    def __init__(self, host: str, username: str, password: str, verify_ssl: bool = False):
        self.host = host
        self.username = username
        self.password = password
        self.verify_ssl = verify_ssl
        self.session = None
        self.ticket = None
        self.csrf_token = None
        
    async def connect(self):
        """Proxmoxサーバーに接続"""
        ssl_context = ssl.create_default_context()
        if not self.verify_ssl:
            ssl_context.check_hostname = False
            ssl_context.verify_mode = ssl.CERT_NONE
            
        connector = aiohttp.TCPConnector(ssl=ssl_context)
        self.session = aiohttp.ClientSession(connector=connector)
        
        # 認証
        auth_url = f"https://{self.host}:8006/api2/json/access/ticket"
        auth_data = {'username': self.username, 'password': self.password}
        
        async with self.session.post(auth_url, data=auth_data) as response:
            if response.status == 200:
                result = await response.json()
                self.ticket = result['data']['ticket']
                self.csrf_token = result['data']['CSRFPreventionToken']
                
                self.session.headers.update({
                    'Cookie': f'PVEAuthCookie={self.ticket}',
                    'CSRFPreventionToken': self.csrf_token
                })
                return True
        return False
    
    async def api_get(self, path: str):
        """API GET リクエスト"""
        if not self.session:
            return None
            
        url = f"https://{self.host}:8006/api2/json{path}"
        try:
            async with self.session.get(url) as response:
                if response.status == 200:
                    result = await response.json()
                    return result.get('data', [])
        except Exception as e:
            print(f"API エラー {path}: {e}")
        return None
    
    async def get_cluster_data(self):
        """クラスター全体の情報を取得"""
        data = {
            'nodes': [],
            'vms': [],
            'storage': [],
            'cluster_status': 'online'
        }
        
        # ノード一覧取得
        nodes = await self.api_get('/nodes')
        if not nodes:
            data['cluster_status'] = 'offline'
            return data
            
        for node in nodes:
            node_name = node['node']
            
            # ノード詳細情報
            status = await self.api_get(f'/nodes/{node_name}/status')
            if status:
                node_data = {
                    'name': node_name,
                    'status': node['status'],
                    'cpu': status.get('cpu', 0) * 100,
                    'memory_used': status.get('memory', {}).get('used', 0),
                    'memory_total': status.get('memory', {}).get('total', 0),
                    'uptime': status.get('uptime', 0),
                    'load': status.get('loadavg', [0, 0, 0])
                }
                data['nodes'].append(node_data)
            
            # VM一覧
            vms = await self.api_get(f'/nodes/{node_name}/qemu')
            if vms:
                for vm in vms:
                    vm_data = {
                        'id': vm['vmid'],
                        'name': vm['name'],
                        'status': vm['status'],
                        'node': node_name,
                        'type': 'vm',
                        'cpu': vm.get('cpu', 0) * 100 if vm.get('cpu') else 0,
                        'memory': vm.get('mem', 0)
                    }
                    data['vms'].append(vm_data)
            
            # コンテナ一覧
            containers = await self.api_get(f'/nodes/{node_name}/lxc')
            if containers:
                for ct in containers:
                    ct_data = {
                        'id': ct['vmid'],
                        'name': ct['name'],
                        'status': ct['status'],
                        'node': node_name,
                        'type': 'container',
                        'cpu': ct.get('cpu', 0) * 100 if ct.get('cpu') else 0,
                        'memory': ct.get('mem', 0)
                    }
                    data['vms'].append(ct_data)
            
            # ストレージ
            storage = await self.api_get(f'/nodes/{node_name}/storage')
            if storage:
                for store in storage:
                    store_data = {
                        'node': node_name,
                        'name': store['storage'],
                        'type': store.get('type', 'unknown'),
                        'total': store.get('total', 0),
                        'used': store.get('used', 0),
                        'available': store.get('avail', 0)
                    }
                    data['storage'].append(store_data)
        
        return data
    
    async def close(self):
        """接続を閉じる"""
        if self.session:
            await self.session.close()

class DatabaseManager:
    def __init__(self, db_path: str = "proxmox_monitoring.db"):
        self.db_path = db_path
        self.init_db()
    
    def init_db(self):
        """データベース初期化"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS metrics_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                total_cpu REAL,
                total_memory_used INTEGER,
                total_memory_total INTEGER,
                nodes_count INTEGER,
                vms_running INTEGER,
                vms_total INTEGER
            )
        """)
        
        conn.commit()
        conn.close()
    
    def save_metrics(self, data: dict):
        """メトリクスを保存"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # 統計計算
        nodes = data.get('nodes', [])
        vms = data.get('vms', [])
        
        total_cpu = sum(node['cpu'] for node in nodes) / len(nodes) if nodes else 0
        total_memory_used = sum(node['memory_used'] for node in nodes)
        total_memory_total = sum(node['memory_total'] for node in nodes)
        vms_running = len([vm for vm in vms if vm['status'] == 'running'])
        
        cursor.execute("""
            INSERT INTO metrics_history 
            (total_cpu, total_memory_used, total_memory_total, nodes_count, vms_running, vms_total)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (total_cpu, total_memory_used, total_memory_total, len(nodes), vms_running, len(vms)))
        
        conn.commit()
        conn.close()
    
    def get_history(self, hours: int = 24):
        """履歴データ取得"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT timestamp, total_cpu, 
                   (total_memory_used * 100.0 / total_memory_total) as memory_percent,
                   vms_running
            FROM metrics_history 
            WHERE timestamp > datetime('now', '-{} hours')
            ORDER BY timestamp
        """.format(hours))
        
        history = []
        for row in cursor.fetchall():
            history.append({
                'time': row[0],
                'cpu': row[1],
                'memory': row[2],
                'vms': row[3]
            })
        
        conn.close()
        return history

class ProxmoxMonitor:
    def __init__(self, config_file: str = "config.yaml"):
        with open(config_file, 'r') as f:
            config = yaml.safe_load(f)
        
        self.clients = []
        for host_config in config['proxmox']:
            client = ProxmoxClient(
                host=host_config['host'],
                username=host_config['username'],
                password=host_config['password'],
                verify_ssl=host_config.get('verify_ssl', False)
            )
            self.clients.append(client)
        
        self.db = DatabaseManager()
        self.latest_data = {}
        self.running = False
    
    async def start_monitoring(self):
        """監視開始"""
        self.running = True
        
        # 全クライアント接続
        for client in self.clients:
            await client.connect()
        
        while self.running:
            try:
                # 全ホストからデータ収集
                all_data = {
                    'nodes': [],
                    'vms': [],
                    'storage': [],
                    'cluster_status': 'online'
                }
                
                for client in self.clients:
                    data = await client.get_cluster_data()
                    if data:
                        all_data['nodes'].extend(data['nodes'])
                        all_data['vms'].extend(data['vms'])
                        all_data['storage'].extend(data['storage'])
                
                self.latest_data = all_data
                self.db.save_metrics(all_data)
                
                print(f"[{datetime.now()}] データ更新完了 - ノード:{len(all_data['nodes'])}, VM/CT:{len(all_data['vms'])}")
                
                await asyncio.sleep(10)  # 10秒間隔
                
            except Exception as e:
                print(f"監視エラー: {e}")
                await asyncio.sleep(5)
    
    def get_latest_data(self):
        return self.latest_data
    
    def get_history(self):
        return self.db.get_history()
    
    async def stop(self):
        self.running = False
        for client in self.clients:
            await client.close()

# Flask アプリケーション
app = Flask(__name__)
app.config['SECRET_KEY'] = 'proxmox-monitor-2025'
socketio = SocketIO(app, cors_allowed_origins="*")

# グローバル監視インスタンス
monitor = ProxmoxMonitor()

@app.route('/')
def dashboard():
    """ダッシュボードページ"""
    return render_template('dashboard.html')

@app.route('/dashboard')
def dashboard_alt():
    """ダッシュボード別ルート"""
    return render_template('dashboard.html')

@app.route('/api/status')
def api_status():
    """ステータスAPI"""
    data = monitor.get_latest_data()
    return jsonify({
        'success': True,
        'data': data,
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/history')
def api_history():
    """履歴データAPI"""
    history = monitor.get_history()
    return jsonify({
        'success': True,
        'data': history,
        'timestamp': datetime.now().isoformat()
    })

@socketio.on('connect')
def handle_connect():
    """WebSocket接続"""
    print('クライアント接続')
    emit('data_update', monitor.get_latest_data())

def monitoring_thread():
    """監視スレッド"""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(monitor.start_monitoring())

def broadcast_thread():
    """ブロードキャストスレッド"""
    while True:
        try:
            data = monitor.get_latest_data()
            if data:
                socketio.emit('data_update', data)
            time.sleep(5)
        except Exception as e:
            print(f"ブロードキャストエラー: {e}")
            time.sleep(10)

if __name__ == '__main__':
    print("🚀 Proxmox監視システム起動中...")
    
    # 監視スレッド開始
    monitor_thread = threading.Thread(target=monitoring_thread, daemon=True)
    monitor_thread.start()
    
    # ブロードキャストスレッド開始  
    broadcast_t = threading.Thread(target=broadcast_thread, daemon=True)
    broadcast_t.start()
    
    print("📊 ダッシュボード: http://localhost:5000")
    
    socketio.run(app, host='0.0.0.0', port=5000, debug=False)
