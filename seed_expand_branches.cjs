const { Branch, Room, RoomType, sequelize } = require('./backend/src/models');

const NEW_BRANCHES = [
  {
    BranchId: 6,
    BranchName: 'Grand Horizon Vũng Tàu Imperial Palace',
    Address: 'Đường Thùy Vân, Phường Thắng Tam, TP. Vũng Tàu, Bà Rịa - Vũng Tàu',
    Phone: '0254 388 6868',
    Status: 'Active'
  },
  {
    BranchId: 7,
    BranchName: 'Grand Horizon Đà Lạt Heritage & Pine',
    Address: 'Khu Du Lịch Hồ Tuyền Lâm, Phường 4, TP. Đà Lạt, Lâm Đồng',
    Phone: '0263 388 6868',
    Status: 'Active'
  },
  {
    BranchId: 8,
    BranchName: 'Grand Horizon Sa Pa Cloud Retreat',
    Address: 'Đường Fansipan, Thị Xã Sa Pa, Lào Cai',
    Phone: '0214 388 6868',
    Status: 'Active'
  },
  {
    BranchId: 9,
    BranchName: 'Grand Horizon Hội An Riverside Resort',
    Address: 'Đường Huyền Trân Công Chúa, Phường Cẩm Châu, TP. Hội An, Quảng Nam',
    Phone: '0235 388 6868',
    Status: 'Active'
  },
  {
    BranchId: 10,
    BranchName: 'Grand Horizon Vịnh Hạ Long Bay View',
    Address: 'Đảo Tuần Châu, Bãi Cháy, TP. Hạ Long, Quảng Ninh',
    Phone: '0203 388 6868',
    Status: 'Active'
  },
  {
    BranchId: 11,
    BranchName: 'Grand Horizon Quy Nhơn Emerald Bay',
    Address: 'Khu Du Lịch Kỳ Co, Xã Nhơn Lý, TP. Quy Nhơn, Bình Định',
    Phone: '0256 388 6868',
    Status: 'Active'
  },
  {
    BranchId: 12,
    BranchName: 'Grand Horizon Mũi Né Sunset Beach',
    Address: 'Đường Nguyễn Đình Chiểu, Phường Hàm Tiến, Mũi Né, Bình Thuận',
    Phone: '0252 388 6868',
    Status: 'Active'
  },
  {
    BranchId: 13,
    BranchName: 'Grand Horizon Hồ Tây Royal Hanoi',
    Address: 'Đường Thanh Niên, Phường Yên Phụ, Quận Tây Hồ, Hà Nội',
    Phone: '024 3888 6868',
    Status: 'Active'
  },
  {
    BranchId: 14,
    BranchName: 'Grand Horizon Sài Gòn Riverside Luxury',
    Address: 'Đường Tôn Đức Thắng, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
    Phone: '028 3888 6868',
    Status: 'Active'
  },
  {
    BranchId: 15,
    BranchName: 'Grand Horizon Ninh Bình Heritage Resort',
    Address: 'Quần Thể Danh Thắng Tràng An, Huyện Hoa Lư, Ninh Bình',
    Phone: '0229 388 6868',
    Status: 'Active'
  },
  {
    BranchId: 16,
    BranchName: 'Grand Horizon Huế Imperial Boutique',
    Address: 'Đường Lê Lợi, Phường Vĩnh Ninh, TP. Huế, Thừa Thiên Huế',
    Phone: '0234 388 6868',
    Status: 'Active'
  }
];

async function seedExpandedBranches() {
  try {
    console.log('--- Đang kiểm tra và bổ sung các khách sạn mới vào Database ---');
    
    // 1. Chèn các chi nhánh mới nếu chưa có
    for (const bData of NEW_BRANCHES) {
      const [branch, created] = await Branch.findOrCreate({
        where: { BranchId: bData.BranchId },
        defaults: bData
      });
      if (created) {
        console.log(`+ Đã tạo khách sạn mới: ${branch.BranchName}`);
      } else {
        await branch.update(bData);
        console.log(`= Đã cập nhật khách sạn: ${branch.BranchName}`);
      }
    }

    // 2. Phân bổ các phòng (Rooms) cho 16 chi nhánh
    // Phân bổ 1,100 phòng đều cho 16 chi nhánh (khoảng 68 phòng / chi nhánh)
    const allRooms = await Room.findAll({ order: [['RoomId', 'ASC']] });
    console.log(`Tổng số phòng trong hệ thống: ${allRooms.length}`);

    const totalBranches = 16;
    for (let i = 0; i < allRooms.length; i++) {
      const targetBranchId = (i % totalBranches) + 1;
      const room = allRooms[i];
      if (room.BranchId !== targetBranchId) {
        await room.update({ BranchId: targetBranchId });
      }
    }

    console.log('--- Kiểm tra lại số lượng phòng theo từng khách sạn ---');
    const allBranches = await Branch.findAll({ where: { Status: 'Active' }, order: [['BranchId', 'ASC']] });
    for (const b of allBranches) {
      const roomCount = await Room.count({ where: { BranchId: b.BranchId } });
      console.log(`Khách sạn #${b.BranchId}: ${b.BranchName} -> ${roomCount} phòng`);
    }

    console.log('✅ Hoàn tất bổ sung 16 khách sạn vào cơ sở dữ liệu!');
    process.exit(0);
  } catch (error) {
    console.error('Lỗi khi bổ sung khách sạn:', error);
    process.exit(1);
  }
}

seedExpandedBranches();

