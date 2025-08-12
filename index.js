// index.js (CommonJS) — API server entry for Bar Tab Manager

const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');

// Routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const customerRoutes = require('./routes/customers');
const transactionRoutes = require('./routes/transactions');
const drinkRoutes = require('./routes/drinks');

// Error middleware
const errorHandler = require('./middleware/errorHandler');

dotenv.config();

const app = express();

/* ------------------------- CORS ------------------------- */
/**
 * Allow requests from:
 *  - Local dev front-end (http://127.0.0.1:8080 and http://localhost:8080)
 *  - GitHub Pages domain (both user root and project page)
 *  - Render (your API is hosted here)
 *  - Any origin you add via env ALLOWED_ORIGINS (comma-separated)
 */
const staticAllowed = new Set([
  'http://127.0.0.1:8080',
  'http://localhost:8080',
  'https://benmessaoudm.github.io',
  'https://benmessaoudm.github.io/bar-tab-manager',
]);

if (process.env.ALLOWED_ORIGINS) {
  process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim()).forEach(o => staticAllowed.add(o));
}

app.use(
  cors({
    origin: (origin, cb) => {
      // allow non-browser (no origin) and those in the list
      if (!origin || staticAllowed.has(origin)) return cb(null, true);
      // Also allow any subpath of your GH pages project (some browsers send trailing slashes)
      if (origin.startsWith('https://benmessaoudm.github.io')) return cb(null, true);
      return cb(new Error(`CORS blocked: ${origin}`));
    },
    credentials: false,
  })
);

/* ------------------------- Core middleware ------------------------- */
app.use(express.json());
app.set('trust proxy', 1); // for Render / proxies

/* ------------------------- DB connect ------------------------- */
const mongoUri = process.env.MONGO_URI || process.env.DATABASE_URL;
if (!mongoUri) {
  console.warn('⚠️  MONGO_URI is not set. Set it in your environment.');
}
mongoose
  .connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
  });

/* ------------------------- Health & root ------------------------- */
app.get('/', (_req, res) => res.json({ ok: true, name: 'bar-tab-api' }));
app.get('/healthz', (_req, res) => res.status(200).send('ok'));

/* ------------------------- API routes ------------------------- */
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/drinks', drinkRoutes);

/* ------------------------- Error handler (last) ------------------------- */
app.use(errorHandler);

/* ------------------------- Start ------------------------- */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 API listening on port ${PORT}`);
});

module.exports = app;
