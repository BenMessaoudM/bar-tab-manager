// models/Transaction.js
const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    drink: { type: String, default: '' },   // label/description
    price: { type: Number, required: true },// numeric amount
    worker: { type: String, default: '' },  // username/id of worker
  },
  { timestamps: true }
);

module.exports = mongoose.model('Transaction', TransactionSchema);
