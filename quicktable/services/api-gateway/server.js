import express from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Service URLs
const services = {
  order: process.env.ORDER_SERVICE_URL || 'http://localhost:3001',
  reservation: process.env.RESERVATION_SERVICE_URL || 'http://localhost:3002',
  table: process.env.TABLE_SERVICE_URL || 'http://localhost:3003',
  menu: process.env.MENU_SERVICE_URL || 'http://localhost:3004',
  hours: process.env.HOURS_SERVICE_URL || 'http://localhost:3005',
  notification: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3006',
  realtime: process.env.REALTIME_SERVICE_URL || 'http://localhost:3007',
  auth: process.env.AUTH_SERVICE_URL || 'http://localhost:3008'
};

// Proxy middleware for each service
app.use('/api/orders', createProxyMiddleware({
  target: services.order,
  changeOrigin: true,
  pathRewrite: { '^/api': '' }
}));

app.use('/api/reservations', createProxyMiddleware({
  target: services.reservation,
  changeOrigin: true,
  pathRewrite: { '^/api': '' }
}));

app.use('/api/tables', createProxyMiddleware({
  target: services.table,
  changeOrigin: true,
  pathRewrite: { '^/api': '' }
}));

app.use('/api/menu', createProxyMiddleware({
  target: services.menu,
  changeOrigin: true,
  pathRewrite: { '^/api': '' }
}));

app.use('/api/hours', createProxyMiddleware({
  target: services.hours,
  changeOrigin: true,
  pathRewrite: { '^/api': '' }
}));

app.use('/api/notifications', createProxyMiddleware({
  target: services.notification,
  changeOrigin: true,
  pathRewrite: { '^/api': '' }
}));

app.use('/api/realtime', createProxyMiddleware({
  target: services.realtime,
  changeOrigin: true,
  pathRewrite: { '^/api': '' }
}));

app.use('/api/auth', createProxyMiddleware({
  target: services.auth,
  changeOrigin: true,
  pathRewrite: { '^/api': '' }
}));

// Health check endpoint
app.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    gateway: 'api-gateway',
    timestamp: new Date().toISOString(),
    services: {}
  };
  
  // Check service health
  const serviceNames = ['order', 'reservation', 'table', 'menu', 'hours', 'notification', 'realtime', 'auth'];
  
  for (const serviceName of serviceNames) {
    try {
      const response = await fetch(`${services[serviceName]}/health`);
      health.services[serviceName] = await response.json();
    } catch (error) {
      health.services[serviceName] = { status: 'error', message: error.message };
    }
  }
  
  res.json(health);
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'QuickTable API Gateway',
    version: '1.0.0',
    endpoints: {
      orders: '/api/orders',
      reservations: '/api/reservations',
      tables: '/api/tables',
      menu: '/api/menu',
      hours: '/api/hours',
      notifications: '/api/notifications',
      realtime: '/api/realtime',
      auth: '/api/auth',
      health: '/health'
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 API Gateway running on port ${PORT}`);
  console.log(`📡 Proxying requests to services:`);
  Object.entries(services).forEach(([name, url]) => {
    console.log(`   ${name}: ${url}`);
  });
});

