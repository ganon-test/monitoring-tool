import requests

def fetch_metrics(ip, port):
    try:
        url = f"http://{ip}:{port}/metrics"
        res = requests.get(url, timeout=3)
        lines = res.text.split('\n')
        output = {}
        for line in lines:
            if line.startswith("node_memory_MemAvailable_bytes"):
                output['mem_available'] = int(float(line.split()[-1]))  # 修正
            elif line.startswith("node_memory_MemTotal_bytes"):
                output['mem_total'] = int(float(line.split()[-1]))      # 修正
            elif line.startswith("node_load1"):
                output['load1'] = float(line.split()[-1])
            elif line.startswith("node_load5"):
                output['load5'] = float(line.split()[-1])
            elif line.startswith("node_load15"):
                output['load15'] = float(line.split()[-1])
        return output
    except Exception as e:
        return {"error": str(e)}
