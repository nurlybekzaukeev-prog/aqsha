const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Routes
const { adChatRouter } = require('./routes/ad-chat-routes');
const { adminRouter } = require('./routes/admin-routes');
const { adsRouter } = require('./routes/ads-routes');
const { authRouter } = require('./routes/auth-routes');
const { notificationsRouter } = require('./routes/notifications-routes');
const { ordersRouter } = require('./routes/orders-routes');
const { servicesRouter } = require('./routes/services-routes');
const { walletRouter } = require('./routes/wallet-routes');
const { streamRouter } = require('./routes/stream-routes');

function createApp() {
  const app = express();

  // Middleware
  app.use(helmet());
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
  });
  app.use(limiter);

  // Serve static files (like uploads)
  app.use('/uploads', express.static('uploads'));

  // Route registration
  app.use('/api', adChatRouter);
  app.use('/api', adminRouter);
  app.use('/api', adsRouter);
  app.use('/api', authRouter);
  app.use('/api', notificationsRouter);
  app.use('/api', ordersRouter);
  app.use('/api', servicesRouter);
  app.use('/api', walletRouter);
  app.use('/api', streamRouter);

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
