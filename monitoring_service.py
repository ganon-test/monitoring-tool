"""
Proxmox監視ダッシュボード - フルリビルド版
"""
import asyncio
import aiohttp
import yaml
import ssl
import json
import time
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
import sqlite3
import os
from dataclasses import dataclass, asdict
from contextlib import asynccontextmanager

# データクラス定義
@dataclass
class NodeInfo:
    name: str
    status: str
    cpu_usage: float
    memory_usage: float
    memory_total: int
    uptime: int
    temperature: Optional[float] = None
    power: Optional[float] = None

@dataclass
class VMInfo:
    vmid: int
    name: str
    status: str
    node: str
    type: str
    cpu_usage: Optional[float] = None
    memory_usage: Optional[int] = None
    memory_max: Optional[int] = None

@dataclass
class StorageInfo:
    node: str
    storage: str
    type: str
    total: int
    used: int
    available: int

@dataclass
class ClusterStats:
    nodes: List[NodeInfo]
    vms: List[VMInfo]
    storages: List[StorageInfo]
    total_cpu_cores: int
    total_memory: int
    cluster_status: str

class ProxmoxAPI:
    def __init__(self, config: Dict[str, Any]):
        self.hosts = config['proxmox']
        self.sessions = {}
        self.tickets = {}
        
    async def authenticate(self, host_config: Dict[str, Any]) -> Optional[str]:
        """Proxmoxサーバーに認証"""
        host = host_config['host']
        
        ssl_context = ssl.create_default_context()
        if not host_config.get('verify_ssl', True):
            ssl_context.check_hostname = False
            ssl_context.verify_mode = ssl.CERT_NONE
            
        connector = aiohttp.TCPConnector(ssl=ssl_context)
        
        try:
            if host not in self.sessions:
                self.sessions[host] = aiohttp.ClientSession(connector=connector)
            
            session = self.sessions[host]
            auth_url = f"https://{host}:8006/api2/json/access/ticket"
            
            auth_data = {
                'username': host_config['username'],
                'password': host_config['password']
            }
            
            async with session.post(auth_url, data=auth_data) as response:
                if response.status == 200:
                    result = await response.json()
                    ticket = result['data']['ticket']
                    csrf_token = result['data']['CSRFPreventionToken']
                    
                    self.tickets[host] = {
                        'ticket': ticket,
                        'csrf': csrf_token,
                        'timestamp': time.time()
                    }
                    
                    # ヘッダーを設定
                    session.headers.update({
                        'Cookie': f'PVEAuthCookie={ticket}',
                        'CSRFPreventionToken': csrf_token
                    })
                    
                    return ticket
                    
        except Exception as e:
            print(f"認証エラー {host}: {e}")
            return None
            
    async def api_request(self, host: str, endpoint: str) -> Optional[Dict]:
        """API リクエストを実行"""
        try:
            session = self.sessions.get(host)
            if not session:
                return None
                
            url = f"https://{host}:8006/api2/json{endpoint}"
            
            async with session.get(url) as response:
                if response.status == 200:
                    result = await response.json()
                    return result.get('data', [])
                elif response.status == 401:
                    # 再認証が必要
                    host_config = next(h for h in self.hosts if h['host'] == host)
                    await self.authenticate(host_config)
                    # リトライ
                    async with session.get(url) as retry_response:
                        if retry_response.status == 200:
                            result = await retry_response.json()
                            return result.get('data', [])
                            
        except Exception as e:
            print(f"API リクエストエラー {host}{endpoint}: {e}")
            return None
            
    async def get_cluster_status(self) -> ClusterStats:
        """クラスター全体の状態を取得"""
        all_nodes = []
        all_vms = []
        all_storages = []
        total_cpu_cores = 0
        total_memory = 0
        
        for host_config in self.hosts:
            host = host_config['host']
            
            # 認証
            await self.authenticate(host_config)
            
            # ノード情報取得
            nodes_data = await self.api_request(host, '/nodes')
            if nodes_data:
                for node in nodes_data:
                    node_name = node['node']
                    
                    # 詳細ノード情報取得
                    node_status = await self.api_request(host, f'/nodes/{node_name}/status')
                    if node_status:
                        node_info = NodeInfo(
                            name=node_name,
                            status=node['status'],
                            cpu_usage=node_status.get('cpu', 0),
                            memory_usage=node_status.get('memory', {}).get('used', 0),
                            memory_total=node_status.get('memory', {}).get('total', 0),
                            uptime=node_status.get('uptime', 0),
                            temperature=node_status.get('temperature'),
                            power=node_status.get('power')
                        )
                        all_nodes.append(node_info)
                        
                        total_cpu_cores += node_status.get('cpuinfo', {}).get('cpus', 0)
                        total_memory += node_status.get('memory', {}).get('total', 0)
                    
                    # VM/コンテナ情報取得
                    vms_data = await self.api_request(host, f'/nodes/{node_name}/qemu')
                    if vms_data:
                        for vm in vms_data:
                            vm_info = VMInfo(
                                vmid=vm['vmid'],
                                name=vm['name'],
                                status=vm['status'],
                                node=node_name,
                                type='vm',
                                cpu_usage=vm.get('cpu'),
                                memory_usage=vm.get('mem'),
                                memory_max=vm.get('maxmem')
                            )
                            all_vms.append(vm_info)
                    
                    # コンテナ情報取得
                    containers_data = await self.api_request(host, f'/nodes/{node_name}/lxc')
                    if containers_data:
                        for container in containers_data:
                            container_info = VMInfo(
                                vmid=container['vmid'],
                                name=container['name'],
                                status=container['status'],
                                node=node_name,
                                type='container',
                                cpu_usage=container.get('cpu'),
                                memory_usage=container.get('mem'),
                                memory_max=container.get('maxmem')
                            )
                            all_vms.append(container_info)
                    
                    # ストレージ情報取得
                    storage_data = await self.api_request(host, f'/nodes/{node_name}/storage')
                    if storage_data:
                        for storage in storage_data:
                            storage_info = StorageInfo(
                                node=node_name,
                                storage=storage['storage'],
                                type=storage.get('type', 'unknown'),
                                total=storage.get('total', 0),
                                used=storage.get('used', 0),
                                available=storage.get('avail', 0)
                            )
                            all_storages.append(storage_info)
        
        cluster_status = "online" if all_nodes else "offline"
        
        return ClusterStats(
            nodes=all_nodes,
            vms=all_vms,
            storages=all_storages,
            total_cpu_cores=total_cpu_cores,
            total_memory=total_memory,
            cluster_status=cluster_status
        )
    
    async def close(self):
        """セッションを閉じる"""
        for session in self.sessions.values():
            await session.close()

class DataStorage:
    def __init__(self, db_path: str = "monitoring.db"):
        self.db_path = db_path
        self.init_database()
    
    def init_database(self):
        """データベースを初期化"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # 履歴テーブル作成
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS cluster_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                total_cpu_usage REAL,
                total_memory_usage REAL,
                total_memory_total INTEGER,
                node_count INTEGER,
                vm_running_count INTEGER,
                vm_total_count INTEGER
            )
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS node_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                node_name TEXT,
                cpu_usage REAL,
                memory_usage REAL,
                memory_total INTEGER,
                status TEXT
            )
        """)
        
        conn.commit()
        conn.close()
    
    def save_cluster_data(self, stats: ClusterStats):
        """クラスターデータを保存"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # クラスター統計計算
        total_cpu = sum(node.cpu_usage for node in stats.nodes) / len(stats.nodes) if stats.nodes else 0
        total_memory_used = sum(node.memory_usage for node in stats.nodes)
        vm_running = len([vm for vm in stats.vms if vm.status == 'running'])
        
        cursor.execute("""
            INSERT INTO cluster_history 
            (total_cpu_usage, total_memory_usage, total_memory_total, node_count, vm_running_count, vm_total_count)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (total_cpu, total_memory_used, stats.total_memory, len(stats.nodes), vm_running, len(stats.vms)))
        
        # ノード履歴保存
        for node in stats.nodes:
            cursor.execute("""
                INSERT INTO node_history 
                (node_name, cpu_usage, memory_usage, memory_total, status)
                VALUES (?, ?, ?, ?, ?)
            """, (node.name, node.cpu_usage, node.memory_usage, node.memory_total, node.status))
        
        conn.commit()
        conn.close()
    
    def get_cluster_history(self, hours: int = 24) -> List[Dict]:
        """クラスター履歴を取得"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT timestamp, total_cpu_usage, total_memory_usage, vm_running_count
            FROM cluster_history 
            WHERE timestamp > datetime('now', '-{} hours')
            ORDER BY timestamp
        """.format(hours))
        
        results = []
        for row in cursor.fetchall():
            results.append({
                'timestamp': row[0],
                'cpu': row[1],
                'memory': row[2],
                'vms': row[3]
            })
        
        conn.close()
        return results

class MonitoringService:
    def __init__(self, config_path: str = "config.yaml"):
        with open(config_path, 'r') as f:
            self.config = yaml.safe_load(f)
        
        self.proxmox_api = ProxmoxAPI(self.config)
        self.storage = DataStorage()
        self.latest_data = None
        self.running = False
    
    async def start_monitoring(self):
        """監視を開始"""
        self.running = True
        
        while self.running:
            try:
                # データ取得
                stats = await self.proxmox_api.get_cluster_status()
                
                # データベースに保存
                self.storage.save_cluster_data(stats)
                
                # 最新データを更新
                self.latest_data = stats
                
                print(f"監視データ更新完了: {datetime.now()}")
                print(f"ノード数: {len(stats.nodes)}, VM/CT数: {len(stats.vms)}")
                
                # 10秒待機
                await asyncio.sleep(10)
                
            except Exception as e:
                print(f"監視エラー: {e}")
                await asyncio.sleep(5)
    
    def get_latest_data(self) -> Optional[ClusterStats]:
        """最新データを取得"""
        return self.latest_data
    
    def get_history_data(self, hours: int = 24) -> List[Dict]:
        """履歴データを取得"""
        return self.storage.get_cluster_history(hours)
    
    async def stop_monitoring(self):
        """監視を停止"""
        self.running = False
        await self.proxmox_api.close()

# グローバルサービスインスタンス
monitoring_service = MonitoringService()

async def main():
    """メイン関数"""
    print("Proxmox監視サービス開始...")
    
    try:
        await monitoring_service.start_monitoring()
    except KeyboardInterrupt:
        print("サービス停止中...")
        await monitoring_service.stop_monitoring()
    except Exception as e:
        print(f"予期しないエラー: {e}")
        await monitoring_service.stop_monitoring()

if __name__ == "__main__":
    asyncio.run(main())
