'use strict';

/**
 * Migration 011: Bổ sung cột HandledBy cho bảng ChatbotConversations
 * Đặc tả: Spec C13 (Smart Hotel Concierge - Phụ lục 2.1)
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable('ChatbotConversations');
    if (!tableInfo.HandledBy) {
      await queryInterface.addColumn('ChatbotConversations', 'HandledBy', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'UserId',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      });
    }

    try {
      await queryInterface.addIndex('ChatbotConversations', ['HandledBy'], {
        name: 'idx_chatbot_conversations_handledby',
      });
    } catch (e) {
      // Bỏ qua nếu index đã tồn tại
    }
  },

  down: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable('ChatbotConversations');
    if (tableInfo.HandledBy) {
      try {
        await queryInterface.removeIndex('ChatbotConversations', 'idx_chatbot_conversations_handledby');
      } catch (e) {}
      await queryInterface.removeColumn('ChatbotConversations', 'HandledBy');
    }
  },
};
