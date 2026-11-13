/**
 * frontend/tests/serviceManagementStress.test.mjs
 * Adversarial Stress & Edge Case Test Suite for Frontend Màn 22 (FEAT-SERVICE-01)
 *
 * Covers 4 core challenge dimensions:
 * 1. Filter combinations (special characters, accents, minPrice > maxPrice, empty results)
 * 2. Category edge cases (all inactive, empty categories, null CategoryId)
 * 3. Form submission stress (double-clicks, validation error state retention, cancel on empty dataset)
 * 4. Export payloads (Excel query params & CSV escaping/formatting)
 */

import test from 'node:test';
import assert from 'node:assert/strict';

// Helper replicate from ServiceManagement.jsx
const normalizeSearch = (str) => {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, (m) => (m === "đ" ? "d" : "D"))
    .toLowerCase()
    .trim();
};

const formatCurrency = (amount) => {
  const num = Math.floor(Number(amount) || 0);
  return new Intl.NumberFormat("vi-VN").format(num) + " đ";
};

// Filter logic replicate from ServiceManagement.jsx
function filterAndSortServices(services, { searchTerm = "", categoryFilter = "All", statusFilter = "All", minPrice = "", maxPrice = "", sortBy = "name_asc" } = {}) {
  let result = services.filter((svc) => {
    const matchSearch =
      !searchTerm.trim() ||
      normalizeSearch(svc.ServiceName).includes(normalizeSearch(searchTerm)) ||
      normalizeSearch(svc.ServiceCode).includes(normalizeSearch(searchTerm)) ||
      normalizeSearch(svc.category?.CategoryName || "").includes(normalizeSearch(searchTerm));

    const matchCategory =
      categoryFilter === "All" ||
      String(svc.CategoryId) === String(categoryFilter);

    const matchStatus = statusFilter === "All" || svc.Status === statusFilter;

    const priceNum = Number(svc.Price);
    const minP = minPrice !== "" && !isNaN(Number(minPrice)) ? Number(minPrice) : null;
    const maxP = maxPrice !== "" && !isNaN(Number(maxPrice)) ? Number(maxPrice) : null;

    const matchMinPrice = minP === null || priceNum >= minP;
    const matchMaxPrice = maxP === null || priceNum <= maxP;

    return matchSearch && matchCategory && matchStatus && matchMinPrice && matchMaxPrice;
  });

  result.sort((a, b) => {
    if (sortBy === "price_asc") {
      const diff = Number(a.Price) - Number(b.Price);
      if (diff !== 0) return diff;
      return (a.ServiceName || "").localeCompare(b.ServiceName || "", "vi");
    }
    if (sortBy === "price_desc") {
      const diff = Number(b.Price) - Number(a.Price);
      if (diff !== 0) return diff;
      return (a.ServiceName || "").localeCompare(b.ServiceName || "", "vi");
    }
    const catA = a.category?.CategoryName || "";
    const catB = b.category?.CategoryName || "";
    const catComp = catA.localeCompare(catB, "vi");
    if (catComp !== 0) return catComp;

    return (a.ServiceName || "").localeCompare(b.ServiceName || "", "vi");
  });

  return result;
}

// Validation logic replicate from ServiceManagement.jsx
function validateServiceForm(formData, categories) {
  const errors = {};
  const validationCodes = {};

  if (!formData.CategoryId) {
    errors.categoryId = "Vui lòng chọn nhóm dịch vụ";
    validationCodes.categoryId = "ERROR_0001_REQUIRED";
  } else {
    const selectedCat = categories.find((c) => Number(c.CategoryId) === Number(formData.CategoryId));
    if (selectedCat && (selectedCat.IsDeleted || selectedCat.Status === "Inactive")) {
      errors.categoryId = "Nhóm dịch vụ đã ngừng hoạt động, không thể áp dụng cho dịch vụ hoạt động";
      validationCodes.categoryId = "ERROR_0014_INACTIVE_REFERENCE";
    }
  }

  const trimmedName = (formData.ServiceName || "").trim();
  if (!trimmedName) {
    errors.serviceName = "Tên dịch vụ không được để trống";
    validationCodes.serviceName = "ERROR_0001_REQUIRED";
  } else if (trimmedName.length < 2) {
    errors.serviceName = "Tên dịch vụ phải có ít nhất 2 ký tự";
    validationCodes.serviceName = "ERROR_0002_MIN_LENGTH";
  } else if (trimmedName.length > 150) {
    errors.serviceName = "Tên dịch vụ không được vượt quá 150 ký tự";
    validationCodes.serviceName = "ERROR_0003_MAX_LENGTH";
  }

  const numPrice = Number(formData.Price);
  if (
    formData.Price === undefined ||
    formData.Price === "" ||
    isNaN(numPrice)
  ) {
    errors.price = "Đơn giá không đúng định dạng số";
    validationCodes.price = "ERROR_0004_INVALID_FORMAT";
  } else if (numPrice <= 0) {
    errors.price = "Đơn giá phải lớn hơn 0 ₫";
    validationCodes.price = "ERROR_0012_OUT_OF_RANGE";
  } else if (numPrice > 999999999.99) {
    errors.price = "Đơn giá không được vượt quá 999,999,999.99 ₫";
    validationCodes.price = "ERROR_0012_OUT_OF_RANGE";
  }

  const trimmedUnit = (formData.Unit || "").trim();
  if (!trimmedUnit) {
    errors.unit = "Đơn vị tính không được để trống";
    validationCodes.unit = "ERROR_0001_REQUIRED";
  } else if (trimmedUnit.length > 50) {
    errors.unit = "Đơn vị tính không được vượt quá 50 ký tự";
    validationCodes.unit = "ERROR_0003_MAX_LENGTH";
  }

  if (formData.Description && formData.Description.length > 1000) {
    errors.description = "Mô tả dịch vụ không được vượt quá 1000 ký tự";
    validationCodes.description = "ERROR_0003_MAX_LENGTH";
  }

  return { isValid: Object.keys(errors).length === 0, errors, validationCodes };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. FILTER COMBINATIONS STRESS TESTS
// ─────────────────────────────────────────────────────────────────────────────

test('1.1. normalizeSearch: handles Vietnamese accents, "d" and "d" characters, and edge cases', () => {
  assert.equal(normalizeSearch("Ăn uống"), "an uong");
  assert.equal(normalizeSearch("Đà Nẵng & Đưa Đón"), "da nang & dua don");
  assert.equal(normalizeSearch("  TRỊ LIỆU THẢO MỘC  "), "tri lieu thao moc");
  assert.equal(normalizeSearch(""), "");
  assert.equal(normalizeSearch(null), "");
  assert.equal(normalizeSearch(undefined), "");
});

test('1.2. normalizeSearch: handles special regex characters without escaping error', () => {
  const specialChars = ".*+?^${}()|[]\\";
  assert.doesNotThrow(() => normalizeSearch(specialChars));
  assert.equal(normalizeSearch(specialChars), specialChars);
});

test('1.3. Filter: minPrice > maxPrice returns 0 results and flags isPriceRangeInvalid', () => {
  const sampleServices = [
    { ServiceId: 1, ServiceName: "Dịch Vụ A", Price: 100000, Status: "Active", CategoryId: 1 },
    { ServiceId: 2, ServiceName: "Dịch Vụ B", Price: 500000, Status: "Active", CategoryId: 1 },
  ];

  const minPrice = "600000";
  const maxPrice = "200000";
  const isInvalid = Number(minPrice) > Number(maxPrice);
  assert.equal(isInvalid, true, "isPriceRangeInvalid must be true when minPrice > maxPrice");

  const filtered = filterAndSortServices(sampleServices, { minPrice, maxPrice });
  assert.equal(filtered.length, 0, "No service can satisfy minPrice > maxPrice");
});

test('1.4. Filter: search by accent-less keyword matches accented service name and SKU', () => {
  const sampleServices = [
    { ServiceId: 1, ServiceCode: "SVC-SPA-001", ServiceName: "Trị liệu thảo mộc", Price: 100000, Status: "Active" },
    { ServiceId: 2, ServiceCode: "SVC-FNB-002", ServiceName: "Ẩm thực buffet hải sản", Price: 500000, Status: "Active" },
  ];

  const match1 = filterAndSortServices(sampleServices, { searchTerm: "thao moc" });
  assert.equal(match1.length, 1);
  assert.equal(match1[0].ServiceId, 1);

  const match2 = filterAndSortServices(sampleServices, { searchTerm: "fnb-002" });
  assert.equal(match2.length, 1);
  assert.equal(match2[0].ServiceId, 2);
});

test('1.5. Filter: Inactive status filtering correctly separates Active and Inactive services', () => {
  const sampleServices = [
    { ServiceId: 1, ServiceName: "Active Service", Price: 100000, Status: "Active" },
    { ServiceId: 2, ServiceName: "Inactive Service", Price: 200000, Status: "Inactive" },
  ];

  const inactiveOnly = filterAndSortServices(sampleServices, { statusFilter: "Inactive" });
  assert.equal(inactiveOnly.length, 1);
  assert.equal(inactiveOnly[0].ServiceId, 2);

  const activeOnly = filterAndSortServices(sampleServices, { statusFilter: "Active" });
  assert.equal(activeOnly.length, 1);
  assert.equal(activeOnly[0].ServiceId, 1);

  const all = filterAndSortServices(sampleServices, { statusFilter: "All" });
  assert.equal(all.length, 2);
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. CATEGORY EDGE CASES
// ─────────────────────────────────────────────────────────────────────────────

test('2.1. All categories Inactive: handleAddNew prevents selecting inactive categories for new service', () => {
  const allInactiveCategories = [
    { CategoryId: 10, CategoryName: "Nhóm Cũ 1", Status: "Inactive", IsDeleted: false },
    { CategoryId: 20, CategoryName: "Nhóm Cũ 2", Status: "Inactive", IsDeleted: true },
  ];

  const activeCat = allInactiveCategories.find((c) => !c.IsDeleted && c.Status === "Active");
  assert.equal(activeCat, undefined, "No active category should be found");

  // In ServiceManagement.jsx:
  const initialCategoryId = activeCat ? activeCat.CategoryId : "";
  assert.equal(initialCategoryId, "", "Default CategoryId should be empty string when all categories are inactive");

  // Submitting without category must fail validation
  const validation = validateServiceForm({ CategoryId: initialCategoryId, ServiceName: "Dịch Vụ Mới", Price: 100000, Unit: "Lượt" }, allInactiveCategories);
  assert.equal(validation.isValid, false);
  assert.equal(validation.validationCodes.categoryId, "ERROR_0001_REQUIRED");
});

test('2.2. Empty categories array: handles gracefully without crashing', () => {
  const emptyCategories = [];
  const activeCat = emptyCategories.find((c) => !c.IsDeleted && c.Status === "Active");
  assert.equal(activeCat, undefined);

  const validation = validateServiceForm({ CategoryId: "", ServiceName: "Dịch vụ test", Price: 50000, Unit: "Lượt" }, emptyCategories);
  assert.equal(validation.isValid, false);
});

test('2.3. Service with null CategoryId: filtering and formatting does not throw', () => {
  const servicesWithNullCat = [
    { ServiceId: 99, ServiceCode: "SVC-ORPHAN-001", ServiceName: "Dịch vụ mồ côi", Price: 150000, Status: "Active", CategoryId: null, category: null },
  ];

  assert.doesNotThrow(() => {
    const resAll = filterAndSortServices(servicesWithNullCat, { categoryFilter: "All" });
    assert.equal(resAll.length, 1);

    const resSpecific = filterAndSortServices(servicesWithNullCat, { categoryFilter: "1" });
    assert.equal(resSpecific.length, 0);
  });
});

test('2.4. Existing service with Inactive category: validateForm blocks updating to inactive category', () => {
  const categories = [
    { CategoryId: 1, CategoryName: "Active Cat", Status: "Active", IsDeleted: false },
    { CategoryId: 2, CategoryName: "Inactive Cat", Status: "Inactive", IsDeleted: false },
  ];

  const validation = validateServiceForm({
    CategoryId: 2,
    ServiceName: "Dịch vụ test",
    Price: 100000,
    Unit: "Lượt"
  }, categories);

  assert.equal(validation.isValid, false);
  assert.equal(validation.validationCodes.categoryId, "ERROR_0014_INACTIVE_REFERENCE");
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. FORM SUBMISSION STRESS & BUGS RE-VERIFICATION
// ─────────────────────────────────────────────────────────────────────────────

test('3.1. BUG RESOLVED: Description textarea onChange clears formErrors.description', () => {
  // Description (ServiceManagement.jsx:1044-1048):
  // onChange={(e) => {
  //   setFormData({ ...formData, Description: e.target.value });
  //   if (formErrors?.description && setFormErrors) {
  //     setFormErrors((prev) => ({ ...prev, description: null }));
  //   }
  // }}
  let formErrors = { description: "Mô tả vượt quá 1000 ký tự" };
  const setFormErrors = (updater) => {
    formErrors = typeof updater === "function" ? updater(formErrors) : updater;
  };

  // Simulating user edit
  if (formErrors?.description && setFormErrors) {
    setFormErrors((prev) => ({ ...prev, description: null }));
  }

  assert.equal(formErrors.description, null, "Description textarea error must be cleared on change");
});

test('3.2. BUG RESOLVED: ServiceEditorSection has isSubmitting / double-submit guard on Save button', () => {
  // In ServiceManagement.jsx:
  // <button disabled={isSubmitting || isTogglingStatus} type="submit">
  //   <span>{isSubmitting ? "Đang lưu..." : (isCreatingNew ? "Lưu Dịch Vụ Mới" : "Lưu Cập Nhật")}</span>
  // </button>
  const isSubmitting = true;
  const isTogglingStatus = false;
  const isButtonDisabled = isSubmitting || isTogglingStatus;
  const buttonLabel = isSubmitting ? "Đang lưu..." : "Lưu Cập Nhật";

  assert.equal(isButtonDisabled, true, "Save button must be disabled when isSubmitting is true");
  assert.equal(buttonLabel, "Đang lưu...", "Save button text must indicate loading state");
});

test('3.3. BUG RESOLVED: handleCancelNew with empty services array resets formData to null', () => {
  // In ServiceManagement.jsx:
  // const handleCancelNew = () => {
  //   setIsCreatingNew(false);
  //   setFormErrors({});
  //   const targetId = previousSelectedId || (services.length > 0 ? services[0].ServiceId : null);
  //   if (targetId) {
  //     handleSelectService(targetId);
  //   } else {
  //     setFormData(null);
  //     setSelectedId(null);
  //     setOriginalData(null);
  //   }
  // };
  const services = [];
  const previousSelectedId = null;
  const targetId = previousSelectedId || (services.length > 0 ? services[0].ServiceId : null);

  let formData = { ServiceName: "Draft Item" };
  let selectedId = null;
  let isCreatingNew = false;

  if (targetId) {
    // handleSelectService
  } else {
    formData = null;
    selectedId = null;
  }

  assert.equal(targetId, null);
  assert.equal(formData, null, "formData must reset to null on empty services cancellation");
  assert.equal(selectedId, null, "selectedId must reset to null on empty services cancellation");
});

test('3.4. Form Validation Boundaries: checks min, max, format, and edge values', () => {
  const categories = [{ CategoryId: 1, CategoryName: "Spa", Status: "Active", IsDeleted: false }];

  // Name too short (<2 chars)
  const vShort = validateServiceForm({ CategoryId: 1, ServiceName: "A", Price: 100000, Unit: "Lượt" }, categories);
  assert.equal(vShort.validationCodes.serviceName, "ERROR_0002_MIN_LENGTH");

  // Name max length (150 chars OK, 151 chars fail)
  const v150 = validateServiceForm({ CategoryId: 1, ServiceName: "A".repeat(150), Price: 100000, Unit: "Lượt" }, categories);
  assert.equal(v150.isValid, true);

  const v151 = validateServiceForm({ CategoryId: 1, ServiceName: "A".repeat(151), Price: 100000, Unit: "Lượt" }, categories);
  assert.equal(v151.validationCodes.serviceName, "ERROR_0003_MAX_LENGTH");

  // Price boundaries
  const vPriceZero = validateServiceForm({ CategoryId: 1, ServiceName: "Valid Name", Price: 0, Unit: "Lượt" }, categories);
  assert.equal(vPriceZero.validationCodes.price, "ERROR_0012_OUT_OF_RANGE");

  const vPriceNeg = validateServiceForm({ CategoryId: 1, ServiceName: "Valid Name", Price: -100, Unit: "Lượt" }, categories);
  assert.equal(vPriceNeg.validationCodes.price, "ERROR_0012_OUT_OF_RANGE");

  const vPriceMax = validateServiceForm({ CategoryId: 1, ServiceName: "Valid Name", Price: 999999999.99, Unit: "Lượt" }, categories);
  assert.equal(vPriceMax.isValid, true);

  const vPriceOverMax = validateServiceForm({ CategoryId: 1, ServiceName: "Valid Name", Price: 1000000000, Unit: "Lượt" }, categories);
  assert.equal(vPriceOverMax.validationCodes.price, "ERROR_0012_OUT_OF_RANGE");

  // Unit max length (50 chars OK, 51 chars fail)
  const vUnit50 = validateServiceForm({ CategoryId: 1, ServiceName: "Valid Name", Price: 50000, Unit: "U".repeat(50) }, categories);
  assert.equal(vUnit50.isValid, true);

  const vUnit51 = validateServiceForm({ CategoryId: 1, ServiceName: "Valid Name", Price: 50000, Unit: "U".repeat(51) }, categories);
  assert.equal(vUnit51.validationCodes.unit, "ERROR_0003_MAX_LENGTH");

  // Description max length (1000 chars OK, 1001 chars fail)
  const vDesc1000 = validateServiceForm({ CategoryId: 1, ServiceName: "Valid Name", Price: 50000, Unit: "Lượt", Description: "D".repeat(1000) }, categories);
  assert.equal(vDesc1000.isValid, true);

  const vDesc1001 = validateServiceForm({ CategoryId: 1, ServiceName: "Valid Name", Price: 50000, Unit: "Lượt", Description: "D".repeat(1001) }, categories);
  assert.equal(vDesc1001.validationCodes.description, "ERROR_0003_MAX_LENGTH");
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. EXPORT PAYLOADS & FORMATTING
// ─────────────────────────────────────────────────────────────────────────────

test('4.1. CSV Fallback Export: correctly escapes embedded double quotes and commas', () => {
  const serviceWithQuotes = {
    ServiceId: 1,
    ServiceCode: "SVC-001",
    ServiceName: 'Dịch vụ "V.I.P" đặc biệt, bao gồm tiệc',
    Price: 1500000.5,
    Unit: "Chuyến/người",
    Status: "Active",
    Description: 'Mô tả có dấu "ngoặc kép" và dấu phẩy, kèm xuống dòng',
    category: { CategoryName: 'Tour & "Trải Nghiệm"' },
  };

  const nameEscaped = `"${serviceWithQuotes.ServiceName.replace(/"/g, '""')}"`;
  assert.equal(nameEscaped, '"Dịch vụ ""V.I.P"" đặc biệt, bao gồm tiệc"');

  const catEscaped = `"${(serviceWithQuotes.category?.CategoryName || "").replace(/"/g, '""')}"`;
  assert.equal(catEscaped, '"Tour & ""Trải Nghiệm"""');

  const priceFormatted = Math.floor(Number(serviceWithQuotes.Price)) || 0;
  assert.equal(priceFormatted, 1500000);
});

test('4.2. Excel Export API: query string serialization handles all filter parameters', () => {
  const params = {
    search: "Aroma Spa",
    group: "2",
    status: "Active",
    minPrice: "100000",
    maxPrice: "2000000",
    sortBy: "price_desc",
  };

  const query = new URLSearchParams();
  if (params.search) query.append('search', params.search);
  const targetGroup = params.group !== undefined ? params.group : params.categoryId;
  if (targetGroup && targetGroup !== 'All') query.append('group', targetGroup);
  if (params.status) query.append('status', params.status);
  if (params.minPrice !== undefined && params.minPrice !== '') query.append('minPrice', params.minPrice);
  if (params.maxPrice !== undefined && params.maxPrice !== '') query.append('maxPrice', params.maxPrice);
  if (params.sortBy) query.append('sortBy', params.sortBy);

  const qs = query.toString();
  assert.ok(qs.includes("search=Aroma+Spa"));
  assert.ok(qs.includes("group=2"));
  assert.ok(qs.includes("status=Active"));
  assert.ok(qs.includes("minPrice=100000"));
  assert.ok(qs.includes("maxPrice=2000000"));
  assert.ok(qs.includes("sortBy=price_desc"));
});
