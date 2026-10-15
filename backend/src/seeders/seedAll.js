const db = require('../models');

async function seed() {
  try {
    const args = process.argv.slice(2);
    let count = 64; // Default to realistic 64 items (matching UI Active SKUs)
    
    args.forEach(arg => {
      if (arg.startsWith('--count=')) {
        count = parseInt(arg.split('=')[1], 10);
      }
    });

    console.log('Bắt đầu khởi tạo dữ liệu mẫu tiếng Việt chuẩn UTF-8...');
    await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    await db.FoodOrderDetail.destroy({ where: {}, truncate: { cascade: true } }).catch(() => {});
    await db.FoodOrder.destroy({ where: {}, truncate: { cascade: true } }).catch(() => {});
    await db.MenuItem.destroy({ where: {}, truncate: { cascade: true } }).catch(() => {});
    await db.MenuCategory.destroy({ where: {}, truncate: { cascade: true } }).catch(() => {});

    // 1. Seed Categories
    console.log('Đang nạp MenuCategories...');
    const cat1 = await db.MenuCategory.create({ CategoryName: 'Bếp Nóng', Description: 'Các món nóng, nướng, áp chảo và súp' });
    const cat2 = await db.MenuCategory.create({ CategoryName: 'Bếp Lạnh', Description: 'Salad, sashimi, hải sản lạnh và khai vị' });
    const cat3 = await db.MenuCategory.create({ CategoryName: 'Tráng Miệng', Description: 'Bánh ngọt, kem và hoa quả tươi cao cấp' });
    const cat4 = await db.MenuCategory.create({ CategoryName: 'Đồ Uống / Bar', Description: 'Rượu vang, cocktail, nước ép và đồ uống signature' });
    const categories = [cat1.CategoryId, cat2.CategoryId, cat3.CategoryId, cat4.CategoryId];

    // 2. Seed Real Signature Menu Items
    console.log('Đang nạp MenuItems...');
    const signatureItems = [
      { name: 'Bò Wagyu Thượng Hạng', cat: cat1.CategoryId, price: 2030000, station: 'Bếp Nóng 02', sku: 'SKU-WAGYU-01', desc: 'Thịt bò Wagyu vân mỡ A5 mềm tan, dùng kèm sốt nấm Truffle đen thượng hạng.' },
      { name: 'Tôm Hùm Nướng Bơ Tỏi', cat: cat1.CategoryId, price: 2010000, station: 'Bếp Nóng 01', sku: 'SKU-LOBSTER-02', desc: 'Tôm hùm Nha Trang tươi sống nướng bơ tỏi thơm lừng, dùng kèm bánh mì giòn.' },
      { name: 'Súp Bào Ngư Thượng Hạng', cat: cat1.CategoryId, price: 2160000, station: 'Bếp Nóng 01', sku: 'SKU-ABALONE-03', desc: 'Bào ngư hảo hạng hầm thảo mộc cung đình bổ dưỡng thanh mát.' },
      { name: 'Cua Hoàng Đế Hấp Rượu Vang', cat: cat1.CategoryId, price: 2080000, station: 'Bếp Nóng 01', sku: 'SKU-CRAB-04', desc: 'Chân cua hoàng đế tươi hấp rượu vang trắng thơm ngọt tự nhiên.' },
      { name: 'Cá Tuyết Áp Chảo Bơ Chanh', cat: cat1.CategoryId, price: 1850000, station: 'Bếp Nóng 01', sku: 'SKU-COD-05', desc: 'Cá tuyết Nauy phi lê áp chảo bơ chanh vàng, khoai tây nghiền mịn.' },
      { name: 'Salad Cá Hồi Na Uy', cat: cat2.CategoryId, price: 680000, station: 'Bếp Lạnh & Salad', sku: 'SKU-SALAD-06', desc: 'Cá hồi Na Uy áp nhẹ, rau rocket hữu cơ, sốt chanh leo chua ngọt dịu.' },
      { name: 'Sashimi Hải Sản Thượng Hạng', cat: cat2.CategoryId, price: 1450000, station: 'Bếp Lạnh & Salad', sku: 'SKU-SASHIMI-07', desc: 'Set sashimi cá hồi, cá ngừ đại dương và sò điệp Hokkaido tươi rói.' },
      { name: 'Bánh Tiramisu Ý Thượng Hạng', cat: cat3.CategoryId, price: 350000, station: 'Bếp Bánh & Tráng Miệng', sku: 'SKU-TIRAMISU-08', desc: 'Bánh Tiramisu truyền thống Ý với phô mai Mascarpone béo ngậy và cà phê thơm.' },
      { name: 'Bánh Soufflé Grand Marnier', cat: cat3.CategoryId, price: 420000, station: 'Bếp Bánh & Tráng Miệng', sku: 'SKU-SOUFFLE-09', desc: 'Bánh soufflé nướng phồng xốp hương rượu cam Grand Marnier dùng nóng kèm kem vani.' },
      { name: 'Rượu Vang Đỏ Grand Cru', cat: cat4.CategoryId, price: 3200000, station: 'Quầy Bar Sommelier', sku: 'SKU-WINE-10', desc: 'Vang đỏ Bordeaux thượng hạng ủ thùng sồi Pháp 24 tháng.' },
      { name: 'Cocktail Signature Horizon Sunset', cat: cat4.CategoryId, price: 450000, station: 'Quầy Bar Sommelier', sku: 'SKU-COCKTAIL-11', desc: 'Cocktail nhiệt đới với rượu Gin, quả mọng và chanh vàng thanh mát.' },
      { name: 'Nước Ép Trái Cây Tươi Hữu Cơ', cat: cat4.CategoryId, price: 180000, station: 'Quầy Bar Sommelier', sku: 'SKU-JUICE-12', desc: 'Nước cam, dưa hấu, ổi hoặc dứa tươi nguyên chất không đường.' }
    ];

    const createdItems = [];
    for (const item of signatureItems) {
      const created = await db.MenuItem.create({
        CategoryId: item.cat,
        ItemName: item.name,
        Price: item.price,
        Description: item.desc,
        ImageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400',
        Status: 'Available',
        SKU: item.sku,
        KitchenStation: item.station,
        Ingredients: 'Nguyên liệu tuyển chọn hữu cơ 5 sao',
        ServingTime: 'Cả Ngày'
      });
      createdItems.push(created);
    }

    // Nạp thêm nếu count > 12
    if (count > signatureItems.length) {
      const additional = [];
      const baseNames = ['Bò Bít Tết MB7', 'Tôm Sú Nướng Sa Tế', 'Mực Hấp Hành Gừng', 'Gà Đồi Hấp Lá Chanh', 'Salad Bơ Trái Cây', 'Bánh Kem Phô Mai'];
      for (let i = signatureItems.length + 1; i <= count; i++) {
        const nameIdx = i % baseNames.length;
        additional.push({
          CategoryId: categories[i % categories.length],
          ItemName: `${baseNames[nameIdx]} Đặc Biệt ${i}`,
          Price: (Math.floor(Math.random() * 150) + 20) * 10000,
          Description: `Món ngon đặc sắc chuẩn 5 sao chế biến tươi ngon mỗi ngày (Mã: ${i}).`,
          ImageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400',
          Status: 'Available',
          SKU: `SKU-ITEM-${i}`,
          KitchenStation: 'Trạm Bếp 01',
          Ingredients: 'Nguyên liệu tươi sạch hữu cơ',
          ServingTime: 'Cả Ngày'
        });
      }
      await db.MenuItem.bulkCreate(additional);
    }

    // 3. User, Room, Stay
    console.log('Đang thiết lập Phòng & Khách hàng...');
    try {
      await db.sequelize.query("INSERT INTO Users (UserId, FullName, Email, PasswordHash, Phone, RoleId, Status) VALUES (1, 'Khách VIP Arthur Dent', 'arthurdent@example.com', 'hash', '0901234567', 4, 'Active') ON DUPLICATE KEY UPDATE FullName = VALUES(FullName)");
      await db.sequelize.query("INSERT INTO Rooms (RoomId, RoomNumber, Floor, Status, CleanStatus, CleanPriority) VALUES (1, '804', 8, 'Occupied', 'Clean', 'Normal') ON DUPLICATE KEY UPDATE RoomNumber = VALUES(RoomNumber)");
      await db.sequelize.query("INSERT INTO Stays (StayId, RoomId, BookingId, CheckInDate, CheckOutDate, Status) VALUES (1, 1, 1, '2026-10-01 14:00:00', '2026-10-20 12:00:00', 'Active') ON DUPLICATE KEY UPDATE Status = VALUES(Status)");
    } catch (e) {
      console.warn('Lưu ý khi tạo Room/Stay:', e.message);
    }

    // 4. Sample Orders
    console.log('Đang nạp các đơn hàng F&B mẫu...');
    const sampleOrders = [
      { time: '2026-10-14 12:30:00', status: 'Served', total: 4040000, mode: 'RoomInvoice', note: 'Giao lên phòng 804 kèm đá lạnh', items: [{ item: createdItems[0], q: 1, note: 'Chín vừa medium rare' }, { item: createdItems[1], q: 1, note: 'Nhiều bơ tỏi' }] },
      { time: '2026-10-14 09:15:00', status: 'Delivered', total: 1030000, mode: 'PayNow', note: 'Không ớt, nhiều đá', items: [{ item: createdItems[5], q: 1, note: 'Nước xốt để riêng' }, { item: createdItems[7], q: 1, note: 'Ít đường' }] },
      { time: '2026-10-13 19:40:00', status: 'Ready', total: 5360000, mode: 'RoomInvoice', note: 'Khách VIP kỷ niệm ngày cưới', items: [{ item: createdItems[9], q: 1, note: 'Ướp lạnh sẵn' }, { item: createdItems[2], q: 1, note: 'Nóng hổi' }] },
      { time: '2026-10-13 12:10:00', status: 'Preparing', total: 3880000, mode: 'RoomInvoice', note: 'Giao trước 12h30', items: [{ item: createdItems[4], q: 1, note: 'Ít muối' }, { item: createdItems[0], q: 1, note: 'Tái vừa' }] },
      { time: '2026-10-12 18:20:00', status: 'Pending', total: 2010000, mode: 'PayNow', note: 'Gọi thêm bánh mì bơ', items: [{ item: createdItems[1], q: 1, note: 'Ăn nóng' }] }
    ];

    for (const so of sampleOrders) {
      const order = await db.FoodOrder.create({
        StayId: 1,
        UserId: 1,
        OrderTime: new Date(so.time),
        OrderType: 'RoomService',
        Status: so.status,
        TotalAmount: so.total,
        PaymentMode: so.mode,
        Note: so.note
      });

      for (const it of so.items) {
        await db.FoodOrderDetail.create({
          FoodOrderId: order.FoodOrderId,
          MenuItemId: it.item.MenuItemId,
          Quantity: it.q,
          UnitPrice: it.item.Price,
          TotalPrice: it.item.Price * it.q,
          Note: it.note,
          IsCompleted: true
        });
      }
    }

    await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('\n✅ THÀNH CÔNG! Đã khởi tạo cơ sở dữ liệu mẫu tiếng Việt chuẩn 100% không còn dấu chấm hỏi (??)!');
    process.exit(0);

  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

seed();

