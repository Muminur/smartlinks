import request from 'supertest';
import app from '../src/app';

describe('Health Check Endpoints', () => {
  describe('GET /api/health', () => {
    it('should return 200 and health status', async () => {
      const response = await request(app).get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('uptime');
      expect(response.body.data).toHaveProperty('message');
      expect(response.body.data).toHaveProperty('timestamp');
      expect(response.body.data.message).toBe('OK');
    });
  });

  describe('GET /api/live', () => {
    it('should return 200 and liveness status', async () => {
      const response = await request(app).get('/api/live');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('status');
      expect(response.body.data.status).toBe('alive');
    });
  });

  describe('GET /', () => {
    it('should return API information', async () => {
      const response = await request(app).get('/');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('version');
      expect(response.body.message).toBe('Shortlinks API Server');
    });
  });

  describe('GET /api/nonexistent', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await request(app).get('/api/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toHaveProperty('message');
    });
  });
});
