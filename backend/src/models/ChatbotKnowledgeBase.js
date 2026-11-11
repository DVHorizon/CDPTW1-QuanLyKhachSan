'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ChatbotKnowledgeBase = sequelize.define('ChatbotKnowledgeBase', {
    KnowledgeId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    Question: {
      type: DataTypes.STRING(1000),
      allowNull: false,
    },
    Answer: {
      type: DataTypes.TEXT('long'),
      allowNull: false,
    },
    Category: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    Keywords: {
      type: DataTypes.STRING(1000),
      allowNull: true,
    },
    Status: {
      type: DataTypes.STRING(30),
      defaultValue: 'Active',
    },
    CreatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    UpdatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  }, {
    tableName: 'ChatbotKnowledgeBase',
    timestamps: true,
    createdAt: 'CreatedAt',
    updatedAt: 'UpdatedAt',
  });

  return ChatbotKnowledgeBase;
};
