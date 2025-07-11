const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

// Force IPv4 for axios
axios.defaults.family = 4;

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.static('public'));
app.use(express.json());

const API_BASE = process.env.API_BASE || 'http://127.0.0.1:5000';

console.log('API_BASE set to:', API_BASE);

// Serve the main dashboard
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API endpoints to fetch data from Python backend
app.get('/api/nextcloud', async (req, res) => {
  try {
    const response = await axios.get(`${API_BASE}/metrics/nextcloud`);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/nextcloud/history', async (req, res) => {
  try {
    const response = await axios.get(`${API_BASE}/metrics/nextcloud/history`);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/proxmox', async (req, res) => {
  try {
    const response = await axios.get(`${API_BASE}/metrics/proxmox`);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/proxmox/detailed', async (req, res) => {
  try {
    console.log('Requesting detailed data from:', `${API_BASE}/metrics/proxmox/detailed`);
    const response = await axios.get(`${API_BASE}/metrics/proxmox/detailed`);
    console.log('Response status:', response.status);
    console.log('Response data keys:', Object.keys(response.data));
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching proxmox detailed:', error.message);
    if (error.response) {
      console.error('Error response status:', error.response.status);
      console.error('Error response data:', error.response.data);
    }
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/proxmox/history', async (req, res) => {
  try {
    const response = await axios.get(`${API_BASE}/metrics/proxmox/history`);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Real-time data updates via WebSocket
io.on('connection', (socket) => {
  console.log('Client connected');

  // Send initial data
  const sendData = async () => {
    try {
      console.log('Fetching data from Python API...');
      console.log('API_BASE:', API_BASE);
      const [nextcloud, proxmox] = await Promise.all([
        axios.get('http://127.0.0.1:5000/metrics/nextcloud').catch((err) => {
          console.error('Nextcloud API error:', err.message);
          return { data: { error: 'Nextcloud unavailable' } };
        }),
        axios.get('http://127.0.0.1:5000/metrics/proxmox').catch((err) => {
          console.error('Proxmox API error:', err.message);
          return { data: { error: 'Proxmox unavailable' } };
        })
      ]);

      console.log('Nextcloud response:', nextcloud.data);
      console.log('Proxmox response:', proxmox.data);

      socket.emit('data-update', {
        nextcloud: nextcloud.data,
        proxmox: proxmox.data,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('WebSocket data send error:', error);
      socket.emit('error', { message: error.message });
    }
  };

  // Send data immediately
  sendData();

  // Send data every 10 seconds
  const interval = setInterval(sendData, 10000);

  socket.on('disconnect', () => {
    console.log('Client disconnected');
    clearInterval(interval);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Monitoring Dashboard running on http://localhost:${PORT}`);
  console.log(`📊 Make sure Python API is running on http://localhost:5000`);
});
