'use strict';

require('dotenv').config();
const { MenuItem, MenuCategory } = require('../models');
const { esClient } = require('../config/elasticsearch');

const SOLR_HOST = process.env.SOLR_HOST || (process.env.DB_HOST === 'mysql' ? 'host.docker.internal' : '127.0.0.1');
const SOLR_PORT = process.env.SOLR_PORT || 8983;
const SOLR_CORE = 'menu_items';
const ES_INDEX = 'menu_items';

async function syncMenuToBothEngines() {
  console.log('=====================================================');
  console.log('🚀 BẮT ĐẦU ĐỒNG BỘ THỰC ĐƠN VÀO ELASTICSEARCH & SOLR');
  console.log('=====================================================');

  try {
    // 1. Lấy tất cả món ăn từ MySQL
    const menuItems = await MenuItem.findAll({
      include: [
        {
          model: MenuCategory,
          as: 'category',
          attributes: ['CategoryName'],
          required: false
        }
      ]
    });

    console.log(`📦 Đã lấy được ${menuItems.length} món ăn từ MySQL.`);

    if (menuItems.length === 0) {
      console.log('⚠️ Không có dữ liệu món ăn để đồng bộ.');
      return;
    }

    // 2. Đồng bộ vào Elasticsearch
    console.log('\n--- 1. Đồng bộ vào Elasticsearch (Port 9200) ---');
    try {
      const esOperations = menuItems.flatMap(item => [
        { index: { _index: ES_INDEX, _id: String(item.MenuItemId) } },
        {
          MenuItemId: item.MenuItemId,
          ItemName: item.ItemName,
          Description: item.Description || '',
          CategoryName: item.category ? item.category.CategoryName : 'Khác',
          Price: Number(item.Price) || 0,
          Status: item.Status || 'Available'
        }
      ]);

      await esClient.bulk({ refresh: true, operations: esOperations });
      console.log(`✅ [Elasticsearch] Đã đồng bộ thành công ${menuItems.length} món vào index "${ES_INDEX}"!`);
    } catch (esErr) {
      console.error('❌ [Elasticsearch] Lỗi đồng bộ:', esErr.message);
    }

    // 3. Đồng bộ vào Apache Solr
    console.log('\n--- 2. Đồng bộ vào Apache Solr (Port 8983) ---');
    try {
      const solrDocs = menuItems.map(item => ({
        id: String(item.MenuItemId),
        item_name: item.ItemName,
        description: item.Description || '',
        category: item.category ? item.category.CategoryName : 'Khác',
        price: Number(item.Price) || 0,
        status: item.Status || 'Available'
      }));

      const solrUpdateUrl = `http://${SOLR_HOST}:${SOLR_PORT}/solr/${SOLR_CORE}/update?commit=true`;
      const solrRes = await fetch(solrUpdateUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(solrDocs)
      });

      if (!solrRes.ok) {
        const text = await solrRes.text();
        throw new Error(`Solr HTTP ${solrRes.status}: ${text}`);
      }

      const solrJson = await solrRes.json();
      console.log(`✅ [Apache Solr] Đã đồng bộ thành công ${solrDocs.length} món vào core "${SOLR_CORE}"!`, solrJson);
    } catch (solrErr) {
      console.error('❌ [Apache Solr] Lỗi đồng bộ:', solrErr.message);
    }

    console.log('\n=====================================================');
    console.log('🎉 HOÀN THÀNH TOÀN BỘ TIẾN TRÌNH ĐỒNG BỘ!');
    console.log('=====================================================');
  } catch (error) {
    console.error('❌ Lỗi chung:', error.message || error);
  } finally {
    process.exit(0);
  }
}

syncMenuToBothEngines();

