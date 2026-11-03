const {
  add,
  calculateUptimePercentage,
  calculateAverageLatency,
  evaluateHealth
} = require('../src/services/mathService');

describe('Math & Metrics Service Unit Tests', () => {
  describe('add()', () => {
    it('should correctly sum two positive numbers', () => {
      expect(add(15, 25)).toBe(40);
    });

    it('should correctly sum negative numbers', () => {
      expect(add(-10, -5)).toBe(-15);
    });

    it('should throw TypeError when inputs are not numbers', () => {
      expect(() => add('10', 5)).toThrow(TypeError);
      expect(() => add(null, 5)).toThrow(TypeError);
    });
  });

  describe('calculateUptimePercentage()', () => {
    it('should return 100% when all checks succeed', () => {
      expect(calculateUptimePercentage(100, 100)).toBe(100);
    });

    it('should return 95.00% when 95 out of 100 checks succeed', () => {
      expect(calculateUptimePercentage(100, 95)).toBe(95);
    });

    it('should return 100% when total checks is 0', () => {
      expect(calculateUptimePercentage(0, 0)).toBe(100);
    });

    it('should throw RangeError if successful checks exceed total checks', () => {
      expect(() => calculateUptimePercentage(10, 15)).toThrow(RangeError);
      expect(() => calculateUptimePercentage(10, -1)).toThrow(RangeError);
    });
  });

  describe('calculateAverageLatency()', () => {
    it('should return 0 for empty array', () => {
      expect(calculateAverageLatency([])).toBe(0);
    });

    it('should calculate the correct average latency', () => {
      expect(calculateAverageLatency([20, 30, 40])).toBe(30);
      expect(calculateAverageLatency([10.5, 12.5])).toBe(11.5);
    });
  });

  describe('evaluateHealth()', () => {
    it('should return HEALTHY when status is UP and uptime >= 90', () => {
      const result = evaluateHealth('UP', 99.5);
      expect(result.status).toBe('HEALTHY');
    });

    it('should return WARNING when uptime drops below 90%', () => {
      const result = evaluateHealth('UP', 85);
      expect(result.status).toBe('WARNING');
    });

    it('should return DEGRADED when systemStatus is not UP', () => {
      const result = evaluateHealth('DOWN', 100);
      expect(result.status).toBe('DEGRADED');
    });
  });
});
