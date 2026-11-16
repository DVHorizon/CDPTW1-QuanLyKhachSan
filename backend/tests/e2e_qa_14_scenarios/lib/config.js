'use strict';

const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

const REPO_ROOT = path.resolve(__dirname, '../../../..');
const BACKEND_ROOT = path.resolve(__dirname, '../../..');
const HARNESS_ROOT = path.resolve(__dirname, '..');

// Load backend/.env first, then repo root .env (without overriding explicit env vars)
const backendEnvPath = path.join(BACKEND_ROOT, '.env');
const rootEnvPath = path.join(REPO_ROOT, '.env');
if (fs.existsSync(backendEnvPath)) {
  dotenv.config({ path: backendEnvPath, quiet: true });
}
if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath, quiet: true });
}

const FEATURES = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9', 'C10', 'C11', 'C12', 'C13', 'C14'];
const SCENARIOS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

const PREFIX = 'E2E_QA_';
const SHORT_PREFIX = 'E2EQA';

function makeTag(label = 'ITEM') {
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `${PREFIX}${Date.now()}_${rand}_${label}`;
}

function makeCode(label = '') {
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  const ts = String(Date.now()).slice(-7);
  return `${SHORT_PREFIX}${ts}${rand}${label ? '_' + label : ''}`;
}

module.exports = {
  repoRoot: REPO_ROOT,
  backendRoot: BACKEND_ROOT,
  harnessRoot: HARNESS_ROOT,
  suitesDir: path.join(HARNESS_ROOT, 'suites'),
  defaultOutDir: path.join(HARNESS_ROOT, 'reports'),
  invoicesUploadDir: path.join(BACKEND_ROOT, 'public', 'uploads', 'invoices'),

  apiBaseUrl: (process.env.E2E_API_BASE_URL || 'http://localhost:5000/api/v1').replace(/\/+$/, ''),
  backendBaseUrl: (process.env.E2E_BACKEND_BASE_URL || 'http://localhost:5000').replace(/\/+$/, ''),
  frontendBaseUrl: (process.env.E2E_FRONTEND_BASE_URL || 'http://localhost:3000').replace(/\/+$/, ''),
  wsDashboardUrl: process.env.E2E_WS_DASHBOARD_URL || 'ws://localhost:5000/ws/v1/dashboard',

  db: {
    host: process.env.E2E_DB_HOST || process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.E2E_DB_PORT || process.env.DB_PORT || 3306),
    user: process.env.E2E_DB_USER || process.env.DB_USER || 'root',
    password: process.env.E2E_DB_PASSWORD !== undefined ? process.env.E2E_DB_PASSWORD : (process.env.DB_PASSWORD || ''),
    database: process.env.E2E_DB_NAME || process.env.DB_NAME || 'hotel_management',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  },

  credentials: {
    admin: {
      identifier: process.env.E2E_ADMIN_EMAIL || 'admin@hoteldomain.vn',
      password: process.env.E2E_ADMIN_PASSWORD || '123456',
      roleName: 'Admin',
      roleId: 1,
      uiSupported: true,
    },
    receptionist: {
      identifier: process.env.E2E_RECEPTIONIST_EMAIL || 'receptionist@hoteldomain.vn',
      password: process.env.E2E_RECEPTIONIST_PASSWORD || '123456',
      roleName: 'Receptionist',
      roleId: 2,
      uiSupported: true,
    },
    kitchen: {
      identifier: process.env.E2E_KITCHEN_EMAIL || 'kitchen@hoteldomain.vn',
      password: process.env.E2E_KITCHEN_PASSWORD || '123456',
      roleName: 'Kitchen',
      roleId: 3,
      uiSupported: true,
    },
    housekeeping: {
      identifier: process.env.E2E_HOUSEKEEPING_EMAIL || 'housekeeping@hoteldomain.vn',
      password: process.env.E2E_HOUSEKEEPING_PASSWORD || '123456',
      roleName: 'Housekeeping',
      roleId: 4,
      uiSupported: true,
    },
    guest: {
      identifier: process.env.E2E_GUEST_EMAIL || 'guest@hoteldomain.vn',
      password: process.env.E2E_GUEST_PASSWORD || '123456',
      roleName: 'Guest',
      roleId: 5,
      uiSupported: true,
    },
    guestAlt: {
      identifier: 'hoangnam.417@gmail.com',
      password: '123456',
      roleName: 'Guest',
      roleId: 5,
      uiSupported: true,
    },
    manager: {
      identifier: process.env.E2E_MANAGER_EMAIL || 'manager@hoteldomain.vn',
      password: process.env.E2E_MANAGER_PASSWORD || '123456',
      roleName: 'Manager',
      roleId: 6,
      uiSupported: false,
    },
    staff: {
      identifier: process.env.E2E_STAFF_EMAIL || 'staff@hoteldomain.vn',
      password: process.env.E2E_STAFF_PASSWORD || '123456',
      roleName: 'Staff',
      roleId: 7,
      uiSupported: false,
    },
  },

  timeouts: {
    httpMs: Number(process.env.E2E_HTTP_TIMEOUT_MS || 15000),
    uiNavMs: Number(process.env.E2E_UI_NAV_TIMEOUT_MS || 20000),
    uiActionMs: Number(process.env.E2E_UI_ACTION_TIMEOUT_MS || 10000),
    wsMs: Number(process.env.E2E_WS_TIMEOUT_MS || 8000),
    browserLaunchMs: Number(process.env.E2E_BROWSER_LAUNCH_MS || 15000),
  },

  prefix: PREFIX,
  shortPrefix: SHORT_PREFIX,
  makeTag,
  makeCode,
  features: FEATURES,
  scenarios: SCENARIOS,
};
