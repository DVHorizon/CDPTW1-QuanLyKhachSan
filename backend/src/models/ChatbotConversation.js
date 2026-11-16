'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ChatbotConversation = sequelize.define('ChatbotConversation', {
    ConversationId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    UserId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'UserId',
      },
    },
    StartTime: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    EndTime: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    Status: {
      type: DataTypes.STRING(30),
      defaultValue: 'Open',
    },
    HandledBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'UserId',
      },
    },
  }, {
    tableName: 'ChatbotConversations',
    timestamps: false,
  });

  return ChatbotConversation;
};
