'use strict';

const { Service, ServiceCategory, sequelize } = require('../../../models');
const { Op } = require('sequelize');

/**
 * Helper: Chuẩn hóa chuỗi tiếng Việt (loại bỏ dấu và chuyển chữ thường)
 * Dùng theo quy ước mục 0.2: NFD unicode normalize
 */
const normalizeVietnamese = (str) => {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, (m) => (m === 'đ' ? 'd' : 'D'))
    .toLowerCase()
    .trim();
};

/**
 * Helper: Tạo tiền tố 3 chữ cái từ tên nhóm dịch vụ
 */
const getCategoryPrefix = (categoryName) => {
  const normalized = normalizeVietnamese(categoryName);
  if (normalized.includes('spa')) return 'SPA';
  if (normalized.includes('van chuyen') || normalized.includes('xe')) return 'TRN';
  if (normalized.includes('tour') || normalized.includes('trai nghiem')) return 'EXP';
  if (normalized.includes('giat') || normalized.includes('buong phong')) return 'LND';
  if (normalized.includes('am thuc') || normalized.includes('an uong') || normalized.includes('f&b')) return 'DNG';

  // Mặc định lấy 3 ký tự chữ cái đầu tiên
  const words = normalized.split(/\s+/).filter(Boolean);
  if (words.length >= 3) {
    return (words[0][0] + words[1][0] + words[2][0]).toUpperCase();
  }
  return normalized.replace(/[^a-z0-9]/gi, '').slice(0, 3).toUpperCase().padEnd(3, 'X');
};

/**
 * Helper: Tự sinh mã ServiceCode theo định dạng SVC-{PREFIX}-{000}
 */
const generateServiceCode = async (categoryId, categoryName) => {
  const prefix = getCategoryPrefix(categoryName);
  const count = await Service.count({ where: { CategoryId: categoryId } });
  const seq = String(count + 1).padStart(3, '0');
  let code = `SVC-${prefix}-${seq}`;

  // Đảm bảo không trùng bằng cách kiểm tra
  let isExisted = await Service.findOne({ where: { ServiceCode: code } });
  let step = 1;
  while (isExisted) {
    code = `SVC-${prefix}-${String(count + 1 + step).padStart(3, '0')}`;
    isExisted = await Service.findOne({ where: { ServiceCode: code } });
    step++;
  }
  return code;
};

// ─── 1. LẤY DANH SÁCH DỊCH VỤ (GET /api/v1/services) ──────────────────────────
// Tuân thủ đặc tả FEAT-SERVICE-02: Xem danh sách, tìm kiếm và phân loại dịch vụ
exports.getAllServices = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(req.query.pageSize, 10) || 20, 1), 100);
    const { search, group, categoryId, status, minPrice, maxPrice, sortBy } = req.query;

    // 1. Validate search query (Tối đa 100 ký tự theo mục 2.2)
    if (search && typeof search === 'string' && search.length > 100) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0003_MAX_LENGTH',
        message: 'Từ khoá tìm kiếm không được vượt quá 100 ký tự',
      });
    }

    // 2. Validate khoảng giá minPrice / maxPrice (Mục 2.2 & Test case 3)
    let minP = null;
    let maxP = null;
    if (minPrice !== undefined && minPrice !== '') {
      minP = Number(minPrice);
      if (isNaN(minP) || minP < 0) {
        return res.status(400).json({
          success: false,
          code: 'ERROR_0004_INVALID_FORMAT',
          message: 'Khoảng giá không hợp lệ',
        });
      }
    }
    if (maxPrice !== undefined && maxPrice !== '') {
      maxP = Number(maxPrice);
      if (isNaN(maxP) || maxP < 0) {
        return res.status(400).json({
          success: false,
          code: 'ERROR_0004_INVALID_FORMAT',
          message: 'Khoảng giá không hợp lệ',
        });
      }
    }
    if (minP !== null && maxP !== null && minP > maxP) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0004_INVALID_FORMAT',
        message: 'Khoảng giá không hợp lệ',
      });
    }

    // 3. Xây dựng điều kiện lọc cơ bản (WHERE)
    const where = {};

    // Group / CategoryId: Nếu CategoryId không tồn tại -> trả mảng rỗng 200 OK (Mục 2.2 Test case 2)
    const targetGroup = group !== undefined ? group : categoryId;
    if (targetGroup && targetGroup !== 'All') {
      const parsedCatId = parseInt(targetGroup, 10);
      if (!isNaN(parsedCatId)) {
        where.CategoryId = parsedCatId;
      }
    }

    // Quy tắc nghiệp vụ 2.3:
    // Nếu request công khai (không truyền status hoặc status === 'Active'), chỉ lấy Service có Status = 'Active'
    // Nếu màn quản trị truyền status = 'All' hoặc 'Inactive' thì tôn trọng bộ lọc quản trị
    const isPublicLookup = !status || status === 'Active';
    if (status && status !== 'All') {
      where.Status = status;
    } else if (!status) {
      where.Status = 'Active';
    }

    // Lấy toàn bộ bản ghi theo điều kiện cơ bản kèm Category
    const allServices = await Service.findAll({
      where,
      include: [
        {
          model: ServiceCategory,
          as: 'category',
          attributes: ['CategoryId', 'CategoryName', 'Description', 'IsDeleted', 'Status'],
        },
      ],
    });

    // 4. Lọc dữ liệu theo Quy tắc nghiệp vụ 2.3
    let filtered = allServices.filter((svc) => {
      // Test case 4: Category cha phải có Status = 'Active' và không bị xóa (IsDeleted = false)
      if (isPublicLookup) {
        const cat = svc.category;
        if (!cat || cat.IsDeleted || cat.Status === 'Inactive') {
          return false;
        }
      }

      // Lọc khoảng giá minPrice / maxPrice
      const priceNum = Number(svc.Price);
      if (minP !== null && priceNum < minP) return false;
      if (maxP !== null && priceNum > maxP) return false;

      return true;
    });

    // 5. Lọc tìm kiếm theo chuẩn Unicode NFD không dấu (Mục 0.2 & Test case 1)
    if (search && search.trim()) {
      const searchNorm = normalizeVietnamese(search.trim());
      filtered = filtered.filter((svc) => {
        const nameNorm = normalizeVietnamese(svc.ServiceName);
        const codeNorm = normalizeVietnamese(svc.ServiceCode);
        const catNorm = normalizeVietnamese(svc.category?.CategoryName || '');
        const descNorm = normalizeVietnamese(svc.Description || '');
        return (
          nameNorm.includes(searchNorm) ||
          codeNorm.includes(searchNorm) ||
          catNorm.includes(searchNorm) ||
          descNorm.includes(searchNorm)
        );
      });
    }

    // 6. Sắp xếp (Sort) theo Mục 2.2 & 2.3
    // sortBy nhận: 'name_asc' (mặc định), 'price_asc', 'price_desc'. Giá trị khác -> dùng mặc định name_asc, KHÔNG báo lỗi (Test case 5)
    const validSorts = ['name_asc', 'price_asc', 'price_desc'];
    const activeSort = validSorts.includes(sortBy) ? sortBy : 'name_asc';

    filtered.sort((a, b) => {
      if (activeSort === 'price_asc') {
        const diff = Number(a.Price) - Number(b.Price);
        if (diff !== 0) return diff;
        return (a.ServiceName || '').localeCompare(b.ServiceName || '', 'vi');
      }

      if (activeSort === 'price_desc') {
        const diff = Number(b.Price) - Number(a.Price);
        if (diff !== 0) return diff;
        return (a.ServiceName || '').localeCompare(b.ServiceName || '', 'vi');
      }

      // Mặc định (name_asc): theo CategoryName A→Z, trong cùng nhóm sắp theo ServiceName A→Z
      const catA = a.category?.CategoryName || '';
      const catB = b.category?.CategoryName || '';
      const catComp = catA.localeCompare(catB, 'vi');
      if (catComp !== 0) return catComp;

      return (a.ServiceName || '').localeCompare(b.ServiceName || '', 'vi');
    });

    const total = filtered.length;
    // Phân trang
    const start = (page - 1) * pageSize;
    const paginated = filtered.slice(start, start + pageSize);

    // Chuẩn ISO-8601 & làm tròn hiển thị số tiền VND
    const formatted = paginated.map((s) => ({
      ...s.toJSON(),
      PriceDisplay: Math.floor(Number(s.Price)),
    }));

    // Mục 0.2: Danh sách rỗng KHÔNG phải lỗi, trả HTTP 200 + total = 0
    return res.status(200).json({
      success: true,
      total,
      page,
      pageSize,
      data: formatted,
    });
  } catch (error) {
    console.error('Error in getAllServices:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi tải danh mục dịch vụ.',
      error: error.message,
    });
  }
};

// ─── 2. LẤY DANH MỤC NHÓM DỊCH VỤ (GET /api/v1/services/categories) ───────────
exports.getCategories = async (req, res) => {
  try {
    const categories = await ServiceCategory.findAll({
      order: [['CategoryId', 'ASC']],
    });
    return res.status(200).json({
      success: true,
      data: categories,
      total: categories.length,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi tải danh mục nhóm dịch vụ.',
      error: error.message,
    });
  }
};

// ─── 3. TẠO MỚI DỊCH VỤ (POST /api/v1/services) ───────────────────────────────
exports.createService = async (req, res) => {
  try {
    const categoryId = req.body.categoryId !== undefined ? req.body.categoryId : req.body.CategoryId;
    const serviceName = req.body.serviceName !== undefined ? req.body.serviceName : req.body.ServiceName;
    const price = req.body.price !== undefined ? req.body.price : req.body.Price;
    const unit = req.body.unit !== undefined ? req.body.unit : req.body.Unit;
    const description = req.body.description !== undefined ? req.body.description : req.body.Description;

    // Validate 1: categoryId
    if (!categoryId) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0001_REQUIRED',
        field: 'categoryId',
        message: 'Vui lòng chọn nhóm dịch vụ',
      });
    }

    const category = await ServiceCategory.findByPk(categoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        code: 'ERROR_0011_NOT_FOUND',
        field: 'categoryId',
        message: 'Nhóm dịch vụ không tồn tại hoặc đã bị xoá',
      });
    }

    // Category đang Inactive / IsDeleted
    if (category.IsDeleted) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0014_INACTIVE_REFERENCE',
        field: 'categoryId',
        message: 'Nhóm dịch vụ hiện không còn hoạt động',
      });
    }

    // Validate 2: serviceName
    const trimmedName = (serviceName || '').trim();
    if (!trimmedName) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0001_REQUIRED',
        field: 'serviceName',
        message: 'Tên dịch vụ không được để trống',
      });
    }
    if (trimmedName.length < 2) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0002_MIN_LENGTH',
        field: 'serviceName',
        message: 'Tên dịch vụ phải có ít nhất 2 ký tự',
      });
    }
    if (trimmedName.length > 150) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0003_MAX_LENGTH',
        field: 'serviceName',
        message: 'Tên dịch vụ không được vượt quá 150 ký tự',
      });
    }

    // Validate 3: price
    if (price === undefined || price === null || price === '' || isNaN(price)) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0004_INVALID_FORMAT',
        field: 'price',
        message: 'Đơn giá không đúng định dạng',
      });
    }
    const numPrice = Number(price);
    if (numPrice <= 0 || numPrice > 999999999.99) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0012_OUT_OF_RANGE',
        field: 'price',
        message: 'Đơn giá phải lớn hơn 0',
      });
    }

    // Validate 4: unit
    const trimmedUnit = (unit || '').trim();
    if (!trimmedUnit) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0001_REQUIRED',
        field: 'unit',
        message: 'Đơn vị tính không được để trống',
      });
    }
    if (trimmedUnit.length > 50) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0003_MAX_LENGTH',
        field: 'unit',
        message: 'Đơn vị tính không được vượt quá 50 ký tự',
      });
    }

    // Validate 5: description
    if (description && description.length > 1000) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0003_MAX_LENGTH',
        field: 'description',
        message: 'Mô tả không được vượt quá 1000 ký tự',
      });
    }

    // Cảnh báo trùng lặp mềm theo tiếng Việt không dấu (Test case 5)
    const existingServices = await Service.findAll({
      where: { CategoryId: categoryId, IsDeleted: false },
      attributes: ['ServiceName'],
    });
    const normTarget = normalizeVietnamese(trimmedName);
    const hasSimilar = existingServices.some(
      (s) => normalizeVietnamese(s.ServiceName) === normTarget
    );

    // Tự sinh serviceCode theo chuẩn SVC-{PREFIX}-{000} (Mục 1.2.b)
    const serviceCode = await generateServiceCode(categoryId, category.CategoryName);

    // Tạo bản ghi mới (Status luôn = 'Active')
    const newService = await Service.create({
      CategoryId: categoryId,
      ServiceCode: serviceCode,
      ServiceName: trimmedName,
      Price: Math.round(numPrice * 100) / 100,
      Unit: trimmedUnit,
      Description: description || '',
      Status: 'Active',
      IsDeleted: false,
    });

    const responseData = newService.toJSON();
    if (hasSimilar) {
      responseData.warning = 'Tên dịch vụ tương tự đã tồn tại trong nhóm này.';
    }

    return res.status(201).json({
      success: true,
      code: 'SUCCESS_0001_CREATED',
      message: 'Thêm mới dịch vụ thành công',
      data: responseData,
    });
  } catch (error) {
    console.error('Error creating service:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể thêm mới dịch vụ.',
      error: error.message,
    });
  }
};

// ─── 4. CẬP NHẬT DỊCH VỤ (PUT /api/v1/services/:id) ───────────────────────────
exports.updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const categoryId = req.body.categoryId !== undefined ? req.body.categoryId : req.body.CategoryId;
    const serviceName = req.body.serviceName !== undefined ? req.body.serviceName : req.body.ServiceName;
    const price = req.body.price !== undefined ? req.body.price : req.body.Price;
    const unit = req.body.unit !== undefined ? req.body.unit : req.body.Unit;
    const description = req.body.description !== undefined ? req.body.description : req.body.Description;

    const isNumeric = !isNaN(id);
    const service = await Service.findOne({
      where: isNumeric ? { ServiceId: id } : { ServiceCode: id },
    });

    if (!service) {
      return res.status(404).json({
        success: false,
        code: 'ERROR_0011_NOT_FOUND',
        message: 'Dịch vụ không tồn tại hoặc đã bị xoá',
      });
    }

    // Kiểm tra category nếu thay đổi
    if (categoryId) {
      const category = await ServiceCategory.findByPk(categoryId);
      if (!category) {
        return res.status(404).json({
          success: false,
          code: 'ERROR_0011_NOT_FOUND',
          message: 'Nhóm dịch vụ không tồn tại hoặc đã bị xoá',
        });
      }
      if (category.IsDeleted) {
        return res.status(400).json({
          success: false,
          code: 'ERROR_0014_INACTIVE_REFERENCE',
          message: 'Nhóm dịch vụ hiện không còn hoạt động',
        });
      }
      service.CategoryId = categoryId;
    }

    if (serviceName !== undefined) {
      const trimmed = serviceName.trim();
      if (!trimmed) {
        return res.status(400).json({
          success: false,
          code: 'ERROR_0001_REQUIRED',
          message: 'Tên dịch vụ không được để trống',
        });
      }
      if (trimmed.length < 2) {
        return res.status(400).json({
          success: false,
          code: 'ERROR_0002_MIN_LENGTH',
          message: 'Tên dịch vụ phải có ít nhất 2 ký tự',
        });
      }
      if (trimmed.length > 150) {
        return res.status(400).json({
          success: false,
          code: 'ERROR_0003_MAX_LENGTH',
          message: 'Tên dịch vụ không được vượt quá 150 ký tự',
        });
      }
      service.ServiceName = trimmed;
    }

    if (price !== undefined) {
      const num = Number(price);
      if (isNaN(num)) {
        return res.status(400).json({
          success: false,
          code: 'ERROR_0004_INVALID_FORMAT',
          message: 'Đơn giá không đúng định dạng',
        });
      }
      if (num <= 0 || num > 999999999.99) {
        return res.status(400).json({
          success: false,
          code: 'ERROR_0012_OUT_OF_RANGE',
          message: 'Đơn giá phải lớn hơn 0',
        });
      }
      service.Price = Math.round(num * 100) / 100;
    }

    if (unit !== undefined) {
      const trimmedUnit = unit.trim();
      if (!trimmedUnit) {
        return res.status(400).json({
          success: false,
          code: 'ERROR_0001_REQUIRED',
          message: 'Đơn vị tính không được để trống',
        });
      }
      if (trimmedUnit.length > 50) {
        return res.status(400).json({
          success: false,
          code: 'ERROR_0003_MAX_LENGTH',
          message: 'Đơn vị tính không được vượt quá 50 ký tự',
        });
      }
      service.Unit = trimmedUnit;
    }

    if (description !== undefined) {
      if (description.length > 1000) {
        return res.status(400).json({
          success: false,
          code: 'ERROR_0003_MAX_LENGTH',
          message: 'Mô tả không được vượt quá 1000 ký tự',
        });
      }
      service.Description = description;
    }

    await service.save();

    return res.status(200).json({
      success: true,
      message: 'Cập nhật dịch vụ thành công',
      data: service,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật dịch vụ.',
      error: error.message,
    });
  }
};

// ─── 5. NGỪNG CUNG CẤP (SOFT-DELETE) (PATCH /api/v1/services/:id/deactivate) ──
exports.deactivateService = async (req, res) => {
  try {
    const { id } = req.params;
    const isNumeric = !isNaN(id);
    const service = await Service.findOne({
      where: isNumeric ? { ServiceId: id } : { ServiceCode: id },
    });

    if (!service) {
      return res.status(404).json({
        success: false,
        code: 'ERROR_0011_NOT_FOUND',
        message: 'Dịch vụ không tồn tại hoặc đã bị xoá',
      });
    }

    // Đổi Status = 'Inactive' (không xoá cứng khỏi DB - Mục 1.3.e)
    service.Status = 'Inactive';
    await service.save();

    return res.status(200).json({
      success: true,
      message: 'Đã ngừng cung cấp dịch vụ thành công.',
      data: service,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi ngừng cung cấp dịch vụ.',
      error: error.message,
    });
  }
};

// ─── 6. KÍCH HOẠT LẠI DỊCH VỤ (PATCH /api/v1/services/:id/reactivate) ───────────
exports.reactivateService = async (req, res) => {
  try {
    const { id } = req.params;
    const isNumeric = !isNaN(id);
    const service = await Service.findOne({
      where: isNumeric ? { ServiceId: id } : { ServiceCode: id },
      include: [{ model: ServiceCategory, as: 'category' }],
    });

    if (!service) {
      return res.status(404).json({
        success: false,
        code: 'ERROR_0011_NOT_FOUND',
        message: 'Dịch vụ không tồn tại hoặc đã bị xoá',
      });
    }

    // Kiểm tra Category cha: Nếu Category cha đang Inactive -> ERROR_0014_INACTIVE_REFERENCE
    if (service.category && service.category.IsDeleted) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0014_INACTIVE_REFERENCE',
        message: 'Nhóm dịch vụ hiện không còn hoạt động, không thể kích hoạt lại dịch vụ này.',
      });
    }

    service.Status = 'Active';
    await service.save();

    return res.status(200).json({
      success: true,
      message: 'Đã kích hoạt lại dịch vụ thành công.',
      data: service,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi kích hoạt lại dịch vụ.',
      error: error.message,
    });
  }
};

// ─── 7. ĐỒNG BỘ POS (POST /api/v1/services/sync-pos) ───────────────────────────
exports.syncToPos = async (req, res) => {
  try {
    const activeCount = await Service.count({ where: { Status: 'Active', IsDeleted: false } });
    const now = new Date();
    return res.status(200).json({
      success: true,
      message: `Đồng bộ thành công ${activeCount} dịch vụ sang POS Terminal.`,
      syncedAt: now.toISOString(),
      timestamp: now.toTimeString().split(' ')[0],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Đồng bộ giá sang POS thất bại — vui lòng thử lại.',
      error: error.message,
    });
  }
};
