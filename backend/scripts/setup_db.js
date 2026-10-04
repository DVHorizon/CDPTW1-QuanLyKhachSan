const mysql = require('mysql2/promise');

async function setup() {
  const conn = await mysql.createConnection({host:'localhost',port:3306,user:'root',password:'',multipleStatements:false});
  console.log('Connected as root');

  await conn.query('CREATE DATABASE IF NOT EXISTS hotel_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
  console.log('Database hotel_management ready');

  try {
    await conn.query("CREATE USER 'hotel_user'@'localhost' IDENTIFIED BY 'hotel_password'");
    console.log('User hotel_user created');
  } catch(e) { console.log('User already exists'); }

  await conn.query("GRANT ALL PRIVILEGES ON hotel_management.* TO 'hotel_user'@'localhost'");
  await conn.query('FLUSH PRIVILEGES');
  await conn.query('USE hotel_management');

  await conn.query("CREATE TABLE IF NOT EXISTS room_types (id INT AUTO_INCREMENT PRIMARY KEY, ma_loai VARCHAR(20) NOT NULL UNIQUE, ten_loai VARCHAR(200) NOT NULL, mo_ta TEXT, hinh_anh TEXT, dien_tich INT, so_phong_ton_kho INT DEFAULT 0, gia_co_ban DECIMAL(10,2) NOT NULL, loai_giuong VARCHAR(100) DEFAULT '1 King Bed', huong_view VARCHAR(100) DEFAULT 'Ocean View', tang_vi_tri VARCHAR(50), toi_da_nguoi_lon TINYINT DEFAULT 2, toi_da_tre_em TINYINT DEFAULT 1, thoi_gian_don_phong INT DEFAULT 30, he_so_cuoi_tuan DECIMAL(4,2) DEFAULT 1.00, tien_ich JSON, trang_thai ENUM('active','inactive') DEFAULT 'active', ngay_tao TIMESTAMP DEFAULT CURRENT_TIMESTAMP, ngay_cap_nhat TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
  console.log('Table room_types ready');

  const rows = [
    ['STD-DBL','Standard Double City View','Phong tieu chuan thoang mat, nhin ra khu do thi nang dong.','https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=80',32,40,130.00,'2 Double Beds','City View','Tang 2-5',2,1,30,1.00,'["wifi","ac","safe","tv"]','active'],
    ['DLX-OCN','Deluxe Ocean View King Suite','Suite cao cap voi ban cong rieng va tam nhin bien panorama 180 do.','https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=80',48,48,180.00,'1 King Bed','Ocean View','Tang 6-9',2,1,35,1.15,'["wifi","balcony","bathtub","minibar","nespresso","ac","safe","tv"]','active'],
    ['EXC-PAN','Executive Corner Panoramic Suite','Suite goc nha voi hai mat nhin song song, khu vuc lam viec rieng biet.','https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800&q=80',58,24,260.00,'1 King Bed + Sofa Bed','Dual Aspect','Tang 6-8',2,2,40,1.20,'["wifi","balcony","bathtub","minibar","nespresso","jacuzzi","workspace","ac","safe","tv"]','active'],
    ['PNT-VIL','Penthouse Horizon Sky Villa','Biet thu tren khong sang trong nhat toa nha voi ho boi rieng va butler 24/7.','https://images.unsplash.com/photo-1631049552240-59c37f38802b?w=800&q=80',110,8,580.00,'2 King Beds','Ocean View','Tang Thuong Rooftop',4,2,60,1.30,'["wifi","balcony","bathtub","minibar","nespresso","pool","butler","jacuzzi","kitchen","ac","safe","tv","workspace"]','active'],
    ['ACC-KNG','Accessible Ground Floor Suite','Phong tiep can dac biet tuan chuan ADA, loi di rong, phong tam roll-in.','https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800&q=80',42,24,150.00,'1 King Bed','Garden View','Tang 1',2,0,30,1.00,'["wifi","ada","ac","safe","tv","workspace"]','active'],
    ['FAM-SUI','Family Connecting Suite','Suite gia dinh gom hai phong thong nhau, phu hop nhom gia dinh dong thanh vien.','https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=800&q=80',68,16,220.00,'2 Twin Beds','Garden View','Tang 3-5',2,3,45,1.10,'["wifi","kitchen","ac","safe","tv","workspace"]','active']
  ];

  for(const r of rows) {
    await conn.query('INSERT IGNORE INTO room_types (ma_loai,ten_loai,mo_ta,hinh_anh,dien_tich,so_phong_ton_kho,gia_co_ban,loai_giuong,huong_view,tang_vi_tri,toi_da_nguoi_lon,toi_da_tre_em,thoi_gian_don_phong,he_so_cuoi_tuan,tien_ich,trang_thai) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', r);
    console.log('Seeded: ' + r[0]);
  }

  const [count] = await conn.query('SELECT COUNT(*) as t FROM room_types');
  console.log('Total rows: ' + count[0].t);
  await conn.end();
  console.log('SETUP COMPLETE');
}
setup().catch(e => { console.error(e.message); process.exit(1); });
