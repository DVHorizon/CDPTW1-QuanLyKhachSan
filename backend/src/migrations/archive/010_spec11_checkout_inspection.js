'use strict';

/**
 * Migration 010: Tạo các bảng cho Spec 11 (Kiểm phòng & Check-out)
 * - RoomInspectionReports
 * - DamageItems
 * - LateFeePolicies
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Tạo bảng RoomInspectionReports
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS RoomInspectionReports (
        InspectionId INT AUTO_INCREMENT PRIMARY KEY,
        StayId INT NOT NULL,
        RoomId INT NOT NULL,
        InspectorId INT NULL,
        InspectorName VARCHAR(100) DEFAULT 'R. Gomez (Housekeeping Staff #409)',
        InspectionTime DATETIME DEFAULT CURRENT_TIMESTAMP,
        Status VARCHAR(30) DEFAULT 'COMPLETED',
        KeycardsIssued INT DEFAULT 2,
        KeycardsReturned INT DEFAULT 2,
        KeycardLossPenalty DECIMAL(18, 2) DEFAULT 0.00,
        RoomCondition VARCHAR(30) DEFAULT 'NOMINAL',
        LinenDamageFee DECIMAL(18, 2) DEFAULT 0.00,
        GuestAcknowledgement VARCHAR(30) DEFAULT 'ACKNOWLEDGED',
        GuestNotes TEXT NULL,
        SupervisorId INT NULL,
        SupervisorNotes TEXT NULL,
        SignOffProofUrl VARCHAR(500) NULL,
        CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_inspection_stay (StayId),
        INDEX idx_inspection_room (RoomId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 2. Tạo bảng DamageItems
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS DamageItems (
        DamageItemId INT AUTO_INCREMENT PRIMARY KEY,
        InspectionId INT NULL,
        StayId INT NOT NULL,
        RoomId INT NOT NULL,
        ItemName VARCHAR(150) NOT NULL,
        ItemLocation VARCHAR(100) DEFAULT 'Phòng ngủ chính / Master Bedroom',
        DamageDescription TEXT NOT NULL,
        Severity VARCHAR(30) DEFAULT 'MODERATE',
        EvidenceUrls LONGTEXT NULL,
        ProposedCharge DECIMAL(18, 2) DEFAULT 0.00,
        ApprovedCharge DECIMAL(18, 2) DEFAULT 0.00,
        Status VARCHAR(30) DEFAULT 'SUBMITTED',
        ReasonCode VARCHAR(50) NULL,
        DisputeNote TEXT NULL,
        CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_damage_stay (StayId),
        INDEX idx_damage_insp (InspectionId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 3. Tạo bảng LateFeePolicies
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS LateFeePolicies (
        PolicyId INT AUTO_INCREMENT PRIMARY KEY,
        BranchId INT NULL,
        PolicyName VARCHAR(100) NOT NULL,
        GracePeriodMinutes INT DEFAULT 30,
        HourlyFee DECIMAL(18, 2) DEFAULT 200000.00,
        HalfDayThresholdHours INT DEFAULT 3,
        HalfDayFeePercent DECIMAL(5, 2) DEFAULT 50.00,
        FullDayThresholdHours INT DEFAULT 6,
        FullDayFeePercent DECIMAL(5, 2) DEFAULT 100.00,
        MaxFee DECIMAL(18, 2) DEFAULT 3000000.00,
        TaxRate DECIMAL(5, 2) DEFAULT 10.00,
        IsActive TINYINT(1) DEFAULT 1,
        CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Chèn 1 chính sách mặc định nếu chưa có
    await queryInterface.sequelize.query(`
      INSERT INTO LateFeePolicies (BranchId, PolicyName, GracePeriodMinutes, HourlyFee, HalfDayThresholdHours, HalfDayFeePercent, FullDayThresholdHours, FullDayFeePercent, MaxFee, TaxRate, IsActive)
      SELECT 1, 'Chính sách trả phòng trễ tiêu chuẩn', 30, 200000.00, 3, 50.00, 6, 100.00, 3000000.00, 10.00, 1
      WHERE NOT EXISTS (SELECT 1 FROM LateFeePolicies WHERE PolicyId = 1);
    `);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS DamageItems;');
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS RoomInspectionReports;');
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS LateFeePolicies;');
  }
};
