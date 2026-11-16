'use strict';

/**
 * Migration 005: Tạo bảng RoomSearchIndex
 * Bảng chỉ mục tìm kiếm tối ưu hóa theo cấu trúc Cây Nhị Phân / B-Tree (Binary Tree)
 * Giúp tăng tốc độ tìm kiếm từ O(N) quét tuần tự sang O(log N) tìm kiếm theo cây chỉ mục.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const qi = queryInterface;

    await qi.sequelize.query('SET FOREIGN_KEY_CHECKS = 0;');

    await qi.createTable('RoomSearchIndex', {
      SearchIndexId: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      RoomTypeId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'RoomTypes', key: 'RoomTypeId' },
        onDelete: 'CASCADE'
      },
      BranchId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Branches', key: 'BranchId' },
        onDelete: 'SET NULL'
      },
      Keyword: {
        type: Sequelize.STRING(150),
        allowNull: false,
        comment: 'Từ khóa tìm kiếm (có dấu)'
      },
      KeywordUnaccent: {
        type: Sequelize.STRING(150),
        allowNull: false,
        comment: 'Từ khóa tìm kiếm không dấu'
      },
      Category: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      BasePrice: {
        type: Sequelize.DECIMAL(18, 2),
        allowNull: false
      },
      MaxOccupancy: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 2
      },
      SearchVector: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Dữ liệu tổng hợp: Tên phòng, Tiện nghi, View, Mô tả'
      },
      CreatedAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      UpdatedAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Tạo các chỉ mục Binary Tree (B-TREE INDEX)
    // 1. Cây nhị phân tìm kiếm từ khóa có dấu
    await qi.addIndex('RoomSearchIndex', ['Keyword'], {
      name: 'idx_search_keyword_btree',
      using: 'BTREE'
    });

    // 2. Cây nhị phân tìm kiếm từ khóa không dấu (Unaccent)
    await qi.addIndex('RoomSearchIndex', ['KeywordUnaccent'], {
      name: 'idx_search_unaccent_btree',
      using: 'BTREE'
    });

    // 3. Cây nhị phân kết hợp (Composite B-Tree) để lọc theo Chi nhánh, Sức chứa và Khoảng giá
    await qi.addIndex('RoomSearchIndex', ['BranchId', 'MaxOccupancy', 'BasePrice'], {
      name: 'idx_search_filter_btree',
      using: 'BTREE'
    });

    // 4. Chỉ mục FullText bổ trợ
    try {
      await qi.sequelize.query(
        'ALTER TABLE `RoomSearchIndex` ADD FULLTEXT INDEX `ft_search_vector` (`SearchVector`);'
      );
    } catch (_) {}

    await qi.sequelize.query('SET FOREIGN_KEY_CHECKS = 1;');
    console.log('✅ Tạo bảng RoomSearchIndex với các chỉ mục B-Tree (Binary Tree) thành công.');
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('SET FOREIGN_KEY_CHECKS = 0;');
    await queryInterface.dropTable('RoomSearchIndex');
    await queryInterface.sequelize.query('SET FOREIGN_KEY_CHECKS = 1;');
  }
};
