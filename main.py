from flask import Flask, jsonify
from fetch import nextcloud_api, proxmox_api
import yaml
import urllib3
import os
import threading
import time
from datetime import datetime
from fetch import resource_history
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

app = Flask(__name__)

# グローバルキャッシュ
cache = {
    'nextcloud': {'data': None, 'last_update': None, 'error': None},
    'nextcloud_history': {'data': None, 'last_update': None, 'error': None},
    'proxmox': {'data': None, 'last_update': None, 'error': None},
    'proxmox_detailed': {'data': None, 'last_update': None, 'error': None},
    'proxmox_history': {'data': None, 'last_update': None, 'error': None}
}

# 更新間隔（秒）
UPDATE_INTERVAL = 10

# CORSヘッダーを追加
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE')
    return response

# 環境変数から設定を読み込む関数
def load_config():
    with open('config.yaml', 'r') as f:
        config = yaml.safe_load(f)
    
    # 環境変数でパスワードを上書き
    if 'NEXTCLOUD_PASSWORD' in os.environ:
        config['nextcloud']['password'] = os.environ['NEXTCLOUD_PASSWORD']
    
    if 'PROXMOX_PASSWORD_1' in os.environ:
        config['proxmox'][0]['password'] = os.environ['PROXMOX_PASSWORD_1']
    
    if 'PROXMOX_PASSWORD_2' in os.environ and len(config['proxmox']) > 1:
        config['proxmox'][1]['password'] = os.environ['PROXMOX_PASSWORD_2']
    
    return config

config = load_config()

@app.route('/metrics/nextcloud')
def nextcloud_metrics():
    if cache['nextcloud']['error']:
        return jsonify({"error": cache['nextcloud']['error']}), 500
    
    if cache['nextcloud']['data'] is None:
        return jsonify({"error": "Data not yet available"}), 503
    
    return jsonify({
        "data": cache['nextcloud']['data'],
        "last_update": cache['nextcloud']['last_update'].isoformat() if cache['nextcloud']['last_update'] else None
    })

@app.route('/metrics/nextcloud/history')
def nextcloud_history():
    if cache['nextcloud_history']['error']:
        return jsonify({"error": cache['nextcloud_history']['error']}), 500
    
    if cache['nextcloud_history']['data'] is None:
        return jsonify({"error": "History data not yet available"}), 503
    
    return jsonify({
        "data": cache['nextcloud_history']['data'],
        "last_update": cache['nextcloud_history']['last_update'].isoformat() if cache['nextcloud_history']['last_update'] else None
    })

@app.route('/metrics/proxmox')
def proxmox_metrics():
    if cache['proxmox']['error']:
        return jsonify({"error": cache['proxmox']['error']}), 500
    
    if cache['proxmox']['data'] is None:
        return jsonify({"error": "Data not yet available"}), 503
    
    return jsonify({
        "data": cache['proxmox']['data'],
        "last_update": cache['proxmox']['last_update'].isoformat() if cache['proxmox']['last_update'] else None
    })

@app.route('/metrics/proxmox/history')
def proxmox_history():
    if cache['proxmox_history']['error']:
        return jsonify({"error": cache['proxmox_history']['error']}), 500
    
    if cache['proxmox_history']['data'] is None:
        return jsonify({"error": "History data not yet available"}), 503
    
    return jsonify({
        "data": cache['proxmox_history']['data'],
        "last_update": cache['proxmox_history']['last_update'].isoformat() if cache['proxmox_history']['last_update'] else None
    })

# 詳細なProxmoxデータ取得エンドポイント
@app.route('/metrics/proxmox/detailed')
def proxmox_detailed():
    if cache['proxmox_detailed']['error']:
        return jsonify({"error": cache['proxmox_detailed']['error']}), 500
    
    if cache['proxmox_detailed']['data'] is None:
        return jsonify({"error": "Data not yet available"}), 503
    
    return jsonify({
        "data": cache['proxmox_detailed']['data'],
        "last_update": cache['proxmox_detailed']['last_update'].isoformat() if cache['proxmox_detailed']['last_update'] else None
    })

# デバッグ用エンドポイント
@app.route('/debug/proxmox/raw')
def proxmox_raw():
    data = proxmox_api.fetch_proxmox_cluster_any(config['proxmox'])
    return jsonify(data)

# 手動更新エンドポイント
@app.route('/refresh/all')
def refresh_all():
    try:
        update_nextcloud_data()
        update_proxmox_data()
        return jsonify({"message": "All data refreshed successfully", "timestamp": datetime.now().isoformat()})
    except Exception as e:
        return jsonify({"error": f"Refresh failed: {str(e)}"}), 500

@app.route('/refresh/nextcloud')
def refresh_nextcloud():
    try:
        update_nextcloud_data()
        return jsonify({"message": "Nextcloud data refreshed successfully", "timestamp": datetime.now().isoformat()})
    except Exception as e:
        return jsonify({"error": f"Refresh failed: {str(e)}"}), 500

@app.route('/refresh/proxmox')
def refresh_proxmox():
    try:
        update_proxmox_data()
        return jsonify({"message": "Proxmox data refreshed successfully", "timestamp": datetime.now().isoformat()})
    except Exception as e:
        return jsonify({"error": f"Refresh failed: {str(e)}"}), 500

# ステータス確認エンドポイント
@app.route('/status')
def status():
    return jsonify({
        "nextcloud": {
            "last_update": cache['nextcloud']['last_update'].isoformat() if cache['nextcloud']['last_update'] else None,
            "has_data": cache['nextcloud']['data'] is not None,
            "error": cache['nextcloud']['error']
        },
        "nextcloud_history": {
            "last_update": cache['nextcloud_history']['last_update'].isoformat() if cache['nextcloud_history']['last_update'] else None,
            "has_data": cache['nextcloud_history']['data'] is not None,
            "error": cache['nextcloud_history']['error']
        },
        "proxmox": {
            "last_update": cache['proxmox']['last_update'].isoformat() if cache['proxmox']['last_update'] else None,
            "has_data": cache['proxmox']['data'] is not None,
            "error": cache['proxmox']['error']
        },
        "proxmox_detailed": {
            "last_update": cache['proxmox_detailed']['last_update'].isoformat() if cache['proxmox_detailed']['last_update'] else None,
            "has_data": cache['proxmox_detailed']['data'] is not None,
            "error": cache['proxmox_detailed']['error']
        },
        "proxmox_history": {
            "last_update": cache['proxmox_history']['last_update'].isoformat() if cache['proxmox_history']['last_update'] else None,
            "has_data": cache['proxmox_history']['data'] is not None,
            "error": cache['proxmox_history']['error']
        },
        "update_interval": UPDATE_INTERVAL
    })

# データ更新関数
def update_nextcloud_data():
    try:
        print(f"[{datetime.now()}] Updating Nextcloud data...")
        data = nextcloud_api.fetch_nextcloud_serverinfo(config['nextcloud'])
        cache['nextcloud']['data'] = data
        cache['nextcloud']['last_update'] = datetime.now()
        cache['nextcloud']['error'] = None
        
        # データベースに保存
        resource_history.insert_resource('nextcloud', data)
        
        # 履歴データもキャッシュ
        update_nextcloud_history_cache()
        
        print(f"[{datetime.now()}] Nextcloud data updated successfully")
    except Exception as e:
        print(f"[{datetime.now()}] Error updating Nextcloud data: {str(e)}")
        cache['nextcloud']['error'] = str(e)

def update_nextcloud_history_cache():
    try:
        history = resource_history.get_resource_history('nextcloud')
        formatted_history = [
            {'timestamp': ts, 'data': d} for ts, d in history
        ]
        cache['nextcloud_history']['data'] = formatted_history
        cache['nextcloud_history']['last_update'] = datetime.now()
        cache['nextcloud_history']['error'] = None
    except Exception as e:
        print(f"[{datetime.now()}] Error updating Nextcloud history cache: {str(e)}")
        cache['nextcloud_history']['error'] = str(e)

def update_proxmox_data():
    try:
        print(f"[{datetime.now()}] Updating Proxmox data...")
        raw_data = proxmox_api.fetch_proxmox_cluster_any(config['proxmox'])
        
        if 'error' in raw_data:
            cache['proxmox']['error'] = raw_data['error']
            cache['proxmox_detailed']['error'] = raw_data['error']
            return

        # フィルタ済みデータ
        filtered_data = {
            'nodes': [],
            'vms': [],
            'containers': []
        }

        # ノード情報
        if 'nodes' in raw_data and 'data' in raw_data['nodes']:
            for node in raw_data['nodes']['data']:
                memory_info = None
                if node.get('mem') and node.get('maxmem'):
                    memory_info = {
                        'used': node.get('mem'),
                        'total': node.get('maxmem'),
                        'percentage': (node.get('mem') / node.get('maxmem')) * 100 if node.get('maxmem') > 0 else 0
                    }
                
                filtered_data['nodes'].append({
                    'node': node.get('node'),
                    'status': node.get('status'),
                    'cpu': node.get('cpu'),
                    'memory': memory_info
                })

        # リソース情報から VM/コンテナを分類
        if 'cluster_resources' in raw_data and 'data' in raw_data['cluster_resources']:
            for resource in raw_data['cluster_resources']['data']:
                memory_info = None
                if resource.get('mem') and resource.get('maxmem'):
                    memory_info = {
                        'used': resource.get('mem'),
                        'total': resource.get('maxmem'),
                        'percentage': (resource.get('mem') / resource.get('maxmem')) * 100 if resource.get('maxmem') > 0 else 0
                    }
                
                if resource.get('type') == 'qemu':
                    filtered_data['vms'].append({
                        'vmid': resource.get('vmid'),
                        'name': resource.get('name'),
                        'node': resource.get('node'),
                        'status': resource.get('status'),
                        'cpu': resource.get('cpu'),
                        'memory': memory_info
                    })
                elif resource.get('type') == 'lxc':
                    filtered_data['containers'].append({
                        'vmid': resource.get('vmid'),
                        'name': resource.get('name'),
                        'node': resource.get('node'),
                        'status': resource.get('status'),
                        'cpu': resource.get('cpu'),
                        'memory': memory_info
                    })

        # 詳細データ
        detailed_data = {
            'cluster_info': raw_data.get('cluster_status', {}),
            'nodes': [],
            'vms': [],
            'containers': [],
            'storage': []
        }
        
        # ノード情報
        if 'nodes' in raw_data and 'data' in raw_data['nodes']:
            for node in raw_data['nodes']['data']:
                detailed_data['nodes'].append(node)
        
        # リソース情報から VM/コンテナ/ストレージを分類
        if 'cluster_resources' in raw_data and 'data' in raw_data['cluster_resources']:
            for resource in raw_data['cluster_resources']['data']:
                if resource.get('type') == 'qemu':
                    detailed_data['vms'].append(resource)
                elif resource.get('type') == 'lxc':
                    detailed_data['containers'].append(resource)
                elif resource.get('type') == 'storage':
                    detailed_data['storage'].append(resource)
        
        # ノード詳細情報を追加
        if 'node_details' in raw_data:
            for node_name, node_detail in raw_data['node_details'].items():
                for node in detailed_data['nodes']:
                    if node.get('node') == node_name:
                        node['details'] = node_detail
                        break

        # キャッシュを更新
        cache['proxmox']['data'] = filtered_data
        cache['proxmox']['last_update'] = datetime.now()
        cache['proxmox']['error'] = None
        
        cache['proxmox_detailed']['data'] = detailed_data
        cache['proxmox_detailed']['last_update'] = datetime.now()
        cache['proxmox_detailed']['error'] = None
        
        # データベースに保存
        resource_history.insert_resource('proxmox', filtered_data)
        
        # 履歴データもキャッシュ
        update_proxmox_history_cache()
        
        print(f"[{datetime.now()}] Proxmox data updated successfully")
        
    except Exception as e:
        print(f"[{datetime.now()}] Error updating Proxmox data: {str(e)}")
        cache['proxmox']['error'] = str(e)
        cache['proxmox_detailed']['error'] = str(e)

def update_proxmox_history_cache():
    try:
        history = resource_history.get_resource_history('proxmox')
        formatted_history = [
            {'timestamp': ts, 'data': d} for ts, d in history
        ]
        cache['proxmox_history']['data'] = formatted_history
        cache['proxmox_history']['last_update'] = datetime.now()
        cache['proxmox_history']['error'] = None
    except Exception as e:
        print(f"[{datetime.now()}] Error updating Proxmox history cache: {str(e)}")
        cache['proxmox_history']['error'] = str(e)

# バックグラウンドでデータを更新するタスク
def background_updater():
    while True:
        try:
            update_nextcloud_data()
            update_proxmox_data()
        except Exception as e:
            print(f"[{datetime.now()}] Background update error: {str(e)}")
        
        time.sleep(UPDATE_INTERVAL)

if __name__ == '__main__':
    print('--- Starting Monitoring API ---')
    print(f'Update interval: {UPDATE_INTERVAL} seconds (High-frequency mode)')
    print('--- Debug Links ---')
    print('Status:         http://localhost:5000/status')
    print('Nextcloud:      http://localhost:5000/metrics/nextcloud')
    print('Nextcloud History: http://localhost:5000/metrics/nextcloud/history')
    print('Proxmox:        http://localhost:5000/metrics/proxmox')
    print('Proxmox Detailed: http://localhost:5000/metrics/proxmox/detailed')
    print('Proxmox History: http://localhost:5000/metrics/proxmox/history')
    print('Proxmox Raw (Debug): http://localhost:5000/debug/proxmox/raw')
    print('--- Manual Refresh ---')
    print('Refresh All:    http://localhost:5000/refresh/all')
    print('Refresh Nextcloud: http://localhost:5000/refresh/nextcloud')
    print('Refresh Proxmox: http://localhost:5000/refresh/proxmox')
    print('-------------------')
    
    # 初回データ取得
    print('Initial data fetch...')
    update_nextcloud_data()
    update_proxmox_data()
    
    # 初回履歴データロード
    print('Loading initial history data...')
    update_nextcloud_history_cache()
    update_proxmox_history_cache()
    
    # バックグラウンドスレッド開始
    updater_thread = threading.Thread(target=background_updater, daemon=True)
    updater_thread.start()
    print(f'Background updater started (every {UPDATE_INTERVAL}s)')
    print('All APIs now respond instantly from cache!')
    
    app.run(host='0.0.0.0', port=5000)
