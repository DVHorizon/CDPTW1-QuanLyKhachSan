'use strict';

/**
 * Helper bulk insert với chunk + transaction + progress logging
 */
const { sequelize } = require('../../models');

/**
 * Insert N records vào model hoặc table name bằng chunk với size chunkSize.
 * @param {SequelizeModel|string} target - Sequelize Model hoặc tên bảng dạng string (e.g. 'Permissions')
 * @param {Function} factory             - (index) => { field: value } tạo 1 record
 * @param {number} total                 - Tổng số record cần tạo
 * @param {number} chunkSize             - Số record mỗi lần insert (default 5000)
 * @param {Object} options               - { silent: bool }
 * @returns {Promise<{inserted: number}>}
 */
async function seedInChunks(target, factory, total, chunkSize = 5000, options = {}) {
  const isModel = typeof target === 'object' && target !== null && typeof target.bulkCreate === 'function';
  const name = isModel ? (target.name || target.tableName) : String(target);
  const inserted = { count: 0 };
  const totalChunks = Math.ceil(total / chunkSize);

  if (!options.silent) {
    console.log(`   [${name}] Seeding ${total.toLocaleString()} records in ${totalChunks} chunks...`);
  }

  const queryInterface = sequelize.getQueryInterface();

  for (let chunkIdx = 0; chunkIdx < totalChunks; chunkIdx++) {
    const startIdx = chunkIdx * chunkSize + 1;
    const endIdx = Math.min(startIdx + chunkSize - 1, total);
    const chunkData = [];

    for (let i = startIdx; i <= endIdx; i++) {
      chunkData.push(factory(i));
    }

    if (chunkData.length > 0) {
      if (isModel) {
        await target.bulkCreate(chunkData, {
          ignoreDuplicates: true,
          hooks: false,
          validate: false,
          logging: false
        });
      } else {
        await queryInterface.bulkInsert(name, chunkData, {
          ignoreDuplicates: true,
          logging: false
        });
      }
    }

    inserted.count += chunkData.length;
    if (!options.silent && (chunkIdx + 1) % Math.max(1, Math.floor(totalChunks / 10)) === 0) {
      const percent = ((inserted.count / total) * 100).toFixed(1);
      process.stdout.write(`\r   [${name}] ${inserted.count.toLocaleString()}/${total.toLocaleString()} (${percent}%)   `);
    }
  }

  if (!options.silent) {
    console.log(`\r   [${name}] ✅ ${inserted.count.toLocaleString()} records seeded.          `);
  }
  return inserted;
}

/**
 * Drop indexes trước khi seed để tăng tốc ghi.
 */
async function dropIndexes(tableName, indexes) {
  for (const idx of indexes) {
    try {
      await sequelize.query(`ALTER TABLE \`${tableName}\` DROP INDEX \`${idx}\``);
    } catch (_) {
      // Bỏ qua nếu index không tồn tại
    }
  }
}

/**
 * Recreate indexes sau khi seed.
 */
async function recreateIndexes(tableName, indexes) {
  for (const sql of indexes) {
    try {
      await sequelize.query(sql);
    } catch (_) {
      // Bỏ qua nếu index đã tồn tại
    }
  }
}

module.exports = { seedInChunks, dropIndexes, recreateIndexes };
