const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const RoomSearchIndex = sequelize.define('RoomSearchIndex', {
    SearchIndexId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    RoomTypeId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    BranchId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    Keyword: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    KeywordUnaccent: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    Category: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    BasePrice: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: false
    },
    MaxOccupancy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 2
    },
    SearchVector: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'RoomSearchIndex',
    timestamps: true,
    createdAt: 'CreatedAt',
    updatedAt: 'UpdatedAt',
    indexes: [
      { name: 'idx_search_keyword_btree', using: 'BTREE', fields: ['Keyword'] },
      { name: 'idx_search_unaccent_btree', using: 'BTREE', fields: ['KeywordUnaccent'] },
      { name: 'idx_search_filter_btree', using: 'BTREE', fields: ['BranchId', 'MaxOccupancy', 'BasePrice'] }
    ]
  });

  return RoomSearchIndex;
};
