/**
 * Automated Blue-Green Deployment & Rollback Engine
 * Implements Stage 3 of CI/CD pipeline:
 * 1. Prepares next release slot (blue or green)
 * 2. Copies application files
 * 3. Verifies deployment health check
 * 4. Automatically triggers Rollback if health check fails
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { runHealthCheck } = require('./health_check');

const ROOT_DIR = path.join(__dirname, '..');
const PROD_DIR = path.join(ROOT_DIR, 'production');
const STATE_FILE = path.join(PROD_DIR, 'deploy_state.json');
const LOG_FILE = path.join(ROOT_DIR, 'logs', 'deployment.log');

// Ensure directories
[PROD_DIR, path.join(PROD_DIR, 'releases', 'blue'), path.join(PROD_DIR, 'releases', 'green'), path.join(ROOT_DIR, 'logs')].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

function logDeploy(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  fs.appendFileSync(LOG_FILE, line, 'utf8');
  console.log(msg);
}

function getDeployState() {
  if (fs.existsSync(STATE_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    } catch (e) {
      // fallback
    }
  }
  return { activeSlot: 'blue', lastHealthySlot: 'blue', version: '1.0.0', deployedAt: null };
}

function saveDeployState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
}

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'production' || entry.name === 'coverage') {
      continue;
    }

    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

async function startServerForCheck(slotDir, port, slotName) {
  return new Promise((resolve, reject) => {
    const nodeModulesPath = path.join(ROOT_DIR, 'node_modules');
    const child = spawn(process.execPath, [path.join(slotDir, 'src', 'server.js')], {
      env: {
        ...process.env,
        PORT: port,
        DEPLOY_SLOT: slotName,
        NODE_PATH: nodeModulesPath
      },
      stdio: 'ignore'
    });

    child.on('error', reject);

    // Give it 1.5 seconds to start up
    setTimeout(() => {
      resolve(child);
    }, 1500);
  });
}

async function performDeployment() {
  const isRollbackManual = process.argv.includes('--rollback');
  const currentState = getDeployState();

  if (isRollbackManual) {
    logDeploy(`🔄 [MANUAL ROLLBACK] Initiated rollback to last healthy slot: ${currentState.lastHealthySlot}`);
    currentState.activeSlot = currentState.lastHealthySlot;
    saveDeployState(currentState);
    logDeploy(`✅ Rollback complete. Active slot is now: ${currentState.activeSlot}`);
    return;
  }

  // Determine target slot (Blue-Green switch)
  const targetSlot = currentState.activeSlot === 'blue' ? 'green' : 'blue';
  const targetDir = path.join(PROD_DIR, 'releases', targetSlot);
  const testPort = 3001;

  logDeploy(`🚀 [DEPLOYMENT STARTED] Target Slot: ${targetSlot.toUpperCase()}`);
  logDeploy(`📂 Copying release payload into: ${targetDir}`);

  // Copy fresh files
  copyDirRecursive(ROOT_DIR, targetDir);

  logDeploy(`🩺 Performing health verification on slot: ${targetSlot}...`);

  let testServer;
  try {
    testServer = await startServerForCheck(targetDir, testPort, targetSlot);
    
    // Check health
    await runHealthCheck(`http://localhost:${testPort}/health`);
    logDeploy(`✅ Health check passed for ${targetSlot.toUpperCase()} slot!`);

    // Kill test server
    testServer.kill();

    // Promote new slot to active production
    const prevState = { ...currentState };
    currentState.lastHealthySlot = currentState.activeSlot;
    currentState.activeSlot = targetSlot;
    currentState.deployedAt = new Date().toISOString();
    saveDeployState(currentState);

    // Update active production pointer
    const currentProdDir = path.join(PROD_DIR, 'current');
    if (fs.existsSync(currentProdDir)) {
      fs.rmSync(currentProdDir, { recursive: true, force: true });
    }
    copyDirRecursive(targetDir, currentProdDir);

    logDeploy(`🎉 [DEPLOYMENT SUCCESSFUL] Switched active production traffic to ${targetSlot.toUpperCase()}!`);
    logDeploy(`Previous healthy slot kept for instant rollback: ${prevState.activeSlot.toUpperCase()}`);

  } catch (err) {
    if (testServer) testServer.kill();

    logDeploy(`❌ [DEPLOYMENT FAILED] Health verification failed for ${targetSlot.toUpperCase()}: ${err.message}`);
    logDeploy(`🛡️ [AUTOMATED ROLLBACK] Aborting release. Preserving active healthy slot: ${currentState.activeSlot.toUpperCase()}`);

    // Rollback ensures state remains on lastHealthySlot
    saveDeployState(currentState);
    throw new Error(`Deployment failed and automated rollback triggered: ${err.message}`);
  }
}

if (require.main === module) {
  performDeployment()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err.message);
      process.exit(1);
    });
}

module.exports = { performDeployment };
