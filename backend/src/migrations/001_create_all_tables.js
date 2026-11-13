'use strict';

/**
 * Migration tạo toàn bộ 57 bảng hệ thống Quản lý Khách sạn
 * Chuẩn hóa theo đặc tả yêu cầu đồ án (Từ Bảng 6 đến Bảng 62)
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // Tắt kiểm tra khóa ngoại để tạo bảng an toàn
    await queryInterface.sequelize.query('SET FOREIGN_KEY_CHECKS = 0;');

    // 1. Roles
    await queryInterface.createTable('Roles', {
      RoleId: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      RoleName: { type: Sequelize.STRING(100), allowNull: false },
      Description: { type: Sequelize.STRING(500), allowNull: true },
      IsDeleted: { type: Sequelize.BOOLEAN, defaultValue: false },
      CreatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      UpdatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });

    // 2. Permissions
    await queryInterface.createTable('Permissions', {
      PermissionId: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      PermissionName: { type: Sequelize.STRING(150), allowNull: false, unique: true },
      Module: { type: Sequelize.STRING(100), allowNull: true },
      Description: { type: Sequelize.STRING(500), allowNull: true },
      CreatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });

    // 3. RolePermissions
    await queryInterface.createTable('RolePermissions', {
      RoleId: { type: Sequelize.INTEGER, primaryKey: true, references: { model: 'Roles', key: 'RoleId' }, onDelete: 'CASCADE' },
      PermissionId: { type: Sequelize.INTEGER, primaryKey: true, references: { model: 'Permissions', key: 'PermissionId' }, onDelete: 'CASCADE' },
      CreatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });

    // 4. MembershipTiers
    await queryInterface.createTable('MembershipTiers', {
      TierId: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      TierName: { type: Sequelize.STRING(100), allowNull: false },
      MinPoints: { type: Sequelize.INTEGER, defaultValue: 0 },
      Benefits: { type: Sequelize.STRING(1000), allowNull: true },
      DiscountRate: { type: Sequelize.DECIMAL(5, 2), defaultValue: 0.00 },
      PointMultiplier: { type: Sequelize.DECIMAL(4, 2), defaultValue: 1.00 },
      IsDeleted: { type: Sequelize.BOOLEAN, defaultValue: false },
      CreatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      UpdatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });

    // 5. Branches
    await queryInterface.createTable('Branches', {
      BranchId: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      BranchName: { type: Sequelize.STRING(200), allowNull: false },
      Address: { type: Sequelize.STRING(500), allowNull: true },
      Phone: { type: Sequelize.STRING(30), allowNull: true },
      Status: { type: Sequelize.STRING(30), defaultValue: 'Active' },
      CreatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      UpdatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });

    // 6. Users (Tích hợp phân quyền RBAC & hồ sơ mở rộng)
    await queryInterface.createTable('Users', {
      UserId: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      RoleId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'Roles', key: 'RoleId' } },
      TierId: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'MembershipTiers', key: 'TierId' } },
      FullName: { type: Sequelize.STRING(150), allowNull: false },
      Email: { type: Sequelize.STRING(150), allowNull: false, unique: true },
      Phone: { type: Sequelize.STRING(30), allowNull: true },
      PasswordHash: { type: Sequelize.STRING(500), allowNull: false },
      IdNumber: { type: Sequelize.STRING(50), allowNull: true },
      IdType: { type: Sequelize.STRING(30), allowNull: true },
      DateOfBirth: { type: Sequelize.DATEONLY, allowNull: true },
      Gender: { type: Sequelize.STRING(20), allowNull: true },
      Status: { type: Sequelize.STRING(30), defaultValue: 'Active' },
      Department: { type: Sequelize.STRING(100), allowNull: true },
      Permissions: { type: Sequelize.TEXT, allowNull: true },
      SecurityPolicy: { type: Sequelize.TEXT, allowNull: true },
      FailedLoginAttempts: { type: Sequelize.INTEGER, defaultValue: 0 },
      LockoutUntil: { type: Sequelize.DATE, allowNull: true },
      PasswordChangedAt: { type: Sequelize.DATE, allowNull: true },
      MustChangePassword: { type: Sequelize.BOOLEAN, defaultValue: false },
      IsDeleted: { type: Sequelize.BOOLEAN, defaultValue: false, allowNull: false },
      CreatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      UpdatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });

    // 7. PasswordResetTokens
    await queryInterface.createTable('PasswordResetTokens', {
      PasswordResetTokenId: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      UserId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'Users', key: 'UserId' }, onDelete: 'CASCADE' },
      OtpCode: { type: Sequelize.CHAR(6), allowNull: false },
      ExpiresAt: { type: Sequelize.DATE, allowNull: false },
      AttemptCount: { type: Sequelize.INTEGER, defaultValue: 0 },
      UsedAt: { type: Sequelize.DATE, allowNull: true },
      CreatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });

    // 8. RoomTypes (Tích hợp thông số buồng phòng mở rộng & TypeCode)
    await queryInterface.createTable('RoomTypes', {
      RoomTypeId: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      TypeCode: { type: Sequelize.STRING(20), allowNull: true },
      TypeName: { type: Sequelize.STRING(100), allowNull: false },
      Description: { type: Sequelize.STRING(1000), allowNull: true },
      BasePrice: { type: Sequelize.DECIMAL(18, 2), allowNull: false },
      MaxOccupancy: { type: Sequelize.INTEGER, defaultValue: 2 },
      AdultCapacity: { type: Sequelize.INTEGER, defaultValue: 2 },
      ChildCapacity: { type: Sequelize.INTEGER, defaultValue: 1 },
      ImageUrl: { type: Sequelize.STRING(1000), allowNull: true },
      AreaSqm: { type: Sequelize.DECIMAL(8, 2), allowNull: true },
      TotalRooms: { type: Sequelize.INTEGER, defaultValue: 0 },
      BedType: { type: Sequelize.STRING(100), allowNull: true },
      ViewType: { type: Sequelize.STRING(100), allowNull: true },
      FloorRange: { type: Sequelize.STRING(50), allowNull: true },
      TurnoverMinutes: { type: Sequelize.INTEGER, defaultValue: 30 },
      WeekendMultiplier: { type: Sequelize.DECIMAL(4, 2), defaultValue: 1.00 },
      Amenities: { type: Sequelize.TEXT, allowNull: true },
      Status: { type: Sequelize.STRING(30), defaultValue: 'Active' },
      IsDeleted: { type: Sequelize.BOOLEAN, defaultValue: false },
      CreatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      UpdatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });
    try {
      await queryInterface.addIndex('RoomTypes', ['TypeCode'], { unique: true, name: 'idx_roomtypes_typecode' });
    } catch (_) {}

    // 9. Amenities
    await queryInterface.createTable('Amenities', {
      AmenityId: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      AmenityName: { type: Sequelize.STRING(150), allowNull: false },
      Description: { type: Sequelize.STRING(500), allowNull: true },
      IconUrl: { type: Sequelize.STRING(1000), allowNull: true },
      CreatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      UpdatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });

    // 10. RoomTypeAmenities
    await queryInterface.createTable('RoomTypeAmenities', {
      RoomTypeId: { type: Sequelize.INTEGER, primaryKey: true, references: { model: 'RoomTypes', key: 'RoomTypeId' }, onDelete: 'CASCADE' },
      AmenityId: { type: Sequelize.INTEGER, primaryKey: true, references: { model: 'Amenities', key: 'AmenityId' }, onDelete: 'CASCADE' }
    });

    // 11. Rooms
    await queryInterface.createTable('Rooms', {
      RoomId: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      BranchId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'Branches', key: 'BranchId' } },
      RoomTypeId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'RoomTypes', key: 'RoomTypeId' } },
      RoomNumber: { type: Sequelize.STRING(20), allowNull: false },
      Floor: { type: Sequelize.INTEGER, allowNull: false },
      Status: { type: Sequelize.STRING(40), defaultValue: 'CleanAvailable' },
      Description: { type: Sequelize.STRING(500), allowNull: true },
      IsDeleted: { type: Sequelize.BOOLEAN, defaultValue: false },
      CreatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      UpdatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });

    // 12. PricingRules
    await queryInterface.createTable('PricingRules', {
      PricingRuleId: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      RoomTypeId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'RoomTypes', key: 'RoomTypeId' } },
      RuleName: { type: Sequelize.STRING(150), allowNull: false },
      StartDate: { type: Sequelize.DATEONLY, allowNull: false },
      EndDate: { type: Sequelize.DATEONLY, allowNull: false },
      MinPrice: { type: Sequelize.DECIMAL(18, 2), allowNull: true },
      MaxPrice: { type: Sequelize.DECIMAL(18, 2), allowNull: true },
      PriceMultiplier: { type: Sequelize.DECIMAL(8, 4), defaultValue: 1.0000 },
      Conditions: { type: Sequelize.STRING(1000), allowNull: true },
      Priority: { type: Sequelize.INTEGER, defaultValue: 0 },
      Status: { type: Sequelize.STRING(30), defaultValue: 'Active' },
      CreatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });

    // 13. Vouchers
    await queryInterface.createTable('Vouchers', {
      VoucherId: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      Code: { type: Sequelize.STRING(50), allowNull: false, unique: true },
      DiscountType: { type: Sequelize.STRING(20), defaultValue: 'Percent' },
      DiscountValue: { type: Sequelize.DECIMAL(18, 2), allowNull: false },
      MinOrderAmount: { type: Sequelize.DECIMAL(18, 2), defaultValue: 0.00 },
      MaxDiscountAmount: { type: Sequelize.DECIMAL(18, 2), allowNull: true },
      StartDate: { type: Sequelize.DATE, allowNull: true },
      EndDate: { type: Sequelize.DATE, allowNull: true },
      UsageLimit: { type: Sequelize.INTEGER, defaultValue: 100 },
      UsedCount: { type: Sequelize.INTEGER, defaultValue: 0 },
      IsDeleted: { type: Sequelize.BOOLEAN, defaultValue: false },
      Status: { type: Sequelize.STRING(30), defaultValue: 'Active' },
      CreatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });

    // 14. OTAChannels
    await queryInterface.createTable('OTAChannels', {
      OTAChannelId: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      ChannelName: { type: Sequelize.STRING(100), allowNull: false },
      ApiType: { type: Sequelize.STRING(50), allowNull: true },
      ApiKey: { type: Sequelize.STRING(500), allowNull: true },
      Status: { type: Sequelize.STRING(30), defaultValue: 'Active' },
      CreatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });

    // 15. OTARoomMappings
    await queryInterface.createTable('OTARoomMappings', {
      MappingId: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      OTAChannelId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'OTAChannels', key: 'OTAChannelId' } },
      RoomTypeId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'RoomTypes', key: 'RoomTypeId' } },
      OTARoomTypeCode: { type: Sequelize.STRING(100), allowNull: false },
      Status: { type: Sequelize.STRING(30), defaultValue: 'Active' },
      LastSyncedAt: { type: Sequelize.DATE, allowNull: true }
    });

    // 16. Bookings (Tích hợp phân bổ phòng, xác thực danh tính & check-in audit)
    await queryInterface.createTable('Bookings', {
      BookingId: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      UserId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'Users', key: 'UserId' } },
      RoomTypeId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'RoomTypes', key: 'RoomTypeId' } },
      VoucherId: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'Vouchers', key: 'VoucherId' } },
      OTAChannelId: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'OTAChannels', key: 'OTAChannelId' } },
      CheckInDate: { type: Sequelize.DATEONLY, allowNull: false },
      CheckOutDate: { type: Sequelize.DATEONLY, allowNull: false },
      NumberOfNights: { type: Sequelize.INTEGER, defaultValue: 1 },
      Adults: { type: Sequelize.INTEGER, defaultValue: 1 },
      Children: { type: Sequelize.INTEGER, defaultValue: 0 },
      RoomQuantity: { type: Sequelize.INTEGER, defaultValue: 1 },
      RoomSubtotal: { type: Sequelize.DECIMAL(18, 2), defaultValue: 0.00 },
      SurchargeAmount: { type: Sequelize.DECIMAL(18, 2), defaultValue: 0.00 },
      DiscountAmount: { type: Sequelize.DECIMAL(18, 2), defaultValue: 0.00 },
      TotalAmount: { type: Sequelize.DECIMAL(18, 2), defaultValue: 0.00 },
      DepositAmount: { type: Sequelize.DECIMAL(18, 2), defaultValue: 0.00 },
      Status: { type: Sequelize.STRING(30), defaultValue: 'Pending' },
      BookingSource: { type: Sequelize.STRING(50), defaultValue: 'DirectWeb' },
      BookingQrCode: { type: Sequelize.STRING(500), allowNull: true },
      ConfirmationCode: { type: Sequelize.STRING(100), allowNull: true },
      ConfirmationSentAt: { type: Sequelize.DATE, allowNull: true },
      Note: { type: Sequelize.TEXT, allowNull: true },
      ConfirmedBy: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'Users', key: 'UserId' } },
      ConfirmedAt: { type: Sequelize.DATE, allowNull: true },
      AllocatedAt: { type: Sequelize.DATE, allowNull: true },
      AllocatedBy: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'Users', key: 'UserId' } },
      AllocationStatus: { type: Sequelize.STRING(30), defaultValue: 'UNALLOCATED' },
      SpecialRequests: { type: Sequelize.TEXT, allowNull: true },
      AutoAllocationHoldUntil: { type: Sequelize.DATE, allowNull: true },
      AllocationAuditTrail: { type: Sequelize.TEXT, allowNull: true },
      CheckedInBy: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'Users', key: 'UserId' } },
      CheckedInAt: { type: Sequelize.DATE, allowNull: true },
      ExpectedCheckIn: { type: Sequelize.DATE, allowNull: true },
      CheckInNotes: { type: Sequelize.TEXT, allowNull: true },
      DepositPaymentMethod: { type: Sequelize.STRING(50), allowNull: true },
      DepositAmountPaid: { type: Sequelize.DECIMAL(18, 2), defaultValue: 0.00 },
      TotalPrepaidAmount: { type: Sequelize.DECIMAL(18, 2), defaultValue: 0.00 },
      IdentityVerified: { type: Sequelize.BOOLEAN, defaultValue: false },
      CreatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      UpdatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });

    // 17. BookingGuests
    await queryInterface.createTable('BookingGuests', {
      BookingGuestId: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      BookingId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'Bookings', key: 'BookingId' }, onDelete: 'CASCADE' },
      FullName: { type: Sequelize.STRING(150), allowNull: false },
      Email: { type: Sequelize.STRING(150), allowNull: true },
      Phone: { type: Sequelize.STRING(30), allowNull: true },
      IdNumber: { type: Sequelize.STRING(50), allowNull: true },
      IdType: { type: Sequelize.STRING(30), allowNull: true },
      DateOfBirth: { type: Sequelize.DATEONLY, allowNull: true },
      Gender: { type: Sequelize.STRING(20), allowNull: true },
      IsPrimaryGuest: { type: Sequelize.BOOLEAN, defaultValue: false },
      CreatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });

    // 18. Stays (Tích hợp CheckIn/OutTime & Version lock)
    await queryInterface.createTable('Stays', {
      StayId: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      BookingId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'Bookings', key: 'BookingId' } },
      RoomId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'Rooms', key: 'RoomId' } },
      ActualCheckIn: { type: Sequelize.DATE, allowNull: true },
      ExpectedCheckOut: { type: Sequelize.DATE, allowNull: true },
      ActualCheckOut: { type: Sequelize.DATE, allowNull: true },
      CheckInTime: { type: Sequelize.DATE, allowNull: true },
      CheckOutTime: { type: Sequelize.DATE, allowNull: true },
      Version: { type: Sequelize.INTEGER, defaultValue: 1, allowNull: false },
      Status: { type: Sequelize.STRING(30), defaultValue: 'CheckedIn' },
      DepositAmount: { type: Sequelize.DECIMAL(18, 2), defaultValue: 0.00 },
      CreatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      UpdatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });

    // 19. RoomMoveHistory (Tích hợp đổi phòng đa tiêu chí & audit log)
    await queryInterface.createTable('RoomMoveHistory', {
      MoveId: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      StayId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'Stays', key: 'StayId' } },
      FromRoomId: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'Rooms', key: 'RoomId' } },
      ToRoomId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'Rooms', key: 'RoomId' } },
      MoveDate: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      Reason: { type: Sequelize.STRING(500), allowNull: true },
      MovedBy: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'Users', key: 'UserId' } },
      MoveType: { type: Sequelize.STRING(30), defaultValue: 'OPERATIONAL' },
      MoveReasonCode: { type: Sequelize.STRING(50), defaultValue: 'GUEST_UPGRADE' },
      GuestDiscontent: { type: Sequelize.BOOLEAN, defaultValue: false },
      DiscontentNotes: { type: Sequelize.TEXT, allowNull: true },
      PriceDifferenceFee: { type: Sequelize.DECIMAL(18, 2), defaultValue: 0.00 },
      FeeWaived: { type: Sequelize.BOOLEAN, defaultValue: false },
      FeeWaivedReason: { type: Sequelize.TEXT, allowNull: true },
      OldKeycardsRevoked: { type: Sequelize.BOOLEAN, defaultValue: true },
      NewKeycardsIssued: { type: Sequelize.INTEGER, defaultValue: 2 },
      OldKeycardsPhysicalCount: { type: Sequelize.INTEGER, defaultValue: 2 },
      KeycardStatusNote: { type: Sequelize.TEXT, allowNull: true },
      LuggageAssistanceRequired: { type: Sequelize.BOOLEAN, defaultValue: false },
      BellmanAssigned: { type: Sequelize.STRING(100), allowNull: true },
      MoveExecutionStatus: { type: Sequelize.STRING(30), defaultValue: 'COMPLETED' },
      AuditTrail: { type: Sequelize.TEXT, allowNull: true }
    });

    // 20. HousekeepingAssignments
    await queryInterface.createTable('HousekeepingAssignments', {
      AssignmentId: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      RoomId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'Rooms', key: 'RoomId' } },
      UserId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'Users', key: 'UserId' } },
      StayId: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'Stays', key: 'StayId' } },
      AssignmentDate: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      Priority: { type: Sequelize.INTEGER, defaultValue: 1 },
      Status: { type: Sequelize.STRING(30), defaultValue: 'Assigned' },
      StartedAt: { type: Sequelize.DATE, allowNull: true },
      CompletedAt: { type: Sequelize.DATE, allowNull: true },
      Note: { type: Sequelize.STRING(500), allowNull: true }
    });

    // 21. ServiceCategories
    await queryInterface.createTable('ServiceCategories', {
      CategoryId: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      CategoryName: { type: Sequelize.STRING(100), allowNull: false },
      Description: { type: Sequelize.STRING(500), allowNull: true },
      IsDeleted: { type: Sequelize.BOOLEAN, defaultValue: false },
      CreatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });

    // 22. Services
    await queryInterface.createTable('Services', {
      ServiceId: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      CategoryId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'ServiceCategories', key: 'CategoryId' } },
      ServiceName: { type: Sequelize.STRING(150), allowNull: false },
      Price: { type: Sequelize.DECIMAL(18, 2), allowNull: false },
      Unit: { type: Sequelize.STRING(50), allowNull: true },
      Description: { type: Sequelize.STRING(1000), allowNull: true },
      Status: { type: Sequelize.STRING(30), defaultValue: 'Active' },
      ServiceCode: { type: Sequelize.STRING(50), allowNull: true },
      IsDeleted: { type: Sequelize.BOOLEAN, defaultValue: false },
      CreatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      UpdatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });

    // 23. ServiceOrders
    await queryInterface.createTable('ServiceOrders', {
      OrderId: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      StayId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'Stays', key: 'StayId' } },
      ServiceId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'Services', key: 'ServiceId' } },
      CreatedBy: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'Users', key: 'UserId' } },
      Quantity: { type: Sequelize.DECIMAL(18, 2), defaultValue: 1.00 },
      UnitPrice: { type: Sequelize.DECIMAL(18, 2), allowNull: false },
      TotalPrice: { type: Sequelize.DECIMAL(18, 2), allowNull: false },
      OrderDate: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      Status: { type: Sequelize.STRING(30), defaultValue: 'Received' },
      Note: { type: Sequelize.STRING(500), allowNull: true }
    });

    // 24. Invoices
    await queryInterface.createTable('Invoices', {
      InvoiceId: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      StayId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'Stays', key: 'StayId' } },
      BookingId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'Bookings', key: 'BookingId' } },
      InvoiceNumber: { type: Sequelize.STRING(50), allowNull: false, unique: true },
      InvoiceDate: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      Subtotal: { type: Sequelize.DECIMAL(18, 2), defaultValue: 0.00 },
      VATRate: { type: Sequelize.DECIMAL(5, 2), defaultValue: 10.00 },
      VATAmount: { type: Sequelize.DECIMAL(18, 2), defaultValue: 0.00 },
      TotalAmount: { type: Sequelize.DECIMAL(18, 2), defaultValue: 0.00 },
      Status: { type: Sequelize.STRING(30), defaultValue: 'Unpaid' },
      PdfPath: { type: Sequelize.STRING(1000), allowNull: true },
      AssignedTo: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'Users', key: 'UserId' } },
      CreatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      UpdatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });

    // 25. InvoiceDetails
    await queryInterface.createTable('InvoiceDetails', {
      DetailId: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      InvoiceId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'Invoices', key: 'InvoiceId' }, onDelete: 'CASCADE' },
      ItemType: { type: Sequelize.STRING(30), allowNull: false },
      ItemId: { type: Sequelize.INTEGER, allowNull: true },
      Description: { type: Sequelize.STRING(500), allowNull: true },
      Quantity: { type: Sequelize.DECIMAL(18, 2), defaultValue: 1.00 },
      UnitPrice: { type: Sequelize.DECIMAL(18, 2), defaultValue: 0.00 },
      TotalPrice: { type: Sequelize.DECIMAL(18, 2), defaultValue: 0.00 }
    });

    // 26. Payments
    await queryInterface.createTable('Payments', {
      PaymentId: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      InvoiceId: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'Invoices', key: 'InvoiceId' } },
      BookingId: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'Bookings', key: 'BookingId' } },
      UserId: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'Users', key: 'UserId' } },
      Amount: { type: Sequelize.DECIMAL(18, 2), allowNull: false },
      PaymentMethod: { type: Sequelize.STRING(30), defaultValue: 'Cash' },
      PaymentDate: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      TransactionCode: { type: Sequelize.STRING(150), allowNull: true },
      Status: { type: Sequelize.STRING(30), defaultValue: 'Pending' },
      RefundReason: { type: Sequelize.STRING(500), allowNull: true },
      RefundAmount: { type: Sequelize.DECIMAL(18, 2), defaultValue: 0.00 },
      GatewayResponse: { type: Sequelize.TEXT('long'), allowNull: true }
    });

    // 27. MenuCategories
    await queryInterface.createTable('MenuCategories', {
      CategoryId: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      CategoryName: { type: Sequelize.STRING(100), allowNull: false },
      IsDeleted: { type: Sequelize.BOOLEAN, defaultValue: false },
      Description: { type: Sequelize.STRING(500), allowNull: true },
      CreatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });

    // 28. MenuItems
    await queryInterface.createTable('MenuItems', {
      MenuItemId: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      CategoryId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'MenuCategories', key: 'CategoryId' } },
      ItemName: { type: Sequelize.STRING(150), allowNull: false },
      Price: { type: Sequelize.DECIMAL(18, 2), allowNull: false },
      Description: { type: Sequelize.STRING(1000), allowNull: true },
      ImageUrl: { type: Sequelize.STRING(1000), allowNull: true },
      Status: { type: Sequelize.STRING(30), defaultValue: 'Available' },
      IsDeleted: { type: Sequelize.BOOLEAN, defaultValue: false },
      CreatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      UpdatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });

    // 29. RestaurantTables
    await queryInterface.createTable('RestaurantTables', {
      TableId: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      BranchName: { type: Sequelize.STRING(200), allowNull: true },
      TableNumber: { type: Sequelize.STRING(20), allowNull: false },
      Location: { type: Sequelize.STRING(150), allowNull: true },
      Capacity: { type: Sequelize.INTEGER, defaultValue: 4 },
      IsDeleted: { type: Sequelize.BOOLEAN, defaultValue: false },
      Status: { type: Sequelize.STRING(30), defaultValue: 'Available' },
      CreatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      UpdatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });

    // 30. FoodOrders
    await queryInterface.createTable('FoodOrders', {
      FoodOrderId: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      StayId: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'Stays', key: 'StayId' } },
      TableId: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'RestaurantTables', key: 'TableId' } },
      UserId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'Users', key: 'UserId' } },
      OrderTime: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      OrderType: { type: Sequelize.STRING(30), defaultValue: 'RoomService' },
      Status: { type: Sequelize.STRING(30), defaultValue: 'Pending' },
      TotalAmount: { type: Sequelize.DECIMAL(18, 2), defaultValue: 0.00 },
      PaymentMode: { type: Sequelize.STRING(30), defaultValue: 'RoomInvoice' },
      Note: { type: Sequelize.STRING(500), allowNull: true }
    });

    // 31. FoodOrderDetails
    await queryInterface.createTable('FoodOrderDetails', {
      FoodOrderDetailId: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      FoodOrderId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'FoodOrders', key: 'FoodOrderId' }, onDelete: 'CASCADE' },
      MenuItemId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'MenuItems', key: 'MenuItemId' } },
      Quantity: { type: Sequelize.INTEGER, defaultValue: 1 },
      UnitPrice: { type: Sequelize.DECIMAL(18, 2), allowNull: false },
      TotalPrice: { type: Sequelize.DECIMAL(18, 2), allowNull: false },
      Note: { type: Sequelize.STRING(500), allowNull: true }
    });

    // 32. TableReservations
    await queryInterface.createTable('TableReservations', {
      TableReservationId: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      TableId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'RestaurantTables', key: 'TableId' } },
      UserId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'Users', key: 'UserId' } },
      ReservationTime: { type: Sequelize.DATE, allowNull: false },
      GuestCount: { type: Sequelize.INTEGER, defaultValue: 2 },
      Status: { type: Sequelize.STRING(30), defaultValue: 'Pending' },
      Note: { type: Sequelize.STRING(500), allowNull: true },
      CreatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });

    // 33. InventoryItems (Tích hợp quản lý Minibar & đồ tiêu hao phòng)
    await queryInterface.createTable('InventoryItems', {
      ItemId: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      ItemCode: { type: Sequelize.STRING(50), allowNull: false, unique: true },
      ItemName: { type: Sequelize.STRING(150), allowNull: false },
      ItemType: { type: Sequelize.STRING(30), defaultValue: 'Consumable' },
      Category: { type: Sequelize.STRING(50), defaultValue: 'Beverage' },
      Unit: { type: Sequelize.STRING(30), defaultValue: 'Cái' },
      Quantity: { type: Sequelize.DECIMAL(18, 2), defaultValue: 0.00 },
      MinQuantity: { type: Sequelize.DECIMAL(18, 2), defaultValue: 10.00 },
      DefaultOpeningQty: { type: Sequelize.DECIMAL(10, 2), defaultValue: 2.00 },
      IsComplimentary: { type: Sequelize.BOOLEAN, defaultValue: false },
      UnitCost: { type: Sequelize.DECIMAL(18, 2), defaultValue: 0.00 },
      UnitPrice: { type: Sequelize.DECIMAL(18, 2), defaultValue: 0.00 },
      Status: { type: Sequelize.STRING(30), defaultValue: 'Active' },
      IsDeleted: { type: Sequelize.BOOLEAN, defaultValue: false },
      CreatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      UpdatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });

    // 34. InventoryTransactions
    await queryInterface.createTable('InventoryTransactions', {
      TransactionId: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      ItemId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'InventoryItems', key: 'ItemId' } },
      RoomId: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'Rooms', key: 'RoomId' } },
      UserId: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'Users', key: 'UserId' } },
      TransactionType: { type: Sequelize.STRING(30), defaultValue: 'Import' },
      Quantity: { type: Sequelize.DECIMAL(18, 2), allowNull: false },
      ReferenceId: { type: Sequelize.INTEGER, allowNull: true },
      TransactionDate: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      Note: { type: Sequelize.STRING(500), allowNull: true }
    });

    // 35. MinibarUsages (Tích hợp RoomId, Version, Status & Idempotency)
    await queryInterface.createTable('MinibarUsages', {
      UsageId: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      StayId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'Stays', key: 'StayId' } },
      RoomId: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'Rooms', key: 'RoomId' } },
      ItemId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'InventoryItems', key: 'ItemId' } },
      RecordedBy: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'Users', key: 'UserId' } },
      Quantity: { type: Sequelize.DECIMAL(18, 2), defaultValue: 1.00 },
      UsageDate: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      UnitPrice: { type: Sequelize.DECIMAL(18, 2), defaultValue: 0.00 },
      TotalAmount: { type: Sequelize.DECIMAL(18, 2), defaultValue: 0.00 },
      Status: { type: Sequelize.STRING(30), defaultValue: 'CONFIRMED' },
      Version: { type: Sequelize.INTEGER, defaultValue: 1 },
      Notes: { type: Sequelize.STRING(500), allowNull: true },
      IdempotencyKey: { type: Sequelize.STRING(100), allowNull: true }
    });

    // 36. Reviews
    await queryInterface.createTable('Reviews', {
      ReviewId: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      UserId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'Users', key: 'UserId' } },
      StayId: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'Stays', key: 'StayId' } },
      FoodOrderId: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'FoodOrders', key: 'FoodOrderId' } },
      Rating: { type: Sequelize.DECIMAL(2, 1), defaultValue: 5.0 },
      OverallRating: { type: Sequelize.DECIMAL(2, 1), defaultValue: 5.0 },
      CleanlinessScore: { type: Sequelize.TINYINT, defaultValue: 5 },
      StaffServiceScore: { type: Sequelize.TINYINT, defaultValue: 5 },
      RoomComfortScore: { type: Sequelize.TINYINT, defaultValue: 5 },
      DiningScore: { type: Sequelize.TINYINT, defaultValue: 5 },
      ValueForMoneyScore: { type: Sequelize.TINYINT, defaultValue: 5 },
      WouldRecommend: { type: Sequelize.STRING(10), defaultValue: 'YES' },
      TripClassification: { type: Sequelize.STRING(20), defaultValue: 'LEISURE' },
      ReviewTitle: { type: Sequelize.STRING(80), allowNull: true },
      ReviewBody: { type: Sequelize.STRING(1000), allowNull: true },
      IsAnonymous: { type: Sequelize.BOOLEAN, defaultValue: false },
      Comment: { type: Sequelize.STRING(2000), allowNull: true },
      CreatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });

    // 37. ReviewPhotos
    await queryInterface.createTable('ReviewPhotos', {
      PhotoId: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      ReviewId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'Reviews', key: 'ReviewId' }, onDelete: 'CASCADE' },
      PhotoUrl: { type: Sequelize.STRING(1000), allowNull: false },
      UploadedAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });

    // 38. ChatbotKnowledgeBase
    await queryInterface.createTable('ChatbotKnowledgeBase', {
      KnowledgeId: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      Question: { type: Sequelize.STRING(1000), allowNull: false },
      Answer: { type: Sequelize.TEXT('long'), allowNull: false },
      Category: { type: Sequelize.STRING(100), allowNull: true },
      Keywords: { type: Sequelize.STRING(1000), allowNull: true },
      Status: { type: Sequelize.STRING(30), defaultValue: 'Active' },
      CreatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      UpdatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });

    // 39. ChatbotConversations (Tích hợp HandledBy hỗ trợ nhân viên tiếp quản)
    await queryInterface.createTable('ChatbotConversations', {
      ConversationId: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      UserId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'Users', key: 'UserId' } },
      HandledBy: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'Users', key: 'UserId' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      StartTime: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      EndTime: { type: Sequelize.DATE, allowNull: true },
      Status: { type: Sequelize.STRING(30), defaultValue: 'Open' }
    });
    try {
      await queryInterface.addIndex('ChatbotConversations', ['HandledBy'], { name: 'idx_chatbot_conversations_handledby' });
    } catch (_) {}

    // 40. ChatbotMessages
    await queryInterface.createTable('ChatbotMessages', {
      MessageId: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      ConversationId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'ChatbotConversations', key: 'ConversationId' }, onDelete: 'CASCADE' },
      KnowledgeId: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'ChatbotKnowledgeBase', key: 'KnowledgeId' } },
      SenderType: { type: Sequelize.STRING(20), defaultValue: 'Guest' },
      MessageText: { type: Sequelize.TEXT('long'), allowNull: false },
      MessageTime: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });

    // 41. LoyaltyPointTransactions
    await queryInterface.createTable('LoyaltyPointTransactions', {
      TransactionId: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      UserId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'Users', key: 'UserId' } },
      TierId: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'MembershipTiers', key: 'TierId' } },
      StayId: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'Stays', key: 'StayId' } },
      Points: { type: Sequelize.INTEGER, allowNull: false },
      TransactionType: { type: Sequelize.STRING(30), defaultValue: 'Earn' },
      Description: { type: Sequelize.STRING(500), allowNull: true },
      CreatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });

    // 42. MarketingCampaigns
    await queryInterface.createTable('MarketingCampaigns', {
      CampaignId: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      CreatedBy: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'Users', key: 'UserId' } },
      TargetUserId: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'Users', key: 'UserId' } },
      CampaignName: { type: Sequelize.STRING(200), allowNull: false },
      Channel: { type: Sequelize.STRING(30), defaultValue: 'Email' },
      Recipient: { type: Sequelize.STRING(200), allowNull: true },
      Content: { type: Sequelize.TEXT('long'), allowNull: true },
      StartDate: { type: Sequelize.DATE, allowNull: true },
      EndDate: { type: Sequelize.DATE, allowNull: true },
      TargetType: { type: Sequelize.STRING(30), defaultValue: 'Guest' },
      DeliveryStatus: { type: Sequelize.STRING(30), defaultValue: 'Draft' },
      SentAt: { type: Sequelize.DATE, allowNull: true },
      CreatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });

    // 43. CampaignRecipients
    await queryInterface.createTable('CampaignRecipients', {
      RecipientId: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      CampaignId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'MarketingCampaigns', key: 'CampaignId' }, onDelete: 'CASCADE' },
      UserId: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'Users', key: 'UserId' } },
      ContactValue: { type: Sequelize.STRING(320), allowNull: true },
      SendStatus: { type: Sequelize.STRING(30), defaultValue: 'Pending' },
      SentAt: { type: Sequelize.DATE, allowNull: true },
      ErrorMessage: { type: Sequelize.STRING(1000), allowNull: true }
    });

    // 44. MaintenanceTickets
    await queryInterface.createTable('MaintenanceTickets', {
      TicketId: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      RoomId: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'Rooms', key: 'RoomId' } },
      AreaName: { type: Sequelize.STRING(200), allowNull: true },
      ReportedBy: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'Users', key: 'UserId' } },
      AssignedTo: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'Users', key: 'UserId' } },
      Title: { type: Sequelize.STRING(200), allowNull: false },
      Description: { type: Sequelize.STRING(2000), allowNull: true },
      Priority: { type: Sequelize.STRING(20), defaultValue: 'Medium' },
      Status: { type: Sequelize.STRING(30), defaultValue: 'Open' },
      CreatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      CompletedAt: { type: Sequelize.DATE, allowNull: true }
    });

    // 45. MaintenanceTicketPhotos
    await queryInterface.createTable('MaintenanceTicketPhotos', {
      PhotoId: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      TicketId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'MaintenanceTickets', key: 'TicketId' }, onDelete: 'CASCADE' },
      PhotoUrl: { type: Sequelize.STRING(500), allowNull: false },
      UploadedBy: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'Users', key: 'UserId' } },
      UploadedAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });

    // 46. LostAndFoundItems
    await queryInterface.createTable('LostAndFoundItems', {
      LostFoundId: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      RoomId: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'Rooms', key: 'RoomId' } },
      FoundBy: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'Users', key: 'UserId' } },
      ClaimedBy: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'Users', key: 'UserId' } },
      ItemName: { type: Sequelize.STRING(200), allowNull: false },
      Description: { type: Sequelize.STRING(2000), allowNull: true },
      FoundDate: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      Location: { type: Sequelize.STRING(200), allowNull: true },
      Status: { type: Sequelize.STRING(30), defaultValue: 'Found' },
      ClaimedDate: { type: Sequelize.DATE, allowNull: true }
    });

    // 47. SmartLockLogs
    await queryInterface.createTable('SmartLockLogs', {
      LogId: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      RoomId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'Rooms', key: 'RoomId' } },
      StayId: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'Stays', key: 'StayId' } },
      UserId: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'Users', key: 'UserId' } },
      DigitalKey: { type: Sequelize.STRING(200), allowNull: true },
      ActionType: { type: Sequelize.STRING(30), defaultValue: 'Unlock' },
      ActionTime: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      Status: { type: Sequelize.STRING(30), defaultValue: 'Success' },
      DeviceId: { type: Sequelize.STRING(100), allowNull: true }
    });

    // 48. CashShifts
    await queryInterface.createTable('CashShifts', {
      ShiftId: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      UserId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'Users', key: 'UserId' } },
      ShiftDate: { type: Sequelize.DATEONLY, allowNull: false },
      ShiftType: { type: Sequelize.STRING(30), defaultValue: 'Morning' },
      OpeningAmount: { type: Sequelize.DECIMAL(18, 2), defaultValue: 0.00 },
      ClosingAmount: { type: Sequelize.DECIMAL(18, 2), defaultValue: 0.00 },
      HandoverAmount: { type: Sequelize.DECIMAL(18, 2), defaultValue: 0.00 },
      Status: { type: Sequelize.STRING(30), defaultValue: 'Open' },
      Note: { type: Sequelize.STRING(1000), allowNull: true },
      CreatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });

    // 49. NightAuditReports
    await queryInterface.createTable('NightAuditReports', {
      ReportId: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      ReportDate: { type: Sequelize.DATEONLY, allowNull: false, unique: true },
      GeneratedBy: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'Users', key: 'UserId' } },
      TotalRevenue: { type: Sequelize.DECIMAL(18, 2), defaultValue: 0.00 },
      TotalBookings: { type: Sequelize.INTEGER, defaultValue: 0 },
      TotalCheckIns: { type: Sequelize.INTEGER, defaultValue: 0 },
      TotalCheckOuts: { type: Sequelize.INTEGER, defaultValue: 0 },
      OccupancyRate: { type: Sequelize.DECIMAL(5, 2), defaultValue: 0.00 },
      RevPAR: { type: Sequelize.DECIMAL(18, 2), defaultValue: 0.00 },
      Status: { type: Sequelize.STRING(30), defaultValue: 'Completed' },
      Note: { type: Sequelize.STRING(2000), allowNull: true },
      CreatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });

    // 50. Vehicles
    await queryInterface.createTable('Vehicles', {
      VehicleId: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      BranchName: { type: Sequelize.STRING(200), allowNull: true },
      PlateNumber: { type: Sequelize.STRING(30), allowNull: false, unique: true },
      VehicleType: { type: Sequelize.STRING(50), defaultValue: 'Sedan' },
      SeatCapacity: { type: Sequelize.INTEGER, defaultValue: 4 },
      DriverName: { type: Sequelize.STRING(150), allowNull: true },
      DriverPhone: { type: Sequelize.STRING(30), allowNull: true },
      Status: { type: Sequelize.STRING(30), defaultValue: 'Available' },
      Description: { type: Sequelize.STRING(500), allowNull: true },
      CreatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });

    // 51. ShuttleSchedules
    await queryInterface.createTable('ShuttleSchedules', {
      ShuttleScheduleId: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      VehicleId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'Vehicles', key: 'VehicleId' } },
      BookingId: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'Bookings', key: 'BookingId' } },
      UserId: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'Users', key: 'UserId' } },
      Route: { type: Sequelize.STRING(300), allowNull: true },
      DepartureTime: { type: Sequelize.DATE, allowNull: false },
      ArrivalTime: { type: Sequelize.DATE, allowNull: true },
      PassengerCount: { type: Sequelize.INTEGER, defaultValue: 1 },
      Status: { type: Sequelize.STRING(30), defaultValue: 'Scheduled' },
      Note: { type: Sequelize.STRING(500), allowNull: true }
    });

    // 52. PoliceDeclarations
    await queryInterface.createTable('PoliceDeclarations', {
      DeclarationId: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      StayId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'Stays', key: 'StayId' } },
      GuestName: { type: Sequelize.STRING(150), allowNull: false },
      IdNumber: { type: Sequelize.STRING(50), allowNull: false },
      IdType: { type: Sequelize.STRING(30), defaultValue: 'CCCD' },
      Nationality: { type: Sequelize.STRING(100), defaultValue: 'Vietnam' },
      DeclarationDate: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      Status: { type: Sequelize.STRING(30), defaultValue: 'Pending' },
      ExportedAt: { type: Sequelize.DATE, allowNull: true }
    });

    // 53. BanquetEvents
    await queryInterface.createTable('BanquetEvents', {
      EventId: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      BookingId: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'Bookings', key: 'BookingId' } },
      CreatedBy: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'Users', key: 'UserId' } },
      EventName: { type: Sequelize.STRING(200), allowNull: false },
      EventType: { type: Sequelize.STRING(50), defaultValue: 'Conference' },
      EventDate: { type: Sequelize.DATEONLY, allowNull: false },
      StartTime: { type: Sequelize.TIME, allowNull: true },
      EndTime: { type: Sequelize.TIME, allowNull: true },
      Venue: { type: Sequelize.STRING(200), allowNull: true },
      GuestCount: { type: Sequelize.INTEGER, defaultValue: 50 },
      Revenue: { type: Sequelize.DECIMAL(18, 2), defaultValue: 0.00 },
      Status: { type: Sequelize.STRING(30), defaultValue: 'Pending' },
      Note: { type: Sequelize.STRING(1000), allowNull: true }
    });

    // 54. StaffSchedules
    await queryInterface.createTable('StaffSchedules', {
      ScheduleId: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      UserId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'Users', key: 'UserId' } },
      BranchName: { type: Sequelize.STRING(200), allowNull: true },
      WorkDate: { type: Sequelize.DATEONLY, allowNull: false },
      Shift: { type: Sequelize.STRING(30), defaultValue: 'Morning' },
      StartTime: { type: Sequelize.TIME, allowNull: true },
      EndTime: { type: Sequelize.TIME, allowNull: true },
      Status: { type: Sequelize.STRING(30), defaultValue: 'Scheduled' },
      CheckInTime: { type: Sequelize.DATE, allowNull: true },
      CheckOutTime: { type: Sequelize.DATE, allowNull: true },
      Note: { type: Sequelize.STRING(500), allowNull: true }
    });

    // 55. AuditLogs
    await queryInterface.createTable('AuditLogs', {
      LogId: { type: Sequelize.BIGINT, primaryKey: true, autoIncrement: true },
      UserId: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'Users', key: 'UserId' } },
      ActionType: { type: Sequelize.STRING(50), allowNull: false },
      TableName: { type: Sequelize.STRING(128), allowNull: false },
      RecordId: { type: Sequelize.INTEGER, allowNull: true },
      OldValues: { type: Sequelize.TEXT('long'), allowNull: true },
      NewValues: { type: Sequelize.TEXT('long'), allowNull: true },
      ActionTime: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      IpAddress: { type: Sequelize.STRING(50), allowNull: true }
    });

    // 56. Wishlists
    await queryInterface.createTable('Wishlists', {
      WishlistId: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      UserId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'Users', key: 'UserId' }, onDelete: 'CASCADE' },
      RoomTypeId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'RoomTypes', key: 'RoomTypeId' }, onDelete: 'CASCADE' },
      CreatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });

    // 57. NewsletterSubscribers
    await queryInterface.createTable('NewsletterSubscribers', {
      SubscriberId: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      Email: { type: Sequelize.STRING(320), allowNull: false, unique: true },
      IsActive: { type: Sequelize.BOOLEAN, defaultValue: true },
      SubscribedAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });

    // 58. RoomSearchIndex (A5 - Full-text Search Index)
    await queryInterface.createTable('RoomSearchIndex', {
      IndexId: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      RoomTypeId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'RoomTypes', key: 'RoomTypeId' }, onDelete: 'CASCADE' },
      BranchId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'Branches', key: 'BranchId' }, onDelete: 'CASCADE' },
      Keyword: { type: Sequelize.STRING(100), allowNull: false },
      KeywordUnaccent: { type: Sequelize.STRING(100), allowNull: false },
      Weight: { type: Sequelize.FLOAT, defaultValue: 1.0 },
      MaxOccupancy: { type: Sequelize.INTEGER, defaultValue: 2 },
      BasePrice: { type: Sequelize.DECIMAL(12, 2), defaultValue: 0.00 },
      CreatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      UpdatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });
    try {
      await queryInterface.addIndex('RoomSearchIndex', ['Keyword'], { name: 'idx_rsi_keyword' });
      await queryInterface.addIndex('RoomSearchIndex', ['KeywordUnaccent'], { name: 'idx_rsi_unaccent' });
      await queryInterface.addIndex('RoomSearchIndex', ['BranchId', 'MaxOccupancy', 'BasePrice'], { name: 'idx_rsi_filter' });
      await queryInterface.addIndex('RoomSearchIndex', ['RoomTypeId', 'Keyword'], { unique: true, name: 'idx_rsi_rt_kw_unique' });
    } catch (_) {}

    // 59. RoomInspectionReports (Spec 11 - Check-out Inspection)
    await queryInterface.createTable('RoomInspectionReports', {
      InspectionId: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      StayId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'Stays', key: 'StayId' } },
      RoomId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'Rooms', key: 'RoomId' } },
      InspectorId: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'Users', key: 'UserId' } },
      InspectorName: { type: Sequelize.STRING(100), defaultValue: 'R. Gomez (Housekeeping Staff #409)' },
      InspectionTime: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      Status: { type: Sequelize.STRING(30), defaultValue: 'COMPLETED' },
      KeycardsIssued: { type: Sequelize.INTEGER, defaultValue: 2 },
      KeycardsReturned: { type: Sequelize.INTEGER, defaultValue: 2 },
      KeycardLossPenalty: { type: Sequelize.DECIMAL(18, 2), defaultValue: 0.00 },
      RoomCondition: { type: Sequelize.STRING(30), defaultValue: 'NOMINAL' },
      LinenDamageFee: { type: Sequelize.DECIMAL(18, 2), defaultValue: 0.00 },
      GuestAcknowledgement: { type: Sequelize.STRING(30), defaultValue: 'ACKNOWLEDGED' },
      GuestNotes: { type: Sequelize.TEXT, allowNull: true },
      SupervisorId: { type: Sequelize.INTEGER, allowNull: true },
      SupervisorNotes: { type: Sequelize.TEXT, allowNull: true },
      SignOffProofUrl: { type: Sequelize.STRING(500), allowNull: true },
      CreatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      UpdatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });
    try {
      await queryInterface.addIndex('RoomInspectionReports', ['StayId'], { name: 'idx_inspection_stay' });
      await queryInterface.addIndex('RoomInspectionReports', ['RoomId'], { name: 'idx_inspection_room' });
    } catch (_) {}

    // 60. DamageItems (Spec 11 - Inspection Damage Claims)
    await queryInterface.createTable('DamageItems', {
      DamageItemId: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      InspectionId: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'RoomInspectionReports', key: 'InspectionId' } },
      StayId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'Stays', key: 'StayId' } },
      RoomId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'Rooms', key: 'RoomId' } },
      ItemName: { type: Sequelize.STRING(150), allowNull: false },
      ItemLocation: { type: Sequelize.STRING(100), defaultValue: 'Phòng ngủ chính / Master Bedroom' },
      DamageDescription: { type: Sequelize.TEXT, allowNull: false },
      Severity: { type: Sequelize.STRING(30), defaultValue: 'MODERATE' },
      EvidenceUrls: { type: Sequelize.TEXT('long'), allowNull: true },
      ProposedCharge: { type: Sequelize.DECIMAL(18, 2), defaultValue: 0.00 },
      ApprovedCharge: { type: Sequelize.DECIMAL(18, 2), defaultValue: 0.00 },
      Status: { type: Sequelize.STRING(30), defaultValue: 'SUBMITTED' },
      ReasonCode: { type: Sequelize.STRING(50), allowNull: true },
      DisputeNote: { type: Sequelize.TEXT, allowNull: true },
      CreatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      UpdatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });
    try {
      await queryInterface.addIndex('DamageItems', ['StayId'], { name: 'idx_damage_stay' });
      await queryInterface.addIndex('DamageItems', ['InspectionId'], { name: 'idx_damage_insp' });
    } catch (_) {}

    // 61. LateFeePolicies (Spec 11 - Late Check-out Policy)
    await queryInterface.createTable('LateFeePolicies', {
      PolicyId: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      BranchId: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'Branches', key: 'BranchId' } },
      PolicyName: { type: Sequelize.STRING(100), allowNull: false },
      GracePeriodMinutes: { type: Sequelize.INTEGER, defaultValue: 30 },
      HourlyFee: { type: Sequelize.DECIMAL(18, 2), defaultValue: 200000.00 },
      HalfDayThresholdHours: { type: Sequelize.INTEGER, defaultValue: 3 },
      HalfDayFeePercent: { type: Sequelize.DECIMAL(5, 2), defaultValue: 50.00 },
      FullDayThresholdHours: { type: Sequelize.INTEGER, defaultValue: 6 },
      FullDayFeePercent: { type: Sequelize.DECIMAL(5, 2), defaultValue: 100.00 },
      MaxFee: { type: Sequelize.DECIMAL(18, 2), defaultValue: 3000000.00 },
      TaxRate: { type: Sequelize.DECIMAL(5, 2), defaultValue: 10.00 },
      IsActive: { type: Sequelize.BOOLEAN, defaultValue: true },
      CreatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      UpdatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });
    try {
      await queryInterface.sequelize.query(`
        INSERT INTO LateFeePolicies (BranchId, PolicyName, GracePeriodMinutes, HourlyFee, HalfDayThresholdHours, HalfDayFeePercent, FullDayThresholdHours, FullDayFeePercent, MaxFee, TaxRate, IsActive)
        SELECT 1, 'Chính sách trả phòng trễ tiêu chuẩn', 30, 200000.00, 3, 50.00, 6, 100.00, 3000000.00, 10.00, 1
        WHERE NOT EXISTS (SELECT 1 FROM LateFeePolicies WHERE PolicyId = 1);
      `);
    } catch (_) {}


    // Bật lại kiểm tra khóa ngoại
    await queryInterface.sequelize.query('SET FOREIGN_KEY_CHECKS = 1;');
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('SET FOREIGN_KEY_CHECKS = 0;');

    const tables = [
      'DamageItems', 'RoomInspectionReports', 'LateFeePolicies', 'RoomSearchIndex', 'NewsletterSubscribers', 'Wishlists', 'AuditLogs', 'StaffSchedules', 'BanquetEvents',
      'PoliceDeclarations', 'ShuttleSchedules', 'Vehicles', 'NightAuditReports', 'CashShifts',
      'SmartLockLogs', 'LostAndFoundItems', 'MaintenanceTicketPhotos', 'MaintenanceTickets',
      'CampaignRecipients', 'MarketingCampaigns', 'LoyaltyPointTransactions', 'ChatbotMessages',
      'ChatbotConversations', 'ChatbotKnowledgeBase', 'ReviewPhotos', 'Reviews',
      'MinibarUsages', 'InventoryTransactions', 'InventoryItems', 'TableReservations',
      'FoodOrderDetails', 'FoodOrders', 'RestaurantTables', 'MenuItems', 'MenuCategories',
      'Payments', 'InvoiceDetails', 'Invoices', 'ServiceOrders', 'Services', 'ServiceCategories',
      'HousekeepingAssignments', 'RoomMoveHistory', 'Stays', 'BookingGuests', 'Bookings',
      'OTARoomMappings', 'OTAChannels', 'Vouchers', 'PricingRules', 'Rooms',
      'RoomTypeAmenities', 'Amenities', 'RoomTypes', 'PasswordResetTokens', 'Users',
      'Branches', 'MembershipTiers', 'RolePermissions', 'Permissions', 'Roles'
    ];

    for (const table of tables) {
      await queryInterface.dropTable(table);
    }

    await queryInterface.sequelize.query('SET FOREIGN_KEY_CHECKS = 1;');
  }
};
