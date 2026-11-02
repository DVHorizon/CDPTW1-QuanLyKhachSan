import React, { useState, useEffect } from 'react';
import AdminLayout from '../../../components/admin/layout/AdminLayout';

export default function KitchenInventory() {
  const [ingredients, setIngredients] = useState([]);
  const [metrics, setMetrics] = useState({
    totalSku: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    inStockCount: 0
  });
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL'); // ALL, LOW, OUT, NORMAL
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  // Modal Thêm nguyên liệu mới
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    itemCode: '',
    itemName: '',
    unit: 'Kilogram (KG)',
    quantity: '',
    minQuantity: '',
    unitCost: ''
  });
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');

  // Mở modal Thêm nguyên liệu và tự động lấy mã tiếp theo
  const handleOpenAddModal = async () => {
    setAddError('');
    setAddSuccess('');
    setAddForm({
      itemCode: 'Đang tạo mã...',
      itemName: '',
      unit: 'Kilogram (KG)',
      quantity: '',
      minQuantity: '',
      unitCost: ''
    });
    setShowAddModal(true);

    try {
      const res = await fetch('http://localhost:5000/api/v1/kitchen-inventory/ingredients/next-code', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.nextCode) {
        setAddForm(prev => ({ ...prev, itemCode: data.nextCode }));
      } else {
        setAddForm(prev => ({ ...prev, itemCode: 'ING-0816' }));
      }
    } catch {
      setAddForm(prev => ({ ...prev, itemCode: 'ING-0816' }));
    }
  };
  const [selectedIngredient, setSelectedIngredient] = useState(null);
  const [importForm, setImportForm] = useState({
    itemId: '',
    importQuantity: '',
    supplier: '',
    note: ''
  });
  const [importStatus, setImportStatus] = useState({ error: '', success: '', loading: false });

  // Modal / Tab Cảnh báo món bị ảnh hưởng & Gợi ý chuyển món sang Tạm Hết
  const [showAffectedModal, setShowAffectedModal] = useState(false);
  const [affectedDishes, setAffectedDishes] = useState([]);
  const [affectedLoading, setAffectedLoading] = useState(false);
  const [markSuccessMsg, setMarkSuccessMsg] = useState('');

  const token = localStorage.getItem('hotel_token') || localStorage.getItem('token') || sessionStorage.getItem('token');

  // Tải danh sách nguyên liệu và metrics
  const fetchIngredients = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page,
        limit: 10,
        search,
        status: filterStatus
      });

      const res = await fetch(`http://localhost:5000/api/v1/kitchen-inventory/ingredients?${queryParams.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setIngredients(data.data || []);
        if (data.metrics) setMetrics(data.metrics);
        if (data.pagination) setPagination(data.pagination);

        // Mặc định chọn dòng đầu tiên cho panel Nhập kho nếu chưa có dòng nào được chọn
        if (!selectedIngredient && data.data && data.data.length > 0) {
          selectForImport(data.data[0]);
        }
      }
    } catch (err) {
      console.error('Lỗi tải dữ liệu nguyên liệu:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIngredients();
  }, [page, filterStatus]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchIngredients();
  };

  const selectForImport = (item) => {
    setSelectedIngredient(item);
    setImportForm({
      itemId: item.ItemId,
      importQuantity: '',
      supplier: '',
      note: ''
    });
    setImportStatus({ error: '', success: '', loading: false });
  };

  // Xử lý Thêm nguyên liệu mới (FEAT-FNB-14 Flow 4.1)
  const handleCreateIngredient = async (e) => {
    e.preventDefault();
    setAddError('');
    setAddSuccess('');

    try {
      const res = await fetch('http://localhost:5000/api/v1/kitchen-inventory/ingredients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(addForm)
      });

      const data = await res.json();
      if (!res.ok) {
        setAddError(data.message || 'Thao tác không thành công.');
        return;
      }

      setAddSuccess(data.message || 'Thêm mới nguyên liệu thành công');
      setTimeout(() => {
        setShowAddModal(false);
        setAddSuccess('');
        setAddForm({
          itemCode: '',
          itemName: '',
          unit: 'Kilogram (KG)',
          quantity: '',
          minQuantity: '',
          unitCost: ''
        });
        fetchIngredients();
      }, 1200);

    } catch (err) {
      setAddError('Lỗi kết nối máy chủ khi tạo nguyên liệu.');
    }
  };

  // Xử lý Nhập kho nguyên liệu (FEAT-FNB-14 Flow 4.2)
  const handleImportStock = async (e) => {
    e.preventDefault();
    if (!selectedIngredient) {
      setImportStatus({ error: 'Vui lòng chọn nguyên liệu cần nhập kho', success: '', loading: false });
      return;
    }

    setImportStatus({ error: '', success: '', loading: true });

    try {
      const res = await fetch('http://localhost:5000/api/v1/kitchen-inventory/ingredients/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          itemId: selectedIngredient.ItemId,
          importQuantity: parseFloat(importForm.importQuantity),
          supplier: importForm.supplier,
          note: importForm.note
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setImportStatus({ error: data.message || 'Nhập kho thất bại.', success: '', loading: false });
        return;
      }

      setImportStatus({
        error: '',
        success: `Nhập kho thành công! Tồn mới: ${data.data?.newQuantity} ${data.data?.unit}`,
        loading: false
      });

      setImportForm(prev => ({ ...prev, importQuantity: '', note: '' }));
      fetchIngredients();

    } catch (err) {
      setImportStatus({ error: 'Lỗi kết nối máy chủ.', success: '', loading: false });
    }
  };

  // Tải danh sách món ăn bị ảnh hưởng khi tồn dưới ngưỡng
  const handleOpenAffectedDishes = async () => {
    setShowAffectedModal(true);
    setAffectedLoading(true);
    setMarkSuccessMsg('');
    try {
      const res = await fetch('http://localhost:5000/api/v1/kitchen-inventory/ingredients/affected-dishes', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setAffectedDishes(data.data || []);
      }
    } catch (err) {
      console.error('Lỗi tải món bị ảnh hưởng:', err);
    } finally {
      setAffectedLoading(false);
    }
  };

  // Chuyển toàn bộ các món bị thiếu nguyên liệu sang "Tạm Hết"
  const handleMarkAllOutOfStock = async () => {
    const ids = affectedDishes.map(d => d.MenuItemId);
    if (ids.length === 0) return;

    try {
      const res = await fetch('http://localhost:5000/api/v1/kitchen-inventory/ingredients/mark-dishes-out-of-stock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ menuItemIds: ids })
      });
      const data = await res.json();
      if (data.success) {
        setMarkSuccessMsg(data.message || 'Đã chuyển các món ăn sang trạng thái Tạm Hết!');
        setTimeout(() => {
          handleOpenAffectedDishes();
        }, 1500);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 bg-[#f8fafc] min-h-screen text-slate-800 font-sans">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-200 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                BOH OPERATIONS • TRỰC TUYẾN
              </span>
              <span className="text-xs text-slate-500 font-medium">Ca Ngày (Bếp Trưởng & Quản Lý Kho)</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 font-serif">
              Sổ Cái Kiểm Kê Nguyên Liệu Bếp Trung Tâm & Kho Lạnh B2
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Giám sát chuỗi cung ứng thực phẩm tươi sống, hạch toán lượng tồn kho theo thời gian thực và tự động cảnh báo định mức Par Stock 5 sao quốc tế.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button 
              onClick={handleOpenAffectedDishes}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 font-medium text-sm transition shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px] text-amber-600">warning</span>
              Gợi Ý Món Tạm Hết {metrics.lowStockCount > 0 && `(${metrics.lowStockCount})`}
            </button>
            <button 
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-sm transition shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              Thêm Nguyên Liệu Mới
            </button>
          </div>
        </div>

        {/* METRICS CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">TỔNG NGUYÊN LIỆU KIỂM SOÁT</p>
              <h3 className="text-3xl font-bold text-slate-900 mt-2">{metrics.totalSku} <span className="text-sm font-normal text-slate-500">SKU</span></h3>
              <p className="text-xs text-emerald-600 font-medium mt-1 flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">check_circle</span>
                Đạt chuẩn định mức Par Stock
              </p>
            </div>
            <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-lg">
              <span className="material-symbols-outlined text-2xl">inventory</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-rose-200 shadow-sm flex items-start justify-between relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-rose-500"></div>
            <div>
              <p className="text-xs font-semibold tracking-wider text-rose-600 uppercase flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                CẢNH BÁO TỒN THẤP (KHẨN CẤP)
              </p>
              <h3 className="text-3xl font-bold text-rose-700 mt-2">{metrics.lowStockCount} <span className="text-sm font-normal text-rose-600">mặt hàng</span></h3>
              <p className="text-xs text-rose-600 font-medium mt-1">Dưới ngưỡng an toàn phục vụ thực khách</p>
            </div>
            <div className="p-2.5 bg-rose-50 text-rose-600 rounded-lg">
              <span className="material-symbols-outlined text-2xl">report_problem</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">LÔ HÀNG ĐANG GIAO TRONG NGÀY</p>
              <h3 className="text-3xl font-bold text-slate-900 mt-2">04 <span className="text-sm font-normal text-slate-500">chuyến nhập</span></h3>
              <p className="text-xs text-slate-500 font-medium mt-1">Nhà cung cấp hải sản & Wagyu đến lúc 14:30</p>
            </div>
            <div className="p-2.5 bg-sky-50 text-sky-700 rounded-lg">
              <span className="material-symbols-outlined text-2xl">local_shipping</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">NHIỆT ĐỘ KHO B2 REALTIME</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-2 font-mono">-18.4°C / +2.1°C</h3>
              <p className="text-xs text-emerald-600 font-medium mt-1 flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">ac_unit</span>
                Tất cả cảm biến ổn định (HACCP Level 4.19)
              </p>
            </div>
            <div className="p-2.5 bg-blue-50 text-blue-700 rounded-lg">
              <span className="material-symbols-outlined text-2xl">thermostat</span>
            </div>
          </div>
        </div>

        {/* SEARCH & FILTER CONTROLS */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
            <input 
              type="text"
              placeholder="Tìm kiếm nhanh mã SKU, tên nguyên liệu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            />
          </form>

          <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
            <button 
              onClick={() => { setFilterStatus('ALL'); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${filterStatus === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              Tất Cả ({metrics.totalSku})
            </button>
            <button 
              onClick={() => { setFilterStatus('LOW'); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${filterStatus === 'LOW' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'}`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
              Khẩn Cấp ({metrics.lowStockCount})
            </button>
            <button 
              onClick={() => { setFilterStatus('NORMAL'); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${filterStatus === 'NORMAL' ? 'bg-emerald-700 text-white' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'}`}
            >
              Bình Thường ({metrics.inStockCount})
            </button>
            <button 
              onClick={() => { setFilterStatus('OUT'); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${filterStatus === 'OUT' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-800 hover:bg-amber-100'}`}
            >
              Hết Hàng ({metrics.outOfStockCount})
            </button>
          </div>
        </div>

        {/* MAIN SPLIT VIEW (TABLE + QUICK IMPORT SIDEBAR) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* INVENTORY ITEMS TABLE (8 COLS) */}
          <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-700">inventory_2</span>
                <h2 className="font-bold text-slate-800 text-base">Danh Mục Nguyên Liệu Chi Tiết BOH</h2>
              </div>
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Tự động đồng bộ thời gian thực
              </span>
            </div>

            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 text-xs uppercase font-semibold border-b border-slate-200">
                    <th className="py-3 px-4">Mã SKU / Tên Nguyên Liệu</th>
                    <th className="py-3 px-3 text-center">Vị Trí Lưu Kho</th>
                    <th className="py-3 px-4 text-right">Tồn Thực Tế</th>
                    <th className="py-3 px-4 text-right">Định Mức An Toàn</th>
                    <th className="py-3 px-3 text-center">Trạng Thái</th>
                    <th className="py-3 px-3 text-center">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="py-12 text-center text-slate-400">
                        <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-emerald-600 border-t-transparent mb-2"></div>
                        <p>Đang tải dữ liệu kho bếp...</p>
                      </td>
                    </tr>
                  ) : ingredients.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-12 text-center text-slate-400">
                        Không tìm thấy nguyên liệu nào phù hợp.
                      </td>
                    </tr>
                  ) : (
                    ingredients.map((item) => {
                      const isSelected = selectedIngredient?.ItemId === item.ItemId;
                      const isLow = parseFloat(item.Quantity) <= parseFloat(item.MinQuantity);
                      const isZero = parseFloat(item.Quantity) <= 0;

                      return (
                        <tr 
                          key={item.ItemId}
                          onClick={() => selectForImport(item)}
                          className={`hover:bg-slate-50 cursor-pointer transition ${isSelected ? 'bg-emerald-50/50 ring-1 ring-emerald-500/30' : ''}`}
                        >
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                                {item.ItemCode}
                              </span>
                              <span className="font-medium text-slate-900">{item.ItemName}</span>
                            </div>
                            <span className="text-[11px] text-slate-400 block mt-0.5">
                              Giá vốn: {parseFloat(item.UnitCost || 0).toLocaleString()} đ / {item.Unit}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                              Kho Lạnh B2
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <span className={`font-mono font-bold text-base ${isZero ? 'text-slate-400' : isLow ? 'text-rose-600' : 'text-slate-900'}`}>
                              {parseFloat(item.Quantity).toFixed(2)}
                            </span>
                            <span className="text-xs text-slate-500 ml-1 font-medium">{item.Unit}</span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <span className="font-mono text-slate-600">
                              {parseFloat(item.MinQuantity).toFixed(2)}
                            </span>
                            <span className="text-xs text-slate-400 ml-1">{item.Unit}</span>
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            {isZero ? (
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800">
                                Hết Hàng
                              </span>
                            ) : isLow ? (
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 animate-pulse">
                                Tồn Thấp
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                                Đạt Định Mức
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            <button 
                              onClick={(e) => { e.stopPropagation(); selectForImport(item); }}
                              className="p-1 rounded hover:bg-slate-200 text-slate-600 transition"
                              title="Nhập thêm kho"
                            >
                              <span className="material-symbols-outlined text-[18px]">add_box</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* PHÂN TRANG */}
            <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Hiển thị trang {page} / {pagination.totalPages || 1} (Tổng số {pagination.total} nguyên liệu)</span>
              <div className="flex items-center gap-1">
                <button 
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Trước
                </button>
                <button 
                  disabled={page >= (pagination.totalPages || 1)}
                  onClick={() => setPage(p => p + 1)}
                  className="px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Sau
                </button>
              </div>
            </div>
          </div>

          {/* QUICK IMPORT / TRANSACTIONS SIDEBAR (4 COLS) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* PANEL ĐIỀU CHỈNH NHẬP KHO NHANH */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-700">sync_alt</span>
                  <h3 className="font-bold text-slate-900 text-sm">Điều Chỉnh Nhập Kho Nhanh</h3>
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600">TERMINAL #B2</span>
              </div>

              {selectedIngredient ? (
                <form onSubmit={handleImportStock} className="space-y-4">
                  {/* THÔNG TIN CHI TIẾT NGUYÊN LIỆU ĐANG CHỌN */}
                  <div className="rounded-xl border border-emerald-600/30 bg-gradient-to-br from-emerald-50/60 to-slate-50 p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-emerald-100">
                      <div>
                        <span className="text-[10px] font-bold tracking-wider text-emerald-800 uppercase bg-emerald-100/80 px-2 py-0.5 rounded-full inline-block mb-1">
                          NGUYÊN LIỆU ĐANG CHỌN
                        </span>
                        <h4 className="font-bold text-slate-900 text-base leading-snug">
                          {selectedIngredient.ItemName}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700">
                            {selectedIngredient.ItemCode}
                          </span>
                          <span className="text-xs text-slate-500 font-medium">
                            • Vị trí: Kho Lạnh B2
                          </span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="text-[11px] text-slate-500 block">Tồn thực tế</span>
                        <span className="font-mono font-extrabold text-emerald-700 text-lg">
                          {parseFloat(selectedIngredient.Quantity).toFixed(2)}
                        </span>
                        <span className="text-xs text-slate-600 font-medium ml-1">
                          {selectedIngredient.Unit}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-3 text-xs">
                      <div className="p-2 rounded-lg bg-white border border-slate-100 shadow-2xs">
                        <span className="text-[11px] text-slate-400 block">Định mức an toàn:</span>
                        <span className="font-mono font-semibold text-slate-800 text-sm">
                          {parseFloat(selectedIngredient.MinQuantity).toFixed(2)} {selectedIngredient.Unit}
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-white border border-slate-100 shadow-2xs">
                        <span className="text-[11px] text-slate-400 block">Giá vốn đơn vị:</span>
                        <span className="font-mono font-semibold text-slate-800 text-sm">
                          {parseFloat(selectedIngredient.UnitCost || 0).toLocaleString()} đ
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">SỐ LƯỢNG NHẬP VÀO (*)</label>
                    <div className="relative">
                      <input 
                        type="number"
                        step="0.01"
                        min="0.01"
                        required
                        placeholder="Nhập số lượng (vd: 10.5)"
                        value={importForm.importQuantity}
                        onChange={(e) => setImportForm({ ...importForm, importQuantity: e.target.value })}
                        className="w-full px-3 py-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-semibold"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {selectedIngredient.Unit}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">NHÀ CUNG CẤP (SUPPLIER)</label>
                    <input 
                      type="text"
                      placeholder="vd: Công ty Hải Sản Nha Trang"
                      value={importForm.supplier}
                      onChange={(e) => setImportForm({ ...importForm, supplier: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">GHI CHÚ KIỂM TOÁN CA TRỰC</label>
                    <textarea 
                      rows="2"
                      placeholder="Số phiếu giao nhận, nhiệt độ xe chuyên dụng..."
                      value={importForm.note}
                      onChange={(e) => setImportForm({ ...importForm, note: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    ></textarea>
                  </div>

                  {importStatus.error && (
                    <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px]">error</span>
                      {importStatus.error}
                    </div>
                  )}

                  {importStatus.success && (
                    <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px]">check_circle</span>
                      {importStatus.success}
                    </div>
                  )}

                  <button 
                    type="submit"
                    disabled={importStatus.loading}
                    className="w-full py-2.5 px-4 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[18px]">verified</span>
                    {importStatus.loading ? 'Đang hạch toán...' : 'Xác Nhận Cập Nhật Kho Bếp'}
                  </button>
                </form>
              ) : (
                <div className="py-8 text-center text-slate-400 text-xs">
                  Vui lòng chọn 1 nguyên liệu từ bảng bên trái để nhập kho.
                </div>
              )}
            </div>

            {/* PHẦN THÔNG TIN QUY TRÌNH TIÊU CHUẨN MICHELIN */}
            <div className="bg-slate-900 text-white rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-400 text-slate-950 uppercase">
                  Chuẩn Michelin
                </span>
                <span className="text-xs text-slate-400">Quy trình HACCP Level 4.19</span>
              </div>
              <h4 className="font-bold text-sm text-slate-100">Kiểm Soát Vi Khí Hậu & Tươi Sống (Farm-To-Table)</h4>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Hệ thống tự động canh chỉnh độ ẩm 78% đối với ngăn rau củ hữu cơ và làm lạnh sâu -22.5°C đối với hầm bảo quản Wagyu, ức ngỗng Pháp. Toàn bộ nguyên liệu quá hạn par stock quá 12h sẽ bị gắn cờ kiểm toán.
              </p>
            </div>
          </div>
        </div>

        {/* MODAL THÊM NGUYÊN LIỆU MỚI (FEAT-FNB-14) */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-150">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-700">add_circle</span>
                  <h3 className="font-bold text-slate-900 text-base">Thêm Nguyên Liệu Bếp Mới</h3>
                </div>
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                >
                  <span className="material-symbols-outlined text-xl">close</span>
                </button>
              </div>

              <form onSubmit={handleCreateIngredient} className="p-6 space-y-4">
                {addError && (
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">error</span>
                    <span>{addError}</span>
                  </div>
                )}
                {addSuccess && (
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">check_circle</span>
                    <span>{addSuccess}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700">Mã nguyên liệu</label>
                      <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-medium">Tự động tăng</span>
                    </div>
                    <input 
                      type="text"
                      readOnly
                      title="Mã nguyên liệu được hệ thống tự động sinh tăng dần"
                      value={addForm.itemCode}
                      className="w-full px-3 py-2 text-sm bg-slate-100 border border-slate-200 rounded-lg text-slate-700 font-mono font-semibold cursor-not-allowed select-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Đơn vị tính (*)</label>
                    <select
                      value={addForm.unit}
                      onChange={(e) => setAddForm({ ...addForm, unit: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    >
                      <option value="Kilogram (KG)">Kilogram (KG)</option>
                      <option value="Gram">Gram</option>
                      <option value="Lít (L)">Lít (L)</option>
                      <option value="Chai">Chai</option>
                      <option value="Trái / Quả">Trái / Quả</option>
                      <option value="Hộp">Hộp</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tên nguyên liệu bếp (*)</label>
                  <input 
                    type="text"
                    required
                    placeholder="vd: Tôm Hùm Bông Nha Trang Sống"
                    value={addForm.itemName}
                    onChange={(e) => setAddForm({ ...addForm, itemName: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Tồn kho ban đầu (*)</label>
                    <input 
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      placeholder="0"
                      value={addForm.quantity}
                      onChange={(e) => setAddForm({ ...addForm, quantity: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Ngưỡng tối thiểu (*)</label>
                    <input 
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      placeholder="0"
                      value={addForm.minQuantity}
                      onChange={(e) => setAddForm({ ...addForm, minQuantity: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Giá vốn đơn vị (VNĐ)</label>
                    <input 
                      type="number"
                      step="1000"
                      min="0"
                      placeholder="0"
                      value={addForm.unitCost}
                      onChange={(e) => setAddForm({ ...addForm, unitCost: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button 
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition"
                  >
                    Hủy bỏ
                  </button>
                  <button 
                    type="submit"
                    className="px-5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold transition shadow-sm"
                  >
                    Lưu Nguyên Liệu
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL MÓN ĂN BỊ ẢNH HƯỞNG & GỢI Ý CHUYỂN TẠM HẾT (FEAT-FNB-14 Flow 4.3) */}
        {showAffectedModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-150">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-amber-50">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-700">warning</span>
                  <h3 className="font-bold text-slate-900 text-base">Cảnh Báo Tồn Thấp & Gợi Ý Chuyển Món Sang Tạm Hết</h3>
                </div>
                <button 
                  onClick={() => setShowAffectedModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                >
                  <span className="material-symbols-outlined text-xl">close</span>
                </button>
              </div>

              <div className="p-6">
                <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                  Các nguyên liệu dưới đây hiện có số lượng tồn kho nhỏ hơn ngưỡng an toàn (MinQuantity). 
                  Dưới đây là danh sách các món ăn thuộc thực đơn có liên kết với những nguyên liệu này được khuyến nghị chuyển sang trạng thái <strong>Tạm Hết (OutOfStock)</strong> để tránh phục vụ quá tải hoặc thiếu hụt nguyên liệu.
                </p>

                {markSuccessMsg && (
                  <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">check_circle</span>
                    <span>{markSuccessMsg}</span>
                  </div>
                )}

                <div className="max-h-72 overflow-y-auto rounded-lg border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold uppercase border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Món Ăn</th>
                        <th className="py-2.5 px-3">Nguyên Liệu Thiếu</th>
                        <th className="py-2.5 px-3 text-right">Tồn / Ngưỡng</th>
                        <th className="py-2.5 px-3 text-center">Trạng Thái Món</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {affectedLoading ? (
                        <tr>
                          <td colSpan="4" className="py-8 text-center text-slate-400">Đang quét danh sách món...</td>
                        </tr>
                      ) : affectedDishes.length === 0 ? (
                        <tr>
                          <td colSpan="4" className="py-8 text-center text-emerald-600 font-medium">
                            Tất cả nguyên liệu bếp đều đang đạt hoặc vượt ngưỡng an toàn. Không có món nào bị ảnh hưởng!
                          </td>
                        </tr>
                      ) : (
                        affectedDishes.map((dish) => (
                          <tr key={dish.MenuItemId} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3 font-semibold text-slate-900">
                              #{dish.MenuItemId} - {dish.ItemName}
                            </td>
                            <td className="py-2.5 px-3 text-rose-700 font-medium">
                              {dish.MissingIngredientName}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono">
                              <span className="text-rose-600 font-bold">{dish.CurrentQuantity}</span> / {dish.MinQuantity} {dish.Unit}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full font-semibold ${dish.Status === 'OutOfStock' ? 'bg-slate-100 text-slate-600' : 'bg-emerald-100 text-emerald-800'}`}>
                                {dish.Status === 'OutOfStock' ? 'Đã Tạm Hết' : 'Đang Bán'}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button 
                    onClick={() => setShowAffectedModal(false)}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition"
                  >
                    Đóng
                  </button>
                  {affectedDishes.length > 0 && (
                    <button 
                      onClick={handleMarkAllOutOfStock}
                      className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold transition shadow-sm flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[18px]">block</span>
                      Chuyển Các Món Này Sang Tạm Hết
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </AdminLayout>
  );
}

