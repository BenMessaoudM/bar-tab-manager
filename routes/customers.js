const express = require('express');
const router = express.Router();

const Customer = require('../models/Customer');
const Transaction = require('../models/Transaction');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

/**
 * GET /api/customers
 * List all customers
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const customers = await Customer.find().sort({ name: 1 });
    res.json(customers);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching customers', error: err.message });
  }
});

/**
 * POST /api/customers
 * Create a customer (superuser only)
 */
router.post('/', authMiddleware, roleMiddleware('superuser'), async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Name is required' });
    }
    const exists = await Customer.findOne({ name: name.trim() });
    if (exists) return res.status(409).json({ message: 'Customer already exists' });

    const customer = await Customer.create({ name: name.trim(), balance: 0 });
    res.status(201).json(customer);
  } catch (err) {
    res.status(500).json({ message: 'Error creating customer', error: err.message });
  }
});

/**
 * PUT /api/customers/:id
 * Update a customer (optional)
 */
router.put('/:id', authMiddleware, roleMiddleware('superuser'), async (req, res) => {
  try {
    const { name } = req.body;
    const updated = await Customer.findByIdAndUpdate(
      req.params.id,
      { $set: { name } },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: 'Customer not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Error updating customer', error: err.message });
  }
});

/**
 * DELETE /api/customers/:id
 * Delete customer + cascade delete transactions (superuser only)
 */
router.delete('/:id', authMiddleware, roleMiddleware('superuser'), async (req, res) => {
  try {
    const id = req.params.id;
    const customer = await Customer.findById(id);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    // delete all transactions for this customer
    await Transaction.deleteMany({ customer: id });

    await Customer.findByIdAndDelete(id);
    return res.json({ message: 'Customer deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting customer', error: err.message });
  }
});

module.exports = router;
