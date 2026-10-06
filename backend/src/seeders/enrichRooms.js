'use strict';
const mysql = require('mysql2/promise');

async function enrich() {
  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '',
    database: 'hotel_management'
  });

  console.log('Connected to MySQL.');

  // 1. Update Branches
  await conn.query(`
    UPDATE Branches SET BranchName = 'Grand Horizon Phú Quốc', Address = 'Bãi Khem, An Thới, Phú Quốc, Kiên Giang' WHERE BranchId = 1;
  `);
  await conn.query(`
    UPDATE Branches SET BranchName = 'Grand Horizon Cam Ranh', Address = 'Bãi Dài, Bán đảo Cam Ranh, Khánh Hòa' WHERE BranchId = 2;
  `);
  await conn.query(`
    UPDATE Branches SET BranchName = 'Grand Horizon Côn Đảo', Address = 'Bãi Nhát, Côn Đảo, Bà Rịa - Vũng Tàu' WHERE BranchId = 3;
  `);

  // 2. Update Top RoomTypes with pristine data
  const roomTypesData = [
    {
      id: 1,
      name: 'Ocean Premier Suite',
      desc: 'Thu trọn khoảnh khắc hoàng hôn lộng lẫy trên vịnh Thái Lan từ ban công kính vô cực độc bản cùng phòng tắm đá cẩm thạch sang trọng.',
      price: 3450000.00,
      maxOcc: 3,
      adult: 2,
      child: 1,
      img: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=1200&auto=format&fit=crop'
    },
    {
      id: 2,
      name: 'Grand Beachfront Pool Villa',
      desc: 'Kiệt tác biệt thự biệt lập với hồ bơi vô cực riêng sát bờ cát trắng, phòng khách thông tầng ngập nắng và dịch vụ quản gia túc trực chuyên biệt.',
      price: 11200000.00,
      maxOcc: 6,
      adult: 4,
      child: 2,
      img: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?q=80&w=1200&auto=format&fit=crop'
    },
    {
      id: 3,
      name: 'Deluxe Garden Terrace',
      desc: 'Nép mình giữa khu vườn nhiệt đới rì rào hoa cỏ, sở hữu sân hiên tắm nắng thoáng đãng đem lại sự yên tĩnh tuyệt đối cho tâm hồn.',
      price: 2150000.00,
      maxOcc: 3,
      adult: 2,
      child: 1,
      img: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?q=80&w=1200&auto=format&fit=crop'
    },
    {
      id: 4,
      name: 'Executive Beachfront Suite',
      desc: 'Không gian thượng lưu hướng trọn đại dương với ban công riêng biệt, bồn tắm sục Jacuzzi và đặc quyền tiệc trà chiều hoàng hôn Sunset High Tea.',
      price: 4800000.00,
      maxOcc: 4,
      adult: 3,
      child: 1,
      img: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?q=80&w=1200&auto=format&fit=crop'
    },
    {
      id: 5,
      name: 'Standard Garden Villa',
      desc: 'Không gian tĩnh dưỡng tiêu chuẩn ẩn mình giữa khu vườn hoa sứ râm mát, ban công thư giãn thoáng đãng.',
      price: 1650000.00,
      maxOcc: 2,
      adult: 2,
      child: 1,
      img: 'https://images.unsplash.com/photo-1591088398332-8a7791972843?q=80&w=1200&auto=format&fit=crop'
    },
    {
      id: 6,
      name: 'Presidential Penthouse Villa',
      desc: 'Đỉnh cao xa hoa biệt lập trên tầng thượng với hồ bơi vô cực riêng trên mây, phòng khách thông tầng và quản gia túc trực 24/7.',
      price: 18500000.00,
      maxOcc: 8,
      adult: 6,
      child: 2,
      img: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?q=80&w=1200&auto=format&fit=crop'
    },
    {
      id: 7,
      name: 'Royal Pool Sanctuary',
      desc: 'Khu nghỉ dưỡng ốc đảo biệt lập có hồ bơi riêng 50m², sân vườn nhiệt đới và lối đi riêng ra bãi biển nguyên sơ.',
      price: 8900000.00,
      maxOcc: 5,
      adult: 4,
      child: 2,
      img: 'https://images.unsplash.com/photo-1540541338287-41700207dee6?q=80&w=1200&auto=format&fit=crop'
    },
    {
      id: 8,
      name: 'Deluxe Ocean View',
      desc: 'Tầm nhìn toàn cảnh đại dương khoáng đạt, giường King êm ái cùng ban công đón gió biển trong lành mỗi sớm mai.',
      price: 2850000.00,
      maxOcc: 3,
      adult: 2,
      child: 1,
      img: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?q=80&w=1200&auto=format&fit=crop'
    }
  ];

  for (const rt of roomTypesData) {
    await conn.query(`
      UPDATE RoomTypes 
      SET TypeName = ?, Description = ?, BasePrice = ?, MaxOccupancy = ?, AdultCapacity = ?, ChildCapacity = ?, ImageUrl = ?
      WHERE RoomTypeId = ?
    `, [rt.name, rt.desc, rt.price, rt.maxOcc, rt.adult, rt.child, rt.img, rt.id]);
  }

  // 3. Update Rooms for Branch 1, 2, 3 so each branch has rooms for RoomTypeId 1..8
  // Branch 1: Rooms 1..24 (3 rooms per RoomType 1..8)
  for (let rtId = 1; rtId <= 8; rtId++) {
    for (let r = 0; r < 3; r++) {
      const roomId = (rtId - 1) * 3 + r + 1;
      await conn.query(`
        UPDATE Rooms
        SET BranchId = 1, RoomTypeId = ?, RoomNumber = ?, Floor = ?, Status = 'CleanAvailable', IsDeleted = 0
        WHERE RoomId = ?
      `, [rtId, `PQ-${rtId}0${r + 1}`, rtId, roomId]);
    }
  }

  // Branch 2: Rooms 25..48 (3 rooms per RoomType 1..8)
  for (let rtId = 1; rtId <= 8; rtId++) {
    for (let r = 0; r < 3; r++) {
      const roomId = 24 + (rtId - 1) * 3 + r + 1;
      await conn.query(`
        UPDATE Rooms
        SET BranchId = 2, RoomTypeId = ?, RoomNumber = ?, Floor = ?, Status = 'CleanAvailable', IsDeleted = 0
        WHERE RoomId = ?
      `, [rtId, `CR-${rtId}0${r + 1}`, rtId, roomId]);
    }
  }

  // Branch 3: Rooms 49..72 (3 rooms per RoomType 1..8)
  for (let rtId = 1; rtId <= 8; rtId++) {
    for (let r = 0; r < 3; r++) {
      const roomId = 48 + (rtId - 1) * 3 + r + 1;
      await conn.query(`
        UPDATE Rooms
        SET BranchId = 3, RoomTypeId = ?, RoomNumber = ?, Floor = ?, Status = 'CleanAvailable', IsDeleted = 0
        WHERE RoomId = ?
      `, [rtId, `CD-${rtId}0${r + 1}`, rtId, roomId]);
    }
  }

  console.log('✅ Dữ liệu Chi nhánh, Loại phòng và Phòng vật lý đã được cập nhật chuẩn xác!');
  await conn.end();
}

enrich().catch(err => {
  console.error('Error enriching:', err);
  process.exit(1);
});
