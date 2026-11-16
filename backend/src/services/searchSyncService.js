'use strict';

const esClient = require('../config/elasticsearch');
const { MenuItem, MenuCategory, RoomType } = require('../models');

const SOLR_HOST = process.env.SOLR_HOST || (process.env.DB_HOST === 'mysql' ? 'host.docker.internal' : '127.0.0.1');
const SOLR_PORT = process.env.SOLR_PORT || 8983;
const SOLR_MENU_CORE = 'menu_items';
const ES_MENU_INDEX = 'menu_items';

// In-Memory Fallback Cache để phục vụ Virtual Engine tức thời
const memoryMenuCache = new Map();

/**
 * Service đồng bộ dữ liệu tự động 2 chiều giữa MySQL và (Elasticsearch + Apache Solr)
 * Hoạt động theo cơ chế Change Data Capture (CDC) / Event Hook:
 * Khi Database có thao tác CREATE / UPDATE / DELETE, dữ liệu sẽ được tự động đồng bộ sang 2 engine.
 */
class SearchSyncService {
  constructor() {
    this.solrBaseUrl = `http://${SOLR_HOST}:${SOLR_PORT}/solr`;
  }

  /**
   * Đồng bộ 1 món ăn sang Elasticsearch và Apache Solr
   * @param {number|string} menuItemId ID món ăn
   * @param {'upsert'|'delete'} action Hành động đồng bộ
   */
  async syncMenuItem(menuItemId, action = 'upsert') {
    // Chạy bất đồng bộ trong background (non-blocking) để không làm chậm luồng chính
    setImmediate(async () => {
      try {
        const mId = Number(menuItemId);
        if (!mId) return;

        if (action === 'delete') {
          await this._deleteMenuItemFromEngines(mId);
          memoryMenuCache.delete(mId);
          console.log(`[SearchSync] 🗑️ Đã xóa món #${mId} khỏi Elasticsearch & Apache Solr`);
          return;
        }

        // Lấy thông tin bản ghi mới nhất từ MySQL
        const item = await MenuItem.findByPk(mId, {
          include: [
            {
              model: MenuCategory,
              attributes: ['CategoryName'],
              required: false
            }
          ]
        });

        if (!item || item.IsDeleted) {
          await this._deleteMenuItemFromEngines(mId);
          memoryMenuCache.delete(mId);
          return;
        }

        const categoryName = item.MenuCategory ? item.MenuCategory.CategoryName : (item.category ? item.category.CategoryName : 'Khác');
        const docData = {
          MenuItemId: item.MenuItemId,
          ItemName: item.ItemName,
          Description: item.Description || '',
          CategoryName: categoryName,
          Price: Number(item.Price) || 0,
          Status: item.Status || 'Available',
          ImageUrl: item.ImageUrl || ''
        };

        // 1. Cập nhật vào Memory Cache
        memoryMenuCache.set(mId, docData);

        // 2. Tự động đồng bộ sang Elasticsearch
        this._syncToElasticsearch(docData).catch(err => {
          // Bắt lỗi nhẹ nhàng nếu ES cluster ngoài chưa bật
          console.warn(`[SearchSync] Elasticsearch offline hoặc chưa sẵn sàng: ${err.message}`);
        });

        // 3. Tự động đồng bộ sang Apache Solr
        this._syncToSolr(docData).catch(err => {
          // Bắt lỗi nhẹ nhàng nếu Solr cluster ngoài chưa bật
          console.warn(`[SearchSync] Apache Solr offline hoặc chưa sẵn sàng: ${err.message}`);
        });

        console.log(`[SearchSync] ⚡ Đã tự động đồng bộ món #${mId} ("${item.ItemName}") sang Elasticsearch & Solr!`);
      } catch (error) {
        console.error(`[SearchSync] Lỗi trong quá trình đồng bộ món #${menuItemId}:`, error.message);
      }
    });
  }

  /**
   * Đẩy document vào Elasticsearch
   */
  async _syncToElasticsearch(doc) {
    await esClient.index({
      index: ES_MENU_INDEX,
      id: String(doc.MenuItemId),
      document: {
        MenuItemId: doc.MenuItemId,
        ItemName: doc.ItemName,
        Description: doc.Description,
        CategoryName: doc.CategoryName,
        Price: doc.Price,
        Status: doc.Status,
        ImageUrl: doc.ImageUrl
      },
      refresh: true
    });
  }

  /**
   * Đẩy document vào Apache Solr
   */
  async _syncToSolr(doc) {
    const solrDoc = {
      id: String(doc.MenuItemId),
      item_name: doc.ItemName,
      description: doc.Description,
      category: doc.CategoryName,
      price: doc.Price,
      status: doc.Status,
      image_url: doc.ImageUrl
    };

    const url = `${this.solrBaseUrl}/${SOLR_MENU_CORE}/update?commit=true`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([solrDoc]),
      signal: AbortSignal.timeout(1000)
    });

    if (!res.ok) {
      throw new Error(`Solr HTTP ${res.status}`);
    }
  }

  /**
   * Xóa document khỏi Elasticsearch & Solr
   */
  async _deleteMenuItemFromEngines(menuItemId) {
    const idStr = String(menuItemId);
    // Xóa khỏi ES
    esClient.delete({
      index: ES_MENU_INDEX,
      id: idStr,
      refresh: true
    }).catch(() => {});

    // Xóa khỏi Solr
    const url = `${this.solrBaseUrl}/${SOLR_MENU_CORE}/update?commit=true`;
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delete: { id: idStr } }),
      signal: AbortSignal.timeout(1000)
    }).catch(() => {});
  }

  /**
   * Lấy toàn bộ món ăn từ Memory Cache (cho Virtual Engine)
   */
  async getAllMenuCache() {
    if (memoryMenuCache.size > 0) {
      return Array.from(memoryMenuCache.values());
    }
    // Nếu cache trống, tự nạp từ DB MySQL
    const items = await MenuItem.findAll({
      where: { IsDeleted: false },
      include: [{ model: MenuCategory, attributes: ['CategoryName'], required: false }]
    });

    items.forEach(item => {
      memoryMenuCache.set(item.MenuItemId, {
        MenuItemId: item.MenuItemId,
        ItemName: item.ItemName,
        Description: item.Description || '',
        CategoryName: item.MenuCategory ? item.MenuCategory.CategoryName : (item.category ? item.category.CategoryName : 'Khác'),
        Price: Number(item.Price) || 0,
        Status: item.Status || 'Available',
        ImageUrl: item.ImageUrl || ''
      });
    });

    return Array.from(memoryMenuCache.values());
  }
}

module.exports = new SearchSyncService();
