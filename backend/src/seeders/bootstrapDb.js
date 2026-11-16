'use strict';

/**
 * bootstrapDb.js
 * Tự động chờ MySQL sẵn sàng -> Chạy toàn bộ Migration -> Đồng bộ Sequelize Models ->
 * Tự động Seed dữ liệu chuẩn (nếu DB trống) & đảm bảo đủ 16 chi nhánh toàn quốc.
 */

const path = require('path');
const { execSync } = require('child_process');
const Sequelize = require('sequelize');
const { sequelize, Branch, Room } = require('../models');
const syncMigration = require('../migrations/011_sync_all_models_schema');

const EXPANDED_BRANCHES = [
  { BranchId: 6, BranchName: 'Grand Horizon Vũng Tàu Imperial Palace', Address: 'Đường Thùy Vân, Phường Thắng Tam, TP. Vũng Tàu, Bà Rịa - Vũng Tàu', Phone: '0254 388 6868', Status: 'Active' },
  { BranchId: 7, BranchName: 'Grand Horizon Đà Lạt Heritage & Pine', Address: 'Khu Du Lịch Hồ Tuyền Lâm, Phường 4, TP. Đà Lạt, Lâm Đồng', Phone: '0263 388 6868', Status: 'Active' },
  { BranchId: 8, BranchName: 'Grand Horizon Sa Pa Cloud Retreat', Address: 'Đường Fansipan, Thị Xã Sa Pa, Lào Cai', Phone: '0214 388 6868', Status: 'Active' },
  { BranchId: 9, BranchName: 'Grand Horizon Hội An Riverside Resort', Address: 'Đường Huyền Trân Công Chúa, Phường Cẩm Châu, TP. Hội An, Quảng Nam', Phone: '0235 388 6868', Status: 'Active' },
  { BranchId: 10, BranchName: 'Grand Horizon Vịnh Hạ Long Bay View', Address: 'Đảo Tuần Châu, Bãi Cháy, TP. Hạ Long, Quảng Ninh', Phone: '0203 388 6868', Status: 'Active' },
  { BranchId: 11, BranchName: 'Grand Horizon Quy Nhơn Emerald Bay', Address: 'Khu Du Lịch Kỳ Co, Xã Nhơn Lý, TP. Quy Nhơn, Bình Định', Phone: '0256 388 6868', Status: 'Active' },
  { BranchId: 12, BranchName: 'Grand Horizon Mũi Né Sunset Beach', Address: 'Đường Nguyễn Đình Chiểu, Phường Hàm Tiến, Mũi Né, Bình Thuận', Phone: '0252 388 6868', Status: 'Active' },
  { BranchId: 13, BranchName: 'Grand Horizon Hồ Tây Royal Hanoi', Address: 'Đường Thanh Niên, Phường Yên Phụ, Quận Tây Hồ, Hà Nội', Phone: '024 3888 6868', Status: 'Active' },
  { BranchId: 14, BranchName: 'Grand Horizon Sài Gòn Riverside Luxury', Address: 'Đường Tôn Đức Thắng, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh', Phone: '028 3888 6868', Status: 'Active' },
  { BranchId: 15, BranchName: 'Grand Horizon Ninh Bình Heritage Resort', Address: 'Quần Thể Danh Thắng Tràng An, Huyện Hoa Lư, Ninh Bình', Phone: '0229 388 6868', Status: 'Active' },
  { BranchId: 16, BranchName: 'Grand Horizon Huế Imperial Boutique', Address: 'Đường Lê Lợi, Phường Vĩnh Ninh, TP. Huế, Thừa Thiên Huế', Phone: '0234 388 6868', Status: 'Active' },
];

async function waitForDatabase(maxRetries = 30, delayMs = 2000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await sequelize.authenticate();
      console.log(`✅ [Bootstrap] Kết nối MySQL thành công (lần thử ${attempt}/${maxRetries}).`);
      return true;
    } catch (err) {
      console.log(`⏳ [Bootstrap] Đang chờ MySQL khởi động (${attempt}/${maxRetries})... (${err.message})`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw new Error('Không thể kết nối tới MySQL sau nhiều lần thử.');
}

async function ensureAll16BranchesAndRooms() {
  for (const bData of EXPANDED_BRANCHES) {
    const [branch, created] = await Branch.findOrCreate({
      where: { BranchId: bData.BranchId },
      defaults: bData,
    });
    if (!created) {
      await branch.update(bData);
    }
  }

  // Đảm bảo các chi nhánh 2..16 đều có phòng khả dụng để tìm kiếm trên trang chủ (giữ nguyên 31 phòng chuẩn ở Chi nhánh 1)
  for (let branchId = 2; branchId <= 16; branchId++) {
    const count = await Room.count({ where: { BranchId: branchId } });
    if (count === 0) {
      const sampleRooms = [
        { typeId: 1, num: `B${branchId}-101`, floor: 1, desc: `Deluxe Ocean View - Chi nhánh #${branchId}` },
        { typeId: 2, num: `B${branchId}-201`, floor: 2, desc: `Premier Suite - Chi nhánh #${branchId}` },
        { typeId: 3, num: `B${branchId}-301`, floor: 3, desc: `Royal Beachfront Villa - Chi nhánh #${branchId}` },
        { typeId: 4, num: `B${branchId}-102`, floor: 1, desc: `Garden Tropical Bungalow - Chi nhánh #${branchId}` },
        { typeId: 5, num: `B${branchId}-401`, floor: 4, desc: `Grand Family Ocean Suite - Chi nhánh #${branchId}` },
      ];
      for (const sr of sampleRooms) {
        await Room.create({
          BranchId: branchId,
          RoomTypeId: sr.typeId,
          RoomNumber: sr.num,
          Floor: sr.floor,
          Status: 'CleanAvailable',
          Description: sr.desc,
          IsDeleted: false,
        });
      }
    }
  }
}

async function bootstrap() {
  const backendRoot = path.resolve(__dirname, '../..');
  await waitForDatabase();

  console.log('🗄️  [Bootstrap] Đang chạy Sequelize CLI migrations...');
  try {
    execSync('npx sequelize-cli db:migrate', { cwd: backendRoot, stdio: 'inherit' });
  } catch (err) {
    console.warn('⚠️  [Bootstrap] Cảnh báo khi chạy sequelize-cli db:migrate:', err.message);
  }

  console.log('🔄 [Bootstrap] Đang đồng bộ bảng & cột từ Sequelize Models...');
  const qi = sequelize.getQueryInterface();
  await syncMigration.up(qi, Sequelize);

  // Kiểm tra dữ liệu mẫu
  let roomCount = 0;
  try {
    roomCount = await Room.count();
  } catch (_) {}

  if (roomCount === 0) {
    console.log('🌱 [Bootstrap] Cơ sở dữ liệu đang trống -> Tự động nạp dữ liệu mẫu chuẩn 5 sao...');
    const seedScript = path.resolve(__dirname, 'seedPristineClean.js');
    execSync(`node "${seedScript}"`, { cwd: backendRoot, stdio: 'inherit' });
  }

  console.log('🏨 [Bootstrap] Kiểm tra & đồng bộ đủ 16 chi nhánh khách sạn toàn quốc...');
  await ensureAll16BranchesAndRooms();

  console.log('🎉 [Bootstrap] Cơ sở dữ liệu đã đồng bộ hoàn chỉnh 100%!');
}

if (require.main === module) {
  bootstrap()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ [Bootstrap] Lỗi:', err);
      process.exit(1);
    });
}

module.exports = bootstrap;
