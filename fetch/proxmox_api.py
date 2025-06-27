import requests

def fetch_proxmox(cfg):
    auth = requests.post(
        f"https://{cfg['host']}:8006/api2/json/access/ticket",
        data={"username": cfg['username'], "password": cfg['password']},
        verify=cfg.get('verify_ssl', True)
    ).json()['data']

    ticket = auth['ticket']
    csrf = auth['CSRFPreventionToken']
    headers = {'CSRFPreventionToken': csrf, 'Cookie': f"PVEAuthCookie={ticket}"}

    # 取得できる主要なAPIエンドポイント
    endpoints = {
        'cluster_resources': f"https://{cfg['host']}:8006/api2/json/cluster/resources",
        'cluster_status': f"https://{cfg['host']}:8006/api2/json/cluster/status",
        'nodes': f"https://{cfg['host']}:8006/api2/json/nodes",
        'cluster_backup': f"https://{cfg['host']}:8006/api2/json/cluster/backup",
        'cluster_tasks': f"https://{cfg['host']}:8006/api2/json/cluster/tasks",
        'cluster_metrics': f"https://{cfg['host']}:8006/api2/json/cluster/metrics",
        'cluster_options': f"https://{cfg['host']}:8006/api2/json/cluster/options",
        'cluster_log': f"https://{cfg['host']}:8006/api2/json/cluster/log",
    }
    result = {}
    for key, url in endpoints.items():
        try:
            res = requests.get(url, headers=headers, verify=cfg.get('verify_ssl', True), timeout=10)
            result[key] = res.json()
        except Exception as e:
            result[key] = {'error': str(e)}

    # 各ノードごとの詳細情報も取得
    try:
        nodes = result.get('nodes', {}).get('data', [])
        node_details = {}
        for node in nodes:
            node_name = node.get('node')
            if node_name:
                node_endpoints = {
                    'status': f"https://{cfg['host']}:8006/api2/json/nodes/{node_name}/status",
                    'syslog': f"https://{cfg['host']}:8006/api2/json/nodes/{node_name}/syslog",
                    'tasks': f"https://{cfg['host']}:8006/api2/json/nodes/{node_name}/tasks",
                    'rrd': f"https://{cfg['host']}:8006/api2/json/nodes/{node_name}/rrddata",
                    'services': f"https://{cfg['host']}:8006/api2/json/nodes/{node_name}/services",
                }
                node_details[node_name] = {}
                for nkey, nurl in node_endpoints.items():
                    try:
                        nres = requests.get(nurl, headers=headers, verify=cfg.get('verify_ssl', True), timeout=10)
                        node_details[node_name][nkey] = nres.json()
                    except Exception as e:
                        node_details[node_name][nkey] = {'error': str(e)}
        result['node_details'] = node_details
    except Exception as e:
        result['node_details'] = {'error': str(e)}

    return result

def fetch_proxmox_cluster_any(cfg_list):
    for cfg in cfg_list:
        try:
            result = fetch_proxmox(cfg)
            if result:
                return result
        except Exception as e:
            continue
    return {"error": "All Proxmox nodes are unreachable"}
