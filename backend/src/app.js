const express = require('express');
const cors = require('cors');
const adminMenuRoutes = require('./routes/admin/menuRoutes');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/v1', adminMenuRoutes);

// Base route for testing
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Hotel Management API' });
});

module.exports = app;
