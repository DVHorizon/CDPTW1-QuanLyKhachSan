'use strict';

/**
 * authHelper.js - Token & Role Manager for Grand Horizon E2E Testing Track
 */

const { request } = require('./apiClient');

let cache = {
  admin: null,
  receptionist: null,
  guest: null,
};

async function loginUser(identifier, password = 'password123') {
  // Try common passwords if default fails
  const passwordsToTry = [password, '123456', 'admin123', 'guest123'];
  for (const pwd of passwordsToTry) {
    const res = await request('/auth/login', {
      method: 'POST',
      body: { identifier, password: pwd },
    });
    if (res.status === 200 && res.data && res.data.token) {
      return {
        token: res.data.token,
        user: res.data.user,
        role: res.data.user?.roleName || res.data.user?.Role,
      };
    }
  }
  throw new Error(`Failed to login user ${identifier}`);
}

async function getAuthContext() {
  if (!cache.admin) {
    cache.admin = await loginUser('admin', '123456');
  }
  if (!cache.receptionist) {
    cache.receptionist = await loginUser('receptionist', '123456');
  }
  if (!cache.guest) {
    cache.guest = await loginUser('guest', '123456');
  }

  return {
    adminToken: cache.admin.token,
    adminUser: cache.admin.user,
    recToken: cache.receptionist.token,
    recUser: cache.receptionist.user,
    guestToken: cache.guest.token,
    guestUser: cache.guest.user,
  };
}

module.exports = {
  loginUser,
  getAuthContext,
};
