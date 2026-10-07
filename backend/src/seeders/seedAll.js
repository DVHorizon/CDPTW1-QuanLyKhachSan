const db = require('../models');

async function seed() {
  try {
    const args = process.argv.slice(2);
    let count = 100000; // Default to 100,000
    
    // Parse arguments
    args.forEach(arg => {
      if (arg.startsWith('--count=')) {
        count = parseInt(arg.split('=')[1], 10);
      }
    });

    console.log(`Starting Database Sync...`);
    // Turn off constraints for SQLite during mass sync/seed
    await db.sequelize.query('PRAGMA foreign_keys = OFF');
    await db.sequelize.sync({ force: true });
    console.log('Database synced and reset successfully.');

    // 1. Seed Categories
    console.log('Seeding Categories...');
    const cat1 = await db.MenuCategory.create({ CategoryName: 'Bếp Nóng', Description: 'Các món nóng' });
    const cat2 = await db.MenuCategory.create({ CategoryName: 'Bếp Lạnh', Description: 'Các món lạnh' });
    const cat3 = await db.MenuCategory.create({ CategoryName: 'Tráng Miệng', Description: 'Bánh và đồ ngọt' });
    const cat4 = await db.MenuCategory.create({ CategoryName: 'Đồ Uống / Bar', Description: 'Nước và rượu' });
    const categories = [cat1.CategoryId, cat2.CategoryId, cat3.CategoryId, cat4.CategoryId];

    // 2. Generate and Seed Menu Items in Chunks
    console.log(`Seeding ${count} Menu Items in chunks of 5000...`);
    
    const CHUNK_SIZE = 5000;
    let menuItemsChunk = [];
    
    const statuses = ['Available', 'OutOfStock', 'Inactive'];
    const names = ['Cá Tuyết', 'Bò Wagyu', 'Tôm Hùm', 'Súp Bào Ngư', 'Cua Hoàng Đế', 'Salad Cá Hồi', 'Bánh Tiramisu', 'Rượu Vang Đỏ'];

    for (let i = 1; i <= count; i++) {
      const nameIdx = i % names.length;
      
      const servingTimes = ['Ăn Sáng', 'Cả Ngày', 'Tối'];
      const stations = ['Trạm 1', 'Trạm 2', 'Trạm 3', 'Trạm 4'];
      const ingredientsList = ['Thịt bò, Muối', 'Cá, Rau, Tiêu', 'Đường, Sữa, Trứng', 'Gạo, Hải sản'];
      const allergensList = ['Đậu phộng', 'Hải sản', 'Sữa', 'Không có'];
      
      menuItemsChunk.push({
        CategoryId: categories[i % categories.length],
        ItemName: `${names[nameIdx]} Thượng Hạng ${i}`,
        Price: (Math.floor(Math.random() * 200) + 50) * 10000, // 500k -> 2.5m
        Description: `Món ăn đặc biệt chuẩn 5 sao (Mã hệ thống: ${i})`,
        ImageUrl: `https://loremflickr.com/320/240/food,dish?lock=${i}`,
        Status: statuses[Math.floor(Math.random() * statuses.length)],
        SKU: `SKU-100${i}`,
        Ingredients: ingredientsList[Math.floor(Math.random() * ingredientsList.length)],
        Allergens: allergensList[Math.floor(Math.random() * allergensList.length)],
        ServingTime: servingTimes[Math.floor(Math.random() * servingTimes.length)],
        KitchenStation: stations[Math.floor(Math.random() * stations.length)]
      });

      // Insert chunk
      if (menuItemsChunk.length === CHUNK_SIZE || i === count) {
        await db.MenuItem.bulkCreate(menuItemsChunk);
        console.log(`Inserted chunk... (${i}/${count})`);
        menuItemsChunk = []; // Reset chunk
      }
    }

    await db.sequelize.query('PRAGMA foreign_keys = ON');
    console.log(`\n✅ Thành công! Đã nạp ${count} records vào bảng MenuItems với hiệu năng cao.`);
    process.exit(0);

  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

seed();
