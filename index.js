// index.js (CommonJS)
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const bcrypt = require('bcryptjs');

// Routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const customerRoutes = require('./routes/customers');
const transactionRoutes = require('./routes/transactions');
const drinkRoutes = require('./routes/drinks');

// Middleware
const errorHandler = require('./middleware/errorHandler');

// Models
const User = require('./models/User');

dotenv.config();

const app = express();

/* ------------------------ Core Middleware ------------------------ */
app.use(express.json());

app.use(
  cors({
    origin: [
      'http://localhost:8080',
      'http://127.0.0.1:8080',
      // your GitHub Pages site(s)
      'https://benmessaoudm.github.io',
      'https://benmessaoudm.github.io/bar-tab-manager',
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false,
  })
);

// Optional simple health probe
app.get('/health', (_, res) => res.status(200).send('ok'));

/* ------------------------ MongoDB Connect ------------------------ */
mongoose
  .connect(process.env.MONGO_URI, {
    // These options are fine with Mongoose 6+/7+
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(async () => {
    console.log('✅ MongoDB connected');
    await createAdminIfNotExists();
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
  });

/**
 * Ensure an admin account exists in production environments where shell access
 * isn’t available (e.g., Render/Hobby tiers).
 * Username: admin / Password: admin
 */
async function createAdminIfNotExists() {
  try {
    const existing = await User.findOne({ username: 'admin' });
    if (!existing) {
      const hash = await bcrypt.hash('admin', 10);
      await User.create({
        username: 'admin',
        password: hash,
        role: 'superuser',
      });
      console.log(
        '👑 Seeded admin user → username: "admin", password: "admin" (please change later)'
      );
    } else {
      console.log('ℹ️ Admin user already exists.');
      // Optionally enforce role/password if you want:
      // existing.role = 'superuser';
      // await existing.save();
    }
  } catch (err) {
    console.error('❌ Failed to seed admin user:', err.message);
  }
}

/* --------------------------- API Routes -------------------------- */
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/drinks', drinkRoutes);

/* ------------------------ Error Handler Last --------------------- */
app.use(errorHandler);

/* ----------------------------- Start ----------------------------- */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://127.0.0.1:${PORT}`);
});
