const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Routes
const adChatRoutes = require('./routes/ad-chat-routes');
const adminRoutes = require('./routes/admin-routes');
const adsRoutes = require('./routes/ads-routes');
const authRoutes = require('./routes/auth-routes');
const notificationsRoutes = require('./routes/notifications-routes');
const ordersRoutes = require('./routes/orders-routes');
const servicesRoutes = require('./routes/services-routes');
const walletRoutes = require('./routes/wallet-routes');

function createApp() {
  const app = express();

  // Middleware
  app.use(helmet());
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());
  
  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
  });
  app.use(limiter);

  // Serve static files (like uploads)
  app.use('/uploads', express.static('uploads'));

  // Route registration
  app.use('/api/ad-chat', adChatRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/ads', adsRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/notifications', notificationsRoutes);
  app.use('/api/orders', ordersRoutes);
  app.use('/api/services', servicesRoutes);
  app.use('/api/wallet', walletRoutes);

  // Basic healthcheck or fallback route
  app.get('/', (req, res) => {
    res.json({ message: 'API is running' });
  });

  // Error handling middleware
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
  });

  return app;
}

module.exports = {
  createApp
};
