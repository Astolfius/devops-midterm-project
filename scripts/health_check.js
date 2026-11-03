/**
 * Health Check & Monitoring Script
 * Verifies application availability and logs status to logs/health_check.log
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

// Extract URL argument or environment variable
let targetUrl = process.env.TARGET_URL || 'http://localhost:3000';
process.argv.forEach(arg => {
  if (arg.startsWith('--url=')) {
    targetUrl = arg.split('=')[1];
  }
});

const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}
const logFilePath = path.join(logDir, 'health_check.log');

function appendLog(message) {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] ${message}\n`;
  fs.appendFileSync(logFilePath, logLine, 'utf8');
  console.log(logLine.trim());
}

function runHealthCheck(url) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url.endsWith('/health') ? url : `${url}/health`);
    const client = parsed.protocol === 'https:' ? https : http;
    const startTime = Date.now();

    const req = client.get(parsed.toString(), { timeout: 5000 }, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        const latency = Date.now() - startTime;
        let body;
        try {
          body = JSON.parse(data);
        } catch (e) {
          body = {};
        }

        if (res.statusCode === 200 && body.status === 'UP') {
          const slot = body.slot || 'unknown';
          const version = body.version || '1.0.0';
          appendLog(`[SUCCESS] URL: ${parsed.href} | Status: 200 UP | Latency: ${latency}ms | Slot: ${slot} | Version: v${version}`);
          resolve({ success: true, latency, body });
        } else {
          appendLog(`[FAILURE] URL: ${parsed.href} | Status: ${res.statusCode} | Latency: ${latency}ms | Payload: ${data.slice(0, 100)}`);
          reject(new Error(`Unhealthy status: ${res.statusCode}`));
        }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      appendLog(`[FAILURE] URL: ${parsed.href} | Error: Connection Timed Out (>5000ms)`);
      reject(new Error('Connection Timed Out'));
    });

    req.on('error', err => {
      appendLog(`[FAILURE] URL: ${parsed.href} | Error: ${err.message}`);
      reject(err);
    });
  });
}

// Execute check if run directly
if (require.main === module) {
  console.log(`🩺 Checking target: ${targetUrl}...`);
  runHealthCheck(targetUrl)
    .then(() => {
      console.log('✅ Health check completed: Target is Healthy.');
      process.exit(0);
    })
    .catch(() => {
      console.error('❌ Health check failed: Target is Unhealthy.');
      process.exit(1);
    });
}

module.exports = { runHealthCheck };
