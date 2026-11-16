'use strict';

const { Service, ServiceCategory, sequelize } = require('../../../models');
const { Op } = require('sequelize');
const ExcelJS = require('exceljs');

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
    const requestedPageSize = parseInt(req.query.pageSize, 10) || 20;
    const maxLimit = req.query.all === 'true' || requestedPageSize > 100 ? 1000 : 100;
    const pageSize = Math.min(Math.max(requestedPageSize, 1), maxLimit);
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
    const where = { IsDeleted: false };
    if (req.query.status && req.query.status !== 'All') {
      where.Status = req.query.status;
    }
    const categories = await ServiceCategory.findAll({
      where,
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
    if (category.IsDeleted || category.Status === 'Inactive') {
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
          field: 'categoryId',
          message: 'Nhóm dịch vụ không tồn tại hoặc đã bị xoá',
        });
      }
      if (category.IsDeleted || category.Status === 'Inactive') {
        return res.status(400).json({
          success: false,
          code: 'ERROR_0014_INACTIVE_REFERENCE',
          field: 'categoryId',
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
          field: 'serviceName',
          message: 'Tên dịch vụ không được để trống',
        });
      }
      if (trimmed.length < 2) {
        return res.status(400).json({
          success: false,
          code: 'ERROR_0002_MIN_LENGTH',
          field: 'serviceName',
          message: 'Tên dịch vụ phải có ít nhất 2 ký tự',
        });
      }
      if (trimmed.length > 150) {
        return res.status(400).json({
          success: false,
          code: 'ERROR_0003_MAX_LENGTH',
          field: 'serviceName',
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
          field: 'price',
          message: 'Đơn giá không đúng định dạng',
        });
      }
      if (num <= 0 || num > 999999999.99) {
        return res.status(400).json({
          success: false,
          code: 'ERROR_0012_OUT_OF_RANGE',
          field: 'price',
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
      service.Unit = trimmedUnit;
    }

    if (description !== undefined) {
      if (description.length > 1000) {
        return res.status(400).json({
          success: false,
          code: 'ERROR_0003_MAX_LENGTH',
          field: 'description',
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
    if (service.category && (service.category.IsDeleted || service.category.Status === 'Inactive')) {
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

// ─── 7. TẠO MỚI NHÓM DỊCH VỤ (POST /api/v1/services/categories) ─────────────────
exports.createCategory = async (req, res) => {
  try {
    const { categoryName, CategoryName, description, Description } = req.body;
    const rawName = categoryName !== undefined ? categoryName : CategoryName;
    const rawDesc = description !== undefined ? description : Description;

    if (!rawName || typeof rawName !== 'string' || !rawName.trim()) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0001_REQUIRED',
        message: 'Tên nhóm dịch vụ là bắt buộc',
        field: 'categoryName',
      });
    }

    const trimmedName = rawName.trim();
    if (trimmedName.length < 2) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0002_MIN_LENGTH',
        message: 'Tên nhóm dịch vụ phải có ít nhất 2 ký tự',
        field: 'categoryName',
      });
    }

    if (trimmedName.length > 100) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0003_MAX_LENGTH',
        message: 'Tên nhóm dịch vụ không được vượt quá 100 ký tự',
        field: 'categoryName',
      });
    }

    const trimmedDesc = rawDesc ? String(rawDesc).trim() : null;
    if (trimmedDesc && trimmedDesc.length > 500) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0003_MAX_LENGTH',
        message: 'Mô tả nhóm dịch vụ không được vượt quá 500 ký tự',
        field: 'description',
      });
    }

    // Kiểm tra trùng lặp không phân biệt hoa thường và không phân biệt dấu tiếng Việt
    const existingCategories = await ServiceCategory.findAll({
      where: { IsDeleted: false },
    });
    const normalizedInput = normalizeVietnamese(trimmedName);
    const isDuplicate = existingCategories.some(
      (cat) => normalizeVietnamese(cat.CategoryName) === normalizedInput
    );

    if (isDuplicate) {
      return res.status(409).json({
        success: false,
        code: 'ERROR_0007_DUPLICATE',
        message: 'Tên nhóm dịch vụ đã tồn tại trong hệ thống',
        field: 'categoryName',
      });
    }

    const newCategory = await ServiceCategory.create({
      CategoryName: trimmedName,
      Description: trimmedDesc,
      Status: 'Active',
      IsDeleted: false,
    });

    return res.status(201).json({
      success: true,
      code: 'SUCCESS_0001_CREATED',
      message: 'Tạo mới nhóm dịch vụ thành công',
      data: newCategory,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo mới nhóm dịch vụ.',
      error: error.message,
    });
  }
};


/**
 * Xuất danh mục dịch vụ & bảng giá chuẩn Excel 5 sao (.xlsx)
 * GET /api/v1/services/export
 */
exports.exportServicesExcel = async (req, res) => {
  try {
    const { search, group, categoryId, status, minPrice, maxPrice, sortBy } = req.query;

    const where = { IsDeleted: false };
    const targetGroup = group !== undefined ? group : categoryId;
    if (targetGroup && targetGroup !== 'All') {
      const parsedCatId = parseInt(targetGroup, 10);
      if (!isNaN(parsedCatId)) {
        where.CategoryId = parsedCatId;
      }
    }

    if (status && status !== 'All') {
      where.Status = status;
    }

    let minP = null;
    let maxP = null;
    if (minPrice !== undefined && minPrice !== '') {
      minP = Number(minPrice);
    }
    if (maxPrice !== undefined && maxPrice !== '') {
      maxP = Number(maxPrice);
    }

    const allServices = await Service.findAll({
      where,
      include: [
        {
          model: ServiceCategory,
          as: 'category',
          attributes: ['CategoryId', 'CategoryName', 'Description', 'IsDeleted', 'Status'],
        },
      ],
      order: [['ServiceCode', 'ASC']],
    });

    let filtered = allServices.filter((svc) => {
      const priceNum = Number(svc.Price);
      if (minP !== null && !isNaN(minP) && priceNum < minP) return false;
      if (maxP !== null && !isNaN(maxP) && priceNum > maxP) return false;
      return true;
    });

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
      const catA = a.category?.CategoryName || '';
      const catB = b.category?.CategoryName || '';
      const catComp = catA.localeCompare(catB, 'vi');
      if (catComp !== 0) return catComp;
      return (a.ServiceName || '').localeCompare(b.ServiceName || '', 'vi');
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Grand Horizon Luxury Hotel Management System';
    workbook.lastModifiedBy = 'PMS Service Engine';
    workbook.created = new Date();
    workbook.modified = new Date();

    const sheet = workbook.addWorksheet('Bảng Giá Dịch Vụ', {
      views: [{ showGridLines: true }],
      properties: { defaultRowHeight: 24 },
    });

    const BORDER_THIN = {
      top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    };

    const BORDER_HEADER = {
      top: { style: 'medium', color: { argb: 'FF0F766E' } },
      left: { style: 'thin', color: { argb: 'FF94A3B8' } },
      bottom: { style: 'medium', color: { argb: 'FF0F766E' } },
      right: { style: 'thin', color: { argb: 'FF94A3B8' } },
    };

    const BORDER_SUMMARY = {
      top: { style: 'thin', color: { argb: 'FF0F766E' } },
      bottom: { style: 'double', color: { argb: 'FF0F766E' } },
      left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    };

    // Dòng 1: Banner thương hiệu
    sheet.mergeCells('A1:I1');
    const brandCell = sheet.getCell('A1');
    brandCell.value = 'GRAND HORIZON LUXURY HOTEL & RESORT • PHÂN HỆ QUẢN TRỊ DỊCH VỤ PMS';
    brandCell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF0D9488' } };
    brandCell.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(1).height = 20;

    // Dòng 2: Tiêu đề báo cáo
    sheet.mergeCells('A2:I2');
    const titleCell = sheet.getCell('A2');
    titleCell.value = 'BẢNG GIÁ NIÊM YẾT VÀ DANH MỤC DỊCH VỤ KHÁCH SẠN';
    titleCell.font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(2).height = 36;

    // Dòng 3: Metadata
    sheet.mergeCells('A3:I3');
    const subTitleCell = sheet.getCell('A3');
    subTitleCell.value = `Thời điểm xuất: ${new Date().toLocaleString('vi-VN')}   |   Tổng số: ${filtered.length} dịch vụ   |   Đơn vị tiền tệ: Đồng Việt Nam (VND)`;
    subTitleCell.font = { name: 'Segoe UI', size: 9.5, italic: true, color: { argb: 'FF475569' } };
    subTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    subTitleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(3).height = 24;

    sheet.addRow([]); // Dòng 4 trống

    // Dòng 5: Tiêu đề các cột dữ liệu
    const tableHeader = sheet.addRow([
      'STT',
      'Mã Dịch Vụ',
      'Tên Dịch Vụ',
      'Phân Nhóm',
      'Đơn Giá (VND)',
      'Đơn Vị Tính',
      'Trạng Thái',
      'Mô Tả Chi Tiết',
      'Ngày Cập Nhật',
    ]);
    tableHeader.height = 30;
    tableHeader.eachCell((cell) => {
      cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = BORDER_HEADER;
    });

    let totalAmount = 0;

    filtered.forEach((s, idx) => {
      const price = Number(s.Price) || 0;
      totalAmount += price;
      const isActive = s.Status === 'Active';
      const statusLabel = isActive ? 'Đang kinh doanh' : 'Tạm ngừng';
      const statusBg = isActive ? 'FFECFDF5' : 'FFFEF2F2';
      const statusFg = isActive ? 'FF047857' : 'FFB91C1C';

      const updateDateStr = s.UpdatedAt
        ? new Date(s.UpdatedAt).toLocaleDateString('vi-VN')
        : '—';

      const row = sheet.addRow([
        idx + 1,
        s.ServiceCode || `SVC-${s.ServiceId}`,
        s.ServiceName,
        s.category?.CategoryName || 'Khác',
        price,
        s.Unit || '/lượt',
        statusLabel,
        s.Description || '—',
        updateDateStr,
      ]);

      row.height = 24;
      const isEven = idx % 2 === 1;
      const bgArgb = isEven ? 'FFF8FAFC' : 'FFFFFFFF';

      // Cột 1: STT
      row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(1).font = { name: 'Segoe UI', size: 9.5, color: { argb: 'FF64748B' } };

      // Cột 2: Mã Dịch Vụ
      row.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(2).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF0F766E' } };

      // Cột 3: Tên Dịch Vụ
      row.getCell(3).alignment = { vertical: 'middle', horizontal: 'left' };
      row.getCell(3).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF0F172A' } };

      // Cột 4: Phân Nhóm
      row.getCell(4).alignment = { vertical: 'middle', horizontal: 'left' };
      row.getCell(4).font = { name: 'Segoe UI', size: 9.5, color: { argb: 'FF334155' } };

      // Cột 5: Đơn Giá (VND)
      const priceCell = row.getCell(5);
      priceCell.alignment = { vertical: 'middle', horizontal: 'right' };
      priceCell.font = { name: 'Segoe UI', size: 10.5, bold: true, color: { argb: 'FF0F766E' } };
      priceCell.numFmt = '#,##0 "₫"';

      // Cột 6: Đơn Vị Tính
      row.getCell(6).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(6).font = { name: 'Segoe UI', size: 9.5, color: { argb: 'FF64748B' } };

      // Cột 7: Trạng Thái (Badge)
      const stCell = row.getCell(7);
      stCell.alignment = { vertical: 'middle', horizontal: 'center' };
      stCell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: statusFg } };

      // Cột 8: Mô Tả Chi Tiết
      row.getCell(8).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
      row.getCell(8).font = { name: 'Segoe UI', size: 9, color: { argb: 'FF475569' } };

      // Cột 9: Ngày Cập Nhật
      row.getCell(9).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(9).font = { name: 'Segoe UI', size: 9, color: { argb: 'FF64748B' } };

      for (let c = 1; c <= 9; c++) {
        const cell = row.getCell(c);
        cell.border = BORDER_THIN;
        if (c === 7) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: statusBg } };
        } else {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
        }
      }
    });

    // Dòng tổng hợp
    const avgPrice = filtered.length > 0 ? Math.round(totalAmount / filtered.length) : 0;
    const summaryRow = sheet.addRow([
      `TỔNG CỘNG (${filtered.length} DỊCH VỤ)  |  ĐƠN GIÁ BÌNH QUÂN:`,
      '',
      '',
      '',
      avgPrice,
      '',
      '',
      '',
      '',
    ]);
    const summaryRowIdx = sheet.rowCount;
    sheet.mergeCells(`A${summaryRowIdx}:D${summaryRowIdx}`);
    sheet.mergeCells(`F${summaryRowIdx}:I${summaryRowIdx}`);

    summaryRow.height = 28;
    const sumLabel = summaryRow.getCell(1);
    sumLabel.alignment = { vertical: 'middle', horizontal: 'right' };
    sumLabel.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF1E293B' } };
    sumLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    sumLabel.border = BORDER_SUMMARY;

    const sumVal = summaryRow.getCell(5);
    sumVal.alignment = { vertical: 'middle', horizontal: 'right' };
    sumVal.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FF0F766E' } };
    sumVal.numFmt = '#,##0 "₫"';
    sumVal.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    sumVal.border = BORDER_SUMMARY;

    const sumTail = summaryRow.getCell(6);
    sumTail.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    sumTail.border = BORDER_SUMMARY;

    // Chữ ký xác nhận
    sheet.addRow([]);
    sheet.addRow([]);
    const signRow = sheet.addRow([
      '',
      'Người Lập Biểu Mẫu',
      '',
      '',
      'Trưởng Bộ Phận Dịch Vụ',
      '',
      '',
      'Ban Giám Đốc Khách Sạn',
      '',
    ]);
    signRow.height = 22;
    signRow.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF334155' } };
    signRow.alignment = { vertical: 'middle', horizontal: 'center' };

    const noteRow = sheet.addRow([
      '',
      '(Ký, ghi rõ họ tên)',
      '',
      '',
      '(Ký, ghi rõ họ tên)',
      '',
      '',
      '(Ký, đóng dấu phê duyệt)',
      '',
    ]);
    noteRow.height = 20;
    noteRow.font = { name: 'Segoe UI', size: 8.5, italic: true, color: { argb: 'FF64748B' } };
    noteRow.alignment = { vertical: 'middle', horizontal: 'center' };

    sheet.columns = [
      { width: 8 },
      { width: 18 },
      { width: 32 },
      { width: 22 },
      { width: 20 },
      { width: 14 },
      { width: 20 },
      { width: 36 },
      { width: 18 },
    ];

    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const filename = `Bang_Gia_Dich_Vu_${todayStr}.xlsx`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('GET /api/v1/services/export error:', err);
    res.status(500).json({ success: false, message: 'Lỗi xuất Excel: ' + err.message });
  }
};
