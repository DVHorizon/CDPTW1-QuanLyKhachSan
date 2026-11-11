import React, { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "../../../components/admin/layout/AdminLayout";
import styles from "./ServiceManagement.module.css";
import {
  fetchServicesApi,
  fetchCategoriesApi,
  createServiceApi,
  updateServiceApi,
  deactivateServiceApi,
  reactivateServiceApi,
  exportServicesExcelApi,
  createCategoryApi,
} from "../../../api/serviceApi";
import { cleanMessage, extractErrorCode, logSystemEvent } from "../../../utils/toastSanitizer";

// ─── DỮ LIỆU DANH MỤC MẪU BAN ĐẦU (FALLBACK) ──────────────────────────────────

const INITIAL_CATEGORIES = [
  { CategoryId: 1, CategoryName: "Spa & Trị liệu", IsDeleted: false, Status: "Active" },
  { CategoryId: 2, CategoryName: "Vận chuyển Concierge", IsDeleted: false, Status: "Active" },
  { CategoryId: 3, CategoryName: "Tour & Trải nghiệm", IsDeleted: false, Status: "Active" },
  { CategoryId: 4, CategoryName: "Buồng phòng & Giặt là", IsDeleted: false, Status: "Active" },
  { CategoryId: 5, CategoryName: "Ẩm thực F&B", IsDeleted: false, Status: "Active" },
];

const INITIAL_SERVICES = [
  {
    ServiceId: 1,
    ServiceCode: "SVC-SPA-001",
    CategoryId: 1,
    ServiceName: "Trị liệu thảo mộc toàn thân Aroma 60m",
    Price: 1650000,
    Unit: "Liệu trình",
    Description:
      "Tiếp đón với trà ấm, ngâm chân muối khoáng biển và massage tinh dầu thảo dược thiên nhiên.",
    Status: "Active",
    category: { CategoryId: 1, CategoryName: "Spa & Trị liệu" },
  },
  {
    ServiceId: 2,
    ServiceCode: "SVC-TRN-001",
    CategoryId: 2,
    ServiceName: "Đưa đón sân bay Limousine Mercedes Maybach",
    Price: 2200000,
    Unit: "Chuyến",
    Description:
      "Xe sang Maybach đời mới, tài xế riêng chuẩn VIP đón khách tận sảnh ga đến.",
    Status: "Active",
    category: { CategoryId: 2, CategoryName: "Vận chuyển Concierge" },
  },
  {
    ServiceId: 3,
    ServiceCode: "SVC-EXP-001",
    CategoryId: 3,
    ServiceName: "Tour du thuyền ngắm hoàng hôn vịnh An Thới",
    Price: 8500000,
    Unit: "Chuyến riêng",
    Description:
      "Hải trình khám phá vịnh biển 3 tiếng kèm tiệc rượu vang và canapé cao cấp.",
    Status: "Active",
    category: { CategoryId: 3, CategoryName: "Tour & Trải nghiệm" },
  },
  {
    ServiceId: 4,
    ServiceCode: "SVC-LND-001",
    CategoryId: 4,
    ServiceName: "Giặt ủi hấp ép lấy nhanh trong 4 giờ",
    Price: 350000,
    Unit: "Lượt",
    Description:
      "Quy trình giặt sấy bảo quản sợi tơ tằm, ép nhiệt và đóng gói chống bụi.",
    Status: "Active",
    category: { CategoryId: 4, CategoryName: "Buồng phòng & Giặt là" },
  },
  {
    ServiceId: 5,
    ServiceCode: "SVC-DNG-001",
    CategoryId: 5,
    ServiceName: "Bữa tối lãng mạn ánh nến bên bờ biển",
    Price: 4800000,
    Unit: "Cặp đôi",
    Description:
      "Bàn tiệc riêng tư sát biển, thực đơn 5 món chế biến trực tiếp bởi Bếp trưởng.",
    Status: "Inactive",
    category: { CategoryId: 5, CategoryName: "Ẩm thực F&B" },
  },
];

// Helper: Chuẩn hóa chuỗi tìm kiếm bỏ dấu tiếng Việt (Mục 0.2)
const normalizeSearch = (str) => {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, (m) => (m === "đ" ? "d" : "D"))
    .toLowerCase()
    .trim();
};

// Helper: Định dạng tiền tệ VND làm tròn 0 chữ số (Mục 0.2)
const formatCurrency = (amount) => {
  const num = Math.floor(Number(amount) || 0);
  return new Intl.NumberFormat("vi-VN").format(num) + " đ";
};

// ─── THÀNH PHẦN CHỈ SỐ KPI TỔNG QUAN ──────────────────────────────────────────

const OverviewKpiCards = ({ services, categories }) => {
  const stats = useMemo(() => {
    const total = services.length;
    const active = services.filter((s) => s.Status === "Active").length;
    const inactive = services.filter((s) => s.Status === "Inactive").length;
    const totalCategories = categories.length;
    return { total, active, inactive, totalCategories };
  }, [services, categories]);

  return (
    <div className={styles.kpiGrid}>
      <div className={styles.kpiCard}>
        <div>
          <p className={styles.kpiLabel}>Tổng Dịch Vụ</p>
          <p className={styles.kpiValue}>{stats.total}</p>
        </div>
        <div
          className={styles.kpiIconWrapper}
          style={{
            backgroundColor: "rgba(16, 185, 129, 0.15)",
            color: "#10b981",
          }}
        >
          <span className="material-symbols-outlined text-[22px]">
            category
          </span>
        </div>
      </div>

      <div className={styles.kpiCard}>
        <div>
          <p className={styles.kpiLabel}>Đang Hoạt Động</p>
          <p className={styles.kpiValue} style={{ color: "#059669" }}>
            {stats.active}
          </p>
        </div>
        <div
          className={styles.kpiIconWrapper}
          style={{
            backgroundColor: "rgba(16, 185, 129, 0.15)",
            color: "#059669",
          }}
        >
          <span className="material-symbols-outlined text-[22px]">
            check_circle
          </span>
        </div>
      </div>

      <div className={styles.kpiCard}>
        <div>
          <p className={styles.kpiLabel}>Ngừng Cung Cấp</p>
          <p className={styles.kpiValue} style={{ color: "#dc2626" }}>
            {stats.inactive}
          </p>
        </div>
        <div
          className={styles.kpiIconWrapper}
          style={{
            backgroundColor: "rgba(239, 68, 68, 0.15)",
            color: "#dc2626",
          }}
        >
          <span className="material-symbols-outlined text-[22px]">
            pause_circle
          </span>
        </div>
      </div>

      <div className={styles.kpiCard}>
        <div>
          <p className={styles.kpiLabel}>Nhóm Dịch Vụ</p>
          <p className={styles.kpiValue}>{stats.totalCategories}</p>
        </div>
        <div
          className={styles.kpiIconWrapper}
          style={{
            backgroundColor: "rgba(245, 158, 11, 0.15)",
            color: "#d97706",
          }}
        >
          <span className="material-symbols-outlined text-[22px]">folder</span>
        </div>
      </div>
    </div>
  );
};

// ─── MODAL TẠO NHÓM DỊCH VỤ MỚI ───────────────────────────────────────────────

const CreateCategoryModal = ({ isOpen, onClose, onSuccess, showToast }) => {
  const [categoryName, setCategoryName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = categoryName.trim();
    if (!trimmed) {
      setError("Tên nhóm dịch vụ không được để trống");
      return;
    }
    if (trimmed.length < 2) {
      setError("Tên nhóm dịch vụ phải có ít nhất 2 ký tự");
      return;
    }
    if (trimmed.length > 100) {
      setError("Tên nhóm dịch vụ không được vượt quá 100 ký tự");
      return;
    }
    if (description && description.length > 500) {
      setError("Mô tả nhóm dịch vụ không được vượt quá 500 ký tự");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const res = await createCategoryApi({
        categoryName: trimmed,
        description: description.trim(),
      });
      showToast("Tạo nhóm dịch vụ thành công!", "success", "SUCCESS_0001_CREATED");
      onSuccess(res.data);
      onClose();
    } catch (err) {
      setError(cleanMessage(err?.message || err?.error) || "Không thể tạo mới nhóm dịch vụ.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>
            <span className="material-symbols-outlined text-[20px]" style={{ color: "#10b981" }}>
              create_new_folder
            </span>
            Thêm Nhóm Dịch Vụ Mới
          </h3>
          <button type="button" onClick={onClose} className={styles.modalCloseBtn}>
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                Tên Nhóm Dịch Vụ <span className={styles.requiredStar}>*</span>
              </label>
              <input
                className={`${styles.inputControl} ${error ? styles.inputError : ""}`}
                type="text"
                placeholder="VD: Tour & Trải Nghiệm, Dịch Vụ Thể Thao..."
                value={categoryName}
                onChange={(e) => {
                  setCategoryName(e.target.value);
                  if (error) setError(null);
                }}
                autoFocus
              />
              {error && <span className={styles.errorMessage}>{error}</span>}
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Mô Tả Nhóm (Tối đa 500 ký tự)</label>
              <textarea
                className={styles.textareaControl}
                rows="3"
                placeholder="Mô tả nhóm dịch vụ..."
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  if (error) setError(null);
                }}
              />
            </div>
          </div>
          <div className={styles.modalFooter}>
            <button type="button" onClick={onClose} className={`${styles.btn} ${styles.btnCancel}`}>
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`${styles.btn} ${styles.btnPrimary}`}
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              <span>{isSubmitting ? "Đang lưu..." : "Tạo Nhóm Mới"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── HEADER SECTION ────────────────────────────────────────────────────────────

const HeaderSection = ({ onAddNew, onAddCategory, onExportExcel }) => (
  <div className={styles.headerCard}>
    <div className={styles.headerInfo}>
      <span className={styles.headerSubtitle}>Module 22 • FEAT-SERVICE-01</span>
      <h1 className={styles.headerTitle}>Quản Lý Danh Mục Dịch Vụ Khách Sạn</h1>
      <p className={styles.headerDesc}>
        Tạo, xem, hiệu chỉnh biểu phí và quản lý trạng thái cung cấp (Active /
        Inactive)
      </p>
    </div>
    <div className={styles.headerActions}>
      <button
        onClick={onExportExcel}
        className={`${styles.btn} ${styles.btnOutline}`}
        type="button"
      >
        <span className="material-symbols-outlined text-[18px]">
          file_download
        </span>
        <span>Xuất File Bảng Giá</span>
      </button>

      <button
        onClick={onAddCategory}
        className={`${styles.btn} ${styles.btnOutline}`}
        type="button"
        title="Tạo nhóm dịch vụ mới (ServiceCategory)"
      >
        <span className="material-symbols-outlined text-[18px]">create_new_folder</span>
        <span>+ Nhóm Mới</span>
      </button>

      <Link
        to="/admin/services/dispatch"
        className={`${styles.btn} ${styles.btnOutline}`}
        style={{ borderColor: "#047857", color: "#047857", fontWeight: 700, backgroundColor: "#ecfdf5" }}
        title="Chuyển sang màn hình Tiếp Nhận Đặt Dịch Vụ & Điều Phối Lịch Trình (C3)"
      >
        <span className="material-symbols-outlined text-[18px]">event_available</span>
        <span>Đặt &amp; Điều Phối (C3)</span>
      </Link>

      <button
        onClick={onAddNew}
        className={`${styles.btn} ${styles.btnPrimary}`}
        type="button"
      >
        <span className="material-symbols-outlined text-[20px]">
          add_circle
        </span>
        <span>New Service</span>
      </button>
    </div>
  </div>
);

// ─── DANH SÁCH & BỘ LỌC DỊCH VỤ ───────────────────────────────────────────────

const ServiceListSection = ({
  services,
  filteredServices,
  categories,
  selectedId,
  onSelect,
  searchTerm,
  setSearchTerm,
  categoryFilter,
  setCategoryFilter,
  statusFilter,
  setStatusFilter,
  minPrice,
  setMinPrice,
  maxPrice,
  setMaxPrice,
  sortBy,
  setSortBy,
  currentPage,
  setCurrentPage,
  itemsPerPage,
  setItemsPerPage,
}) => {
  // Kiểm tra lỗi khoảng giá hợp lệ (FEAT-SERVICE-02)
  const isPriceRangeInvalid = useMemo(() => {
    if (minPrice !== "" && maxPrice !== "") {
      const minP = Number(minPrice);
      const maxP = Number(maxPrice);
      if (!isNaN(minP) && !isNaN(maxP) && minP > maxP) {
        return true;
      }
    }
    return false;
  }, [minPrice, maxPrice]);

  const hasActiveFilters = useMemo(() => {
    return (
      Boolean(searchTerm.trim()) ||
      categoryFilter !== "All" ||
      statusFilter !== "All" ||
      minPrice !== "" ||
      maxPrice !== "" ||
      sortBy !== "name_asc"
    );
  }, [searchTerm, categoryFilter, statusFilter, minPrice, maxPrice, sortBy]);

  const handleResetFilters = () => {
    setSearchTerm("");
    setCategoryFilter("All");
    setStatusFilter("All");
    setMinPrice("");
    setMaxPrice("");
    setSortBy("name_asc");
    setCurrentPage(1);
  };

  const totalPages = Math.ceil((filteredServices?.length || 0) / itemsPerPage) || 1;
  const paginatedServices = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return (filteredServices || []).slice(start, start + itemsPerPage);
  }, [filteredServices, currentPage, itemsPerPage]);

  return (
    <div className={styles.leftCol}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span
            className="material-symbols-outlined text-[22px]"
            style={{ color: "#10b981" }}
          >
            list_alt
          </span>
          <span
            style={{ fontSize: "1.125rem", fontWeight: 600, color: "#0f172a" }}
          >
            Danh Mục Dịch Vụ
          </span>
          <span className={styles.skuBadge}>{filteredServices.length}</span>
        </div>
      </div>

      {/* Bộ lọc và ô tìm kiếm */}
      <div className={styles.searchFilterGrid}>
        <div className={styles.searchBox}>
          <span className={`material-symbols-outlined ${styles.searchIcon}`}>
            search
          </span>
          <input
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className={styles.searchInput}
            placeholder="Tìm theo mã SKU, tên dịch vụ (ví dụ: 'an uong' khớp 'Ăn uống')..."
            type="text"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className={styles.searchClearBtn}
              type="button"
            >
              ✕
            </button>
          )}
        </div>

        <div>
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setCurrentPage(1);
            }}
            className={styles.selectControl}
          >
            <option value="All">Tất cả nhóm ({categories.length})</option>
            {categories.map((cat) => (
              <option key={cat.CategoryId} value={cat.CategoryId}>
                {cat.CategoryName}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className={styles.selectControl}
          >
            <option value="All">Trạng thái: Tất cả</option>
            <option value="Active">Đang hoạt động (Active)</option>
            <option value="Inactive">Ngừng cung cấp (Inactive)</option>
          </select>
        </div>
      </div>

      {/* Hàng bộ lọc nâng cao: Sắp xếp (sortBy) & Khoảng giá (minPrice - maxPrice) */}
      <div className={styles.filterRowAdvanced}>
        {/* Sắp xếp */}
        <div>
          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              setCurrentPage(1);
            }}
            className={styles.selectControl}
            title="Sắp xếp danh sách dịch vụ"
          >
            <option value="name_asc">Sắp xếp: Tên A→Z (Mặc định)</option>
            <option value="price_asc">Giá: Thấp đến Cao</option>
            <option value="price_desc">Giá: Cao đến Thấp</option>
          </select>
        </div>

        {/* Khoảng giá */}
        <div className={styles.priceRangeGroup}>
          <input
            type="number"
            min="0"
            step="10000"
            placeholder="Giá từ (VND)..."
            value={minPrice}
            onChange={(e) => {
              setMinPrice(e.target.value);
              setCurrentPage(1);
            }}
            className={styles.priceRangeInput}
            title="Đơn giá tối thiểu"
          />
          <span className={styles.priceRangeSeparator}>-</span>
          <input
            type="number"
            min="0"
            step="10000"
            placeholder="Đến (VND)..."
            value={maxPrice}
            onChange={(e) => {
              setMaxPrice(e.target.value);
              setCurrentPage(1);
            }}
            className={styles.priceRangeInput}
            title="Đơn giá tối đa"
          />
        </div>

        {/* Nút đặt lại bộ lọc */}
        {hasActiveFilters && (
          <button
            onClick={handleResetFilters}
            className={styles.resetFilterBtn}
            type="button"
            title="Đặt lại toàn bộ tiêu chí lọc"
          >
            <span className="material-symbols-outlined text-[16px]">restart_alt</span>
            <span>Đặt lại</span>
          </button>
        )}

        {/* Thông báo lỗi khi minPrice > maxPrice (ERROR_0004_INVALID_FORMAT) */}
        {isPriceRangeInvalid && (
          <div className={styles.filterErrorText}>
            <span className="material-symbols-outlined text-[16px]">error</span>
            <span>Khoảng giá không hợp lệ: Giá tối thiểu không được lớn hơn giá tối đa</span>
          </div>
        )}
      </div>

      {/* Danh sách dịch vụ hoặc Empty state */}
      {paginatedServices.length === 0 ? (
        <div className={styles.emptyState}>
          <span
            className="material-symbols-outlined text-[48px]"
            style={{ color: "#94a3b8", marginBottom: "0.5rem" }}
          >
            search_off
          </span>
          <p style={{ fontWeight: 600, color: "#1e293b", margin: 0 }}>
            Không tìm thấy dịch vụ phù hợp với điều kiện lọc
          </p>
          <p
            style={{
              fontSize: "0.75rem",
              color: "#64748b",
              marginTop: "0.25rem",
            }}
          >
            Vui lòng thử từ khóa khác hoặc điều chỉnh lại bộ lọc trạng thái.
          </p>
        </div>
      ) : (
        <div className={styles.serviceList}>
          {paginatedServices.map((svc) => {
            const isSelected = svc.ServiceId === selectedId;
            const isActive = svc.Status === "Active";

            return (
              <div
                key={svc.ServiceId || svc.ServiceCode}
                onClick={() => onSelect(svc.ServiceId)}
                className={`${styles.serviceCard} ${isSelected ? styles.serviceCardSelected : ""}`}
              >
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitleGroup}>
                    <span className={styles.skuBadge}>{svc.ServiceCode}</span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <h2 className={styles.cardTitle}>{svc.ServiceName}</h2>
                      <span className={styles.cardCategory}>
                        Nhóm: {svc.category?.CategoryName || "Tổng hợp"}
                      </span>
                    </div>
                  </div>
                  <span
                    className={
                      isActive ? styles.badgeActive : styles.badgeInactive
                    }
                  >
                    <span
                      className={`${styles.dot} ${isActive ? styles.dotActive : styles.dotInactive}`}
                    ></span>
                    {isActive ? "Đang hoạt động" : "Ngừng cung cấp"}
                  </span>
                </div>

                <div className={styles.cardFooter}>
                  <p className={styles.cardDesc}>
                    {svc.Description || "Chưa có mô tả chi tiết quy trình."}
                  </p>
                  <div className={styles.cardPriceGroup}>
                    <span className={styles.priceTag}>
                      {formatCurrency(svc.Price)}
                    </span>
                    <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                      /{svc.Unit}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Phân trang gọn gàng thông minh (Ellipsis windowing) */}
      <div className={styles.paginationWrapper}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", flexWrap: "wrap" }}>
          <span>
            Hiển thị{" "}
            <strong>
              {filteredServices.length === 0
                ? 0
                : (currentPage - 1) * itemsPerPage + 1}{" "}
              - {Math.min(currentPage * itemsPerPage, filteredServices.length)}
            </strong>{" "}
            / <strong>{filteredServices.length}</strong> dịch vụ
          </span>

          <select
            value={itemsPerPage}
            onChange={(e) => {
              if (setItemsPerPage) setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className={styles.pageSizeSelect}
            title="Số lượng hiển thị trên mỗi trang"
          >
            <option value={5}>5 / trang</option>
            <option value={8}>8 / trang</option>
            <option value={10}>10 / trang</option>
            <option value={20}>20 / trang</option>
            <option value={50}>50 / trang</option>
          </select>
        </div>

        <div className={styles.paginationControls}>
          {/* Nút về trang đầu */}
          <button
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            className={styles.pageNavBtn}
            title="Trang đầu"
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">
              first_page
            </span>
          </button>

          {/* Nút lùi 1 trang */}
          <button
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
            className={styles.pageNavBtn}
            title="Trang trước"
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">
              chevron_left
            </span>
          </button>

          {/* Dải số trang có rút gọn: Tối đa 7 ô */}
          {(() => {
            let pages = [];
            if (totalPages <= 7) {
              pages = Array.from({ length: totalPages }, (_, idx) => idx + 1);
            } else if (currentPage <= 4) {
              pages = [1, 2, 3, 4, 5, "...", totalPages];
            } else if (currentPage >= totalPages - 3) {
              pages = [
                1,
                "...",
                totalPages - 4,
                totalPages - 3,
                totalPages - 2,
                totalPages - 1,
                totalPages,
              ];
            } else {
              pages = [
                1,
                "...",
                currentPage - 1,
                currentPage,
                currentPage + 1,
                "...",
                totalPages,
              ];
            }

            return pages.map((item, idx) => {
              if (item === "...") {
                return (
                  <span
                    key={`ellipsis-${idx}`}
                    className={styles.pageEllipsis}
                  >
                    …
                  </span>
                );
              }
              const pageNum = Number(item);
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`${styles.pageBtn} ${pageNum === currentPage ? styles.pageBtnActive : ""}`}
                  type="button"
                >
                  {pageNum}
                </button>
              );
            });
          })()}

          {/* Nút tiến 1 trang */}
          <button
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages || totalPages === 0}
            className={styles.pageNavBtn}
            title="Trang sau"
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">
              chevron_right
            </span>
          </button>

          {/* Nút đến trang cuối */}
          <button
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages || totalPages === 0}
            className={styles.pageNavBtn}
            title="Trang cuối"
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">
              last_page
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── FORM ĐẶC TẢ DỊCH VỤ (RIGHT COLUMN) ────────────────────────────────────────

const ServiceEditorSection = ({
  formData,
  setFormData,
  categories,
  isCreatingNew,
  onSave,
  onCancel,
  onRevert,
  onToggleStatus,
  formErrors,
  setFormErrors,
  isSubmitting = false,
  isTogglingStatus = false,
}) => {
  const selectedCategory = useMemo(() => {
    return categories.find((c) => Number(c.CategoryId) === Number(formData?.CategoryId));
  }, [categories, formData?.CategoryId]);

  if (!formData && !isCreatingNew) {
    return (
      <div className={styles.rightCol}>
        <div className={styles.emptyState}>
          <span className="material-symbols-outlined text-[48px]" style={{ color: "#94a3b8" }}>
            touch_app
          </span>
          <p style={{ marginTop: "0.5rem", fontWeight: 600, color: "#64748b" }}>
            Chọn một dịch vụ từ danh sách để xem hoặc chỉnh sửa
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.rightCol}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingBottom: "0.5rem",
          borderBottom: "1px solid #e2e8f0",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span
            className="material-symbols-outlined text-[22px]"
            style={{ color: "#10b981" }}
          >
            {isCreatingNew ? "add_box" : "tune"}
          </span>
          <span
            style={{ fontSize: "1.125rem", fontWeight: 600, color: "#0f172a" }}
          >
            {isCreatingNew
              ? "Thêm Mới Dịch Vụ Khách Sạn"
              : "Hiệu Chỉnh Đặc Tả Dịch Vụ"}
          </span>
        </div>
        <span className={styles.skuBadge}>
          {isCreatingNew ? "Tạo Mới" : `Mã: ${formData.ServiceCode}`}
        </span>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave();
        }}
        style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
      >
        {/* Nhóm dịch vụ & Mã dịch vụ */}
        <div className={styles.formRow2}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              Nhóm Dịch Vụ <span className={styles.requiredStar}>*</span>
            </label>
            <select
              value={formData.CategoryId || ""}
              onChange={(e) => {
                const val = e.target.value ? Number(e.target.value) : "";
                setFormData({ ...formData, CategoryId: val });
                if (formErrors?.categoryId && setFormErrors) {
                  setFormErrors((prev) => ({ ...prev, categoryId: null }));
                }
              }}
              className={`${styles.selectControl} ${formErrors?.categoryId ? styles.inputError : ""}`}
            >
              <option value="">-- Chọn nhóm dịch vụ --</option>
              {categories.map((cat) => {
                const isCatInactive = cat.IsDeleted || cat.Status === "Inactive";
                return (
                  <option
                    key={cat.CategoryId}
                    value={cat.CategoryId}
                    disabled={isCreatingNew && isCatInactive}
                  >
                    {cat.CategoryName} {isCatInactive ? "(Đã ngừng)" : ""}
                  </option>
                );
              })}
            </select>
            {formErrors?.categoryId && (
              <span className={styles.errorMessage}>
                {formErrors.categoryId}
              </span>
            )}
            {selectedCategory && (selectedCategory.IsDeleted || selectedCategory.Status === "Inactive") && (
              <div className={styles.categoryInactiveWarning}>
                <span className="material-symbols-outlined text-[18px]">warning</span>
                <span>
                  Nhóm dịch vụ này hiện đã ngừng hoạt động. Vui lòng chuyển sang nhóm đang hoạt động trước khi kích hoạt lại dịch vụ.
                </span>
              </div>
            )}
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Mã Dịch Vụ (ServiceCode)</label>
            <input
              className={`${styles.inputControl} ${styles.inputReadOnly}`}
              type="text"
              readOnly
              value={
                isCreatingNew
                  ? "SVC-{NHÓM}-{SỐ} (Tự sinh)"
                  : formData.ServiceCode || ""
              }
              title="Mã dịch vụ tự sinh duy nhất toàn hệ thống, không cho sửa"
            />
          </div>
        </div>

        {/* Tên dịch vụ */}
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            Tên Dịch Vụ <span className={styles.requiredStar}>*</span>
          </label>
          <input
            className={`${styles.inputControl} ${formErrors?.serviceName ? styles.inputError : ""}`}
            type="text"
            placeholder="Nhập tên dịch vụ (2–150 ký tự)"
            value={formData.ServiceName || ""}
            onChange={(e) => {
              setFormData({ ...formData, ServiceName: e.target.value });
              if (formErrors?.serviceName && setFormErrors) setFormErrors((prev) => ({ ...prev, serviceName: null }));
            }}
          />
          {formErrors?.serviceName && (
            <span className={styles.errorMessage}>
              {formErrors.serviceName}
            </span>
          )}
        </div>

        {/* Đơn giá & Đơn vị tính */}
        <div className={styles.formRow2}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              Đơn Giá (VND) <span className={styles.requiredStar}>*</span>
            </label>
            <input
              className={`${styles.inputControl} ${formErrors?.price ? styles.inputError : ""}`}
              style={{
                textAlign: "right",
                fontWeight: 700,
                color: "#10b981",
                fontSize: "1.125rem",
              }}
              type="number"
              min="1"
              step="any"
              placeholder="0"
              value={formData.Price ?? ""}
              onChange={(e) => {
                setFormData({ ...formData, Price: e.target.value });
                if (formErrors?.price && setFormErrors) setFormErrors((prev) => ({ ...prev, price: null }));
              }}
            />
            {formErrors?.price && (
              <span className={styles.errorMessage}>{formErrors.price}</span>
            )}
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              Đơn Vị Tính <span className={styles.requiredStar}>*</span>
            </label>
            <input
              className={`${styles.inputControl} ${formErrors?.unit ? styles.inputError : ""}`}
              type="text"
              placeholder="VD: Lượt, Giờ, Phần, Chuyến..."
              value={formData.Unit || ""}
              onChange={(e) => {
                setFormData({ ...formData, Unit: e.target.value });
                if (formErrors?.unit && setFormErrors) setFormErrors((prev) => ({ ...prev, unit: null }));
              }}
            />
            {formErrors?.unit && (
              <span className={styles.errorMessage}>{formErrors.unit}</span>
            )}
          </div>
        </div>

        {/* Trạng thái dịch vụ */}
        <div className={styles.statusDisplayBox}>
          <span className={styles.formLabel}>Trạng thái hệ thống</span>
          <span
            className={
              formData.Status === "Active"
                ? styles.badgeActive
                : styles.badgeInactive
            }
          >
            <span
              className={`${styles.dot} ${formData.Status === "Active" ? styles.dotActive : styles.dotInactive}`}
            ></span>
            {formData.Status === "Active"
              ? "Đang hoạt động (Active)"
              : "Ngừng cung cấp (Inactive)"}
          </span>
        </div>

        {/* Mô tả dịch vụ */}
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            Mô Tả Dịch Vụ (Tối đa 1000 ký tự)
          </label>
          <textarea
            className={`${styles.textareaControl} ${formErrors?.description ? styles.inputError : ""}`}
            rows="3"
            placeholder="Mô tả tiêu chuẩn phục vụ, quy trình SOP đón tiếp..."
            value={formData.Description || ""}
            onChange={(e) => {
              setFormData({ ...formData, Description: e.target.value });
              if (formErrors?.description && setFormErrors) {
                setFormErrors((prev) => ({ ...prev, description: null }));
              }
            }}
          ></textarea>
          {formErrors?.description && (
            <span className={styles.errorMessage}>
              {formErrors.description}
            </span>
          )}
        </div>

        {/* Nút thao tác */}
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            flexWrap: "wrap",
            marginTop: "0.5rem",
          }}
        >
          <button
            className={`${styles.btn} ${styles.btnPrimary}`}
            style={{ flex: 1, justifyContent: "center" }}
            type="submit"
            disabled={isSubmitting || isTogglingStatus}
          >
            <span className="material-symbols-outlined text-[18px]">
              {isSubmitting ? "hourglass_empty" : "save"}
            </span>
            <span>
              {isSubmitting
                ? "Đang lưu..."
                : isCreatingNew
                  ? "Lưu Dịch Vụ Mới"
                  : "Lưu Cập Nhật"}
            </span>
          </button>

          {!isCreatingNew && onRevert && (
            <button
              onClick={onRevert}
              disabled={isSubmitting || isTogglingStatus}
              className={`${styles.btn} ${styles.btnCancel}`}
              type="button"
              title="Hoàn tác các thay đổi chưa lưu"
            >
              <span className="material-symbols-outlined text-[18px]">undo</span>
              <span>Hoàn tác</span>
            </button>
          )}

          {!isCreatingNew && (
            <button
              onClick={onToggleStatus}
              disabled={isSubmitting || isTogglingStatus}
              className={`${styles.btn} ${formData.Status === "Active" ? styles.btnDeactivate : styles.btnReactivate}`}
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">
                {isTogglingStatus
                  ? "hourglass_empty"
                  : formData.Status === "Active"
                    ? "pause_circle"
                    : "play_circle"}
              </span>
              <span>
                {isTogglingStatus
                  ? "Đang xử lý..."
                  : formData.Status === "Active"
                    ? "Ngừng Cung Cấp"
                    : "Kích Hoạt Lại"}
              </span>
            </button>
          )}

          {isCreatingNew && (
            <button
              onClick={onCancel}
              disabled={isSubmitting || isTogglingStatus}
              className={`${styles.btn} ${styles.btnCancel}`}
              type="button"
            >
              Hủy
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

// ─── TRANG CHÍNH ──────────────────────────────────────────────────────────────

const ServiceManagement = () => {
  const [services, setServices] = useState(INITIAL_SERVICES);
  const [categories, setCategories] = useState(INITIAL_CATEGORIES);
  const [selectedId, setSelectedId] = useState(INITIAL_SERVICES[0]?.ServiceId || 1);
  const [previousSelectedId, setPreviousSelectedId] = useState(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // Bộ lọc & phân trang (FEAT-SERVICE-02)
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sortBy, setSortBy] = useState("name_asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(8);

  // Form Editor
  const [formData, setFormData] = useState(INITIAL_SERVICES[0]);
  const [originalData, setOriginalData] = useState(INITIAL_SERVICES[0]);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);

  // Thông báo
  const [notification, setNotification] = useState(null);

  /**
   * Hiển thị thông báo thân thiện và tự động ghi log kỹ thuật ra Console
   */
  const showToast = (rawMsg, type = "success", code = null) => {
    const message = cleanMessage(rawMsg);
    const extractedCode = code || extractErrorCode(rawMsg);

    setNotification({ message, type });

    logSystemEvent({
      code: extractedCode,
      message,
      rawMessage: rawMsg,
      type,
      context: { page: 'ServiceManagement', selectedId, isCreatingNew }
    });

    setTimeout(() => setNotification(null), 4000);
  };

  const loadData = async () => {
    try {
      const [svcRes, catRes] = await Promise.all([
        fetchServicesApi({ status: "All", pageSize: 500, all: "true" }),
        fetchCategoriesApi(),
      ]);

      if (catRes && catRes.success && Array.isArray(catRes.data)) {
        setCategories(catRes.data);
      } else {
        setCategories([]);
      }

      if (svcRes && svcRes.success && Array.isArray(svcRes.data)) {
        setServices(svcRes.data);
        if (svcRes.data.length > 0) {
          const first = svcRes.data[0];
          setSelectedId(first.ServiceId);
          const cleanPrice = first.Price !== undefined && first.Price !== null ? Math.floor(Number(first.Price)) : "";
          const firstClean = { ...first, Price: cleanPrice };
          setFormData(firstClean);
          setOriginalData(firstClean);
        } else {
          setSelectedId(null);
          setFormData(null);
          setOriginalData(null);
        }
      } else {
        setServices([]);
        setSelectedId(null);
        setFormData(null);
        setOriginalData(null);
      }
    } catch (err) {
      console.warn("Lỗi khi tải dữ liệu từ API:", err);
      showToast(cleanMessage(err?.message || err?.error) || "Không thể tải dữ liệu dịch vụ từ máy chủ.", "error");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Tính toán danh sách dịch vụ đã lọc & sắp xếp (FEAT-SERVICE-02)
  const filteredServices = useMemo(() => {
    let result = services.filter((svc) => {
      // 1. Tìm kiếm không dấu trên tên, mã SKU, tên nhóm và mô tả
      const matchSearch =
        !searchTerm.trim() ||
        normalizeSearch(svc.ServiceName).includes(
          normalizeSearch(searchTerm),
        ) ||
        normalizeSearch(svc.ServiceCode).includes(
          normalizeSearch(searchTerm),
        ) ||
        normalizeSearch(svc.category?.CategoryName || "").includes(
          normalizeSearch(searchTerm),
        );

      // 2. Lọc theo nhóm dịch vụ
      const matchCategory =
        categoryFilter === "All" ||
        String(svc.CategoryId) === String(categoryFilter);

      // 3. Lọc theo trạng thái
      const matchStatus = statusFilter === "All" || svc.Status === statusFilter;

      // 4. Lọc theo khoảng giá minPrice - maxPrice
      const priceNum = Number(svc.Price);
      const minP = minPrice !== "" && !isNaN(Number(minPrice)) ? Number(minPrice) : null;
      const maxP = maxPrice !== "" && !isNaN(Number(maxPrice)) ? Number(maxPrice) : null;

      const matchMinPrice = minP === null || priceNum >= minP;
      const matchMaxPrice = maxP === null || priceNum <= maxP;

      return matchSearch && matchCategory && matchStatus && matchMinPrice && matchMaxPrice;
    });

    // 5. Sắp xếp theo sortBy (FEAT-SERVICE-02: name_asc, price_asc, price_desc)
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
      // Mặc định (name_asc): theo CategoryName A→Z, trong cùng nhóm sắp theo ServiceName A→Z
      const catA = a.category?.CategoryName || "";
      const catB = b.category?.CategoryName || "";
      const catComp = catA.localeCompare(catB, "vi");
      if (catComp !== 0) return catComp;

      return (a.ServiceName || "").localeCompare(b.ServiceName || "", "vi");
    });

    return result;
  }, [services, searchTerm, categoryFilter, statusFilter, minPrice, maxPrice, sortBy]);

  const handleSelectService = (idOrCode) => {
    const found = services.find((s) => s.ServiceId === idOrCode || s.ServiceCode === idOrCode);
    if (found) {
      setSelectedId(found.ServiceId);
      const cleanPrice = found.Price !== undefined && found.Price !== null ? Math.floor(Number(found.Price)) : "";
      const item = { ...found, Price: cleanPrice };
      setFormData(item);
      setOriginalData(item);
      setIsCreatingNew(false);
      setFormErrors({});
    }
  };

  const handleAddNew = () => {
    const activeCat = categories.find((c) => !c.IsDeleted && c.Status === "Active");
    if (!activeCat) {
      showToast("Vui lòng tạo ít nhất một nhóm dịch vụ đang hoạt động trước khi tạo dịch vụ mới!", "warning");
    }
    setPreviousSelectedId(selectedId);
    setIsCreatingNew(true);
    setSelectedId(null);
    setFormData({
      ServiceCode: "",
      CategoryId: activeCat ? activeCat.CategoryId : "",
      ServiceName: "",
      Price: "",
      Unit: "Lượt",
      Description: "",
      Status: "Active",
    });
    setFormErrors({});
    showToast("Đã mở mẫu tạo mới dịch vụ", "info");
  };

  const handleCancelNew = () => {
    setIsCreatingNew(false);
    setFormErrors({});
    const targetId = previousSelectedId || (services.length > 0 ? services[0].ServiceId : null);
    if (targetId) {
      handleSelectService(targetId);
    } else {
      setFormData(null);
      setSelectedId(null);
      setOriginalData(null);
    }
  };

  const handleRevert = () => {
    if (originalData) {
      setFormData({ ...originalData });
      setFormErrors({});
      showToast("Đã hoàn tác các thay đổi chưa lưu", "info");
    }
  };

  const handleCategoryCreated = (newCat) => {
    setCategories((prev) => [...prev, newCat]);
    if (isCreatingNew) {
      setFormData((prev) => ({ ...prev, CategoryId: newCat.CategoryId }));
    }
    if (formErrors?.categoryId) {
      setFormErrors((prev) => ({ ...prev, categoryId: null }));
    }
  };

  const validateForm = () => {
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

    setFormErrors(errors);

    // Ghi mã lỗi xác thực ra Console nếu phát hiện dữ liệu form không hợp lệ
    if (Object.keys(errors).length > 0) {
      console.warn("[Xác thực Form Dịch Vụ] Dữ liệu nhập vào chưa hợp lệ:", {
        validationCodes,
        errors,
        formData,
        timestamp: new Date().toISOString()
      });
    }

    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (isSubmitting || isTogglingStatus) return;
    if (!validateForm()) {
      showToast("Vui lòng kiểm tra lại các trường lỗi trên form!", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      if (isCreatingNew) {
        let created;
        try {
          const res = await createServiceApi(formData);
          created = res.data;
          if (res.data?.warning) {
            showToast(res.data.warning, "warning");
            setTimeout(() => {
              showToast("Thêm mới dịch vụ thành công!", "success", "SUCCESS_0001_CREATED");
            }, 2500);
          } else {
            showToast("Thêm mới dịch vụ thành công!", "success", "SUCCESS_0001_CREATED");
          }
        } catch (apiErr) {
          const field = apiErr?.field || (apiErr?.code === "ERROR_0014_INACTIVE_REFERENCE" ? "categoryId" : null);
          const errMsg = cleanMessage(apiErr?.message || apiErr?.error) || "Không thể tạo mới dịch vụ trong cơ sở dữ liệu. Vui lòng đăng nhập tài khoản Quản trị viên (Admin).";
          if (field) {
            setFormErrors((prev) => ({ ...prev, [field]: errMsg }));
          }
          showToast(errMsg, "error", apiErr?.code || "ERROR_CREATE_SERVICE");
          return;
        }

        const cleanCreatedPrice = created.Price !== undefined && created.Price !== null ? Math.floor(Number(created.Price)) : "";
        const enrichedCreated = {
          ...created,
          Price: cleanCreatedPrice,
          category:
            created.category ||
            categories.find((cat) => Number(cat.CategoryId) === Number(created.CategoryId)),
        };

        const nextList = [enrichedCreated, ...services];
        setServices(nextList);
        setSelectedId(enrichedCreated.ServiceId);
        setFormData(enrichedCreated);
        setOriginalData(enrichedCreated);
        setIsCreatingNew(false);
      } else {
        let updatedFromServer = null;
        try {
          const res = await updateServiceApi(
            formData.ServiceId || formData.ServiceCode,
            formData
          );
          updatedFromServer = res?.data;
        } catch (apiErr) {
          const field = apiErr?.field || (apiErr?.code === "ERROR_0014_INACTIVE_REFERENCE" ? "categoryId" : null);
          const errMsg = cleanMessage(apiErr?.message || apiErr?.error) || "Không thể cập nhật thông tin dịch vụ vào cơ sở dữ liệu. Vui lòng đăng nhập tài khoản Quản trị viên (Admin).";
          if (field) {
            setFormErrors((prev) => ({ ...prev, [field]: errMsg }));
          }
          showToast(errMsg, "error", apiErr?.code || "ERROR_UPDATE_SERVICE");
          return;
        }

        const cleanPrice = updatedFromServer?.Price !== undefined && updatedFromServer?.Price !== null
          ? Math.floor(Number(updatedFromServer.Price))
          : (formData.Price !== undefined && formData.Price !== null ? Math.floor(Number(formData.Price)) : "");

        const merged = {
          ...formData,
          ...(updatedFromServer || {}),
          Price: cleanPrice,
          category: categories.find(
            (cat) => Number(cat.CategoryId) === Number(formData.CategoryId)
          ),
        };
        const updated = services.map((s) =>
          s.ServiceId === formData.ServiceId ? merged : s
        );
        setServices(updated);
        setFormData(merged);
        setOriginalData(merged);
        showToast(
          `Đã lưu cập nhật cho dịch vụ ${formData.ServiceName}!`,
          "success"
        );
      }
    } catch (err) {
      showToast(err.message || "Lỗi khi lưu dữ liệu", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async () => {
    if (isSubmitting || isTogglingStatus) return;
    const isCurrentlyActive = formData.Status === "Active";

    setIsTogglingStatus(true);
    try {
      if (isCurrentlyActive) {
        try {
          await deactivateServiceApi(
            formData.ServiceId || formData.ServiceCode,
          );
        } catch (apiErr) {
          showToast(
            cleanMessage(apiErr?.message || apiErr?.error) || "Không thể thay đổi trạng thái dịch vụ trong cơ sở dữ liệu.",
            "error",
            apiErr?.code || "ERROR_STATUS_SERVICE"
          );
          return;
        }
        const updated = { ...formData, Status: "Inactive" };
        setFormData(updated);
        setOriginalData(updated);
        setServices((prev) =>
          prev.map((s) =>
            s.ServiceId === formData.ServiceId ? updated : s,
          ),
        );
        showToast(
          `Dịch vụ ${formData.ServiceName} đã chuyển sang trạng thái: "Ngừng cung cấp"`,
          "warning",
        );
      } else {
        try {
          await reactivateServiceApi(
            formData.ServiceId || formData.ServiceCode,
          );
        } catch (apiErr) {
          const field = apiErr?.field || (apiErr?.code === "ERROR_0014_INACTIVE_REFERENCE" ? "categoryId" : null);
          const errMsg = cleanMessage(apiErr?.message || apiErr?.error) || "Không thể kích hoạt lại dịch vụ này.";
          if (field) {
            setFormErrors((prev) => ({ ...prev, [field]: errMsg }));
          }
          showToast(errMsg, "error", apiErr?.code || "ERROR_STATUS_SERVICE");
          return;
        }
        const updated = { ...formData, Status: "Active" };
        setFormData(updated);
        setOriginalData(updated);
        setServices((prev) =>
          prev.map((s) =>
            s.ServiceId === formData.ServiceId ? updated : s,
          ),
        );
        showToast(
          `Dịch vụ ${formData.ServiceName} đã được kích hoạt thành công!`,
          "success",
          "SUCCESS_SERVICE_REACTIVATED",
        );
      }
    } catch (err) {
      showToast("Lỗi khi cập nhật trạng thái dịch vụ", "error");
    } finally {
      setIsTogglingStatus(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      showToast("Đang chuẩn bị file Excel báo cáo...", "info");
      const { blob, filename } = await exportServicesExcelApi({
        search: searchTerm,
        group: categoryFilter,
        status: statusFilter,
        minPrice,
        maxPrice,
        sortBy,
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast("Tải xuống danh mục dịch vụ Excel thành công!", "success", "SUCCESS_EXPORT_SERVICES");
    } catch (err) {
      console.warn("Lỗi khi tải file qua API, chuyển sang chế độ xuất CSV dự phòng:", err);
      try {
        const headers = [
          "STT",
          "Mã Dịch Vụ",
          "Tên Dịch Vụ",
          "Nhóm Dịch Vụ",
          "Đơn Giá (VND)",
          "Đơn Vị Tính",
          "Trạng Thái",
          "Mô Tả Chi Tiết",
        ];
        const rows = filteredServices.map((s, idx) => [
          idx + 1,
          `"${s.ServiceCode || `SVC-${s.ServiceId}`}"`,
          `"${(s.ServiceName || "").replace(/"/g, '""')}"`,
          `"${(s.category?.CategoryName || "Khác").replace(/"/g, '""')}"`,
          Math.floor(Number(s.Price)) || 0,
          `"${s.Unit || "/lượt"}"`,
          `"${s.Status === "Active" ? "Đang kinh doanh" : "Tạm ngừng"}"`,
          `"${(s.Description || "").replace(/"/g, '""')}"`,
        ]);

        const csvContent =
          "\uFEFF" +
          [
            `"GRAND HORIZON LUXURY HOTEL & RESORT • PHÂN HỆ QUẢN TRỊ DỊCH VỤ PMS"`,
            `"BẢNG GIÁ NIÊM YẾT VÀ DANH MỤC DỊCH VỤ KHÁCH SẠN"`,
            `"Thời điểm xuất: ${new Date().toLocaleString("vi-VN")} | Tổng số: ${filteredServices.length} dịch vụ | Đơn vị tiền tệ: Đồng Việt Nam (VND)"`,
            "",
            headers.join(","),
            ...rows.map((r) => r.join(",")),
          ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute(
          "download",
          `Bang_Gia_Dich_Vu_${new Date().toISOString().slice(0, 10)}.csv`,
        );
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showToast("Đã xuất danh mục dịch vụ CSV dự phòng thành công!", "success");
      } catch (fallbackErr) {
        showToast("Lỗi khi tạo file xuất dữ liệu!", "error");
      }
    }
  };

  return (
    <AdminLayout>
      <div className={styles.container}>
        {/* Toast thông báo */}
        {notification && (
          <div
            className={`${styles.toast} ${
              notification.type === "error"
                ? styles.toastError
                : notification.type === "warning"
                  ? styles.toastWarning
                  : notification.type === "info"
                    ? styles.toastInfo
                    : styles.toastSuccess
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">
              {notification.type === "error"
                ? "error"
                : notification.type === "warning"
                  ? "warning"
                  : notification.type === "info"
                    ? "info"
                    : "check_circle"}
            </span>
            <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>
              {notification.message}
            </span>
          </div>
        )}

        {/* 1. Header tác vụ */}
        <HeaderSection
          onAddNew={handleAddNew}
          onAddCategory={() => setIsCategoryModalOpen(true)}
          onExportExcel={handleExportExcel}
        />

        {/* Modal Thêm Nhóm Mới */}
        <CreateCategoryModal
          isOpen={isCategoryModalOpen}
          onClose={() => setIsCategoryModalOpen(false)}
          onSuccess={handleCategoryCreated}
          showToast={showToast}
        />

        {/* 2. Chỉ số KPI */}
        <OverviewKpiCards services={services} categories={categories} />

        {/* 3. Khung 2 cột chính */}
        <div className={styles.mainGrid}>
          <ServiceListSection
            services={services}
            filteredServices={filteredServices}
            categories={categories}
            selectedId={selectedId}
            onSelect={handleSelectService}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            categoryFilter={categoryFilter}
            setCategoryFilter={setCategoryFilter}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            minPrice={minPrice}
            setMinPrice={setMinPrice}
            maxPrice={maxPrice}
            setMaxPrice={setMaxPrice}
            sortBy={sortBy}
            setSortBy={setSortBy}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            itemsPerPage={itemsPerPage}
            setItemsPerPage={setItemsPerPage}
          />

          <ServiceEditorSection
            formData={formData}
            setFormData={setFormData}
            categories={categories}
            isCreatingNew={isCreatingNew}
            onSave={handleSave}
            onCancel={handleCancelNew}
            onRevert={handleRevert}
            onToggleStatus={handleToggleStatus}
            formErrors={formErrors}
            setFormErrors={setFormErrors}
            isSubmitting={isSubmitting}
            isTogglingStatus={isTogglingStatus}
          />
        </div>
      </div>
    </AdminLayout>
  );
};

export default ServiceManagement;
