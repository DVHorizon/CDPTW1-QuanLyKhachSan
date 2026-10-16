'use strict';

const { seedInChunks } = require('../lib/chunkWriter');
const faker = require('../lib/vietnameseFaker');
const bcrypt = require('bcryptjs');

async function run(sequelize, IdPool, options = {}) {
  const count = options.count || 100000;
  console.log(`   • Seeding Users (${count.toLocaleString()})...`);

  const [roles] = await sequelize.query('SELECT RoleId, RoleName FROM Roles');
  const [tiers] = await sequelize.query('SELECT TierId FROM MembershipTiers');

  // Pre-hash password "123456" đúng 1 lần (tiết kiệm 10 phút CPU)
  const commonHashedPassword = await bcrypt.hash('123456', 10);

  // Tạo tài khoản test cố định đầu tiên
  const defaultAccounts = [
    { RoleName: 'Admin', Email: 'admin@hoteldomain.vn', FullName: 'Quản Trị Viên Hệ Thống' },
    { RoleName: 'Receptionist', Email: 'receptionist@hoteldomain.vn', FullName: 'Lễ Tân Trực Ban' },
    { RoleName: 'Kitchen', Email: 'kitchen@hoteldomain.vn', FullName: 'Bếp Trưởng Điều Hành' },
    { RoleName: 'Housekeeping', Email: 'housekeeping@hoteldomain.vn', FullName: 'Tổ Trưởng Buồng Phòng' },
    { RoleName: 'Guest', Email: 'guest@hoteldomain.vn', FullName: 'Khách Hàng VIP Trải Nghiệm' },
  ];

  await seedInChunks('Users', (i) => {
    let roleObj;
    let userEmail;
    let userName;

    if (i <= defaultAccounts.length) {
      const def = defaultAccounts[i - 1];
      roleObj = roles.find(r => r.RoleName === def.RoleName) || roles[0];
      userEmail = def.Email;
      userName = def.FullName;
    } else {
      const roleName = faker.random.weighted({
        Guest: 75, Receptionist: 12, Kitchen: 5, Housekeeping: 5, Admin: 3
      });
      roleObj = roles.find(r => r.RoleName === roleName) || roles[0];
      userEmail = faker.email(i, roleName.toLowerCase());
      userName = faker.fullName();
    }

    const hasTier = Math.random() < 0.75;
    const tier = (hasTier && tiers.length > 0) ? faker.random.arrayElement(tiers) : null;
    const gender = Math.random() < 0.5 ? 'Nam' : 'Nữ';

    return {
      RoleId: roleObj.RoleId,
      TierId: tier ? tier.TierId : null,
      FullName: userName,
      Email: userEmail,
      Phone: faker.phone(),
      PasswordHash: commonHashedPassword,
      IdNumber: faker.idNumber(),
      IdType: 'CCCD',
      DateOfBirth: faker.dateInPast(15000),
      Gender: gender,
      Status: faker.random.weighted({ Active: 95, Inactive: 3, Banned: 2 }),
    };
  }, count, 5000);

  console.log(`   • Seeding PasswordResetTokens (${count.toLocaleString()})...`);
  await seedInChunks('PasswordResetTokens', (i) => ({
    UserId: i,
    OtpCode: String(faker.random.int(100000, 999999)),
    ExpiresAt: faker.dateInFuture(15),
    AttemptCount: faker.random.int(0, 3),
    UsedAt: Math.random() < 0.4 ? faker.dateInPast(5) : null,
  }), count, 5000);

  console.log(`   ✅ Users & PasswordResetTokens completed.`);
}

module.exports = { run };
