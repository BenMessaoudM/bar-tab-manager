const express = require('express');
const router = express.Router();

const Transaction = require('../models/Transaction');
const Customer = require('../models/Customer');
const authMiddleware = require('../middleware/authMiddleware');

// GET all transactions (newest first)
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const txs = await Transaction.find().populate('customer').sort({ createdAt: -1 });
    res.json(txs);
  } catch (err) {
    next(err);
  }
});

// GET transactions for a specific customer
router.get('/customer/:id', authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params;
    const txs = await Transaction.find({ customer: id })
      .populate('customer')
      .sort({ createdAt: 1 }); // oldest -> newest for receipt
    res.json(txs);
  } catch (err) {
    next(err);
  }
});

// POST create transaction
// Accepts EITHER: { customerId, amount, description }
// OR legacy: { customer, drink, price, worker }
router.post('/', authMiddleware, async (req, res, next) => {
  try {
    let customerId, amount, description, worker, drink;

    if ('customerId' in req.body) {
      customerId = req.body.customerId;
      amount = Number(req.body.amount);
      description = (req.body.description || '').trim();
      worker = req.user?.username || req.user?.id || 'system';
      drink = description || (amount < 0 ? 'Drink' : 'Payment');
    } else {
      customerId = req.body.customer;
      amount = Number(req.body.price);
      description = req.body.drink || '';
      worker = req.body.worker || req.user?.username || req.user?.id || 'system';
      drink = description || (amount < 0 ? 'Drink' : 'Payment');
    }

    if (!customerId || !Number.isFinite(amount)) {
      return res.status(400).json({ message: 'customerId and numeric amount are required.' });
    }

    const customer = await Customer.findById(customerId);
    if (!customer) return res.status(404).json({ message: 'Customer not found.' });

    // Create transaction
    const tx = await Transaction.create({
      customer: customerId,
      drink,
      price: amount,          // store numeric amount in 'price'
      worker
    });

    // Update customer's running total
    if (typeof customer.amount === 'number') {
      customer.amount += amount;
    } else if (typeof customer.balance === 'number') {
      customer.balance += amount;
    } else {
      customer.amount = (Number(customer.amount) || 0) + amount;
    }
    await customer.save();

    const populated = await tx.populate('customer');
    res.status(201).json(populated);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
