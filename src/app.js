const express = require('express');
const path = require('path');
const fs = require('fs');
const mathService = require('./services/mathService');
const pkg = require('../package.json');

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

const startTime = Date.now();

// Health Check Endpoint
app.get('/health', (req, res) => {
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
  const healthData = {
    status: 'UP',
    service: pkg.name || 'devops-midterm-app',
    version: pkg.version || '1.0.0',
    uptime: uptimeSeconds,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production',
    slot: process.env.DEPLOY_SLOT || 'blue',
    memoryUsageMB: Math.round(process.memoryUsage().rss / (1024 * 1024))
  };

  res.status(200).json(healthData);
});

// Calculation API Endpoint
app.post('/api/calculate', (req, res) => {
  const { a, b } = req.body;
  if (typeof a !== 'number' || typeof b !== 'number') {
    return res.status(400).json({ error: 'Parameters "a" and "b" must be numbers' });
  }

  const result = mathService.add(a, b);
  return res.status(200).json({ a, b, result });
});

// System Metrics API
app.get('/api/metrics', (req, res) => {
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
  const metrics = {
    service: pkg.name,
    version: pkg.version,
    uptimeSeconds,
    uptimeFormatted: `${Math.floor(uptimeSeconds / 60)}m ${uptimeSeconds % 60}s`,
    nodeVersion: process.version,
    platform: process.platform,
    statusEvaluation: mathService.evaluateHealth('UP', 99.9)
  };

  res.status(200).json(metrics);
});

// Fetch Recent Monitoring Logs for Dashboard
app.get('/api/logs', (req, res) => {
  const logPath = path.join(__dirname, '../logs/health_check.log');
  if (!fs.existsSync(logPath)) {
    return res.status(200).json({ logs: [] });
  }

  try {
    const content = fs.readFileSync(logPath, 'utf8');
    const lines = content.trim().split('\n').filter(Boolean);
    const recent = lines.slice(-25).reverse();
    return res.status(200).json({ logs: recent });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to read logs' });
  }
});

// Visual Monitoring Dashboard route
app.get('/status', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/dashboard.html'));
});

// Fallback for root route
app.get('/api', (req, res) => {
  res.json({
    message: 'DevOps Midterm Project API',
    endpoints: {
      health: '/health',
      metrics: '/api/metrics',
      calculate: 'POST /api/calculate',
      logs: '/api/logs',
      dashboard: '/status'
    }
  });
});

module.exports = app;
