'use strict';

const { Service, ServiceCategory } = require('../../../models');
const ExcelJS = require('exceljs');
const {
  trimUnicode,
  isBlankUnicode,
  parseStrictPositiveInt,
  parseStrictNumber,
  validatePaginationParams,
  extractExpectedVersion,
  assertVersionMatch,
  atomicVersionUpdate,
  sendValidationError,
} = require('../../../shared/utils/qaValidators');

// In-flight lock sets to prevent concurrent race-condition duplicates (QA Scenario #9)
const inFlightServiceCreates = new Set();
const inFlightCategoryCreates = new Set();

/**
 * Helper: Chuẩn hóa chuỗi tiếng Việt (loại bỏ dấu và chuyển chữ thường)
 * Dùng theo quy ước mục 0.2: NFD unicode normalize, an toàn với kiểu dữ liệu không phải chuỗi.
 */
const normalizeVietnamese = (str) => {
  if (typeof str !== 'string') return '';
  return trimUnicode(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, (m) => (m === 'đ' ? 'd' : 'D'))
    .toLowerCase();
};

/**
 * Helper: Chuẩn hóa dữ liệu Service trả về cho FE (bao gồm version & PriceDisplay)
 */
const serializeService = (svc) => {
  if (!svc) return null;
  const plain = typeof svc.toJSON === 'function' ? svc.toJSON() : { ...svc };
  const ver = Number(plain.Version ?? plain.version ?? 1);
  return {
    ...plain,
    Version: ver,
    version: ver,
    PriceDisplay: Math.floor(Number(plain.Price || 0)),
  };
};

/**
 * Helper: Phân giải và kiểm tra chặt chẽ tham số :id (ServiceId nguyên dương hoặc ServiceCode hợp lệ)
 * Ngăn chặn lỗi MySQL tự cắt chuỗi '1abc' -> 1 (QA Scenario #3).
 */
const resolveServiceIdentifier = (rawId) => {
  if (rawId === undefined || rawId === null) {
    return {
      ok: false,
      status: 400,
      code: 'ERROR_0004_INVALID_FORMAT',
      field: 'id',
      message: 'Mã dịch vụ (id) không hợp lệ',
    };
  }
  const str = trimUnicode(String(rawId));
  if (/^SVC-[A-Z0-9]+-\d+$/i.test(str)) {
    return {
      ok: true,
      where: { ServiceCode: str.toUpperCase(), IsDeleted: false },
    };
  }

  const parsed = parseStrictPositiveInt(rawId, {
    field: 'id',
    message: 'Mã dịch vụ (id) không hợp lệ',
  });
  if (!parsed.ok) {
    return parsed;
  }

  return {
    ok: true,
    where: { ServiceId: parsed.value, IsDeleted: false },
    serviceId: parsed.value,
  };
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
// Tuân thủ đặc tả FEAT-SERVICE-02 & QA Scenarios #4-#8, #10, #14
exports.getAllServices = async (req, res) => {
  try {
    const { search, group, categoryId, status, minPrice, maxPrice, sortBy } = req.query;

    // 0. Kiểm tra sơ bộ tham số phân trang (bắt lỗi page=abc, page=0, page=-1 ngay lập tức)
    const prePagination = validatePaginationParams(req.query, {
      defaultPageSize: 10,
      maxPageSize: 100,
      allowAll: true,
    });
    if (!prePagination.ok) {
      return sendValidationError(res, prePagination);
    }

    // 1. Validate status (QA Scenario #8 & #14)
    let cleanStatus = 'Active';
    if (status !== undefined && status !== null && !isBlankUnicode(String(status))) {
      cleanStatus = trimUnicode(String(status));
      if (!['Active', 'Inactive', 'All'].includes(cleanStatus)) {
        return res.status(400).json({
          success: false,
          code: 'ERROR_0005_INVALID_VALUE',
          field: 'status',
          message: 'Trạng thái lọc (status) không hợp lệ. Chỉ chấp nhận Active, Inactive hoặc All.',
        });
      }

      if (cleanStatus === 'Inactive' || cleanStatus === 'All') {
        if (!req.user) {
          return res.status(401).json({
            success: false,
            code: 'ERROR_0009_UNAUTHENTICATED',
            message: 'Bạn cần đăng nhập để tra cứu dịch vụ ngừng hoạt động',
          });
        }
        const role = req.user?.roleName || req.user?.role?.RoleName || req.user?.Role || '';
        if (role === 'Guest' || Number(req.user?.roleId) === 5) {
          return res.status(403).json({
            success: false,
            code: 'ERROR_0010_FORBIDDEN',
            message: 'Bạn không có quyền tra cứu dịch vụ ngừng hoạt động',
          });
        }
      }
    }

    // 2. Validate search query (Tối đa 100 ký tự sau khi trimUnicode - QA Scenario #5 & #6)
    let trimmedSearch = '';
    if (search !== undefined && search !== null) {
      if (typeof search !== 'string') {
        return res.status(400).json({
          success: false,
          code: 'ERROR_0004_INVALID_FORMAT',
          field: 'search',
          message: 'Từ khoá tìm kiếm không hợp lệ',
        });
      }
      trimmedSearch = trimUnicode(search);
      if (trimmedSearch.length > 100) {
        return res.status(400).json({
          success: false,
          code: 'ERROR_0003_MAX_LENGTH',
          field: 'search',
          message: 'Từ khoá tìm kiếm không được vượt quá 100 ký tự',
        });
      }
    }

    // 3. Validate khoảng giá minPrice / maxPrice (Hỗ trợ chữ số full-width ０-９ - QA Scenario #7)
    let minP = null;
    let maxP = null;
    if (minPrice !== undefined && minPrice !== null && !isBlankUnicode(String(minPrice))) {
      const parsedMin = parseStrictNumber(minPrice, {
        normalizeFullWidth: true,
        allowDecimal: true,
        field: 'minPrice',
        message: 'Khoảng giá không hợp lệ',
      });
      if (!parsedMin.ok || parsedMin.value < 0) {
        return res.status(400).json({
          success: false,
          code: 'ERROR_0004_INVALID_FORMAT',
          field: 'minPrice',
          message: 'Khoảng giá không hợp lệ',
        });
      }
      minP = parsedMin.value;
    }
    if (maxPrice !== undefined && maxPrice !== null && !isBlankUnicode(String(maxPrice))) {
      const parsedMax = parseStrictNumber(maxPrice, {
        normalizeFullWidth: true,
        allowDecimal: true,
        field: 'maxPrice',
        message: 'Khoảng giá không hợp lệ',
      });
      if (!parsedMax.ok || parsedMax.value < 0) {
        return res.status(400).json({
          success: false,
          code: 'ERROR_0004_INVALID_FORMAT',
          field: 'maxPrice',
          message: 'Khoảng giá không hợp lệ',
        });
      }
      maxP = parsedMax.value;
    }
    if (minP !== null && maxP !== null && minP > maxP) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0004_INVALID_FORMAT',
        message: 'Khoảng giá không hợp lệ',
      });
    }

    // 4. Xây dựng điều kiện lọc cơ bản (WHERE) & Validate group / categoryId (QA Scenario #8)
    const where = { IsDeleted: false };
    const targetGroup = group !== undefined ? group : categoryId;
    if (
      targetGroup !== undefined &&
      targetGroup !== null &&
      !isBlankUnicode(String(targetGroup)) &&
      trimUnicode(String(targetGroup)) !== 'All'
    ) {
      const parsedCatId = parseStrictPositiveInt(targetGroup, {
        field: 'categoryId',
        message: 'Nhóm dịch vụ (categoryId) không hợp lệ',
      });
      if (!parsedCatId.ok) {
        return sendValidationError(res, parsedCatId);
      }
      where.CategoryId = parsedCatId.value;
    }

    const isPublicLookup = cleanStatus === 'Active';
    if (cleanStatus !== 'All') {
      where.Status = cleanStatus;
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
    });

    // 5. Lọc dữ liệu theo Quy tắc nghiệp vụ 2.3
    let filtered = allServices.filter((svc) => {
      if (isPublicLookup) {
        const cat = svc.category;
        if (!cat || cat.IsDeleted || cat.Status === 'Inactive') {
          return false;
        }
      }

      const priceNum = Number(svc.Price);
      if (minP !== null && priceNum < minP) return false;
      if (maxP !== null && priceNum > maxP) return false;

      return true;
    });

    // 6. Lọc tìm kiếm theo chuẩn Unicode NFD không dấu
    if (trimmedSearch) {
      const searchNorm = normalizeVietnamese(trimmedSearch);
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

    // 7. Sắp xếp (Sort)
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

    const total = filtered.length;

    // 8. Kiểm tra phân trang với total thực tế (QA Scenario #10: page=99999 -> 404)
    const pagination = validatePaginationParams(req.query, {
      total,
      defaultPageSize: 10,
      maxPageSize: 100,
      allowAll: true,
    });
    if (!pagination.ok) {
      return sendValidationError(res, pagination);
    }

    const { page, pageSize, offset } = pagination;
    const paginated = filtered.slice(offset, offset + pageSize);
    const formatted = paginated.map((s) => serializeService(s));

    return res.status(200).json({
      success: true,
      total,
      page,
      pageSize,
      totalPages: pagination.totalPages,
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

// ─── 1b. LẤY CHI TIẾT DỊCH VỤ THEO ID (GET /api/v1/services/:id) ──────────────
// QA Scenario #3: Kiểm tra chặt chẽ :id ('abc', '1abc', '99999999999')
exports.getServiceById = async (req, res) => {
  try {
    const idCheck = resolveServiceIdentifier(req.params.id);
    if (!idCheck.ok) {
      return sendValidationError(res, idCheck);
    }

    const service = await Service.findOne({
      where: idCheck.where,
      include: [
        {
          model: ServiceCategory,
          as: 'category',
          attributes: ['CategoryId', 'CategoryName', 'Description', 'IsDeleted', 'Status'],
        },
      ],
    });

    if (!service || service.IsDeleted) {
      return res.status(404).json({
        success: false,
        code: 'ERROR_0011_NOT_FOUND',
        message: 'Dịch vụ không tồn tại hoặc đã bị xoá',
      });
    }

    if (service.Status === 'Inactive') {
      const role = req.user?.roleName || req.user?.role?.RoleName || req.user?.Role || '';
      const isStaff = ['Admin', 'Manager', 'Staff', 'Receptionist', 'Kitchen', 'Housekeeping'].includes(role);
      if (!isStaff) {
        return res.status(404).json({
          success: false,
          code: 'ERROR_0011_NOT_FOUND',
          message: 'Dịch vụ không tồn tại hoặc đã ngừng cung cấp',
        });
      }
    }

    return res.status(200).json({
      success: true,
      data: serializeService(service),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi tải thông tin chi tiết dịch vụ.',
      error: error.message,
    });
  }
};

// ─── 2. LẤY DANH MỤC NHÓM DỊCH VỤ (GET /api/v1/services/categories) ───────────
exports.getCategories = async (req, res) => {
  try {
    const where = { IsDeleted: false };
    if (req.query.status !== undefined && req.query.status !== null && !isBlankUnicode(String(req.query.status))) {
      const cleanStatus = trimUnicode(String(req.query.status));
      if (!['Active', 'Inactive', 'All'].includes(cleanStatus)) {
        return res.status(400).json({
          success: false,
          code: 'ERROR_0005_INVALID_VALUE',
          field: 'status',
          message: 'Trạng thái lọc (status) không hợp lệ',
        });
      }
      if (cleanStatus !== 'All') {
        where.Status = cleanStatus;
      }
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
  let lockKey = null;
  try {
    const categoryId = req.body.categoryId !== undefined ? req.body.categoryId : req.body.CategoryId;
    const serviceName = req.body.serviceName !== undefined ? req.body.serviceName : req.body.ServiceName;
    const price = req.body.price !== undefined ? req.body.price : req.body.Price;
    const unit = req.body.unit !== undefined ? req.body.unit : req.body.Unit;
    const description = req.body.description !== undefined ? req.body.description : req.body.Description;

    // Validate 1: categoryId
    if (categoryId === undefined || categoryId === null || (typeof categoryId === 'string' && isBlankUnicode(categoryId))) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0001_REQUIRED',
        field: 'categoryId',
        message: 'Vui lòng chọn nhóm dịch vụ',
      });
    }

    const parsedCatId = parseStrictPositiveInt(categoryId, {
      field: 'categoryId',
      message: 'Nhóm dịch vụ (categoryId) không hợp lệ',
    });
    if (!parsedCatId.ok) {
      return sendValidationError(res, parsedCatId);
    }

    const category = await ServiceCategory.findByPk(parsedCatId.value);
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

    // Validate 2: serviceName (Guard non-string + trimUnicode - QA Scenarios #4, #5, #6)
    if (serviceName !== undefined && serviceName !== null && typeof serviceName !== 'string') {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0004_INVALID_FORMAT',
        field: 'serviceName',
        message: 'Tên dịch vụ không đúng định dạng chuỗi ký tự',
      });
    }
    const trimmedName = trimUnicode(serviceName);
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

    // Validate 3: price (Hỗ trợ chữ số full-width ０-９ - QA Scenario #7)
    if (price === undefined || price === null || (typeof price === 'string' && isBlankUnicode(price))) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0004_INVALID_FORMAT',
        field: 'price',
        message: 'Đơn giá không đúng định dạng',
      });
    }
    const parsedPrice = parseStrictNumber(price, {
      normalizeFullWidth: true,
      allowDecimal: true,
      field: 'price',
      message: 'Đơn giá không đúng định dạng',
    });
    if (!parsedPrice.ok) {
      return sendValidationError(res, parsedPrice);
    }
    const numPrice = parsedPrice.value;
    if (numPrice <= 0 || numPrice > 999999999.99) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0012_OUT_OF_RANGE',
        field: 'price',
        message: 'Đơn giá phải lớn hơn 0 và không vượt quá 999,999,999.99',
      });
    }

    // Validate 4: unit
    if (unit !== undefined && unit !== null && typeof unit !== 'string') {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0004_INVALID_FORMAT',
        field: 'unit',
        message: 'Đơn vị tính không đúng định dạng chuỗi ký tự',
      });
    }
    const trimmedUnit = trimUnicode(unit);
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

    // Validate 5: description (Trim Unicode TRƯỚC khi kiểm tra độ dài 1000 - QA Scenario #5 & #6)
    if (description !== undefined && description !== null && typeof description !== 'string') {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0004_INVALID_FORMAT',
        field: 'description',
        message: 'Mô tả không đúng định dạng chuỗi ký tự',
      });
    }
    const trimmedDesc = description ? trimUnicode(description) : '';
    if (trimmedDesc.length > 1000) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0003_MAX_LENGTH',
        field: 'description',
        message: 'Mô tả không được vượt quá 1000 ký tự',
      });
    }

    // QA Scenario #9: Chặn trùng lặp tên dịch vụ (không phân biệt hoa thường & dấu tiếng Việt trong các dịch vụ đang Active)
    const normTarget = normalizeVietnamese(trimmedName);
    lockKey = normTarget;
    if (inFlightServiceCreates.has(lockKey)) {
      return res.status(409).json({
        success: false,
        code: 'ERROR_0007_DUPLICATE',
        field: 'serviceName',
        message: 'Dịch vụ cùng tên đang được xử lý hoặc đã tồn tại trong hệ thống',
      });
    }
    inFlightServiceCreates.add(lockKey);

    const existingServices = await Service.findAll({
      where: { IsDeleted: false },
      attributes: ['ServiceId', 'CategoryId', 'ServiceName', 'Status'],
    });
    const duplicateActive = existingServices.find(
      (s) => s.Status === 'Active' && normalizeVietnamese(s.ServiceName) === normTarget
    );
    if (duplicateActive) {
      return res.status(409).json({
        success: false,
        code: 'ERROR_0007_DUPLICATE',
        field: 'serviceName',
        message: 'Tên dịch vụ đã tồn tại trong hệ thống',
      });
    }

    const serviceCode = await generateServiceCode(parsedCatId.value, category.CategoryName);

    const newService = await Service.create({
      CategoryId: parsedCatId.value,
      ServiceCode: serviceCode,
      ServiceName: trimmedName,
      Price: Math.round(numPrice * 100) / 100,
      Unit: trimmedUnit,
      Description: trimmedDesc,
      Status: 'Active',
      IsDeleted: false,
      Version: 1,
    });

    return res.status(201).json({
      success: true,
      code: 'SUCCESS_0001_CREATED',
      message: 'Thêm mới dịch vụ thành công',
      data: serializeService(newService),
    });
  } catch (error) {
    console.error('Error creating service:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể thêm mới dịch vụ.',
      error: error.message,
    });
  } finally {
    if (lockKey) {
      inFlightServiceCreates.delete(lockKey);
    }
  }
};

// ─── 4. CẬP NHẬT DỊCH VỤ (PUT /api/v1/services/:id) ───────────────────────────
// QA Scenarios #2 (Optimistic Locking), #3 (Strict ID), #4-#7 (Validation & Unicode/Full-width)
exports.updateService = async (req, res) => {
  try {
    const idCheck = resolveServiceIdentifier(req.params.id);
    if (!idCheck.ok) {
      return sendValidationError(res, idCheck);
    }

    const verCheck = extractExpectedVersion(req);
    if (!verCheck.ok) {
      return sendValidationError(res, verCheck);
    }

    const categoryId = req.body.categoryId !== undefined ? req.body.categoryId : req.body.CategoryId;
    const serviceName = req.body.serviceName !== undefined ? req.body.serviceName : req.body.ServiceName;
    const price = req.body.price !== undefined ? req.body.price : req.body.Price;
    const unit = req.body.unit !== undefined ? req.body.unit : req.body.Unit;
    const description = req.body.description !== undefined ? req.body.description : req.body.Description;

    const service = await Service.findOne({
      where: idCheck.where,
    });

    if (!service || service.IsDeleted) {
      return res.status(404).json({
        success: false,
        code: 'ERROR_0011_NOT_FOUND',
        message: 'Dịch vụ không tồn tại hoặc đã bị xoá',
      });
    }

    // Kiểm tra Optimistic Locking (QA Scenario #2)
    const matchCheck = assertVersionMatch(service, verCheck.version, 'Version');
    if (!matchCheck.ok) {
      return sendValidationError(res, matchCheck);
    }

    const updates = {};

    // Kiểm tra category nếu thay đổi
    if (categoryId !== undefined && categoryId !== null && categoryId !== '') {
      const parsedCatId = parseStrictPositiveInt(categoryId, {
        field: 'categoryId',
        message: 'Nhóm dịch vụ (categoryId) không hợp lệ',
      });
      if (!parsedCatId.ok) {
        return sendValidationError(res, parsedCatId);
      }

      const category = await ServiceCategory.findByPk(parsedCatId.value);
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
      updates.CategoryId = parsedCatId.value;
    }

    if (serviceName !== undefined) {
      if (serviceName === null || typeof serviceName !== 'string') {
        return res.status(400).json({
          success: false,
          code: 'ERROR_0004_INVALID_FORMAT',
          field: 'serviceName',
          message: 'Tên dịch vụ không đúng định dạng chuỗi ký tự',
        });
      }
      const trimmed = trimUnicode(serviceName);
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

      const normTarget = normalizeVietnamese(trimmed);
      const otherServices = await Service.findAll({
        where: { IsDeleted: false, Status: 'Active' },
        attributes: ['ServiceId', 'ServiceName'],
      });
      const dup = otherServices.find(
        (s) => s.ServiceId !== service.ServiceId && normalizeVietnamese(s.ServiceName) === normTarget
      );
      if (dup) {
        return res.status(409).json({
          success: false,
          code: 'ERROR_0007_DUPLICATE',
          field: 'serviceName',
          message: 'Tên dịch vụ đã tồn tại trong hệ thống',
        });
      }

      updates.ServiceName = trimmed;
    }

    if (price !== undefined) {
      if (price === null || (typeof price === 'string' && isBlankUnicode(price))) {
        return res.status(400).json({
          success: false,
          code: 'ERROR_0004_INVALID_FORMAT',
          field: 'price',
          message: 'Đơn giá không đúng định dạng',
        });
      }
      const parsedPrice = parseStrictNumber(price, {
        normalizeFullWidth: true,
        allowDecimal: true,
        field: 'price',
        message: 'Đơn giá không đúng định dạng',
      });
      if (!parsedPrice.ok) {
        return sendValidationError(res, parsedPrice);
      }
      const num = parsedPrice.value;
      if (num <= 0 || num > 999999999.99) {
        return res.status(400).json({
          success: false,
          code: 'ERROR_0012_OUT_OF_RANGE',
          field: 'price',
          message: 'Đơn giá phải lớn hơn 0 và không vượt quá 999,999,999.99',
        });
      }
      updates.Price = Math.round(num * 100) / 100;
    }

    if (unit !== undefined) {
      if (unit === null || typeof unit !== 'string') {
        return res.status(400).json({
          success: false,
          code: 'ERROR_0004_INVALID_FORMAT',
          field: 'unit',
          message: 'Đơn vị tính không đúng định dạng chuỗi ký tự',
        });
      }
      const trimmedUnit = trimUnicode(unit);
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
      updates.Unit = trimmedUnit;
    }

    if (description !== undefined) {
      if (description !== null && typeof description !== 'string') {
        return res.status(400).json({
          success: false,
          code: 'ERROR_0004_INVALID_FORMAT',
          field: 'description',
          message: 'Mô tả không đúng định dạng chuỗi ký tự',
        });
      }
      const trimmedDesc = description ? trimUnicode(description) : '';
      if (trimmedDesc.length > 1000) {
        return res.status(400).json({
          success: false,
          code: 'ERROR_0003_MAX_LENGTH',
          field: 'description',
          message: 'Mô tả không được vượt quá 1000 ký tự',
        });
      }
      updates.Description = trimmedDesc;
    }

    const lockRes = await atomicVersionUpdate(Service, {
      where: { ServiceId: service.ServiceId },
      updates,
      expectedVersion: verCheck.version,
      versionField: 'Version',
      notFoundMessage: 'Dịch vụ không tồn tại hoặc đã bị xoá',
    });

    if (!lockRes.ok) {
      return sendValidationError(res, lockRes);
    }

    const updatedService = await Service.findByPk(service.ServiceId, {
      include: [
        {
          model: ServiceCategory,
          as: 'category',
          attributes: ['CategoryId', 'CategoryName', 'Description', 'IsDeleted', 'Status'],
        },
      ],
    });

    return res.status(200).json({
      success: true,
      message: 'Cập nhật dịch vụ thành công',
      data: serializeService(updatedService),
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
// QA Scenario #1: Nếu đã Inactive ở tab khác -> trả 400 ERROR_0013_INVALID_STATE_TRANSITION
exports.deactivateService = async (req, res) => {
  try {
    const idCheck = resolveServiceIdentifier(req.params.id);
    if (!idCheck.ok) {
      return sendValidationError(res, idCheck);
    }

    const verCheck = extractExpectedVersion(req);
    if (!verCheck.ok) {
      return sendValidationError(res, verCheck);
    }

    const service = await Service.findOne({
      where: idCheck.where,
    });

    if (!service || service.IsDeleted) {
      return res.status(404).json({
        success: false,
        code: 'ERROR_0011_NOT_FOUND',
        message: 'Dịch vụ không tồn tại hoặc đã bị xoá',
      });
    }

    if (service.Status === 'Inactive') {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0013_INVALID_STATE_TRANSITION',
        message: 'Dịch vụ này đã ngừng hoạt động hoặc đã bị xóa ở phiên khác',
      });
    }

    const lockRes = await atomicVersionUpdate(Service, {
      where: { ServiceId: service.ServiceId },
      updates: { Status: 'Inactive' },
      expectedVersion: verCheck.version,
      versionField: 'Version',
      notFoundMessage: 'Dịch vụ không tồn tại hoặc đã bị xoá',
    });

    if (!lockRes.ok) {
      return sendValidationError(res, lockRes);
    }

    const updated = await Service.findByPk(service.ServiceId);

    return res.status(200).json({
      success: true,
      message: 'Đã ngừng cung cấp dịch vụ thành công.',
      data: serializeService(updated),
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
    const idCheck = resolveServiceIdentifier(req.params.id);
    if (!idCheck.ok) {
      return sendValidationError(res, idCheck);
    }

    const verCheck = extractExpectedVersion(req);
    if (!verCheck.ok) {
      return sendValidationError(res, verCheck);
    }

    const service = await Service.findOne({
      where: idCheck.where,
      include: [{ model: ServiceCategory, as: 'category' }],
    });

    if (!service || service.IsDeleted) {
      return res.status(404).json({
        success: false,
        code: 'ERROR_0011_NOT_FOUND',
        message: 'Dịch vụ không tồn tại hoặc đã bị xoá',
      });
    }

    if (service.Status === 'Active') {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0013_INVALID_STATE_TRANSITION',
        message: 'Dịch vụ này đã ở trạng thái đang hoạt động ở phiên khác',
      });
    }

    if (service.category && (service.category.IsDeleted || service.category.Status === 'Inactive')) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0014_INACTIVE_REFERENCE',
        message: 'Nhóm dịch vụ hiện không còn hoạt động, không thể kích hoạt lại dịch vụ này.',
      });
    }

    const lockRes = await atomicVersionUpdate(Service, {
      where: { ServiceId: service.ServiceId },
      updates: { Status: 'Active' },
      expectedVersion: verCheck.version,
      versionField: 'Version',
      notFoundMessage: 'Dịch vụ không tồn tại hoặc đã bị xoá',
    });

    if (!lockRes.ok) {
      return sendValidationError(res, lockRes);
    }

    const updated = await Service.findByPk(service.ServiceId, {
      include: [{ model: ServiceCategory, as: 'category' }],
    });

    return res.status(200).json({
      success: true,
      message: 'Đã kích hoạt lại dịch vụ thành công.',
      data: serializeService(updated),
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
  let lockKey = null;
  try {
    const { categoryName, CategoryName, description, Description } = req.body;
    const rawName = categoryName !== undefined ? categoryName : CategoryName;
    const rawDesc = description !== undefined ? description : Description;

    if (rawName !== undefined && rawName !== null && typeof rawName !== 'string') {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0004_INVALID_FORMAT',
        message: 'Tên nhóm dịch vụ không đúng định dạng chuỗi ký tự',
        field: 'categoryName',
      });
    }

    const trimmedName = trimUnicode(rawName);
    if (!trimmedName) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0001_REQUIRED',
        message: 'Tên nhóm dịch vụ là bắt buộc',
        field: 'categoryName',
      });
    }

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

    if (rawDesc !== undefined && rawDesc !== null && typeof rawDesc !== 'string') {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0004_INVALID_FORMAT',
        message: 'Mô tả nhóm dịch vụ không đúng định dạng chuỗi ký tự',
        field: 'description',
      });
    }

    const trimmedDesc = rawDesc ? trimUnicode(rawDesc) : null;
    if (trimmedDesc && trimmedDesc.length > 500) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0003_MAX_LENGTH',
        message: 'Mô tả nhóm dịch vụ không được vượt quá 500 ký tự',
        field: 'description',
      });
    }

    const normalizedInput = normalizeVietnamese(trimmedName);
    lockKey = normalizedInput;
    if (inFlightCategoryCreates.has(lockKey)) {
      return res.status(409).json({
        success: false,
        code: 'ERROR_0007_DUPLICATE',
        message: 'Tên nhóm dịch vụ đã tồn tại trong hệ thống',
        field: 'categoryName',
      });
    }
    inFlightCategoryCreates.add(lockKey);

    const existingCategories = await ServiceCategory.findAll({
      where: { IsDeleted: false },
    });
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
      Description: trimmedDesc || null,
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
  } finally {
    if (lockKey) {
      inFlightCategoryCreates.delete(lockKey);
    }
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
    if (
      targetGroup !== undefined &&
      targetGroup !== null &&
      !isBlankUnicode(String(targetGroup)) &&
      trimUnicode(String(targetGroup)) !== 'All'
    ) {
      const parsedCatId = parseStrictPositiveInt(targetGroup, {
        field: 'categoryId',
        message: 'Nhóm dịch vụ (categoryId) không hợp lệ',
      });
      if (!parsedCatId.ok) {
        return sendValidationError(res, parsedCatId);
      }
      where.CategoryId = parsedCatId.value;
    }

    if (status !== undefined && status !== null && !isBlankUnicode(String(status))) {
      const cleanStatus = trimUnicode(String(status));
      if (!['Active', 'Inactive', 'All'].includes(cleanStatus)) {
        return res.status(400).json({
          success: false,
          code: 'ERROR_0005_INVALID_VALUE',
          field: 'status',
          message: 'Trạng thái lọc (status) không hợp lệ',
        });
      }
      if (cleanStatus !== 'All') {
        where.Status = cleanStatus;
      }
    }

    let minP = null;
    let maxP = null;
    if (minPrice !== undefined && minPrice !== null && !isBlankUnicode(String(minPrice))) {
      const pMin = parseStrictNumber(minPrice, { normalizeFullWidth: true, allowDecimal: true, min: 0 });
      if (pMin.ok) minP = pMin.value;
    }
    if (maxPrice !== undefined && maxPrice !== null && !isBlankUnicode(String(maxPrice))) {
      const pMax = parseStrictNumber(maxPrice, { normalizeFullWidth: true, allowDecimal: true, min: 0 });
      if (pMax.ok) maxP = pMax.value;
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

    const trimmedSearch = typeof search === 'string' ? trimUnicode(search) : '';
    if (trimmedSearch) {
      const searchNorm = normalizeVietnamese(trimmedSearch);
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

    sheet.mergeCells('A1:I1');
    const brandCell = sheet.getCell('A1');
    brandCell.value = 'GRAND HORIZON LUXURY HOTEL & RESORT • PHÂN HỆ QUẢN TRỊ DỊCH VỤ PMS';
    brandCell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF0D9488' } };
    brandCell.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(1).height = 20;

    sheet.mergeCells('A2:I2');
    const titleCell = sheet.getCell('A2');
    titleCell.value = 'BẢNG GIÁ NIÊM YẾT VÀ DANH MỤC DỊCH VỤ KHÁCH SẠN';
    titleCell.font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(2).height = 36;

    sheet.mergeCells('A3:I3');
    const subTitleCell = sheet.getCell('A3');
    subTitleCell.value = `Thời điểm xuất: ${new Date().toLocaleString('vi-VN')}   |   Tổng số: ${filtered.length} dịch vụ   |   Đơn vị tiền tệ: Đồng Việt Nam (VND)`;
    subTitleCell.font = { name: 'Segoe UI', size: 9.5, italic: true, color: { argb: 'FF475569' } };
    subTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    subTitleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(3).height = 24;

    sheet.addRow([]);

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

      row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(1).font = { name: 'Segoe UI', size: 9.5, color: { argb: 'FF64748B' } };

      row.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(2).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF0F766E' } };

      row.getCell(3).alignment = { vertical: 'middle', horizontal: 'left' };
      row.getCell(3).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF0F172A' } };

      row.getCell(4).alignment = { vertical: 'middle', horizontal: 'left' };
      row.getCell(4).font = { name: 'Segoe UI', size: 9.5, color: { argb: 'FF334155' } };

      const priceCell = row.getCell(5);
      priceCell.alignment = { vertical: 'middle', horizontal: 'right' };
      priceCell.font = { name: 'Segoe UI', size: 10.5, bold: true, color: { argb: 'FF0F766E' } };
      priceCell.numFmt = '#,##0 "₫"';

      row.getCell(6).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(6).font = { name: 'Segoe UI', size: 9.5, color: { argb: 'FF64748B' } };

      const stCell = row.getCell(7);
      stCell.alignment = { vertical: 'middle', horizontal: 'center' };
      stCell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: statusFg } };

      row.getCell(8).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
      row.getCell(8).font = { name: 'Segoe UI', size: 9, color: { argb: 'FF475569' } };

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
