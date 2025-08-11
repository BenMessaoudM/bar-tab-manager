// routes/drinks.js
const express = require('express');
const router = express.Router();
const Drink = require('../models/Drink');
const auth = require('../middleware/authMiddleware');
const role = require('../middleware/roleMiddleware');

// GET all drinks (any authenticated user)
router.get('/', auth, async (req, res) => {
  try {
    const drinks = await Drink.find().sort({ name: 1 });
    res.json(drinks);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching drinks.', error: err.message });
  }
});

// CREATE a drink (superuser only)
router.post('/', auth, role('superuser'), async (req, res) => {
  try {
    const { name, price, active = true } = req.body;
    if (!name || typeof price !== 'number') {
      return res.status(400).json({ message: 'Name and numeric price are required.' });
    }
    const d = await Drink.create({ name: name.trim(), price, active: !!active });
    res.status(201).json(d);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Drink name already exists.' });
    }
    res.status(500).json({ message: 'Error creating drink.', error: err.message });
  }
});

// UPDATE a drink (superuser only)
router.put('/:id', auth, role('superuser'), async (req, res) => {
  try {
    const { name, price, active } = req.body;
    const update = {};
    if (typeof name === 'string') update.name = name.trim();
    if (typeof price === 'number') update.price = price;
    if (typeof active === 'boolean') update.active = active;

    const d = await Drink.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!d) return res.status(404).json({ message: 'Drink not found.' });
    res.json(d);
  } catch (err) {
    res.status(500).json({ message: 'Error updating drink.', error: err.message });
  }
});

// DELETE a drink (superuser only)
router.delete('/:id', auth, role('superuser'), async (req, res) => {
  try {
    const d = await Drink.findByIdAndDelete(req.params.id);
    if (!d) return res.status(404).json({ message: 'Drink not found.' });
    res.json({ message: 'Deleted', id: d._id });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting drink.', error: err.message });
  }
});

module.exports = router;
