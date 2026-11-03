const request = require('supertest');
const app = require('../src/app');

describe('API Integration & Endpoint Tests', () => {
  it('GET /health - should return 200 and system health payload', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'UP');
    expect(response.body).toHaveProperty('uptime');
    expect(response.body).toHaveProperty('version');
    expect(response.body).toHaveProperty('environment');
    expect(response.body).toHaveProperty('slot');
  });

  it('POST /api/calculate - should return 200 and sum calculation', async () => {
    const response = await request(app)
      .post('/api/calculate')
      .send({ a: 12, b: 28 });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ a: 12, b: 28, result: 40 });
  });

  it('POST /api/calculate - should return 400 for invalid parameters', async () => {
    const response = await request(app)
      .post('/api/calculate')
      .send({ a: 'invalid', b: 10 });
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });

  it('GET /api/metrics - should return 200 and system metrics', async () => {
    const response = await request(app).get('/api/metrics');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('uptimeFormatted');
    expect(response.body).toHaveProperty('statusEvaluation');
    expect(response.body.statusEvaluation.status).toBe('HEALTHY');
  });

  it('GET /api/logs - should return 200 and array of log entries', async () => {
    const response = await request(app).get('/api/logs');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.logs)).toBe(true);
  });

  it('GET /status - should serve visual dashboard HTML', async () => {
    const response = await request(app).get('/status');
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/html/);
  });
});
