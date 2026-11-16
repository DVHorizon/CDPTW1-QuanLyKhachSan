-- ==============================================================================
-- GRAND HORIZON PMS - HỆ THỐNG QUẢN LÝ KHÁCH SẠN
-- Migration: Quản Lý Đồ Thất Lạc & Bỏ Quên (Lost & Found Management)
-- Tương thích: MySQL 8.0 / MariaDB / phpMyAdmin Docker
-- Database: hotel_management
-- ==============================================================================

USE `hotel_management`;

-- 1. Tạo bảng LostAndFoundItems lưu trữ thông tin & hình ảnh hiện trường Base64
CREATE TABLE IF NOT EXISTS `LostAndFoundItems` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY COMMENT 'Mã hồ sơ (VD: LF-2025-0841)',
  `hash` VARCHAR(50) NOT NULL DEFAULT '8F7C-99B4-LF25' COMMENT 'Mã băm định danh hồ sơ',
  `itemName` VARCHAR(255) NOT NULL COMMENT 'Tên vật phẩm',
  `itemType` VARCHAR(100) DEFAULT 'Thiết bị số & Điện tử cao cấp' COMMENT 'Chủng loại vật phẩm',
  `itemSpec` TEXT COMMENT 'Đặc điểm kỹ thuật / Quy cách',
  `serialImei` VARCHAR(100) COMMENT 'Định danh phần cứng IMEI / Serial',
  `serialNote` TEXT COMMENT 'Ghi chú số seri / đối chiếu',
  `securityLevel` VARCHAR(100) DEFAULT 'BẢO VẬT CẤP ĐỘ II' COMMENT 'Cấp độ bảo quản tài sản',
  `roomNumber` VARCHAR(50) NOT NULL COMMENT 'Số phòng nhặt được',
  `roomWing` VARCHAR(100) DEFAULT 'Ocean Wing' COMMENT 'Khu vực / Tòa nhà',
  `foundLocation` VARCHAR(255) NOT NULL COMMENT 'Vị trí cụ thể trong phòng',
  `foundDate` VARCHAR(50) NOT NULL COMMENT 'Ngày phát hiện (YYYY-MM-DD)',
  `foundTime` VARCHAR(50) NOT NULL COMMENT 'Giờ phát hiện',
  `finderName` VARCHAR(100) NOT NULL COMMENT 'Nhân viên phát hiện',
  `finderRole` VARCHAR(100) DEFAULT 'Nhân viên buồng phòng' COMMENT 'Bộ phận người tìm thấy',
  `status` VARCHAR(50) DEFAULT 'IN_STORAGE' COMMENT 'IN_STORAGE | READY_TO_RETURN | RETURNED | DISPOSED',
  `statusLabel` VARCHAR(255) DEFAULT 'ĐANG LƯU KHO BẢO QUẢN NIÊM PHONG KÉT AN TOÀN' COMMENT 'Nhãn trạng thái hiển thị',
  `storageLocation` VARCHAR(100) DEFAULT 'Két an toàn B-04' COMMENT 'Vị trí két an toàn / kho bảo quản',
  `sealNumber` VARCHAR(50) DEFAULT '#ST-99124' COMMENT 'Mã tem niêm phong',
  `verifiedDate` VARCHAR(50) COMMENT 'Ngày xác minh',
  `inspectionReport` LONGTEXT COMMENT 'Báo cáo hiện trạng vật lý (JSON)',
  `images` LONGTEXT COMMENT 'Hình ảnh độ phân giải cao CAM-01 & CAM-02 Base64 / URL (JSON)',
  `guest` LONGTEXT COMMENT 'Thông tin khách hàng PMS lưu trú (JSON)',
  `custodyChain` LONGTEXT COMMENT 'Lịch sử chuỗi bảo quản niêm phong Chain of Custody (JSON)',
  `deliveryMethod` VARCHAR(50) DEFAULT 'FRONT_DESK' COMMENT 'FRONT_DESK | FEDEX | THIRD_PARTY',
  `deliveryNote` TEXT COMMENT 'Ghi chú bàn giao / Mã vận đơn FedEx',
  `trackingCode` VARCHAR(100) COMMENT 'Mã vận đơn bưu cục',
  `sha256` VARCHAR(255) DEFAULT 'e3b0c44298fc1c149afbf4c8996fb7f2834b6932a934d40232efd6d84f88410a' COMMENT 'Mã xác thực SHA-256 ISO 27001',
  `supervisor` LONGTEXT COMMENT 'Giám sát tiền sảnh & chứng thực PKI (JSON)',
  `digitalSignature` LONGTEXT COMMENT 'Chữ ký điện tử số hóa (Digital Signature Base64)',
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Chèn dữ liệu mẫu chuẩn khớp 100% với giao diện Grand Horizon PMS
INSERT INTO `LostAndFoundItems` (
  `id`, `hash`, `itemName`, `itemType`, `itemSpec`, `serialImei`, `serialNote`, `securityLevel`,
  `roomNumber`, `roomWing`, `foundLocation`, `foundDate`, `foundTime`, `finderName`, `finderRole`,
  `status`, `statusLabel`, `storageLocation`, `sealNumber`, `verifiedDate`,
  `inspectionReport`, `images`, `guest`, `custodyChain`, `deliveryMethod`, `deliveryNote`, `trackingCode`, `sha256`, `supervisor`
) VALUES
(
  'LF-2025-0841',
  '8F7C-99B4-LF25',
  'Apple Watch Series 8',
  'Thiết bị số & Điện tử cao cấp',
  '45mm • Màu Bạc {Starlight Silver} • Dây thể thao',
  '8901 - 4432 - 8812',
  'Khớp dữ liệu mua hàng lưu trữ Apple ID',
  'BẢO VẬT CẤP ĐỘ II',
  '804',
  'Ocean Wing',
  'Kệ tủ đầu giường bên trái',
  '2025-10-24',
  '11:20 SA',
  'Teresa Vance',
  'Nhân viên buồng phòng',
  'READY_TO_RETURN',
  'ĐÃ XÁC MINH CHỦ SỞ HỮU • SẴN SÀNG TRAO TRẢ TẠI TIỀN SẢNH',
  'Két an toàn B-04',
  '#ST-99124',
  '2025-10-24',
  '{"screen":"Nguyên vẹn","bezel":"Xước dăm 0.4mm","battery":"Pin còn 18%","securityLock":"Mã PIN 6 ký tự số hoạt động bình thường, đang bật Lost Mode từ iCloud."}',
  '{"front":"https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=800&auto=format&fit=crop&q=80","frontLabel":"CAM-01 // MẶT TRƯỚC","frontTag":"Kính Sapphire","back":"https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800&auto=format&fit=crop&q=80","backLabel":"CAM-02 // KHẮC LASER IMEI","backTag":"SER: 8901-4432"}',
  '{"name":"Arthur Dent","avatar":"AD","bookingId":"#BK-99214","room":"Phòng 804","phone":"+84 912 345 678","tier":"HỘI VIÊN SILVER RESIDENT","tierColor":"bg-blue-100 text-blue-700 border-blue-200","idVerified":"ĐÃ XÁC THỰC CCCD / HỘ CHIẾU","passportNo":"PP: B81920489 (GBR)"}',
  '[{"id":1,"time":"24/10/2025 • 11:20 SA","tag":"Phát hiện tại chỗ","tagColor":"bg-emerald-100 text-emerald-800 border-emerald-200","actor":"Teresa Vance (Buồng phòng)","description":"Nhân viên buồng phòng Teresa Vance phát hiện trên kệ tủ đầu giường bên trái khi dọn vệ sinh phòng 804 (Ocean Wing) sau giờ Checkout."},{"id":2,"time":"24/10/2025 • 11:45 SA","tag":"Niêm phong két an toàn","tagColor":"bg-slate-100 text-slate-800 border-slate-200","actor":"H. Vance (Trưởng bộ phận Buồng phòng)","description":"Trưởng bộ phận Buồng phòng H. Vance đóng gói túi chống ẩm chuyên dụng, gắn tem số niêm phong #ST-99124 và đưa vào Két an toàn B-04."},{"id":3,"time":"24/10/2025 • 14:15 CH","tag":"Chuyển Tiền Sảnh","tagColor":"bg-teal-100 text-teal-800 border-teal-200","actor":"Marcus Aurelius (Giám sát Tiền sảnh)","description":"Bàn giao trực tiếp cho Giám sát Tiền sảnh Marcus Aurelius tại quầy Lễ tân, chuẩn bị trao trả theo lịch hẹn của khách."}]',
  'FRONT_DESK',
  '',
  '',
  'e3b0c44298fc1c149afbf4c8996fb7f2834b6932a934d40232efd6d84f88410a',
  '{"name":"Marcus Aurelius","title":"Front Desk Duty Supervisor","pki":"SIGNED • 0x89AB...441C 14:18","ip":"192.168.10.84","lat":"10.28 N","token":"YUBIKEY-NFC-V5"}'
),
(
  'LF-2025-0839',
  '5A2E-44B1-LF19',
  'Ví da Montblanc Meisterstück & Tiền mặt',
  'Tài sản giá trị & Giấy tờ tùy thân',
  'Da bò hạt màu đen sần • Có chứa 4.200.000 VNĐ & 2 Thẻ Visa Signature',
  'MB-MST-9921',
  'Khớp nhận diện thương hiệu dập nổi góc trong',
  'BẢO VẬT CẤP ĐỘ I (TIỀN MẶT & THẺ)',
  '512',
  'Sunset Wing',
  'Két an toàn điện tử trong tủ quần áo',
  '2025-10-23',
  '15:10 CH',
  'Nguyễn Thị Lành',
  'Nhân viên buồng phòng',
  'IN_STORAGE',
  'ĐANG LƯU KHO BẢO QUẢN NIÊM PHONG KÉT AN TOÀN',
  'Két trung tâm A-01',
  '#ST-99088',
  '2025-10-23',
  '{"screen":"Nguyên vẹn","bezel":"Da mềm không trầy","battery":"N/A","securityLock":"2 Thẻ ngân hàng đã được niêm phong túi bạc có niêm phong bảo mật."}',
  '{"front":"https://images.unsplash.com/photo-1627123424574-724758594e93?w=800&auto=format&fit=crop&q=80","frontLabel":"CAM-01 // MẶT NGOÀI","frontTag":"Logo Ngôi Sao Trắng","back":"https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&auto=format&fit=crop&q=80","backLabel":"CAM-02 // NGĂN TIỀN MẶT","backTag":"Niêm phong túi số 08"}',
  '{"name":"Trần Hoàng Nam","avatar":"TH","bookingId":"#BK-99150","room":"Phòng 512","phone":"+84 903 888 999","tier":"HỘI VIÊN GOLD ELITE","tierColor":"bg-amber-100 text-amber-800 border-amber-300","idVerified":"ĐÃ XÁC THỰC CCCD GẮN CHIP","passportNo":"CCCD: 079092019482"}',
  '[{"id":1,"time":"23/10/2025 • 15:10 CH","tag":"Phát hiện két sắt","tagColor":"bg-emerald-100 text-emerald-800 border-emerald-200","actor":"Nguyễn Thị Lành (Buồng phòng)","description":"Phát hiện ví bỏ quên trong két an toàn mở hé phòng 512 sau khi khách làm thủ tục Check-out."},{"id":2,"time":"23/10/2025 • 15:30 CH","tag":"Niêm phong kép","tagColor":"bg-slate-100 text-slate-800 border-slate-200","actor":"Lê Minh Anh & An ninh KS","description":"Kiểm đếm tiền mặt trước camera an ninh, cho vào phong bì bảo mật số #ST-99088 và khóa két trung tâm."}]',
  'FRONT_DESK',
  '',
  '',
  '9a3d42bc110f01988ef11c90021ba0928ff210381014cc491910bc412384aee1',
  '{"name":"Marcus Aurelius","title":"Front Desk Duty Supervisor","pki":"VERIFIED • 0x489B...119C 15:40","ip":"192.168.10.84","lat":"10.28 N","token":"YUBIKEY-NFC-V5"}'
)
ON DUPLICATE KEY UPDATE `itemName` = VALUES(`itemName`), `status` = VALUES(`status`);
