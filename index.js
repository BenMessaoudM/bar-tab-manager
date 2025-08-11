// index.js
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');

// routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const customerRoutes = require('./routes/customers');
const transactionRoutes = require('./routes/transactions');
const drinkRoutes = require('./routes/drinks');

// middleware
const errorHandler = require('./middleware/errorHandler');

dotenv.config();

const app = express();

// CORS (allow frontend on 127.0.0.1:8080 and localhost:8080)
app.use(cors({
  origin: [
    'http://localhost:8080',                          // local dev
    'https://benmessaoudm.github.io',                 // GH Pages root
    'https://benmessaoudm.github.io/bar-tab-manager'  // your GH Pages project URL
  ],
  credentials: false
}));
// Mongo connect
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(()=>console.log('✅ MongoDB connected'))
  .catch(err=>console.error('❌ MongoDB connection error:', err));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/drinks', drinkRoutes);   

// Error handler last
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, ()=> console.log(`🚀 Server running at http://127.0.0.1:${PORT}`));
