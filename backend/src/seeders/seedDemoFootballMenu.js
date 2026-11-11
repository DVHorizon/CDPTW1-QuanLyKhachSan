'use strict';

require('dotenv').config();
const { MenuItem, MenuCategory } = require('../models');

async function seedTestDemoData() {
  console.log('🚀 Đang thêm 4 món ăn mẫu theo đúng slide báo cáo để test Fuzzy/Typo...');
  try {
    let cat = await MenuCategory.findOne();
    const catId = cat ? cat.CategoryId : 1;

    const demoItems = [
      {
        ItemName: 'Pizza Đặc Biệt Lionel Messi',
        CategoryId: catId,
        Price: 289000,
        Description: 'Món pizza phô mai hải sản cao cấp mang số áo 10 của cầu thủ bóng đá Lionel Messi',
        Status: 'Available'
      },
      {
        ItemName: 'Steak Bò Wagyu Cristiano Ronaldo',
        CategoryId: catId,
        Price: 650000,
        Description: 'Thăn bò nướng hảo hạng phong cách thể thao CR7 Cristiano Ronaldo',
        Status: 'Available'
      },
      {
        ItemName: 'Cocktail Nhiệt Đới Nguyễn Quang Hải',
        CategoryId: catId,
        Price: 150000,
        Description: 'Đồ uống năng lượng đặc sắc phong cách cầu thủ Nguyễn Quang Hải',
        Status: 'Available'
      },
      {
        ItemName: 'Cá Tuyết Thượng Hạng Nauy',
        CategoryId: catId,
        Price: 1250000,
        Description: 'Cá tuyết tươi nhập khẩu phi lê nướng tiêu đen',
        Status: 'Available'
      }
    ];

    for (const item of demoItems) {
      const existing = await MenuItem.findOne({ where: { ItemName: item.ItemName } });
      if (!existing) {
        await MenuItem.create(item);
        console.log(`+ Đã thêm món: ${item.ItemName}`);
      } else {
        console.log(`- Món đã có sẵn: ${item.ItemName}`);
      }
    }

    console.log('🎉 Đã thêm dữ liệu mẫu vào MySQL thành công!');
  } catch (error) {
    console.error('Lỗi thêm dữ liệu mẫu:', error.message);
  } finally {
    process.exit(0);
  }
}

seedTestDemoData();

