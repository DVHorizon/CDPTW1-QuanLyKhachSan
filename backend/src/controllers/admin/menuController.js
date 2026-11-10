const { MenuItem, MenuCategory } = require('../../models');
const { Op } = require('sequelize');
const { getOutOfStockDishIds } = require('../../utils/recipeInventoryHelper');

// Helper bỏ dấu tiếng Việt
function removeVietnameseTones(str) {
  if (!str) return '';
  str = str.toLowerCase();
  str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, 'a');
  str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, 'e');
  str = str.replace(/ì|í|ị|ỉ|ĩ/g, 'i');
  str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, 'o');
  str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, 'u');
  str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, 'y');
  str = str.replace(/đ/g, 'd');
  str = str.replace(/\u0300|\u0301|\u0303|\u0309|\u0323/g, '');
  str = str.replace(/\u02C6|\u0306|\u031B/g, '');
  return str.trim();
}

// Lấy chữ cái đầu (acronym), ví dụ "Bò Wagyu" -> "bw"
function getAcronym(str) {
  return removeVietnameseTones(str)
    .split(/\s+/)
    .filter(Boolean)
    .map(word => word[0])
    .join('');
}

// Thuật toán khoảng cách chỉnh sửa Levenshtein Distance
function levenshteinDistance(s1, s2) {
  const m = s1.length;
  const n = s2.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

// Khớp từ mờ chính xác theo ngữ nghĩa tiếng Việt:
// - Chữ cái đầu phải giống nhau (tránh "com" khớp "tom")
// - Độ dài chênh lệch không quá 1 ký tự
function isFuzzyWordMatch(tw, kw) {
  if (tw === kw) return true;
  if (tw.startsWith(kw) || kw.startsWith(tw)) return true;

  if (tw[0] !== kw[0]) return false;
  if (Math.abs(tw.length - kw.length) > 1) return false;

  const len = Math.max(tw.length, kw.length);
  const maxDist = len <= 5 ? 1 : 2;
  const dist = levenshteinDistance(tw, kw);
  return dist <= maxDist;
}

// Search Engine tổng hợp: Khớp chính xác + Không dấu + Viết tắt + Sai chính tả
function matchesSearchEngine(text, keyword) {
  if (!text || !keyword) return false;

  const normText = removeVietnameseTones(text);
  const normKeyword = removeVietnameseTones(keyword);

  // 1. Khớp trực tiếp
  if (normText.includes(normKeyword)) return true;

  // 2. Khớp từ viết tắt (Acronym)
  const acronym = getAcronym(text);
  const cleanKey = normKeyword.replace(/\s+/g, '');
  if (acronym.includes(cleanKey)) return true;

  // 3. Khớp từng từ không trùng lặp (Fuzzy matching)
  const textWords = normText.split(/\s+/).filter(Boolean);
  const keyWords = normKeyword.split(/\s+/).filter(Boolean);

  const usedIdx = new Set();
  const allMatch = keyWords.every(kw => {
    for (let i = 0; i < textWords.length; i++) {
      if (!usedIdx.has(i) && isFuzzyWordMatch(textWords[i], kw)) {
        usedIdx.add(i);
        return true;
      }
    }
    return false;
  });

  return allMatch;
}

// Get Menu Categories (FEAT-FNB-03)
exports.getMenuCategories = async (req, res) => {
  try {
    // Lấy các danh mục chính đang có món ăn trong thực đơn để hiển thị trên thanh tab
    const categories = await MenuCategory.findAll({
      where: { 
        IsDeleted: false,
        CategoryId: { [Op.in]: [5, 6, 7, 8] }
      },
      order: [['CategoryId', 'ASC']]
    });
    return res.status(200).json({ success: true, data: categories });
  } catch (error) {
    console.error('Error fetching menu categories:', error);
    return res.status(500).json({ success: false, message: 'Lỗi tải danh mục món.' });
  }
};

// Get all Menu Items (FEAT-FNB-02)
exports.getMenuItems = async (req, res) => {
  try {
    const { category, keyword, status, isDeleted, availableOnly, page, limit } = req.query;
    
    // Mặc định chỉ lấy các món chưa bị xóa mềm (IsDeleted = false)
    // Nếu truyền isDeleted=true thì lấy danh sách các món trong thùng rác / đã xóa mềm
    const whereClause = { IsDeleted: false };
    
    // Nếu chỉ hiển thị món còn phục vụ (còn tồn kho, không bị khóa Inactive hay OutOfStock)
    const filterAvailableOnly = availableOnly === 'true' || status === 'Available';

    if (filterAvailableOnly) {
      whereClause.Status = 'Available';
    } else if (status && status !== '') {
      whereClause.Status = status;
    }
    
    if (category) {
      if (isNaN(category)) {
        // Tìm kiếm danh mục theo tên, ưu tiên khớp chính xác hoặc danh mục có món ăn
        const matchedCats = await MenuCategory.findAll({
          where: {
            CategoryName: { [Op.like]: `%${category}%` }
          },
          attributes: ['CategoryId']
        });
        if (matchedCats.length > 0) {
          whereClause.CategoryId = { [Op.in]: matchedCats.map(c => c.CategoryId) };
        } else {
          whereClause.CategoryId = -1; // Không tìm thấy danh mục
        }
      } else {
        whereClause.CategoryId = category;
      }
    }

    // Tra cứu danh sách món hết nguyên liệu tồn kho trong bếp
    const outOfStockDishIds = await getOutOfStockDishIds();

    // Nếu người dùng lọc trạng thái "Available" (hoặc cờ availableOnly), tự động loại trừ các món cạn nguyên liệu
    if (filterAvailableOnly && outOfStockDishIds.size > 0) {
      whereClause.MenuItemId = { [Op.notIn]: Array.from(outOfStockDishIds) };
    } else if (status === 'OutOfStock' && outOfStockDishIds.size > 0) {
      // Khi chọn xem "Tạm Hết", bao gồm cả món OutOfStock trong DB lẫn món thiếu nguyên liệu
      delete whereClause.Status;
      whereClause[Op.or] = [
        { Status: 'OutOfStock' },
        { MenuItemId: { [Op.in]: Array.from(outOfStockDishIds) } }
      ];
    }

    // Helper gán trạng thái thực tế dựa theo tồn kho nguyên liệu
    const attachStockStatus = (item) => {
      const raw = typeof item.toJSON === 'function' ? item.toJSON() : { ...item };
      const isMissingIngredient = outOfStockDishIds.has(Number(raw.MenuItemId));
      if (isMissingIngredient && raw.Status === 'Available') {
        raw.Status = 'OutOfStock';
        raw.StockAlert = 'Hết nguyên liệu trong kho bếp';
      }
      return raw;
    };

    // Nếu không có keyword, lấy toàn bộ món theo thứ tự ID giảm dần
    if (!keyword || keyword.trim() === '') {
      const pageNum = parseInt(page, 10) || 1;
      const limitNum = parseInt(limit, 10) || 100; // Mặc định trả về 100 món thay vì 10.000 món để giao diện mượt mà
      const offset = (pageNum - 1) * limitNum;

      const queryOptions = {
        where: whereClause,
        include: [{ model: MenuCategory, attributes: ['CategoryId', 'CategoryName'] }],
        attributes: ['MenuItemId', 'CategoryId', 'ItemName', 'Price', 'Description', 'ImageUrl', 'Status', 'IsDeleted', 'CreatedAt', 'Version'],
        order: [['MenuItemId', 'DESC']],
        limit: limitNum,
        offset: offset
      };

      const items = await MenuItem.findAll(queryOptions);
      const mapped = items.map(attachStockStatus);

      return res.status(200).json({ success: true, data: mapped });
    }

    // Khi có keyword, áp dụng bộ Smart Fuzzy Search Engine trên toàn bộ món
    const cleanKeyword = keyword.trim();
    const items = await MenuItem.findAll({
      where: whereClause,
      include: [{ model: MenuCategory, attributes: ['CategoryId', 'CategoryName'] }],
      attributes: ['MenuItemId', 'CategoryId', 'ItemName', 'Price', 'Description', 'ImageUrl', 'Status', 'IsDeleted', 'CreatedAt', 'Version'],
      order: [['MenuItemId', 'DESC']]
    });

    const filtered = items
      .filter(item => {
        if (matchesSearchEngine(item.ItemName, cleanKeyword)) return true;
        if (item.Description && matchesSearchEngine(item.Description, cleanKeyword)) return true;
        const idStr = String(item.MenuItemId);
        const cleanNorm = removeVietnameseTones(cleanKeyword).replace(/[^a-z0-9]/g, '');
        if (cleanNorm && (`mn${idStr}`.includes(cleanNorm) || idStr.includes(cleanNorm))) return true;
        return false;
      })
      .map(attachStockStatus);

    if (filtered.length === 0) {
      return res.status(404).json({ code: 'ERROR_0005_INVALID_VALUE', message: 'Không tìm thấy món ăn phù hợp với từ khóa.' });
    }

    return res.status(200).json({ success: true, data: filtered });

  } catch (error) {
    console.error('Error fetching menu items:', error);
    res.status(500).json({ code: 'ERROR_0005_INVALID_VALUE', message: 'Không thể tải danh sách món ăn.' });
  }
};

// Create Item (FEAT-FNB-01)
exports.createMenuItem = async (req, res) => {
  try {
    const { CategoryId, ItemName, Price, Description, ImageUrl, Status } = req.body;

    if (!ItemName || ItemName.trim() === '') {
      return res.status(400).json({ code: 'ERROR_0001_REQUIRED', message: 'Tên món không được để trống' });
    }
    if (ItemName.length > 150) {
      return res.status(400).json({ code: 'ERROR_0003_MAX_LENGTH', message: 'Tên món không được vượt quá 150 ký tự' });
    }
    if (Description && Description.length > 1000) {
      return res.status(400).json({ code: 'ERROR_0003_MAX_LENGTH', message: 'Mô tả không được vượt quá 1000 ký tự' });
    }
    if (!CategoryId) {
      return res.status(400).json({ code: 'ERROR_0001_REQUIRED', message: 'Danh mục không được để trống' });
    }
    if (Price === undefined || Price === null || isNaN(Price) || Number(Price) <= 0) {
      return res.status(400).json({ code: 'ERROR_0005_INVALID_VALUE', message: 'Giá bán không hợp lệ' });
    }
    if (!Status) {
      return res.status(400).json({ code: 'ERROR_0001_REQUIRED', message: 'Trạng thái không được để trống' });
    }

    const categoryExists = await MenuCategory.findByPk(CategoryId);
    if (!categoryExists) {
      return res.status(400).json({ code: 'ERROR_0005_INVALID_VALUE', message: 'Danh mục món ăn không hợp lệ' });
    }

    const newItem = await MenuItem.create({
      CategoryId,
      ItemName: ItemName.trim(),
      Price,
      Description: Description || null,
      ImageUrl: ImageUrl || null,
      Status,
      IsDeleted: false,
      CreatedAt: new Date(),
      UpdatedAt: new Date()
    });

    return res.status(201).json({
      code: 'SUCCESS_0001_CREATED',
      message: 'Thêm mới món ăn thành công',
      data: newItem
    });

  } catch (error) {
    console.error('Error creating menu item:', error);
    return res.status(500).json({ code: 'ERROR_0500_INTERNAL', message: 'Lỗi hệ thống' });
  }
};

// Update Item (FEAT-FNB-01) with Optimistic Locking
exports.updateMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { CategoryId, ItemName, Price, Description, ImageUrl, Status, Version } = req.body;

    const item = await MenuItem.findByPk(id);
    if (!item) {
      return res.status(404).json({ code: 'ERROR_0004_NOT_FOUND', message: 'Không tìm thấy món ăn' });
    }

    // 🔒 OPTIMISTIC LOCKING CHECK:
    // Nếu client truyền Version lên, kiểm tra xem Version có khớp với DB hay không
    if (Version !== undefined && Version !== null && String(Version) !== String(item.Version)) {
      return res.status(409).json({
        code: 'ERROR_0409_VERSION_CONFLICT',
        message: `Xung đột dữ liệu! Món ăn đã được cập nhật bởi một người dùng khác (Phiên bản hiện tại: v${item.Version}, phiên bản bạn đang sửa: v${Version}). Vui lòng tải lại trang để nhận dữ liệu mới nhất.`,
        currentVersion: item.Version,
        expectedVersion: Version
      });
    }

    if (ItemName !== undefined) {
      if (!ItemName || ItemName.trim() === '') {
        return res.status(400).json({ code: 'ERROR_0001_REQUIRED', message: 'Tên món không được để trống' });
      }
      if (ItemName.length > 150) {
        return res.status(400).json({ code: 'ERROR_0003_MAX_LENGTH', message: 'Tên món không được vượt quá 150 ký tự' });
      }
    }
    if (Description && Description.length > 1000) {
      return res.status(400).json({ code: 'ERROR_0003_MAX_LENGTH', message: 'Mô tả không được vượt quá 1000 ký tự' });
    }
    if (Price !== undefined && (Price === null || isNaN(Price) || Number(Price) <= 0)) {
      return res.status(400).json({ code: 'ERROR_0005_INVALID_VALUE', message: 'Giá bán không hợp lệ' });
    }

    if (CategoryId) {
      const categoryExists = await MenuCategory.findByPk(CategoryId);
      if (!categoryExists) {
        return res.status(400).json({ code: 'ERROR_0005_INVALID_VALUE', message: 'Danh mục món ăn không hợp lệ' });
      }
    }

    // Tăng Version lên 1 khi update thành công (Khóa lạc quan)
    const nextVersion = Number(item.Version || 1) + 1;

    await item.update({
      CategoryId: CategoryId || item.CategoryId,
      ItemName: ItemName !== undefined ? ItemName.trim() : item.ItemName,
      Price: Price !== undefined ? Price : item.Price,
      Description: Description !== undefined ? Description : item.Description,
      ImageUrl: ImageUrl !== undefined ? ImageUrl : item.ImageUrl,
      Status: Status || item.Status,
      Version: nextVersion,
      UpdatedAt: new Date()
    });

    // Tự động đồng bộ món này vào Elasticsearch & Solr (nếu có kết nối)
    try {
      const esClient = require('../../config/elasticsearch');
      const cat = await MenuCategory.findByPk(item.CategoryId);
      const catName = cat ? cat.CategoryName : 'Khác';

      esClient.index({
        index: 'menu_items',
        id: String(item.MenuItemId),
        document: {
          MenuItemId: item.MenuItemId,
          ItemName: item.ItemName,
          Description: item.Description || '',
          CategoryName: catName,
          Price: Number(item.Price) || 0,
          Status: item.Status || 'Available'
        }
      }).catch(err => console.error('[ES UPDATE ERROR]:', err.message));

      const SOLR_HOST = process.env.SOLR_HOST || (process.env.DB_HOST === 'mysql' ? 'host.docker.internal' : '127.0.0.1');
      const SOLR_PORT = process.env.SOLR_PORT || 8983;
      fetch(`http://${SOLR_HOST}:${SOLR_PORT}/solr/menu_items/update?commit=true`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([{
          id: String(item.MenuItemId),
          item_name: item.ItemName,
          description: item.Description || '',
          category: catName,
          price: Number(item.Price) || 0,
          status: item.Status || 'Available'
        }])
      }).catch(err => console.error('[SOLR UPDATE ERROR]:', err.message));
    } catch (syncErr) {
      // Bỏ qua lỗi đồng bộ nền, không làm fail API update
    }

    return res.status(200).json({
      code: 'SUCCESS_0002_UPDATED',
      message: 'Cập nhật thông tin thành công (Version: v' + nextVersion + ')',
      data: item
    });

  } catch (error) {
    console.error('Error updating menu item:', error);
    return res.status(500).json({ code: 'ERROR_0500_INTERNAL', message: 'Lỗi hệ thống' });
  }
};

// Soft Delete Item (FEAT-FNB-01)
exports.deleteMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await MenuItem.findByPk(id);

    if (!item) {
      return res.status(404).json({ code: 'ERROR_0004_NOT_FOUND', message: 'Không tìm thấy món ăn' });
    }

    await item.update({ Status: 'Inactive', UpdatedAt: new Date() });

    return res.status(200).json({
      code: 'SUCCESS_0003_DELETED',
      message: 'Đã chuyển trạng thái món sang Ngừng Bán'
    });

  } catch (error) {
    console.error('Error deleting menu item:', error);
    return res.status(500).json({ code: 'ERROR_0500_INTERNAL', message: 'Lỗi hệ thống' });
  }
};

// Khôi phục món đã xóa mềm (Restore Item)
exports.restoreMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await MenuItem.findByPk(id);

    if (!item) {
      return res.status(404).json({ code: 'ERROR_0004_NOT_FOUND', message: 'Không tìm thấy món ăn' });
    }

    await item.update({ Status: 'Available', IsDeleted: false, UpdatedAt: new Date() });

    return res.status(200).json({
      code: 'SUCCESS_0005_RESTORED',
      message: 'Đã khôi phục món ăn trở lại thực đơn'
    });
  } catch (error) {
    console.error('Error restoring menu item:', error);
    return res.status(500).json({ code: 'ERROR_0500_INTERNAL', message: 'Lỗi hệ thống' });
  }
};

// Update status
exports.updateMenuItemStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const validStatuses = ['Available', 'OutOfStock', 'Inactive'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ code: 'ERROR_0005_INVALID_VALUE', message: 'Trạng thái không hợp lệ' });
    }
    
    const item = await MenuItem.findByPk(id);
    if (!item) {
      return res.status(404).json({ code: 'ERROR_0004_NOT_FOUND', message: 'Không tìm thấy món ăn' });
    }
    
    await item.update({ Status: status, UpdatedAt: new Date() });
    
    return res.status(200).json({ 
      code: 'SUCCESS_0004_STATUS_UPDATED', 
      message: 'Đã cập nhật trạng thái món ăn' 
    });
  } catch (error) {
    console.error('Error updating status:', error);
    return res.status(500).json({ code: 'ERROR_0005_INVALID_VALUE', message: 'Không thể cập nhật trạng thái món.' });
  }
};

// ============================================================================
// FEAT-SEARCH-01: TÌM KIẾM THỰC ĐƠN ĐA NỀN TẢNG (ELASTICSEARCH & APACHE SOLR)
// ============================================================================

const { expandQuerySemantics } = require('../../utils/searchSemanticHelper');

// 1. Tìm kiếm bằng Elasticsearch (Full-text + Semantic Expansion + Typo Fuzzy)
exports.searchMenuWithElastic = async (req, res) => {
  const startTime = Date.now();
  try {
    const { keyword, category, status } = req.query;
    const esClient = require('../../config/elasticsearch');

    let esQuery;
    let expandedTerms = [];

    // Nếu không nhập từ khóa nhưng có lọc danh mục hoặc trạng thái:
    if (!keyword || keyword.trim() === '') {
      esQuery = {
        bool: {
          must: [{ match_all: {} }],
          filter: []
        }
      };
    } else {
      const cleanKw = keyword.trim();
      // Phân tích ngữ nghĩa theo phong cách Google (bỏ stop words, tìm từ đồng nghĩa)
      const expansion = expandQuerySemantics(cleanKw);
      const filteredText = expansion.filteredText;
      expandedTerms = expansion.expandedTerms || [];

      const shouldClauses = [
        // 1. Khớp cụm nguyên bản hoặc cụm đã lọc stop words (ưu tiên điểm cao nhất)
        {
          multi_match: {
            query: cleanKw,
            fields: ['ItemName^8.0', 'Description^4.0', 'CategoryName^2.5'],
            fuzziness: 'AUTO',
            boost: 4.0
          }
        }
      ];

      if (filteredText && filteredText !== cleanKw.toLowerCase()) {
        shouldClauses.push({
          multi_match: {
            query: filteredText,
            fields: ['ItemName^6.0', 'Description^3.0', 'CategoryName^2.0'],
            fuzziness: 'AUTO',
            boost: 3.0
          }
        });
      }

      // 2. Thêm các từ cốt lõi (Core Terms) và từ đồng nghĩa ngữ nghĩa (VD: 'thích' <-> 'yêu', 'bò' <-> 'wagyu/beef')
      expandedTerms.forEach(term => {
        if (term !== cleanKw.toLowerCase() && term !== filteredText) {
          shouldClauses.push({
            multi_match: {
              query: term,
              fields: ['ItemName^3.0', 'Description^1.5', 'CategoryName^1.0'],
              fuzziness: 'AUTO',
              boost: 1.2
            }
          });
        }
      });

      esQuery = {
        bool: {
          should: shouldClauses,
          minimum_should_match: 1,
          filter: []
        }
      };
    }

    if (category) {
      esQuery.bool.filter.push({ match_phrase: { CategoryName: category } });
    }
    if (status) {
      esQuery.bool.filter.push({ term: { Status: status } });
    }

    const esResponse = await esClient.search({
      index: 'menu_items',
      body: {
        query: esQuery,
        size: 50
      }
    });

    const outOfStockDishIds = await getOutOfStockDishIds();
    const hits = (esResponse.hits && esResponse.hits.hits) || [];
    const maxScore = esResponse.hits && esResponse.hits.max_score ? esResponse.hits.max_score : 1;
    const scoreThreshold = maxScore * 0.2; // Ngưỡng tương quan 20%

    let filteredHits = hits.filter(h => (h._score || 0) >= scoreThreshold);
    let data = filteredHits.map(hit => {
      const src = { ...hit._source };
      const isMissing = outOfStockDishIds.has(Number(src.MenuItemId));
      if (isMissing && src.Status === 'Available') {
        src.Status = 'OutOfStock';
        src.StockAlert = 'Hết nguyên liệu trong kho bếp';
      }
      return {
        ...src,
        _score: hit._score,
        _engine: 'Elasticsearch'
      };
    });

    if (status === 'Available') {
      data = data.filter(d => d.Status === 'Available' && !outOfStockDishIds.has(Number(d.MenuItemId)));
    } else if (status === 'OutOfStock') {
      data = data.filter(d => d.Status === 'OutOfStock' || outOfStockDishIds.has(Number(d.MenuItemId)));
    }

    return res.status(200).json({
      success: true,
      engine: 'Elasticsearch 9.5.6',
      total: data.length,
      qTimeMs: Date.now() - startTime,
      semanticExpansions: expandedTerms,
      data
    });
  } catch (error) {
    console.error('Lỗi tìm kiếm Elasticsearch:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Không thể kết nối máy chủ Elasticsearch: ' + error.message
    });
  }
};

// 2. Tìm kiếm bằng Apache Solr (Hỗ trợ Semantic Expansion + Tiếng Việt không dấu + Typo Fuzzy & Đa từ)
exports.searchMenuWithSolr = async (req, res) => {
  const startTime = Date.now();
  try {
    const { keyword, category, status } = req.query;
    const solrHost = (process.env.SOLR_HOST) || (process.env.DB_HOST === 'mysql' ? 'host.docker.internal' : '127.0.0.1');
    const solrPort = process.env.SOLR_PORT || 8983;

    // Xử lý truy vấn Solr: Nếu không có keyword thì lấy tất cả theo bộ lọc (*:*)
    let finalQuery = '*:*';
    let expandedTerms = [];

    if (keyword && keyword.trim() !== '') {
      const cleanKw = keyword.trim();
      const noToneKw = removeVietnameseTones(cleanKw);
      // 2. Phân tích ngữ nghĩa theo phong cách Google
      const expansion = expandQuerySemantics(cleanKw);
      const filteredText = expansion.filteredText;
      expandedTerms = expansion.expandedTerms || [];
      const coreTerms = expansion.coreTerms || [];

      // Tách các từ riêng lẻ
      const rawTokens = cleanKw.toLowerCase().split(/\s+/).filter(Boolean);
      const tokens = Array.from(new Set([...rawTokens, ...coreTerms]));

      // Xây dựng danh sách mệnh đề truy vấn chuẩn Solr
      const queryParts = [
        // A. Khớp chính xác cụm nguyên bản (điểm cao nhất)
        `"${cleanKw}"^15.0`
      ];

      if (filteredText && filteredText !== cleanKw.toLowerCase()) {
        queryParts.push(`"${filteredText}"^12.0`);
      }

      // B. Khớp tất cả các từ cùng xuất hiện
      if (tokens.length > 1) {
        queryParts.push(`(${tokens.join(' AND ')})^8.0`);
      }

      // C. Khớp tiền tố (Prefix / Gõ dở dang: vd me -> me*)
      const prefixWords = tokens.map(w => (w.includes('*') || w.includes('~')) ? w : `${w}*`);
      queryParts.push(`(${prefixWords.join(' OR ')})^5.0`);

      // D. Khớp mờ chịu sai/thiếu/dư ký tự (Fuzzy ~1, ~2)
      // Tự động nhận diện lỗi typo như 'mesi' -> 'messi', 'tuyéet' -> 'tuyết', 'ronaldoo' -> 'ronaldo'
      tokens.forEach(w => {
        // Đẩy trực tiếp vào queryParts với edismax
        queryParts.push(`${w}~1^6.0`);
        queryParts.push(`${w}~2^4.0`);
        queryParts.push(`*${w}*^5.0`);

        const noTone = removeVietnameseTones(w);
        if (noTone !== w) {
          queryParts.push(`${noTone}~1^5.0`);
          queryParts.push(`${noTone}~2^3.5`);
          queryParts.push(`*${noTone}*^4.0`);
        }
      });

      // E. Bổ sung các từ khóa ngữ nghĩa / đồng nghĩa (Semantic Expansions)
      expandedTerms.forEach(term => {
        if (term !== cleanKw.toLowerCase() && term !== filteredText) {
          queryParts.push(`"${term}"^3.0`);
          const noToneSyn = removeVietnameseTones(term);
          queryParts.push(`*${noToneSyn}*^2.0`);
        }
      });

      finalQuery = queryParts.join(' OR ');
    }

    // Sử dụng edismax parser của Solr với qf đa trường
    const url = new URL(`http://${solrHost}:${solrPort}/solr/menu_items/select`);
    url.searchParams.append('defType', 'edismax');
    url.searchParams.append('q', finalQuery);
    url.searchParams.append('qf', 'item_name^5.0 description^2.5 category^1.5');
    url.searchParams.append('wt', 'json');
    url.searchParams.append('rows', '50');
    url.searchParams.append('fl', '*,score');

    if (category) {
      // Đối với Solr: Bọc ngoặc kép để hỗ trợ các danh mục có dấu cách và gạch chéo như "Đồ Uống / Bar"
      url.searchParams.append('fq', `category:"${category}"`);
    }
    if (status) {
      url.searchParams.append('fq', `status:${status}`);
    }

    const cleanKw = keyword ? keyword.trim() : '';
    console.log(`[SOLR SEARCH] Kw: "${cleanKw}" | URL: ${url.toString()}`);

    const response = await fetch(url.toString());
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Solr HTTP ${response.status}: ${errText}`);
    }

    const solrJson = await response.json();
    const docs = (solrJson.response && solrJson.response.docs) || [];
    console.log(`[SOLR FOUND] Docs count: ${docs.length}`);

    const outOfStockDishIds = await getOutOfStockDishIds();
    let data = docs.map(doc => {
      const mId = Number(doc.id);
      let dishStatus = Array.isArray(doc.status) ? doc.status[0] : (doc.status || 'Available');
      let stockAlert = null;

      if (outOfStockDishIds.has(mId) && dishStatus === 'Available') {
        dishStatus = 'OutOfStock';
        stockAlert = 'Hết nguyên liệu trong kho bếp';
      }

      return {
        MenuItemId: mId,
        ItemName: Array.isArray(doc.item_name) ? doc.item_name[0] : doc.item_name,
        Description: Array.isArray(doc.description) ? doc.description[0] : (doc.description || ''),
        CategoryName: Array.isArray(doc.category) ? doc.category[0] : (doc.category || 'Khác'),
        Price: Array.isArray(doc.price) ? Number(doc.price[0]) : Number(doc.price || 0),
        Status: dishStatus,
        StockAlert: stockAlert,
        _score: doc.score || null,
        _engine: 'Apache Solr'
      };
    });

    if (status === 'Available') {
      data = data.filter(d => d.Status === 'Available' && !outOfStockDishIds.has(Number(d.MenuItemId)));
    } else if (status === 'OutOfStock') {
      data = data.filter(d => d.Status === 'OutOfStock' || outOfStockDishIds.has(Number(d.MenuItemId)));
    }

    return res.status(200).json({
      success: true,
      engine: 'Apache Solr 9.11.0',
      total: data.length,
      qTimeMs: Date.now() - startTime,
      semanticExpansions: expandedTerms,
      data
    });
  } catch (error) {
    console.error('Lỗi tìm kiếm Apache Solr:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Không thể kết nối máy chủ Apache Solr: ' + error.message
    });
  }
};
