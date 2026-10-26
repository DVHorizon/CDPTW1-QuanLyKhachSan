'use strict';

/**
 * backend/src/seeders/seedInHouseStays.js
 * Seed mẫu 8 - 10 phòng lưu trú In-House (CheckedIn & Extended)
 * Đầy đủ: Hạng phòng, Tầng, VIP Tiers, Khách hàng & Lịch sử Service Orders
 */

require('dotenv').config();
const {
  sequelize,
  Branch,
  RoomType,
  Room,
  MembershipTier,
  User,
  Role,
  Booking,
  Stay,
  Service,
  ServiceOrder,
} = require('../models');

async function seedInHouseData() {
  console.log('🚀 Bắt đầu seed dữ liệu lưu trú In-House (FEAT-SERVICE-03)...');

  try {
    await sequelize.authenticate();
    console.log('✅ Kết nối CSDL MySQL thành công.');

    // ─── 1. TẠO / CẬP NHẬT BRANCH MẪU ─────────────────────────────────────────
    let branch = await Branch.findByPk(1);
    if (!branch) {
      branch = await Branch.create({
        BranchName: 'Grand Horizon Phú Quốc Sanctuary Resort',
        Address: 'Bãi Trường, Dương Tơ, TP. Phú Quốc, Kiên Giang',
        Phone: '02973888999',
        Status: 'Active',
      });
    }

    // ─── 2. SEED HẠNG HỘI VIÊN (MEMBERSHIP TIERS) ─────────────────────────────
    const tiersData = [
      { TierName: 'Standard', MinPoints: 0, Benefits: 'Ưu đãi cơ bản', DiscountRate: 0.00 },
      { TierName: 'VIP Silver', MinPoints: 1000, Benefits: 'Tặng nước trái cây chào mừng, giảm 5% dịch vụ', DiscountRate: 5.00 },
      { TierName: 'VIP Gold', MinPoints: 5000, Benefits: 'Late check-out 14:00, giảm 10% dịch vụ & Spa', DiscountRate: 10.00 },
      { TierName: 'VIP Platinum', MinPoints: 15000, Benefits: 'Đưa đón Maybach sân bay, giảm 15% dịch vụ', DiscountRate: 15.00 },
      { TierName: 'VIP Diamond', MinPoints: 30000, Benefits: 'Concierge 24/7 riêng, giảm 20% dịch vụ, ưu tiên Buggy', DiscountRate: 20.00 },
    ];

    const tiersMap = {};
    for (const t of tiersData) {
      let tier = await MembershipTier.findOne({ where: { TierName: t.TierName } });
      if (!tier) {
        tier = await MembershipTier.create(t);
      }
      tiersMap[t.TierName] = tier.TierId;
    }
    console.log('✅ Đã đảm bảo danh mục Hạng hội viên VIP Tiers.');

    // ─── 3. SEED HẠNG PHÒNG (ROOM TYPES) ───────────────────────────────────────
    const roomTypesData = [
      {
        TypeName: 'Deluxe Ocean View',
        TypeCode: 'RT-DELUXE-OCN',
        BasePrice: 2800000,
        Description: 'Phòng ban công hướng biển hoàng hôn Bãi Trường',
        TotalRooms: 40,
        AdultCapacity: 2,
        ChildCapacity: 1,
        Status: 'Active',
      },
      {
        TypeName: 'Grand Executive Suite',
        TypeCode: 'RT-EXEC-STE',
        BasePrice: 4500000,
        Description: 'Suite cao cấp có phòng khách riêng và bồn tắm sục jacuzzi',
        TotalRooms: 20,
        AdultCapacity: 2,
        ChildCapacity: 2,
        Status: 'Active',
      },
      {
        TypeName: 'Beachfront Pool Villa',
        TypeCode: 'RT-VILLA-POOL',
        BasePrice: 8900000,
        Description: 'Biệt thự sát biển có hồ bơi vô cực riêng tư và sân vườn',
        TotalRooms: 12,
        AdultCapacity: 4,
        ChildCapacity: 2,
        Status: 'Active',
      },
      {
        TypeName: 'Presidential Penthouse',
        TypeCode: 'RT-PENTHOUSE',
        BasePrice: 18000000,
        Description: 'Căn hộ penthouse tầng thượng 360 độ ngắm toàn vịnh',
        TotalRooms: 2,
        AdultCapacity: 6,
        ChildCapacity: 3,
        Status: 'Active',
      },
      {
        TypeName: 'Royal Family Bungalow',
        TypeCode: 'RT-ROYAL-BUNGALOW',
        BasePrice: 6200000,
        Description: 'Bungalow 2 phòng ngủ ấm cúng cho gia đình đa thế hệ',
        TotalRooms: 15,
        AdultCapacity: 4,
        ChildCapacity: 2,
        Status: 'Active',
      },
    ];

    const roomTypesMap = {};
    for (const rt of roomTypesData) {
      let roomType = await RoomType.findOne({ where: { TypeName: rt.TypeName } });
      if (!roomType) {
        roomType = await RoomType.create(rt);
      }
      roomTypesMap[rt.TypeName] = roomType.RoomTypeId;
    }
    console.log('✅ Đã đảm bảo danh mục Hạng phòng nghỉ dưỡng.');

    // ─── 4. SEED PHÒNG (ROOMS) ─────────────────────────────────────────────────
    const roomsData = [
      { RoomNumber: '101', Floor: '1', TypeName: 'Deluxe Ocean View' },
      { RoomNumber: '102', Floor: '1', TypeName: 'Deluxe Ocean View' },
      { RoomNumber: '204', Floor: '2', TypeName: 'Grand Executive Suite' },
      { RoomNumber: '205', Floor: '2', TypeName: 'Grand Executive Suite' },
      { RoomNumber: 'V-101', Floor: '1', TypeName: 'Beachfront Pool Villa' },
      { RoomNumber: 'V-102', Floor: '1', TypeName: 'Beachfront Pool Villa' },
      { RoomNumber: 'B-301', Floor: '3', TypeName: 'Royal Family Bungalow' },
      { RoomNumber: 'PH-501', Floor: '5', TypeName: 'Presidential Penthouse' },
    ];

    const roomsMap = {};
    for (const r of roomsData) {
      let room = await Room.findOne({ where: { RoomNumber: r.RoomNumber } });
      const roomTypeId = roomTypesMap[r.TypeName];
      if (!room) {
        room = await Room.create({
          RoomNumber: r.RoomNumber,
          Floor: r.Floor,
          RoomTypeId: roomTypeId,
          BranchId: branch.BranchId,
          Status: 'Occupied',
        });
      } else {
        await room.update({ Status: 'Occupied', RoomTypeId: roomTypeId, Floor: r.Floor });
      }
      roomsMap[r.RoomNumber] = room.RoomId;
    }
    console.log(`✅ Đã chuẩn bị ${roomsData.length} phòng nghỉ dưỡng thực tế.`);

    // ─── 5. SEED KHÁCH HÀNG (GUEST USERS) ──────────────────────────────────────
    let guestRole = await Role.findOne({ where: { RoleName: 'Guest' } });
    if (!guestRole) {
      guestRole = await Role.create({ RoleName: 'Guest', Description: 'Khách hàng' });
    }

    const guestsData = [
      {
        FullName: 'Nguyễn Hoàng Nam',
        Email: 'nguyen.nam.vip@grandhorizon.vn',
        Phone: '0903123456',
        TierName: 'VIP Diamond',
        RoomNumber: 'PH-501',
      },
      {
        FullName: 'Trần Mai Anh',
        Email: 'tran.maianh@grandhorizon.vn',
        Phone: '0918789123',
        TierName: 'VIP Platinum',
        RoomNumber: 'V-101',
      },
      {
        FullName: 'Lê Gia Bảo',
        Email: 'le.giabao@grandhorizon.vn',
        Phone: '0982345678',
        TierName: 'VIP Gold',
        RoomNumber: '204',
      },
      {
        FullName: 'Phạm Thu Trang',
        Email: 'pham.thutrang@grandhorizon.vn',
        Phone: '0975678901',
        TierName: 'VIP Silver',
        RoomNumber: '101',
      },
      {
        FullName: 'Michael Anderson',
        Email: 'm.anderson@luxurytravel.com',
        Phone: '+14155552671',
        TierName: 'VIP Diamond',
        RoomNumber: 'V-102',
      },
      {
        FullName: 'Đỗ Nhật Quang',
        Email: 'do.nhatquang@grandhorizon.vn',
        Phone: '0934112233',
        TierName: 'VIP Gold',
        RoomNumber: '205',
      },
      {
        FullName: 'Vũ Minh Tâm',
        Email: 'vu.minhtam@grandhorizon.vn',
        Phone: '0945998877',
        TierName: 'VIP Platinum',
        RoomNumber: 'B-301',
      },
      {
        FullName: 'Elena Petrova',
        Email: 'elena.petrova@travelresort.ru',
        Phone: '+79165550192',
        TierName: 'VIP Silver',
        RoomNumber: '102',
      },
    ];

    const guestsMap = {};
    for (const g of guestsData) {
      let user = await User.findOne({ where: { Email: g.Email } });
      const tierId = tiersMap[g.TierName];
      if (!user) {
        user = await User.create({
          FullName: g.FullName,
          Email: g.Email,
          Phone: g.Phone,
          RoleId: guestRole.RoleId,
          TierId: tierId,
          PasswordHash: '$2a$10$e8Z4i2gE1d6p9M2L4x6mNuWj5vTq.S3o.V5lCqUv/Nq.G7m9x0uOu', // 123456
          Status: 'Active',
        });
      } else {
        await user.update({ TierId: tierId, FullName: g.FullName, Phone: g.Phone });
      }
      guestsMap[g.RoomNumber] = user;
    }
    console.log(`✅ Đã chuẩn bị ${guestsData.length} hồ sơ khách hàng In-House.`);

    // ─── 6. SEED BOOKING & STAYS (CHECKEDIN / EXTENDED) ────────────────────────
    const now = new Date();
    const createdStays = [];

    for (let idx = 0; idx < guestsData.length; idx++) {
      const g = guestsData[idx];
      const user = guestsMap[g.RoomNumber];
      const roomId = roomsMap[g.RoomNumber];

      // Ngày check-in từ 1 - 2 ngày trước, check-out sau 2 - 4 ngày
      const checkIn = new Date(now.getTime() - (idx + 1) * 18 * 3600 * 1000);
      const checkOut = new Date(now.getTime() + (idx + 2) * 28 * 3600 * 1000);
      const isExtended = idx === 1; // Khách VIP V-101 được gia hạn (Extended)

      const confCode = `GH-2026-${(idx + 1).toString().padStart(4, '0')}`;

      let booking = await Booking.findOne({ where: { ConfirmationCode: confCode } });
      if (!booking) {
        booking = await Booking.create({
          UserId: user.UserId,
          RoomTypeId: 1,
          CheckInDate: checkIn,
          CheckOutDate: checkOut,
          ConfirmationCode: confCode,
          NumberOfNights: 3,
          Adults: 2,
          Children: 1,
          RoomQuantity: 1,
          TotalAmount: 12000000,
          DepositAmount: 3000000,
          Status: 'Confirmed',
          BookingSource: 'DirectWeb',
          Note: 'Khách yêu cầu setup phòng hoa hồng và trái cây đón tiếp.',
        });
      }

      let stay = await Stay.findOne({ where: { BookingId: booking.BookingId } });
      const stayStatus = isExtended ? 'Extended' : 'CheckedIn';

      if (!stay) {
        stay = await Stay.create({
          BookingId: booking.BookingId,
          RoomId: roomId,
          ActualCheckIn: checkIn,
          ExpectedCheckOut: checkOut,
          Status: stayStatus,
          DepositAmount: 2000000,
        });
      } else {
        await stay.update({
          RoomId: roomId,
          Status: stayStatus,
          ActualCheckIn: checkIn,
          ExpectedCheckOut: checkOut,
        });
      }

      createdStays.push({ stay, roomNumber: g.RoomNumber, user, booking });
    }
    console.log(`✅ Đã nạp thành công ${createdStays.length} lượt lưu trú In-House (7 CheckedIn, 1 Extended).`);

    // ─── 7. SEED LỊCH SỬ ĐƠN DỊCH VỤ (SERVICE ORDERS) ───────────────────────────
    const activeServices = await Service.findAll({ where: { Status: 'Active' }, limit: 5 });
    if (activeServices.length > 0) {
      console.log('📦 Bắt đầu seed lịch sử đơn đặt dịch vụ mẫu...');

      const sampleOrders = [
        {
          stayIdx: 0, // Penthouse 501
          service: activeServices[0],
          quantity: 2,
          status: 'Completed',
          note: '[Khung giờ: 14:00 hôm nay] [Địa điểm: Tại phòng PH-501] - Setup 2 kỹ thuật viên cao cấp',
        },
        {
          stayIdx: 0, // Penthouse 501
          service: activeServices[4] || activeServices[0],
          quantity: 1,
          status: 'InProgress',
          note: '[Khung giờ: 19:30 tối nay] [Địa điểm: Bãi biển riêng biệt] - Bữa tối nến lãng mạn kèm rượu vang đỏ',
        },
        {
          stayIdx: 1, // Villa V-101
          service: activeServices[2] || activeServices[0],
          quantity: 1,
          status: 'Received',
          note: '[Khung giờ: 16:30 chiều mai] [Địa điểm: Bến du thuyền] - Tour hoàng hôn vịnh An Thới 4 người',
        },
        {
          stayIdx: 2, // Room 204
          service: activeServices[3] || activeServices[0],
          quantity: 3,
          status: 'Completed',
          note: '[Khung giờ: 09:00 sáng] [Địa điểm: Tại phòng 204] - Giặt ủi vest lụa lấy gấp trong 4 giờ',
        },
        {
          stayIdx: 3, // Room 101
          service: activeServices[0],
          quantity: 1,
          status: 'Received',
          note: '[Khung giờ: 15:00] [Địa điểm: Tại quầy phục vụ / Spa] - Liệu trình thảo mộc hồi phục năng lượng',
        },
      ];

      for (const ord of sampleOrders) {
        const targetStay = createdStays[ord.stayIdx]?.stay;
        if (targetStay) {
          const unitPrice = Math.floor(Number(ord.service.Price));
          const totalPrice = Math.floor(unitPrice * ord.quantity);

          // Kiểm tra xem đơn đã tồn tại chưa để tránh trùng lặp
          const existing = await ServiceOrder.findOne({
            where: {
              StayId: targetStay.StayId,
              ServiceId: ord.service.ServiceId,
              Note: ord.note,
            },
          });

          if (!existing) {
            await ServiceOrder.create({
              StayId: targetStay.StayId,
              ServiceId: ord.service.ServiceId,
              Quantity: ord.quantity,
              UnitPrice: unitPrice,
              TotalPrice: totalPrice,
              OrderDate: new Date(now.getTime() - Math.floor(Math.random() * 24 * 3600 * 1000)),
              Status: ord.status,
              Note: ord.note,
              CreatedBy: 1,
            });
          }
        }
      }
      console.log('✅ Đã nạp thành công các đơn dịch vụ mẫu cho kiểm thử Lịch Sử Lệnh.');
    }

    console.log('🎉 TOÀN BỘ DỮ LIỆU SEED IN-HOUSE ĐÃ ĐƯỢC NẠP THÀNH CÔNG VÀO CSDL MYSQL!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi khi seed dữ liệu In-House:', error);
    process.exit(1);
  }
}

seedInHouseData();
