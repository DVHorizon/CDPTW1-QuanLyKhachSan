'use strict';
const { sequelize } = require('../models');

async function migrateCategoryStatus() {
  try {
    const [cols] = await sequelize.query('SHOW COLUMNS FROM ServiceCategories LIKE "Status"');
    if (cols.length === 0) {
      await sequelize.query("ALTER TABLE ServiceCategories ADD COLUMN Status ENUM('Active', 'Inactive') DEFAULT 'Active'");
      console.log('✅ Added Status column to ServiceCategories table.');
    } else {
      console.log('ℹ️ Status column already exists on ServiceCategories.');
    }
    // Update existing records
    await sequelize.query("UPDATE ServiceCategories SET Status = 'Active' WHERE Status IS NULL OR IsDeleted = 0");
    await sequelize.query("UPDATE ServiceCategories SET Status = 'Inactive' WHERE IsDeleted = 1");
    console.log('✅ Synchronized Status values in ServiceCategories.');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

migrateCategoryStatus();
