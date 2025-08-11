const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');
const User = require('./models/User');

dotenv.config();

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

    const username = 'admin';
    const password = 'admin';
    const role = 'superuser';

    const existing = await User.findOne({ username });
    if (existing) {
      console.log('Admin already exists -> updating password & role just in case');
      const hashed = await bcrypt.hash(password, 10);
      existing.password = hashed;
      existing.role = role;
      await existing.save();
      console.log('✅ Admin updated:', { username, role });
    } else {
      const hashed = await bcrypt.hash(password, 10);
      const user = await User.create({ username, password: hashed, role });
      console.log('✅ Admin created:', { id: user._id.toString(), username, role });
    }
  } catch (err) {
    console.error('Seed error:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();
