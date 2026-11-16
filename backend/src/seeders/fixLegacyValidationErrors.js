'use strict';

const { sequelize, MaintenanceTicket, InventoryItem, MarketingCampaign } = require('../models');

async function fixLegacyColumnsAndSync() {
  const query = async (sql) => {
    try {
      await sequelize.query(sql);
    } catch (e) {
      if (!e.message.includes('Duplicate column') && !e.message.includes('already exists')) {
        console.warn('   [Notice]:', e.message);
      }
    }
  };

  console.log('🔄 Bắt đầu chuẩn hóa cấu trúc bảng legacy & khắc phục lỗi Validation Error...');

  // 1. MaintenanceTickets
  console.log('1. Cập nhật bảng MaintenanceTickets...');
  await query("ALTER TABLE MaintenanceTickets ADD COLUMN TicketCode VARCHAR(50) NULL");
  await query("ALTER TABLE MaintenanceTickets ADD COLUMN LocationType VARCHAR(50) NULL DEFAULT 'Phòng Đang Ở'");
  await query("ALTER TABLE MaintenanceTickets ADD COLUMN RoomNumber VARCHAR(50) NULL");
  await query("ALTER TABLE MaintenanceTickets ADD COLUMN RoomOccupancyStatus VARCHAR(50) NULL DEFAULT 'OCCUPIED (In-House)'");
  await query("ALTER TABLE MaintenanceTickets ADD COLUMN GuestName VARCHAR(150) NULL");
  await query("ALTER TABLE MaintenanceTickets ADD COLUMN GuestTier VARCHAR(50) NULL");
  await query("ALTER TABLE MaintenanceTickets ADD COLUMN AssetId VARCHAR(50) NULL");
  await query("ALTER TABLE MaintenanceTickets ADD COLUMN AssetName VARCHAR(255) NULL");
  await query("ALTER TABLE MaintenanceTickets ADD COLUMN Category VARCHAR(100) NULL");
  await query("ALTER TABLE MaintenanceTickets ADD COLUMN Symptom VARCHAR(255) NULL");
  await query("ALTER TABLE MaintenanceTickets ADD COLUMN Source VARCHAR(100) NULL DEFAULT 'Lễ Tân gọi'");
  await query("ALTER TABLE MaintenanceTickets ADD COLUMN SlaMinutes INT NULL DEFAULT 45");
  await query("ALTER TABLE MaintenanceTickets ADD COLUMN SlaDeadline DATETIME NULL");
  await query("ALTER TABLE MaintenanceTickets ADD COLUMN TechnicianName VARCHAR(100) NULL");
  await query("ALTER TABLE MaintenanceTickets ADD COLUMN TechnicianSpecialty VARCHAR(100) NULL");
  await query("ALTER TABLE MaintenanceTickets ADD COLUMN TechnicianAvatar VARCHAR(500) NULL");
  await query("ALTER TABLE MaintenanceTickets ADD COLUMN StatusLabel VARCHAR(100) NULL DEFAULT 'Mới tạo'");
  await query("ALTER TABLE MaintenanceTickets ADD COLUMN GuestInRoom TINYINT(1) NULL DEFAULT 1");
  await query("ALTER TABLE MaintenanceTickets ADD COLUMN AgreedImmediateFix TINYINT(1) NULL DEFAULT 1");
  await query("ALTER TABLE MaintenanceTickets ADD COLUMN TempRoomChange TINYINT(1) NULL DEFAULT 0");
  await query("ALTER TABLE MaintenanceTickets ADD COLUMN BmsPartsIssued TEXT NULL");
  await query("ALTER TABLE MaintenanceTickets ADD COLUMN PhotoEvidenceUrl VARCHAR(500) NULL");
  await query("ALTER TABLE MaintenanceTickets ADD COLUMN ResolutionNotes TEXT NULL");
  await query("ALTER TABLE MaintenanceTickets ADD COLUMN UpdatedAt DATETIME NULL");

  await query("UPDATE MaintenanceTickets SET TicketCode = CONCAT('WO-2025-', LPAD(TicketId, 4, '0')) WHERE TicketCode IS NULL OR TicketCode = ''");
  await query("UPDATE MaintenanceTickets SET RoomNumber = CONCAT('Phòng ', COALESCE(RoomId, 101)) WHERE RoomNumber IS NULL OR RoomNumber = ''");
  await query("UPDATE MaintenanceTickets SET AssetName = COALESCE(Title, 'Thiết bị buồng phòng') WHERE AssetName IS NULL OR AssetName = ''");
  await query("UPDATE MaintenanceTickets SET Category = 'Bảo Trì Kỹ Thuật' WHERE Category IS NULL OR Category = ''");
  await query("UPDATE MaintenanceTickets SET Symptom = COALESCE(Title, 'Sự cố thiết bị') WHERE Symptom IS NULL OR Symptom = '';");
  await query("UPDATE MaintenanceTickets SET UpdatedAt = NOW() WHERE UpdatedAt IS NULL");

  // 2. InventoryItems
  console.log('2. Cập nhật bảng InventoryItems...');
  await query("ALTER TABLE InventoryItems ADD COLUMN SKU VARCHAR(50) NULL");
  await query("ALTER TABLE InventoryItems ADD COLUMN Supplier VARCHAR(255) NULL");
  await query("ALTER TABLE InventoryItems ADD COLUMN Location VARCHAR(100) NULL DEFAULT 'Kho A-01'");
  await query("ALTER TABLE InventoryItems ADD COLUMN CurrentStock INT NULL DEFAULT 100");
  await query("ALTER TABLE InventoryItems ADD COLUMN ParStock INT NULL DEFAULT 100");
  await query("ALTER TABLE InventoryItems ADD COLUMN MinAlertLevel INT NULL DEFAULT 50");
  await query("ALTER TABLE InventoryItems ADD COLUMN CostPrice DECIMAL(18,2) NULL DEFAULT 0");
  await query("ALTER TABLE InventoryItems ADD COLUMN SellingPrice DECIMAL(18,2) NULL DEFAULT 0");
  await query("ALTER TABLE InventoryItems ADD COLUMN ImageUrl VARCHAR(500) NULL");
  await query("ALTER TABLE InventoryItems ADD COLUMN StorageTemp VARCHAR(50) NULL DEFAULT 'Kho mát tiêu chuẩn'");

  await query("UPDATE InventoryItems SET SKU = COALESCE(ItemCode, CONCAT('SKU-', LPAD(ItemId, 6, '0'))) WHERE SKU IS NULL OR SKU = ''");
  await query("UPDATE InventoryItems SET CurrentStock = ROUND(COALESCE(Quantity, 50)) WHERE CurrentStock IS NULL OR CurrentStock = 0");
  await query("UPDATE InventoryItems SET CostPrice = COALESCE(UnitCost, 0) WHERE CostPrice IS NULL OR CostPrice = 0");
  await query("UPDATE InventoryItems SET SellingPrice = COALESCE(UnitPrice, 0) WHERE SellingPrice IS NULL OR SellingPrice = 0");

  // 3. MarketingCampaigns
  console.log('3. Cập nhật bảng MarketingCampaigns...');
  await query("ALTER TABLE MarketingCampaigns ADD COLUMN CampaignCode VARCHAR(50) NULL");
  await query("ALTER TABLE MarketingCampaigns ADD COLUMN Goal VARCHAR(255) NULL");
  await query("ALTER TABLE MarketingCampaigns ADD COLUMN Subtitle VARCHAR(255) NULL");
  await query("ALTER TABLE MarketingCampaigns ADD COLUMN TargetAudience VARCHAR(255) NULL");
  await query("ALTER TABLE MarketingCampaigns ADD COLUMN TargetCount INT NULL DEFAULT 0");
  await query("ALTER TABLE MarketingCampaigns ADD COLUMN Channels VARCHAR(255) NULL DEFAULT 'Email, SMS'");
  await query("ALTER TABLE MarketingCampaigns ADD COLUMN ScheduleDate VARCHAR(100) NULL");
  await query("ALTER TABLE MarketingCampaigns ADD COLUMN BannerUrl VARCHAR(500) NULL");
  await query("ALTER TABLE MarketingCampaigns ADD COLUMN ThrottlingSpeed INT NULL DEFAULT 200");
  await query("ALTER TABLE MarketingCampaigns ADD COLUMN AntiSpamDnd TINYINT(1) NULL DEFAULT 1");
  await query("ALTER TABLE MarketingCampaigns ADD COLUMN OpenRate DECIMAL(5,2) NULL DEFAULT 0");
  await query("ALTER TABLE MarketingCampaigns ADD COLUMN ClickRate DECIMAL(5,2) NULL DEFAULT 0");
  await query("ALTER TABLE MarketingCampaigns ADD COLUMN TotalDelivered INT NULL DEFAULT 0");
  await query("ALTER TABLE MarketingCampaigns ADD COLUMN Status VARCHAR(50) NULL DEFAULT 'ACTIVE'");
  await query("ALTER TABLE MarketingCampaigns ADD COLUMN UpdatedAt DATETIME NULL");

  await query("UPDATE MarketingCampaigns SET CampaignCode = CONCAT('CAMP-2025-', LPAD(CampaignId, 4, '0')) WHERE CampaignCode IS NULL OR CampaignCode = ''");
  await query("UPDATE MarketingCampaigns SET Goal = CampaignName WHERE Goal IS NULL");
  await query("UPDATE MarketingCampaigns SET Channels = COALESCE(Channel, 'Email') WHERE Channels IS NULL");
  await query("UPDATE MarketingCampaigns SET UpdatedAt = NOW() WHERE UpdatedAt IS NULL");

  console.log('✅ Hoàn tất chuẩn hóa dữ liệu!');
}

module.exports = fixLegacyColumnsAndSync;

if (require.main === module) {
  fixLegacyColumnsAndSync()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Lỗi:', err);
      process.exit(1);
    });
}

