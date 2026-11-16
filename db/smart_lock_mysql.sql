-- ==============================================================================
-- GRAND HORIZON PMS - HỆ THỐNG QUẢN LÝ KHÁCH SẠN
-- Migration: Khóa Cửa Điện Tử Thông Minh IoT & Cấp Thẻ E-Key (Smart Lock Management)
-- Tương thích: MySQL 8.0 / MariaDB / phpMyAdmin Docker
-- Database: hotel_management
-- ==============================================================================

USE `hotel_management`;

-- 1. Tạo bảng SmartLockKeys
CREATE TABLE IF NOT EXISTS `SmartLockKeys` (
  `KeyId` VARCHAR(50) NOT NULL PRIMARY KEY COMMENT 'Mã khóa E-Key (VD: EK-8891-804)',
  `BookingId` VARCHAR(50) COMMENT 'Mã đặt phòng RES/BK',
  `RoomNumber` VARCHAR(50) NOT NULL COMMENT 'Số phòng',
  `RoomWing` VARCHAR(100) DEFAULT 'Ocean Wing' COMMENT 'Khu vực tòa nhà',
  `RoomType` VARCHAR(100) DEFAULT 'Deluxe Seaview' COMMENT 'Hạng phòng',
  `GuestName` VARCHAR(150) NOT NULL COMMENT 'Tên khách hoặc nhân viên',
  `GuestPhone` VARCHAR(50) COMMENT 'Số điện thoại nhận SMS',
  `GuestEmail` VARCHAR(100) COMMENT 'Email nhận Digital Key',
  `GuestTier` VARCHAR(50) DEFAULT 'SILVER RESIDENT' COMMENT 'Hạng thành viên PMS / Nhân viên',
  `LockType` VARCHAR(100) DEFAULT 'App BLE Mobile Key' COMMENT 'Phương thức & loại khóa',
  `PhysicalCardsCount` INT DEFAULT 0 COMMENT 'Số lượng thẻ từ RFID vật lý',
  `PasscodePin` VARCHAR(20) COMMENT 'Mã PIN mở cửa 6 số',
  `DigitalKeyUrl` TEXT COMMENT 'URL Apple/Google Wallet Pass',
  `RfidCardUid` VARCHAR(100) COMMENT 'Mã UID thẻ Mifare/DESFire',
  `Provider` VARCHAR(50) DEFAULT 'VISIONLINE' COMMENT 'VISIONLINE | SALTO | TTLOCK | TUYA',
  `ValidFrom` VARCHAR(50) NOT NULL COMMENT 'Thời điểm bắt đầu hiệu lực (Check-in)',
  `ValidTo` VARCHAR(50) NOT NULL COMMENT 'Thời điểm hết hiệu lực (Check-out)',
  `BatteryLevel` INT DEFAULT 92 COMMENT 'Phần trăm pin chốt khóa (0-100)',
  `BatteryStatus` VARCHAR(50) DEFAULT 'Tối ưu' COMMENT 'Tối ưu | Chuẩn | Báo Kỹ Thuật',
  `SignalDbm` INT DEFAULT -58 COMMENT 'Độ mạnh tín hiệu Mesh Zigbee (dBm)',
  `AccessAreas` TEXT COMMENT 'Danh sách khu vực được cấp quyền mở cửa (JSON)',
  `Status` VARCHAR(50) DEFAULT 'ACTIVE' COMMENT 'ACTIVE | REVOKED | EXPIRED | EMERGENCY_LOCKED',
  `DoorSensorStatus` VARCHAR(50) DEFAULT 'AN TOÀN (LATCHED)' COMMENT 'Cảm biến chốt cửa',
  `HardwareSerial` VARCHAR(100) DEFAULT 'AC-8829-2024' COMMENT 'Số seri phần cứng chốt cửa VingCard',
  `HardwareFirmware` VARCHAR(50) DEFAULT 'v4.18.2' COMMENT 'Phiên bản firmware',
  `LastTapTime` VARCHAR(50) DEFAULT '12:14:02' COMMENT 'Thời điểm chạm thẻ / mở cửa gần nhất',
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Chèn dữ liệu mẫu chuẩn 100% khớp với ảnh mockup PMS
INSERT INTO `SmartLockKeys` (
  `KeyId`, `BookingId`, `RoomNumber`, `RoomWing`, `RoomType`, `GuestName`, `GuestPhone`, `GuestEmail`,
  `GuestTier`, `LockType`, `PhysicalCardsCount`, `PasscodePin`, `DigitalKeyUrl`, `RfidCardUid`, `Provider`,
  `ValidFrom`, `ValidTo`, `BatteryLevel`, `BatteryStatus`, `SignalDbm`, `AccessAreas`, `Status`, `DoorSensorStatus`,
  `HardwareSerial`, `HardwareFirmware`, `LastTapTime`, `createdAt`, `updatedAt`
) VALUES
(
  'EK-8891-804', 'RES-8891', '804', 'Ocean Wing', 'Deluxe Seaview', 'Arthur Dent', '+84 912 345 678', 'arthur.dent@grandhorizon.vn',
  'SILVER RESIDENT', 'App BLE Mobile Key', 1, '894102', 'https://wallet.grandhorizon.vn/pass/EK-8891-804', '04:78:A2:9B:10', 'VISIONLINE',
  '24/10', '28/10 (Hết hạn: 12:00)', 92, 'Tối ưu', -58, '["Cửa Phòng 804", "Thang Máy Tầng 8", "Phòng Gym & Spa"]', 'ACTIVE', 'AN TOÀN (LATCHED)',
  'AC-8829-2024', 'v4.18.2', '12:14:02', NOW(), NOW()
),
(
  'EK-9902-1401', 'RES-9902', '1401', 'Sky Villa', 'Penthouse • Tầng 14', 'Kenji Sato', '+81 90 1234 5678', 'kenji.sato@tokyo-invest.jp',
  'VIP BLACK', 'BLE + 2 NFC Master VIP', 2, '140188', 'https://wallet.apple.com/pass/EK-9902-1401', '04:99:FF:31:88', 'SALTO',
  '22/10', '30/10 (Hạn: 14:00 {Late C/O})', 98, 'Chuẩn', -52, '["Thang Máy VIP", "Sky Lounge", "Spa"]', 'ACTIVE', 'AN TOÀN (LATCHED)',
  'AC-1401-2024', 'v4.20.1', '13:05:40', NOW(), NOW()
),
(
  'EK-9921-407', 'RES-9921', '407', 'Ocean Wing', 'Garden Suite', 'Clara Higgins', '+44 7700 900888', 'clara.higgins@london-art.uk',
  'STANDARD', 'Android Passkey BLE', 0, '407921', 'https://pay.google.com/gp/v/object/EK-9921-407', NULL, 'TTLOCK',
  '25/10', '27/10 (Hết hạn: 12:00)', 24, 'Báo Kỹ Thuật', -64, '["Cửa Phòng 407", "Bể Bơi Vô Cực"]', 'ACTIVE', 'AN TOÀN (LATCHED)',
  'AC-407-2023', 'v3.90.0', '11:42:15', NOW(), NOW()
),
(
  'EK-HK-8802', 'STAFF-HK', 'HK', 'F1-F3', 'Buồng Phòng • Ca Sáng (F1-F3)', 'Nguyễn Hoàng', '+84 988 777 666', 'hoang.nguyen@grandhorizon.vn',
  'NHÂN VIÊN', 'Thẻ Master HK Tầng 1-3', 1, '998802', NULL, '04:E2:89:1A:BC', 'VISIONLINE',
  'Hôm Nay 07:00', '15:30', 100, 'Thẻ NFC (Vô hạn pin)', 0, '["Hành Lang F1-3 & Kho Vải"]', 'ACTIVE', 'AN TOÀN (LATCHED)',
  'MASTER-ENC-01', 'v5.0.0', '07:15:00', NOW(), NOW()
)
ON DUPLICATE KEY UPDATE `GuestName` = VALUES(`GuestName`), `Status` = VALUES(`Status`);
