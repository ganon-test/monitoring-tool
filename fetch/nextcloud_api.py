import requests
from requests.auth import HTTPBasicAuth

# Nextcloudユーザー情報取得（従来の関数）
def fetch_nextcloud_user(cfg):
    try:
        res = requests.get(
            f"{cfg['url']}/ocs/v2.php/cloud/users/{cfg['username']}?format=json",
            auth=HTTPBasicAuth(cfg['username'], cfg['password']),
            headers={"OCS-APIRequest": "true"},
            timeout=5
        )
        return res.json()
    except Exception as e:
        return {"error": str(e)}

# Nextcloudサーバー情報取得（新規追加）
def fetch_nextcloud_serverinfo(cfg):
    try:
        res = requests.get(
            f"{cfg['url']}/ocs/v2.php/apps/serverinfo/api/v1/info?format=json",
            auth=HTTPBasicAuth(cfg['username'], cfg['password']),
            headers={"OCS-APIRequest": "true"},
            timeout=5,
            verify=False  # 必要に応じてSSL検証を無効化
        )
        return res.json()
    except Exception as e:
        return {"error": str(e)}
