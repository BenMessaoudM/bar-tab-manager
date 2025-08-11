const express = require('express');
const router = express.Router();

const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const bcrypt = require('bcryptjs');

/**
 * GET /api/users
 * List all users (superuser sees all; worker can still call for role probe but you can restrict if you like)
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ username: 1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching users', error: err.message });
  }
});

/**
 * POST /api/users
 * Create worker (superuser only)
 */
router.post('/', authMiddleware, roleMiddleware('superuser'), async (req, res) => {
  try {
    const { username, password, role = 'worker' } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'username and password are required' });
    }
    const exists = await User.findOne({ username });
    if (exists) return res.status(409).json({ message: 'User already exists' });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ username, password: hashed, role });
    res.status(201).json({ _id: user._id, username: user.username, role: user.role });
  } catch (err) {
    res.status(500).json({ message: 'Error creating user', error: err.message });
  }
});

/**
 * DELETE /api/users/:id
 * Delete a worker (superuser only). Prevent deleting superusers for safety.
 */
router.delete('/:id', authMiddleware, roleMiddleware('superuser'), async (req, res) => {
  try {
    const u = await User.findById(req.params.id);
    if (!u) return res.status(404).json({ message: 'User not found' });
    if (u.role === 'superuser') {
      return res.status(400).json({ message: 'Cannot delete a superuser account' });
    }
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting user', error: err.message });
  }
});

module.exports = router;
