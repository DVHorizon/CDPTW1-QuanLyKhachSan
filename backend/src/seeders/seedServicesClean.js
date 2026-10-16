'use strict';

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

const { ServiceCategory, Service, sequelize } = require('../models');

const CLEAN_CATEGORIES = [
  {
    CategoryId: 1,
    CategoryName: 'Spa & Trị liệu',
    Description: 'Dịch vụ chăm sóc sức khỏe, xông hơi và trị liệu thảo mộc cao cấp',
    IsDeleted: false,
  },
  {
    CategoryId: 2,
    CategoryName: 'Vận chuyển Concierge',
    Description: 'Đưa đón sân bay, thuê xe riêng Maybach đẳng cấp VIP',
    IsDeleted: false,
  },
  {
    CategoryId: 3,
    CategoryName: 'Tour & Trải nghiệm',
    Description: 'Du thuyền ngắm hoàng hôn vịnh An Thới, lặn biển ngắm san hô',
    IsDeleted: false,
  },
  {
    CategoryId: 4,
    CategoryName: 'Buồng phòng & Giặt là',
    Description: 'Dịch vụ giặt ủi lấy nhanh, bảo quản tơ lụa và phục vụ tận phòng',
    IsDeleted: false,
  },
  {
    CategoryId: 5,
    CategoryName: 'Ẩm thực F&B',
    Description: 'Phục vụ ẩm thực tại phòng (In-room dining), tiệc nướng BBQ bãi biển',
    IsDeleted: false,
  },
];

const CLEAN_SERVICES = [
  {
    ServiceId: 1,
    CategoryId: 1,
    ServiceCode: 'SVC-SPA-001',
    ServiceName: 'Trị liệu thảo mộc toàn thân Aroma 60m',
    Price: 1650000,
    Unit: 'Liệu trình',
    Description: 'Tiếp đón tại sảnh Lotus Spa với trà hoa cúc mật ong ấm, ngâm chân muối khoáng biển Phú Quốc và massage tinh dầu thảo dược thiên nhiên.',
    Status: 'Active',
    IsDeleted: false,
  },
  {
    ServiceId: 2,
    CategoryId: 2,
    ServiceCode: 'SVC-TRN-001',
    ServiceName: 'Đưa đón sân bay Limousine Mercedes Maybach',
    Price: 2200000,
    Unit: 'Chuyến',
    Description: 'Xe sang Maybach đời mới, tài xế riêng chuẩn VIP đón khách tận cửa ra ga đến với bảng tên nhận diện cao cấp.',
    Status: 'Active',
    IsDeleted: false,
  },
  {
    ServiceId: 3,
    CategoryId: 3,
    ServiceCode: 'SVC-EXP-001',
    ServiceName: 'Tour du thuyền ngắm hoàng hôn vịnh An Thới',
    Price: 8500000,
    Unit: 'Chuyến riêng',
    Description: 'Hải trình khám phá vịnh biển 3 tiếng ngắm hoàng hôn kèm tiệc rượu vang và canapé phục vụ bởi Hostess chuyên nghiệp.',
    Status: 'Active',
    IsDeleted: false,
  },
  {
    ServiceId: 4,
    CategoryId: 4,
    ServiceCode: 'SVC-LND-001',
    ServiceName: 'Giặt ủi hấp ép lấy nhanh trong 4 giờ',
    Price: 350000,
    Unit: 'Lượt',
    Description: 'Quy trình giặt sấy bảo quản sợi tơ tằm, ép nhiệt định hình và đóng gói túi chống bụi chuyên dụng.',
    Status: 'Active',
    IsDeleted: false,
  },
  {
    ServiceId: 5,
    CategoryId: 5,
    ServiceCode: 'SVC-DNG-001',
    ServiceName: 'Bữa tối lãng mạn ánh nến bên bờ biển',
    Price: 4800000,
    Unit: 'Cặp đôi',
    Description: 'Bàn tiệc riêng tư sát biển Sunset Cove với 100 ngọn nến, thực đơn 5 món chế biến trực tiếp bởi Bếp trưởng.',
    Status: 'Inactive',
    IsDeleted: false,
  },
];

async function seedCleanServices() {
  try {
    console.log('🔄 Đang đồng bộ và làm sạch dữ liệu font chữ tiếng Việt (UTF-8)...');

    for (const cat of CLEAN_CATEGORIES) {
      await ServiceCategory.upsert(cat);
    }
    console.log('✅ Đã cập nhật chuẩn UTF-8 cho ServiceCategories.');

    for (const svc of CLEAN_SERVICES) {
      await Service.upsert(svc);
    }
    console.log('✅ Đã cập nhật chuẩn UTF-8 cho Services.');

    // Xóa các bản ghi rác bị lỗi font trong lúc test (nếu có ServiceId > 5 và có dấu ?)
    const allServices = await Service.findAll();
    for (const s of allServices) {
      if (s.ServiceId > 5 && (s.ServiceName.includes('?') || s.ServiceName.includes(''))) {
        await s.destroy();
        console.log(`🗑️ Đã xóa bản ghi rác lỗi font ServiceId: ${s.ServiceId}`);
      }
    }

    console.log('🎉 Hoàn tất sửa lỗi font chữ! Toàn bộ tiếng Việt đã hiển thị sắc nét, chuẩn UTF-8.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Lỗi khi seed dữ liệu sạch:', err);
    process.exit(1);
  }
}

seedCleanServices();
