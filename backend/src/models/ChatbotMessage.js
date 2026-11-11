'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ChatbotMessage = sequelize.define('ChatbotMessage', {
    MessageId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    ConversationId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'ChatbotConversations',
        key: 'ConversationId',
      },
    },
    KnowledgeId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'ChatbotKnowledgeBase',
        key: 'KnowledgeId',
      },
    },
    SenderType: {
      type: DataTypes.STRING(20),
      defaultValue: 'Guest', // 'Guest' | 'AI' | 'Staff' | 'System' (Spec C13 mục 0.3)
    },
    MessageText: {
      type: DataTypes.TEXT('long'),
      allowNull: false,
    },
    MessageTime: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  }, {
    tableName: 'ChatbotMessages',
    timestamps: false,
  });

  return ChatbotMessage;
};
