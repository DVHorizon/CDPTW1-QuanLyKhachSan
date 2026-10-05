const express = require('express');
const cors = require('cors');
require('dotenv').config();

const homeRoutes = require('./routes/homeRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Grand Horizon Hotel Management Backend API is running!');
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Backend is healthy' });
});

// Routes API
app.use('/api', homeRoutes);

app.listen(PORT, () => {
  console.log(`Backend server is running on port ${PORT}`);
});
