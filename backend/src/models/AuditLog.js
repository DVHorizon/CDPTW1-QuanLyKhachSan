const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  const AuditLog = sequelize.define('AuditLog', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true, 
    },
    action: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    entity_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    entity_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    old_values: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    new_values: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    ip_address: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    user_agent: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    tableName: 'audit_logs',
    timestamps: true,
    updatedAt: false,
    hooks: {
      beforeUpdate: () => {
        throw new Error('VI PHẠM BẢO MẬT: Bảng Audit Log là bất biến (WORM), nghiêm cấm sửa đổi nhật ký!');
      },
      beforeDestroy: () => {
        throw new Error('VI PHẠM BẢO MẬT: Bảng Audit Log là bất biến (WORM), nghiêm cấm xóa nhật ký!');
      },
      beforeBulkUpdate: () => {
        throw new Error('VI PHẠM BẢO MẬT: Bảng Audit Log là bất biến (WORM), nghiêm cấm sửa đổi hàng loạt nhật ký!');
      },
      beforeBulkDestroy: () => {
        throw new Error('VI PHẠM BẢO MẬT: Bảng Audit Log là bất biến (WORM), nghiêm cấm xóa hàng loạt nhật ký!');
      }
    }
  });

  // Tạo Database Trigger trực tiếp trong SQLite để chặn can thiệp từ ngoài ORM
  AuditLog.initDatabaseTriggers = async () => {
    try {
      await sequelize.query(`
        CREATE TRIGGER IF NOT EXISTS trg_prevent_audit_log_update
        BEFORE UPDATE ON audit_logs
        BEGIN
          SELECT RAISE(ABORT, 'BẢO MẬT CƠ SỞ DỮ LIỆU: Nghiêm cấm mọi hành vi UPDATE bảng audit_logs!');
        END;
      `);
      await sequelize.query(`
        CREATE TRIGGER IF NOT EXISTS trg_prevent_audit_log_delete
        BEFORE DELETE ON audit_logs
        BEGIN
          SELECT RAISE(ABORT, 'BẢO MẬT CƠ SỞ DỮ LIỆU: Nghiêm cấm mọi hành vi DELETE bảng audit_logs!');
        END;
      `);
    } catch (err) {
      console.warn('Trigger init warning (có thể đã tồn tại):', err.message);
    }
  };

  return AuditLog;
};
