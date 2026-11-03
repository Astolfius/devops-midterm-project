/**
 * Core business & math services for system metrics and calculations.
 * Used for automated testing and status calculations.
 */

function add(a, b) {
  if (typeof a !== 'number' || typeof b !== 'number') {
    throw new TypeError('Inputs must be numbers');
  }
  return a + b;
}

function calculateUptimePercentage(totalChecks, successfulChecks) {
  if (totalChecks <= 0) return 100;
  if (successfulChecks < 0 || successfulChecks > totalChecks) {
    throw new RangeError('successfulChecks must be between 0 and totalChecks');
  }
  const percentage = (successfulChecks / totalChecks) * 100;
  return Number(percentage.toFixed(2));
}

function calculateAverageLatency(latencies) {
  if (!Array.isArray(latencies) || latencies.length === 0) {
    return 0;
  }
  const sum = latencies.reduce((acc, val) => acc + val, 0);
  return Number((sum / latencies.length).toFixed(2));
}

function evaluateHealth(systemStatus, uptimePercentage) {
  if (systemStatus !== 'UP') {
    return { status: 'DEGRADED', message: 'System reported non-UP status' };
  }
  if (uptimePercentage < 90) {
    return { status: 'WARNING', message: 'Uptime dropped below 90%' };
  }
  return { status: 'HEALTHY', message: 'All systems operational' };
}

module.exports = {
  add,
  calculateUptimePercentage,
  calculateAverageLatency,
  evaluateHealth
};
