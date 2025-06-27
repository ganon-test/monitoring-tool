const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

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

const API_BASE = 'http://localhost:5000';

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
    const response = await axios.get(`${API_BASE}/metrics/proxmox/detailed`);
    res.json(response.data);
  } catch (error) {
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
      const [nextcloud, proxmox] = await Promise.all([
        axios.get(`${API_BASE}/metrics/nextcloud`).catch(() => ({ data: { error: 'Nextcloud unavailable' } })),
        axios.get(`${API_BASE}/metrics/proxmox`).catch(() => ({ data: { error: 'Proxmox unavailable' } }))
      ]);

      socket.emit('data-update', {
        nextcloud: nextcloud.data,
        proxmox: proxmox.data,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  };

  // Send data immediately
  sendData();

  // Send data every 30 seconds
  const interval = setInterval(sendData, 30000);

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
