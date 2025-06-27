from flask import Flask, jsonify
from fetch import nextcloud_api, proxmox_api
import yaml
import urllib3
import os
from fetch import resource_history
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

app = Flask(__name__)

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
    data = nextcloud_api.fetch_nextcloud_serverinfo(config['nextcloud'])
    resource_history.insert_resource('nextcloud', data)
    return jsonify(data)

@app.route('/metrics/nextcloud/history')
def nextcloud_history():
    history = resource_history.get_resource_history('nextcloud')
    return jsonify([
        {'timestamp': ts, 'data': d} for ts, d in history
    ])

@app.route('/metrics/proxmox')
def proxmox_metrics():
    data = proxmox_api.fetch_proxmox_cluster_any(config['proxmox'])
    resource_history.insert_resource('proxmox', data)
    return jsonify(data)

@app.route('/metrics/proxmox/history')
def proxmox_history():
    history = resource_history.get_resource_history('proxmox')
    return jsonify([
        {'timestamp': ts, 'data': d} for ts, d in history
    ])

# 詳細なProxmoxデータ取得エンドポイント
@app.route('/metrics/proxmox/detailed')
def proxmox_detailed():
    data = proxmox_api.fetch_proxmox_cluster_any(config['proxmox'])
    if 'error' in data:
        return jsonify(data)
    
    # 詳細データを整理
    detailed_data = {
        'cluster_info': data.get('cluster_status', {}),
        'nodes': [],
        'vms': [],
        'containers': [],
        'storage': []
    }
    
    # ノード情報
    if 'nodes' in data and 'data' in data['nodes']:
        for node in data['nodes']['data']:
            detailed_data['nodes'].append(node)
    
    # リソース情報から VM/コンテナ/ストレージを分類
    if 'cluster_resources' in data and 'data' in data['cluster_resources']:
        for resource in data['cluster_resources']['data']:
            if resource.get('type') == 'qemu':
                detailed_data['vms'].append(resource)
            elif resource.get('type') == 'lxc':
                detailed_data['containers'].append(resource)
            elif resource.get('type') == 'storage':
                detailed_data['storage'].append(resource)
    
    # ノード詳細情報を追加
    if 'node_details' in data:
        for node_name, node_detail in data['node_details'].items():
            # 該当ノードを見つけて詳細情報を追加
            for node in detailed_data['nodes']:
                if node.get('node') == node_name:
                    node['details'] = node_detail
                    break
    
    return jsonify(detailed_data)

if __name__ == '__main__':
    print('--- Debug Links ---')
    print('Nextcloud:  http://localhost:5000/metrics/nextcloud')
    print('Nextcloud History:  http://localhost:5000/metrics/nextcloud/history')
    print('Proxmox:    http://localhost:5000/metrics/proxmox')
    print('Proxmox Detailed:  http://localhost:5000/metrics/proxmox/detailed')
    print('Proxmox History:  http://localhost:5000/metrics/proxmox/history')
    print('-------------------')
    app.run(host='0.0.0.0', port=5000)
