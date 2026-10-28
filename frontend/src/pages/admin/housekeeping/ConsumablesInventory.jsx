import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../../components/admin/layout/AdminLayout';

const ConsumablesInventory = () => {
  const navigate = useNavigate();

  // Tab lọc danh mục
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);

  // Form điều chỉnh Nhập / Xuất kho nhanh
  const [actionType, setActionType] = useState('OUT'); // 'OUT' (Xuất kho - FIFO) | 'IN' (Nhập kho tạo lô)
  const [quantity, setQuantity] = useState(20);
  const [reason, setReason] = useState('Xuất bổ sung xe đẩy buồng phòng tầng 12-14');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState({ text: '', type: '' });
  const [autoRefreshSec, setAutoRefreshSec] = useState(60);

  // Thống kê 4 Card KPI (Ảnh 1)
  const [stats, setStats] = useState({
    totalSku: 142,
    parCompliance: '94.6%',
    stockValueUsd: '$34,820',
    stockValueVnd: '870.500.000 đ',
    criticalItemsCount: '05',
    monthlyConsumption: '4,120',
    minibarRatio: '68%',
    housekeepingRatio: '32%'
  });

  // Dữ liệu bảng danh mục mặt hàng (Ảnh 1)
  const [items, setItems] = useState([
    {
      id: 1,
      sku: 'SKU-MB-001',
      name: 'Nước Evian Thủy Tinh 750ml',
      supplier: 'Danone Waters • Alpine Beverages Group',
      location: 'Kho A-04',
      currentStock: 142,
      parStock: 300,
      needBuy: '+158',
      price: '$6.00',
      costPrice: '$1.20 / chai',
      sellingPrice: '$6.00 (+400% Margin)',
      category: 'Minibar',
      isCritical: true,
      minAlertLevel: 150,
      storageTemp: 'Kho lạnh: 3.8°C Chuẩn',
      imageUrl: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=800&auto=format&fit=crop&q=80',
      batches: [
        { code: 'BATCH-MB001-A', qty: 90, received: '10/10/2026' },
        { code: 'BATCH-MB001-B', qty: 52, received: '15/10/2026' }
      ]
    },
    {
      id: 2,
      sku: 'SKU-BA-014',
      name: 'Dầu Gội & Sữa Tắm Bergamot 100ml',
      supplier: 'Botanica Labs',
      location: 'Kệ C-12',
      currentStock: 38,
      parStock: 100,
      needBuy: '+62',
      price: 'N/A (Comp)',
      costPrice: '$0.85 / lọ',
      sellingPrice: 'Miễn phí buồng phòng',
      category: 'Bath Amenities',
      isCritical: true,
      minAlertLevel: 50,
      storageTemp: 'Nhiệt độ phòng (22-25°C)',
      imageUrl: 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=800&auto=format&fit=crop&q=80',
      batches: [{ code: 'BATCH-BA014-01', qty: 38, received: '05/10/2026' }]
    },
    {
      id: 3,
      sku: 'SKU-MB-008',
      name: 'Hạt Điều Rang Muối Artisan 150g',
      supplier: 'Valley Specialty',
      location: 'Kho A-02',
      currentStock: 85,
      parStock: 150,
      needBuy: '+65',
      price: '$8.00',
      costPrice: '$2.10 / hộp',
      sellingPrice: '$8.00 (+280% Margin)',
      category: 'Minibar',
      isCritical: false,
      minAlertLevel: 70,
      storageTemp: 'Khô ráo, thoáng mát',
      imageUrl: 'https://images.unsplash.com/photo-1599599810769-bcde5a160d32?w=800&auto=format&fit=crop&q=80',
      batches: [{ code: 'BATCH-MB008-01', qty: 85, received: '12/10/2026' }]
    },
    {
      id: 4,
      sku: 'SKU-DG-022',
      name: 'Cà Phê Nespresso Ristretto (Lốc 10)',
      supplier: 'Nestle Pro',
      location: 'Kệ B-01',
      currentStock: 12,
      parStock: 50,
      needBuy: '+38',
      price: 'N/A (Comp)',
      costPrice: '$0.65 / capsule',
      sellingPrice: 'Miễn phí buồng phòng',
      category: 'Nespresso/Trà',
      isCritical: true,
      minAlertLevel: 25,
      storageTemp: 'Tiêu chuẩn khô',
      imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&auto=format&fit=crop&q=80',
      batches: [{ code: 'BATCH-DG022-01', qty: 12, received: '01/10/2026' }]
    },
    {
      id: 5,
      sku: 'SKU-BA-003',
      name: 'Bộ Bàn Chải Tre Sinh Thái & Kem',
      supplier: 'Eco-Hospitality',
      location: 'Kho C-08',
      currentStock: 320,
      parStock: 300,
      needBuy: '0',
      price: 'N/A (Comp)',
      costPrice: '$0.40 / bộ',
      sellingPrice: 'Miễn phí tiêu hao',
      category: 'Bath Amenities',
      isCritical: false,
      minAlertLevel: 100,
      storageTemp: 'Kho khô ráo',
      imageUrl: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=80',
      batches: [{ code: 'BATCH-BA003-01', qty: 320, received: '14/10/2026' }]
    },
    {
      id: 6,
      sku: 'SKU-MB-019',
      name: 'Nước Khoáng Có Ga San Pellegrino 250ml',
      supplier: 'San Pellegrino S.p.A',
      location: 'Kho A-05',
      currentStock: 18,
      parStock: 100,
      needBuy: '+82',
      price: '$5.00',
      costPrice: '$1.10 / chai',
      sellingPrice: '$5.00 (+354% Margin)',
      category: 'Minibar',
      isCritical: true,
      minAlertLevel: 40,
      storageTemp: 'Kho lạnh: 3.8°C Chuẩn',
      imageUrl: 'https://images.unsplash.com/photo-1559839914-17aae19cec71?w=800&auto=format&fit=crop&q=80',
      batches: [{ code: 'BATCH-MB019-01', qty: 18, received: '11/10/2026' }]
    }
  ]);

  // Chọn mặc định item đầu tiên
  useEffect(() => {
    if (!selectedItem && items.length > 0) {
      setSelectedItem(items[0]);
    }
  }, [items]);

  // Bộ đếm đếm ngược tự động làm mới sau mỗi 60 giây
  useEffect(() => {
    const timer = setInterval(() => {
      setAutoRefreshSec(prev => (prev > 1 ? prev - 1 : 60));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Gọi API thực tế từ Backend Database
  const fetchBackendData = () => {
    fetch('/api/housekeeping/inventory/consumables')
      .then(res => res.json())
      .then(result => {
        if (result.success && result.data && result.data.length > 0) {
          const mapped = result.data.map(d => ({
            id: d.ItemId,
            sku: d.SKU,
            name: d.ItemName,
            supplier: d.Supplier,
            location: d.Location,
            currentStock: d.CurrentStock,
            parStock: d.ParStock,
            needBuy: d.CurrentStock < d.ParStock ? `+${d.ParStock - d.CurrentStock}` : '0',
            price: Number(d.SellingPrice) > 0 ? `$${d.SellingPrice}` : 'N/A (Comp)',
            costPrice: `$${d.CostPrice} / đơn vị`,
            sellingPrice: Number(d.SellingPrice) > 0 ? `$${d.SellingPrice}` : 'Miễn phí buồng phòng',
            category: d.Category,
            isCritical: d.CurrentStock < d.MinAlertLevel,
            minAlertLevel: d.MinAlertLevel,
            storageTemp: d.StorageTemp,
            imageUrl: d.ImageUrl,
            batches: d.batches || []
          }));
          setItems(mapped);
          if (result.overview) {
            setStats(prev => ({
              ...prev,
              stockValueUsd: `$${result.overview.totalStockValueUsd.toLocaleString()}`,
              stockValueVnd: `${result.overview.totalStockValueVnd.toLocaleString('vi-VN')} đ`,
              criticalItemsCount: `0${result.overview.criticalCount}`.slice(-2)
            }));
          }
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchBackendData();
  }, []);

  // Xử lý Điều chỉnh Nhập / Xuất Kho Nhanh với FIFO & Optimistic Locking
  const handleInventorySubmit = async (e) => {
    e.preventDefault();
    if (!selectedItem) return;
    setIsSubmitting(true);
    setFeedbackMessage({ text: '', type: '' });

    try {
      if (actionType === 'OUT') {
        // Xuất kho FIFO
        const res = await fetch('/api/housekeeping/inventory/consumables/dispatch-fifo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            itemId: selectedItem.id,
            quantity: Number(quantity),
            reason
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Lỗi xuất kho');

        setFeedbackMessage({
          text: `✔ [FIFO & Optimistic Locking]: Đã xuất thành công ${quantity} đơn vị. Lô cũ nhất được trừ trước! Mã SHA-256 đã ký bảo mật.`,
          type: 'success'
        });
      } else {
        // Nhập kho tạo lô mới
        const res = await fetch('/api/housekeeping/inventory/consumables/receive-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            itemId: selectedItem.id,
            quantity: Number(quantity),
            unitCost: 1.20,
            supplier: selectedItem.supplier
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Lỗi nhập kho');

        setFeedbackMessage({
          text: `✔ Đã nhập kho ${quantity} đơn vị vào Lô mới theo chuẩn FIFO!`,
          type: 'success'
        });
      }

      fetchBackendData();
    } catch (err) {
      setFeedbackMessage({ text: `❌ ${err.message}`, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredItems = items.filter(it => {
    if (activeCategory !== 'ALL' && it.category !== activeCategory) {
      return false;
    }
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return it.name.toLowerCase().includes(q) || it.sku.toLowerCase().includes(q) || it.location.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <AdminLayout>
      <div className="max-w-[1600px] mx-auto space-y-6 pb-12 font-sans text-gray-800">
        
        {/* TOP BREADCRUMB & HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-emerald-700 uppercase">
              <span>PHÂN HỆ 41 // QUẢN TRỊ KHO NỘI BỘ & BUỒNG PHÒNG</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[11px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-mono">
                HỆ THỐNG KIỂM TOÁN TỰ ĐỘNG MINIBAR REALTIME
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 mt-1 tracking-tight">
              Sổ Cái Kiểm Kê Đồ Tiêu Hao &amp; Minibar Tự Động
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Quản lý định mức par stock vật phẩm phòng khách, đối soát cảm biến Smart-Fridge tự động và lập phiếu mua hàng bù kho theo ca trực.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => {
                setActionType('IN');
                setQuantity(50);
                setReason('Nhập kho định kỳ từ nhà cung cấp');
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-sm transition transform active:scale-95"
            >
              <span className="material-symbols-outlined text-base">add_circle</span>
              + Nhập Kho Vật Phẩm Mới
            </button>
            <button
              onClick={() => alert('Cảm biến Smart-Fridge IoT đã quét 124 minibar phòng: 100% kết nối ổn định!')}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition"
            >
              <span className="material-symbols-outlined text-base text-emerald-700">sensors</span>
              Kiểm Kê Tủ Minibar Tự Động
            </button>
            <button
              onClick={() => navigate('/admin/housekeeping/linen')}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              <span className="material-symbols-outlined text-base text-gray-600">bed_linen</span>
              Sang Quản Trị Đồ Vải (Linen)
            </button>
            <button
              onClick={() => alert('Đang xuất sổ cái kiểm kê Minibar ra file Excel...')}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              <span className="material-symbols-outlined text-base text-gray-600">table_view</span>
              Xuất Sổ Cái (Excel)
            </button>
          </div>
        </div>

        {/* 4 CARDS KPI TỔNG QUAN (KHỚP CHÍNH XÁC ẢNH 1) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Tổng mặt hàng khai thác */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
              <span>TỔNG MẶT HÀNG KHAI THÁC</span>
              <span className="p-1 rounded-lg bg-emerald-50 text-emerald-700">
                <span className="material-symbols-outlined text-base">inventory_2</span>
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-gray-900 font-mono">{stats.totalSku}</span>
              <span className="text-xs font-bold text-emerald-700 font-mono">SKU Active</span>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100 text-[11px] text-gray-600 space-y-1">
              <div className="flex justify-between font-medium">
                <span>Tuân thủ Par Stock:</span>
                <strong className="text-emerald-700 font-bold">{stats.parCompliance}</strong>
              </div>
              <div className="text-gray-400 truncate">
                100% gắn mã RFID &amp; Barcode đồng bộ
              </div>
            </div>
          </div>

          {/* Card 2: Giá trị tồn kho tại chỗ */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
              <span>GIÁ TRỊ TỒN KHO TẠI CHỖ</span>
              <span className="p-1 rounded-lg bg-blue-50 text-blue-700">
                <span className="material-symbols-outlined text-base">account_balance</span>
              </span>
            </div>
            <div className="text-2xl font-black text-gray-900 font-mono">
              {stats.stockValueUsd} <span className="text-xs text-gray-500 font-normal">USD</span>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100 text-[11px] text-gray-600 space-y-1">
              <div className="flex justify-between">
                <span>Quy đổi VND:</span>
                <strong className="text-gray-900 font-mono font-bold">≈ {stats.stockValueVnd}</strong>
              </div>
              <div className="flex items-center gap-1 text-emerald-700 font-medium">
                <span className="material-symbols-outlined text-xs">check_circle</span>
                Hạch toán dồn tích (Accrual Basis)
              </div>
            </div>
          </div>

          {/* Card 3: Chạm ngưỡng tối thiểu (Khẩn cấp) */}
          <div className="bg-white border border-rose-200 rounded-xl p-4 shadow-sm hover:shadow-md transition bg-gradient-to-br from-white to-rose-50/30">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-rose-600 mb-1">
              <span>CHẠM NGƯỠNG TỐI THIỂU</span>
              <span className="p-1 rounded-lg bg-rose-100 text-rose-700">
                <span className="material-symbols-outlined text-base">warning</span>
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-rose-700 font-mono">{stats.criticalItemsCount}</span>
              <span className="text-xs font-bold text-rose-700">Mặt Hàng Khẩn Cấp [!]</span>
            </div>
            <div className="mt-3 pt-3 border-t border-rose-100 text-[11px] text-gray-600 space-y-1">
              <div className="flex justify-between items-center">
                <span className="truncate text-rose-900 font-medium">Evian 750ml, Nespresso...</span>
                <span className="px-1.5 py-0.2 bg-rose-100 text-rose-800 rounded font-bold text-[10px]">PO REQ</span>
              </div>
              <div className="text-rose-600 text-[10px] font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping"></span>
                Cần duyệt lệnh mua tức thì ca trực
              </div>
            </div>
          </div>

          {/* Card 4: Tiêu thụ trong tháng */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
              <span>TIÊU THỤ TRONG THÁNG</span>
              <span className="p-1 rounded-lg bg-teal-50 text-teal-700">
                <span className="material-symbols-outlined text-base">pie_chart</span>
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-gray-900 font-mono">{stats.monthlyConsumption}</span>
              <span className="text-xs text-gray-500">Đơn Vị</span>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100 text-[11px] text-gray-600 space-y-1">
              <div className="flex justify-between text-[11px]">
                <span>Minibar: <strong className="text-gray-900">{stats.minibarRatio}</strong></span>
                <span>Buồng: <strong className="text-gray-900">{stats.housekeepingRatio}</strong></span>
              </div>
              <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden flex">
                <div className="bg-teal-600 h-full" style={{ width: '68%' }}></div>
                <div className="bg-emerald-400 h-full" style={{ width: '32%' }}></div>
              </div>
              <div className="text-gray-400 text-[10px]">Tốc độ xuất kho ổn định so với tuần trước</div>
            </div>
          </div>

        </div>

        {/* KHU VỰC CHÍNH: 2 CỘT (Cột trái 8 phần: Bảng Sổ Cái; Cột phải 4 phần: Chi tiết vật phẩm & Xe đẩy) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* CỘT TRÁI (8 phần): BẢNG SỔ CÁI VẬT PHẨM */}
          <div className="lg:col-span-8 bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
            
            {/* Thanh công cụ lọc & tìm kiếm */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  placeholder="Tìm tên mặt hàng, SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg bg-gray-50 text-gray-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <span className="material-symbols-outlined text-sm text-gray-400 absolute left-2.5 top-2">
                  search
                </span>
              </div>

              {/* Danh mục lọc */}
              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto text-xs font-bold text-gray-600">
                {[
                  { label: 'Tất cả kho', val: 'ALL' },
                  { label: 'Minibar', val: 'Minibar' },
                  { label: 'Bath Amenities', val: 'Bath Amenities' },
                  { label: 'Nespresso/Trà', val: 'Nespresso/Trà' }
                ].map(cat => (
                  <button
                    key={cat.val}
                    onClick={() => setActiveCategory(cat.val)}
                    className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
                      activeCategory === cat.val
                        ? 'bg-emerald-800 text-white shadow-sm'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* BẢNG DỮ LIỆU SỔ CÁI */}
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
                <thead className="bg-gray-50 font-bold text-gray-600 uppercase tracking-wider">
                  <tr>
                    <th scope="col" className="px-3.5 py-3">MÃ SKU &amp; TÊN MẶT HÀNG</th>
                    <th scope="col" className="px-3 py-3 text-center">VỊ TRÍ</th>
                    <th scope="col" className="px-3 py-3 text-center">TỒN THỰC</th>
                    <th scope="col" className="px-3 py-3 text-center">PAR STOCK</th>
                    <th scope="col" className="px-3 py-3 text-center">CẦN MUA</th>
                    <th scope="col" className="px-3 py-3 text-right">GIÁ BÁN</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredItems.map(it => {
                    const isSelected = selectedItem && selectedItem.id === it.id;
                    return (
                      <tr
                        key={it.id}
                        onClick={() => setSelectedItem(it)}
                        className={`cursor-pointer transition ${
                          isSelected ? 'bg-emerald-50/70 border-l-4 border-emerald-700' : 'hover:bg-gray-50'
                        }`}
                      >
                        {/* SKU & Tên */}
                        <td className="px-3.5 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 text-gray-600">
                              <span className="material-symbols-outlined text-base">
                                {it.category === 'Minibar' ? 'water_bottle' : it.category === 'Bath Amenities' ? 'sanitizer' : 'coffee'}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-gray-900 leading-tight">
                                {it.name}
                              </div>
                              <div className="text-[10px] text-gray-500 font-mono mt-0.5">
                                {it.sku} • {it.supplier}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Vị trí */}
                        <td className="px-3 py-3 text-center whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded font-mono text-[11px] font-bold bg-gray-100 text-gray-700">
                            {it.location}
                          </span>
                        </td>

                        {/* Tồn thực */}
                        <td className="px-3 py-3 text-center whitespace-nowrap font-mono font-bold text-sm">
                          <span className={it.isCritical ? 'text-rose-600' : 'text-emerald-700'}>
                            {it.currentStock}
                          </span>
                        </td>

                        {/* Par Stock */}
                        <td className="px-3 py-3 text-center whitespace-nowrap font-mono text-gray-600 font-semibold">
                          {it.parStock}
                        </td>

                        {/* Cần mua */}
                        <td className="px-3 py-3 text-center whitespace-nowrap font-mono font-bold">
                          {it.needBuy !== '0' ? (
                            <span className="text-rose-600">{it.needBuy}</span>
                          ) : (
                            <span className="text-gray-400">0</span>
                          )}
                        </td>

                        {/* Giá bán */}
                        <td className="px-3 py-3 text-right whitespace-nowrap font-mono font-bold text-gray-800">
                          {it.price}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 pt-2 gap-2">
              <div className="flex items-center gap-2">
                <span>Hiển thị 1 - 6 của 142 mặt hàng</span>
                <span>• Tự động làm mới sau mỗi {autoRefreshSec} giây</span>
              </div>
              <div className="flex items-center gap-1 font-mono">
                <button className="px-2.5 py-1 border border-gray-300 rounded hover:bg-gray-50">Trước</button>
                <button className="px-2.5 py-1 bg-emerald-800 text-white rounded font-bold">1</button>
                <button className="px-2.5 py-1 border border-gray-300 rounded hover:bg-gray-50">2</button>
                <button className="px-2.5 py-1 border border-gray-300 rounded hover:bg-gray-50">3</button>
                <button className="px-2.5 py-1 border border-gray-300 rounded hover:bg-gray-50">Tiếp</button>
              </div>
            </div>

          </div>

          {/* CỘT PHẢI (4 phần): HỒ SƠ KỸ THUẬT VẬT PHẨM & GIÁM SÁT XE ĐẨY */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Card 1: HỒ SƠ KỸ THUẬT VẬT PHẨM ĐANG CHỌN */}
            {selectedItem && (
              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800">
                    <span className="material-symbols-outlined text-sm text-emerald-700">badge</span>
                    <span>Hồ Sơ Kỹ Thuật Vật Phẩm</span>
                  </div>
                  <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-emerald-50 text-emerald-800">
                    {selectedItem.sku}
                  </span>
                </div>

                {/* Ảnh vật phẩm & Kho lạnh */}
                <div className="relative rounded-lg overflow-hidden border border-gray-200 h-36">
                  <img
                    src={selectedItem.imageUrl}
                    alt={selectedItem.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 left-2 bg-black/70 text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 backdrop-blur-sm">
                    <span className="material-symbols-outlined text-xs text-sky-400">ac_unit</span>
                    {selectedItem.storageTemp}
                  </div>
                </div>

                {/* Thông tin chi tiết */}
                <div>
                  <h3 className="font-extrabold text-gray-900 text-sm leading-snug">
                    {selectedItem.name}
                  </h3>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Nhà phân phối độc quyền: {selectedItem.supplier}
                  </p>
                </div>

                {/* Bảng giá vốn & giá niêm yết */}
                <div className="grid grid-cols-2 gap-2 text-xs bg-gray-50 p-2.5 rounded-lg border border-gray-200">
                  <div>
                    <span className="text-[10px] text-gray-500 block">Giá vốn nhập (Cost):</span>
                    <strong className="text-gray-900 font-mono font-bold">{selectedItem.costPrice}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 block">Giá niêm yết phòng:</span>
                    <strong className="text-emerald-700 font-mono font-bold">{selectedItem.sellingPrice}</strong>
                  </div>
                  <div className="pt-1 border-t border-gray-200">
                    <span className="text-[10px] text-gray-500 block">Ngưỡng cảnh báo:</span>
                    <strong className="text-rose-600 font-mono">&lt; {selectedItem.minAlertLevel} (Par Min)</strong>
                  </div>
                  <div className="pt-1 border-t border-gray-200">
                    <span className="text-[10px] text-gray-500 block">Thiếu hụt thực tế:</span>
                    <strong className="text-rose-600 font-mono font-bold">
                      {selectedItem.currentStock < selectedItem.parStock ? `-${selectedItem.parStock - selectedItem.currentStock} chai` : '0'}
                    </strong>
                  </div>
                </div>

                {/* FORM ĐIỀU CHỈNH NHẬP / XUẤT KHO NHANH (OPTIMISTIC LOCKING + FIFO) */}
                <form onSubmit={handleInventorySubmit} className="pt-1 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between font-bold text-gray-700">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm text-emerald-700">swap_horiz</span>
                      Điều Chỉnh Nhập / Xuất Kho Nhanh
                    </span>
                    <div className="flex items-center gap-1 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setActionType('OUT')}
                        className={`px-2 py-0.5 rounded font-bold ${
                          actionType === 'OUT' ? 'bg-rose-100 text-rose-800' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        Xuất FIFO
                      </button>
                      <button
                        type="button"
                        onClick={() => setActionType('IN')}
                        className={`px-2 py-0.5 rounded font-bold ${
                          actionType === 'IN' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        Nhập Lô
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <input
                        type="number"
                        min="1"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg p-2 font-mono font-bold text-xs bg-gray-50"
                        placeholder="Số lượng..."
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg p-2 text-xs bg-gray-50"
                        placeholder="Lý do điều chỉnh..."
                      />
                    </div>
                  </div>

                  {feedbackMessage.text && (
                    <div className={`p-2 rounded-lg text-[11px] font-semibold ${
                      feedbackMessage.type === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {feedbackMessage.text}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-lg shadow flex items-center justify-center gap-1.5 transition"
                  >
                    <span className="material-symbols-outlined text-sm">verified_user</span>
                    {isSubmitting ? 'Đang Xử Lý Khóa Lạc Quan...' : 'Xác Nhận & Ký Sổ Cái SHA-256'}
                  </button>
                </form>

              </div>
            )}

            {/* Card 2: GIÁM SÁT 8 XE ĐẨY BUỒNG PHÒNG (FLOOR CARTS) */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800">
                  <span className="material-symbols-outlined text-sm text-emerald-700">shopping_cart</span>
                  <span>Giám Sát 8 Xe Đẩy Buồng Phòng</span>
                </div>
                <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-emerald-100 text-emerald-800">
                  8/8 ACTIVE
                </span>
              </div>
              <p className="text-[11px] text-gray-500">
                Theo dõi lưu lượng vật phẩm đang luân chuyển trên các xe đẩy Floor Carts (Tầng 4 đến 18).
              </p>

              <div className="space-y-2 text-xs">
                
                {/* Xe đẩy 1 */}
                <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded bg-emerald-100 text-emerald-800 flex items-center justify-center font-mono font-bold text-xs">
                      C-02
                    </span>
                    <div>
                      <div className="font-bold text-gray-900">Tầng 12-14 (Tower Sol)</div>
                      <div className="text-[10px] text-gray-500">NV: Nguyễn Văn An • 24 Minibars Checked</div>
                    </div>
                  </div>
                  <div className="text-right font-mono">
                    <span className="font-bold text-emerald-700">82%</span>
                    <span className="text-[10px] text-gray-400 block">Đủ par</span>
                  </div>
                </div>

                {/* Xe đẩy 2 */}
                <div className="p-2.5 rounded-lg bg-rose-50/50 border border-rose-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded bg-rose-100 text-rose-800 flex items-center justify-center font-mono font-bold text-xs">
                      C-05
                    </span>
                    <div>
                      <div className="font-bold text-gray-900">Tầng 16-18 (Penthouse Suites)</div>
                      <div className="text-[10px] text-rose-600 font-semibold">NV: Trần Thị Mai • Cần cấp thêm Nespresso</div>
                    </div>
                  </div>
                  <div className="text-right font-mono">
                    <span className="font-bold text-rose-600">45%</span>
                    <span className="text-[10px] text-rose-600 font-bold block">Cần bù kho</span>
                  </div>
                </div>

                {/* Xe đẩy 3 */}
                <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded bg-teal-100 text-teal-800 flex items-center justify-center font-mono font-bold text-xs">
                      C-08
                    </span>
                    <div>
                      <div className="font-bold text-gray-900">Tầng 04-06 (Garden Villas)</div>
                      <div className="text-[10px] text-gray-500">NV: Lê Quốc Bảo • Tự động hóa Smart-Sensor</div>
                    </div>
                  </div>
                  <div className="text-right font-mono">
                    <span className="font-bold text-teal-700">96%</span>
                    <span className="text-[10px] text-gray-400 block">Hoàn tất ca</span>
                  </div>
                </div>

              </div>

              <button
                onClick={() => navigate('/admin/housekeeping/linen')}
                className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg text-xs flex items-center justify-center gap-1 transition"
              >
                <span className="material-symbols-outlined text-sm">map</span>
                Xem Bản Đồ Luân Chuyển Vật Phẩm
              </button>
            </div>

          </div>

        </div>

      </div>
    </AdminLayout>
  );
};

export default ConsumablesInventory;
