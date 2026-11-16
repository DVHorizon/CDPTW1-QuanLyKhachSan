/**
 * Script: Seed 50 phòng thật từ bảng Rooms vào bảng physical_rooms
 * - Xóa dữ liệu cũ (fake/mẫu)
 * - Lấy 50 phòng đầu tiên từ Rooms (nếu dư thừa xóa bớt)
 * - Map trường Rooms → physical_rooms
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config();

const pool = require('../config/db');

// Map Status của bảng Rooms sang buong_phong / luu_tru của physical_rooms
function mapStatus(status) {
  switch (status) {
    case 'Occupied':      return { buong_phong: 'clean', luu_tru: 'inhouse' };
    case 'Dirty':         return { buong_phong: 'dirty', luu_tru: 'vacant' };
    case 'Cleaning':      return { buong_phong: 'dirty', luu_tru: 'vacant' };
    case 'Maintenance':   return { buong_phong: 'ooo',   luu_tru: 'vacant' };
    case 'CleanAvailable':return { buong_phong: 'clean', luu_tru: 'vacant' };
    default:              return { buong_phong: 'clean', luu_tru: 'vacant' };
  }
}

// Map RoomNumber → so_phong (chuẩn hóa nếu cần)
function normalizeRoomNumber(num) {
  // Nếu là "P-1", "P-2", ... → chuyển thành số phòng theo format "101", "102"...
  const match = String(num).match(/^P-(\d+)$/);
  if (match) {
    const n = parseInt(match[1], 10);
    const floor = Math.ceil(n / 25);     // mỗi tầng 25 phòng
    const room  = ((n - 1) % 25) + 1;
    return `${floor}${String(room).padStart(2, '0')}`;
  }
  return String(num);
}

// Map Floor thực tế nếu bị lặp (bảng Rooms chỉ có 2 tầng nên suy ra từ số phòng)
function inferFloor(roomNumber, originalFloor) {
  const n = parseInt(String(roomNumber).replace(/\D/g, ''), 10);
  if (isNaN(n)) return originalFloor;
  return Math.ceil(n / 25) || 1;
}

async function main() {
  console.log('⏳  Đang kết nối DB...');

  // 1. Đếm số bản ghi Rooms hiện có
  const [[{ cnt }]] = await pool.query('SELECT COUNT(*) as cnt FROM Rooms WHERE IsDeleted = 0');
  console.log(`📊  Tổng số Rooms trong DB: ${cnt}`);

  // 2. Lấy 50 phòng đầu tiên từ Rooms (real data)
  const LIMIT = 50;
  const [rooms] = await pool.query(
    `SELECT r.RoomId, r.RoomTypeId, r.RoomNumber, r.Floor, r.Status, r.Description
     FROM Rooms r
     WHERE r.IsDeleted = 0
     ORDER BY r.RoomId ASC
     LIMIT ?`,
    [LIMIT]
  );
  console.log(`✅  Đã lấy ${rooms.length} phòng từ bảng Rooms`);

  // 3. Xóa toàn bộ dữ liệu cũ trong physical_rooms
  await pool.query('DELETE FROM physical_rooms');
  await pool.query('ALTER TABLE physical_rooms AUTO_INCREMENT = 1');
  console.log('🗑️   Đã xóa dữ liệu cũ trong physical_rooms');

  // 4. Cập nhật schema của physical_rooms (nới rộng trường nếu cần)
  try {
    await pool.query('ALTER TABLE physical_rooms MODIFY so_phong VARCHAR(20) NOT NULL');
    await pool.query('ALTER TABLE physical_rooms MODIFY khu VARCHAR(20) NOT NULL DEFAULT \'A\'');
    await pool.query('ALTER TABLE physical_rooms MODIFY ma_loai VARCHAR(50) NOT NULL');
    await pool.query('ALTER TABLE physical_rooms MODIFY phong_lien_thong VARCHAR(20) NULL');
  } catch (e) {
    // Bỏ qua nếu đã đúng schema
  }

  // 5. Insert 50 phòng thật vào physical_rooms
  let insertCount = 0;
  for (const r of rooms) {
    const soPhong  = normalizeRoomNumber(r.RoomNumber);
    const maLoai   = `RT-${r.RoomTypeId}`;
    const maKhoa   = `RFID-${r.RoomId}`;
    const tang     = inferFloor(r.RoomId, r.Floor);
    const n        = r.RoomId;
    const khu      = n <= 17 ? 'A' : n <= 34 ? 'B' : 'C';
    const { buong_phong, luu_tru } = mapStatus(r.Status);
    const ghiChu   = r.Description || '';

    await pool.query(
      `INSERT INTO physical_rooms
       (so_phong, tang, khu, ma_loai, ma_khoa, phong_lien_thong, ghi_chu, buong_phong, luu_tru)
       VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?)
       ON DUPLICATE KEY UPDATE ma_loai=VALUES(ma_loai), buong_phong=VALUES(buong_phong), luu_tru=VALUES(luu_tru)`,
      [soPhong, tang, khu, maLoai, maKhoa, ghiChu, buong_phong, luu_tru]
    );
    insertCount++;
  }

  console.log(`🏨  Đã chèn ${insertCount} phòng thật vào physical_rooms`);

  // 6. Kiểm tra kết quả
  const [[{ total }]] = await pool.query('SELECT COUNT(*) as total FROM physical_rooms');
  const [sample] = await pool.query('SELECT id, so_phong, tang, khu, ma_loai, buong_phong, luu_tru FROM physical_rooms ORDER BY tang, so_phong LIMIT 10');
  console.log(`\n📋  Tổng số phòng trong physical_rooms: ${total}`);
  console.log('📌  10 phòng mẫu:');
  console.table(sample);

  process.exit(0);
}

main().catch(err => {
  console.error('❌  Lỗi:', err);
  process.exit(1);
});
