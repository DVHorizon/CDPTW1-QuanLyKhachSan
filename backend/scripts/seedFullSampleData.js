'use strict';

const bcrypt = require('bcryptjs');
const { sequelize } = require('../src/models');

async function seedData() {
  console.log('--- STARTING FULL SAMPLE DATA SEEDING ---');

  // 1. Cập nhật mật khẩu chuẩn 123456 cho các tài khoản test
  const defaultHash = bcrypt.hashSync('123456', 10);
  await sequelize.query(
    "UPDATE Users SET PasswordHash = ?, IsDeleted = 0, Status = 'Active' WHERE Email IN (?, ?, ?, ?)",
    {
      replacements: [
        defaultHash,
        'thutrang.24211tt1788@hoteldomain.vn',
        'admin@hoteldomain.vn',
        'kitchen@hoteldomain.vn',
        'guest@hoteldomain.vn'
      ]
    }
  );
  console.log('1. Updated password (123456) for test users successfully.');

  // Lấy UserId của thutrang
  const [userRows] = await sequelize.query(
    "SELECT UserId, FullName, Email FROM Users WHERE Email = 'thutrang.24211tt1788@hoteldomain.vn' LIMIT 1"
  );
  const guestUserId = userRows[0]?.UserId || 16;
  console.log(`2. Target Guest: ${userRows[0]?.FullName} (ID: ${guestUserId})`);

  // 3. Đảm bảo có Phòng 804 và kỳ lưu trú CheckedIn cho khách
  let [roomRows] = await sequelize.query("SELECT RoomId, RoomNumber FROM Rooms WHERE RoomNumber = '804' LIMIT 1");
  let roomId;
  if (roomRows.length === 0) {
    const [insRoom] = await sequelize.query(
      "INSERT INTO Rooms (BranchId, RoomNumber, RoomTypeId, Floor, Status, CreatedAt, UpdatedAt) VALUES (1, '804', 1, 8, 'Occupied', NOW(), NOW())"
    );
    roomId = insRoom;
  } else {
    roomId = roomRows[0].RoomId;
    await sequelize.query("UPDATE Rooms SET Status = 'Occupied' WHERE RoomId = ?", { replacements: [roomId] });
  }

  // Tạo hoặc cập nhật Booking CheckedIn
  let [bookingRows] = await sequelize.query(
    "SELECT BookingId FROM Bookings WHERE UserId = ? AND Status = 'CheckedIn' LIMIT 1",
    { replacements: [guestUserId] }
  );
  let bookingId;
  if (bookingRows.length === 0) {
    const [insBk] = await sequelize.query(`
      INSERT INTO Bookings (
        UserId, RoomTypeId, ConfirmationCode, CheckInDate, CheckOutDate,
        NumberOfNights, Adults, Children, TotalAmount, DepositAmount, Status, CreatedAt, UpdatedAt
      ) VALUES (
        ?, 1, 'BK-804-2026', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 3 DAY),
        3, 2, 0, 9500000.00, 3000000.00, 'CheckedIn', NOW(), NOW()
      )
    `, { replacements: [guestUserId] });
    bookingId = insBk;
  } else {
    bookingId = bookingRows[0].BookingId;
  }

  // Tạo hoặc cập nhật Stay Active cho Phòng 804
  let [stayRows] = await sequelize.query(
    "SELECT StayId FROM Stays WHERE BookingId = ? AND Status = 'Active' LIMIT 1",
    { replacements: [bookingId] }
  );
  let stayId;
  if (stayRows.length === 0) {
    const [insStay] = await sequelize.query(`
      INSERT INTO Stays (
        BookingId, RoomId, ActualCheckIn, ExpectedCheckOut, Status, CreatedAt, UpdatedAt
      ) VALUES (
        ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 3 DAY), 'Active', NOW(), NOW()
      )
    `, { replacements: [bookingId, roomId] });
    stayId = insStay;
  } else {
    stayId = stayRows[0].StayId;
  }
  console.log(`3. Active Stay confirmed: StayId = ${stayId}, BookingId = ${bookingId}, Room = 804`);

  // 4. Xóa dữ liệu đơn F&B cũ của user này để tái tạo chuẩn xác
  const [oldOrders] = await sequelize.query(
    "SELECT FoodOrderId FROM FoodOrders WHERE UserId = ?",
    { replacements: [guestUserId] }
  );
  if (oldOrders.length > 0) {
    const oldIds = oldOrders.map(o => o.FoodOrderId);
    await sequelize.query(`DELETE FROM FoodOrderDetails WHERE FoodOrderId IN (${oldIds.join(',')})`);
    await sequelize.query(`DELETE FROM Reviews WHERE FoodOrderId IN (${oldIds.join(',')})`);
    await sequelize.query(`DELETE FROM FoodOrders WHERE FoodOrderId IN (${oldIds.join(',')})`);
    console.log(`4. Cleaned up ${oldOrders.length} old F&B orders.`);
  }

  // 5. Seed 3 đơn hàng F&B thực tế chuẩn nghiệp vụ:
  // ĐƠN 1: Đã phục vụ (Served) - CHƯA ĐÁNH GIÁ (để test trang Đánh Giá Món Ăn)
  const [res1] = await sequelize.query(`
    INSERT INTO FoodOrders (
      StayId, TableId, UserId, OrderTime, OrderType, Status, TotalAmount, PaymentMode, Note
    ) VALUES (
      ?, NULL, ?, DATE_SUB(NOW(), INTERVAL 2 HOUR), 'RoomService', 'Served', 2047000.00, 'PayNow', 'Giao phòng 804 - Món nóng kèm khăn ăn ấm'
    )
  `, { replacements: [stayId, guestUserId] });
  const order1Id = res1;

  // Chi tiết Đơn 1: 1x Bò Wagyu (MenuItemId 1) + 1x Cá Tuyết (MenuItemId 5)
  await sequelize.query(`
    INSERT INTO FoodOrderDetails (FoodOrderId, MenuItemId, Quantity, UnitPrice, TotalPrice, Note)
    VALUES 
      (?, 1, 1, 850000.00, 850000.00, 'Nướng chín vừa (Medium rare)'),
      (?, 5, 1, 1197000.00, 1197000.00, 'Ăn nóng sốt xì dầu hảo hạng')
  `, { replacements: [order1Id, order1Id] });

  // ĐƠN 2: Đã phục vụ (Served) - ĐÃ ĐÁNH GIÁ (5 sao)
  const [res2] = await sequelize.query(`
    INSERT INTO FoodOrders (
      StayId, TableId, UserId, OrderTime, OrderType, Status, TotalAmount, PaymentMode, Note
    ) VALUES (
      ?, NULL, ?, DATE_SUB(NOW(), INTERVAL 1 DAY), 'RoomService', 'Served', 1161000.00, 'RoomInvoice', 'Giao phòng 804 - Bữa tối'
    )
  `, { replacements: [stayId, guestUserId] });
  const order2Id = res2;

  // Chi tiết Đơn 2: 1x Cơm tấm sườn bê (MenuItemId 2)
  await sequelize.query(`
    INSERT INTO FoodOrderDetails (FoodOrderId, MenuItemId, Quantity, UnitPrice, TotalPrice, Note)
    VALUES (?, 2, 1, 1161000.00, 1161000.00, 'Sườn nướng mật ong thơm lừng')
  `, { replacements: [order2Id] });

  // Thêm Review cho Đơn 2
  await sequelize.query(`
    INSERT INTO Reviews (
      UserId, StayId, FoodOrderId, Rating, OverallRating, CleanlinessScore, StaffServiceScore,
      RoomComfortScore, DiningScore, ValueForMoneyScore, WouldRecommend, ReviewTitle, ReviewBody,
      Comment, IsAnonymous, IsDeleted, CreatedAt
    ) VALUES (
      ?, ?, ?, 5.0, 5.0, 5, 5, 5, 5, 5, 'YES', 'Trải nghiệm ẩm thực tuyệt vời tại phòng',
      'Món cơm tấm sườn bê thơm ngon, giao đúng giờ và rất nóng sốt. Phục vụ ân cần chu đáo.',
      'Món cơm tấm sườn bê thơm ngon, giao đúng giờ và rất nóng sốt. Phục vụ ân cần chu đáo.',
      0, 0, DATE_SUB(NOW(), INTERVAL 20 HOUR)
    )
  `, { replacements: [guestUserId, stayId, order2Id] });

  // ĐƠN 3: Đang chế biến (Preparing)
  const [res3] = await sequelize.query(`
    INSERT INTO FoodOrders (
      StayId, TableId, UserId, OrderTime, OrderType, Status, TotalAmount, PaymentMode, Note
    ) VALUES (
      ?, NULL, ?, DATE_SUB(NOW(), INTERVAL 25 MINUTE), 'RoomService', 'Preparing', 1406000.00, 'PayNow', 'Giao phòng 804 - Bữa trưa nhẹ'
    )
  `, { replacements: [stayId, guestUserId] });
  const order3Id = res3;

  // Chi tiết Đơn 3: 1x Gỏi cuốn tôm thịt (MenuItemId 4)
  await sequelize.query(`
    INSERT INTO FoodOrderDetails (FoodOrderId, MenuItemId, Quantity, UnitPrice, TotalPrice, Note)
    VALUES (?, 4, 1, 1406000.00, 1406000.00, 'Nước chấm tương đậu phộng')
  `, { replacements: [order3Id] });

  console.log(`5. Seeded 3 F&B Orders:
   - Order #${order1Id}: Served (READY TO REVIEW) -> 1x Thịt bò Wagyu áp chảo, 1x Cá Tuyết hấp xì dầu
   - Order #${order2Id}: Served (ALREADY REVIEWED 5★) -> 1x Cơm tấm sườn bê
   - Order #${order3Id}: Preparing (IN PROGRESS) -> 1x Gỏi cuốn tôm thịt`);

  console.log('--- SEEDING COMPLETED SUCCESSFULLY ---');
  process.exit(0);
}

seedData().catch(err => {
  console.error('Seeding error:', err);
  process.exit(1);
});
