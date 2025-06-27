# Monitoring Dashboard

A modern, dark-themed monitoring dashboard for Nextcloud and Proxmox infrastructure.

## Features

- 🌙 Modern dark UI with vibrant colors
- 📊 Real-time charts and gauges
- 🔄 Auto-refresh every 30 seconds
- 📱 Responsive design
- ⚡ WebSocket-based real-time updates
- 📈 Historical data visualization

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the dashboard server:
```bash
npm start
```

3. Make sure your Python monitoring API is running on `http://localhost:5000`

4. Open your browser to `http://localhost:3000`

## Development

For development with auto-restart:
```bash
npm run dev
```

## Monitored Metrics

### Nextcloud
- System version and status
- Active users (1h, 24h, 7d, etc.)
- CPU load (1m, 5m, 15m)
- Memory usage
- Storage usage
- File count
- Performance history

### Proxmox
- Cluster node status
- VM and container status
- Resource distribution
- CPU and memory usage per node
- Historical performance data

## API Endpoints

- `/api/nextcloud` - Current Nextcloud metrics
- `/api/nextcloud/history` - Historical Nextcloud data
- `/api/proxmox` - Current Proxmox metrics  
- `/api/proxmox/history` - Historical Proxmox data

## Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Charts**: Chart.js
- **Real-time**: Socket.IO
- **Backend**: Node.js, Express
- **HTTP Client**: Axios
