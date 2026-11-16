'use strict';

/**
 * Migration 012 – Bổ sung cột Version (INTEGER NOT NULL DEFAULT 1)
 * phục vụ Optimistic Locking (QA Scenario #2) cho các bảng C1–C14.
 */

const VERSION_TABLES = [
  'Services',
  'ServiceCategories',
  'ServiceOrders',
  'ChatbotConversations',
  'ChatbotKnowledgeBase',
  'Invoices',
  'Payments',
];

module.exports = {
  async up(queryInterface, Sequelize) {
    for (const table of VERSION_TABLES) {
      const desc = await queryInterface.describeTable(table);
      const cols = Object.keys(desc).map((c) => c.toLowerCase());
      if (!cols.includes('version')) {
        await queryInterface.addColumn(table, 'Version', {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 1,
        });
        console.log(`✅ Thêm cột ${table}.Version`);
      } else {
        console.log(`ℹ️ Cột ${table}.Version đã tồn tại.`);
      }
    }
  },

  async down(queryInterface) {
    for (const table of VERSION_TABLES) {
      try {
        const desc = await queryInterface.describeTable(table);
        const cols = Object.keys(desc);
        if (cols.includes('Version')) {
          await queryInterface.removeColumn(table, 'Version');
          console.log(`🗑️ Đã xóa cột ${table}.Version`);
        }
      } catch (err) {
        console.warn(`⚠️ Rollback ${table}.Version skipped:`, err.message);
      }
    }
  },
};
