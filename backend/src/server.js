require('dotenv').config();
const app = require('./app');
const db = require('./models');

const PORT = process.env.PORT || 5000;

// Test DB and sync
db.sequelize.sync({ force: false }).then(() => {
  console.log('Database connected and synced.');
  
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}.`);
  });
}).catch(err => {
  console.error('Failed to sync db: ' + err.message);
});
