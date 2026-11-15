'use strict';

const { Client } = require('@elastic/elasticsearch');

// Tự động nhận diện:
// 1. Chạy trong Docker container (DB_HOST=mysql): dùng host.docker.internal
// 2. Chạy ngoài máy host Windows (PowerShell/Terminal): dùng 127.0.0.1
let esUrl = process.env.ELASTICSEARCH_URL || 'http://127.0.0.1:9200';

if (process.env.DB_HOST === 'mysql' && esUrl.includes('127.0.0.1')) {
  esUrl = 'http://host.docker.internal:9200';
}

const client = new Client({
  node: esUrl,
  requestTimeout: 800,
  maxRetries: 0
});

module.exports = client;
