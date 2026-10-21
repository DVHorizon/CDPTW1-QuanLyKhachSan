-- Khởi tạo Database cho dự án Quản lý Khách sạn
-- Bảng và cấu trúc dữ liệu được quản lý tập trung và chuẩn hóa thông qua Migration (Sequelize)
CREATE DATABASE IF NOT EXISTS hotel_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE hotel_management;

-- Bảng Roles (Vai trò)
CREATE TABLE IF NOT EXISTS `Roles` (
  `RoleId` INT AUTO_INCREMENT PRIMARY KEY,
  `RoleName` VARCHAR(100) NOT NULL,
  `Description` VARCHAR(500) NULL,
  `IsDeleted` TINYINT(1) DEFAULT 0,
  `CreatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `UpdatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bảng MembershipTiers (Hạng thành viên)
CREATE TABLE IF NOT EXISTS `MembershipTiers` (
  `TierId` INT AUTO_INCREMENT PRIMARY KEY,
  `TierName` VARCHAR(100) NOT NULL,
  `MinPoints` INT DEFAULT 0,
  `Benefits` VARCHAR(1000) NULL,
  `DiscountRate` DECIMAL(5, 2) DEFAULT 0.00,
  `PointMultiplier` DECIMAL(4, 2) DEFAULT 1.00,
  `IsDeleted` TINYINT(1) DEFAULT 0,
  `CreatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `UpdatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bảng Users (Người dùng)
CREATE TABLE IF NOT EXISTS `Users` (
  `UserId` INT AUTO_INCREMENT PRIMARY KEY,
  `RoleId` INT NOT NULL,
  `TierId` INT NULL DEFAULT NULL,
  `FullName` VARCHAR(150) NOT NULL,
  `Email` VARCHAR(150) NOT NULL,
  `Phone` VARCHAR(30) NULL DEFAULT NULL,
  `PasswordHash` VARCHAR(500) NOT NULL,
  `IdNumber` VARCHAR(50) NULL DEFAULT NULL,
  `IdType` VARCHAR(30) NULL DEFAULT NULL,
  `DateOfBirth` DATE NULL DEFAULT NULL,
  `Gender` VARCHAR(20) NULL DEFAULT NULL,
  `Status` VARCHAR(30) DEFAULT 'Active',
  `CreatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `UpdatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_users_email` (`Email`),
  INDEX `idx_users_role` (`RoleId`),
  INDEX `idx_users_tier` (`TierId`),
  INDEX `idx_users_status` (`Status`),
  CONSTRAINT `fk_users_roles` FOREIGN KEY (`RoleId`) REFERENCES `Roles` (`RoleId`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_users_membership_tiers` FOREIGN KEY (`TierId`) REFERENCES `MembershipTiers` (`TierId`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
