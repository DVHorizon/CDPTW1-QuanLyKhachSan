import React, { useState, useEffect } from 'react';
import AdminLayout from '../../../components/admin/layout/AdminLayout';
import MenuForm from './MenuForm';

const MenuManagement = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [status, setStatus] = useState('');
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, itemId: null });
  const [messageModal, setMessageModal] = useState({ isOpen: false, type: 'success', title: '', message: '' });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    itemName: '', sku: '', categoryId: 1, price: 0, status: 'Available', description: ''
  });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const totalPages = Math.ceil(menuItems.length / itemsPerPage);
  const currentItems = menuItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const fetchMenu = () => {
    setLoading(true);
    let url = 'http://localhost:5000/api/v1/menu-items';
    const params = new URLSearchParams();
    if (keyword) params.append('keyword', keyword);
    if (selectedCategory) params.append('category', selectedCategory);
    if (status) params.append('status', status);
    if (params.toString()) url += `?${params.toString()}`;

    fetch(url)
      .then(res => res.json())
      .then(res => {
        if (res.success && Array.isArray(res.data)) {
          setMenuItems(res.data);
        } else {
          setMenuItems([]);
        }
        setLoading(false);
      })
      .catch((error) => {
        console.error("Fetch error:", error);
        setMenuItems([]);
        setLoading(false);
      });
  };

  useEffect(() => { 
    setCurrentPage(1);
    const timer = setTimeout(() => {
      fetchMenu();
    }, 300); // Debounce search
    return () => clearTimeout(timer);
  }, [keyword, selectedCategory, status]);

  const openAddModal = () => {
    setEditingItem(null);
    setFormData({ 
      ItemName: '', 
      CategoryId: 5, 
      Price: 0, 
      Status: 'Available', 
      ServingTime: 'Cả Ngày', 
      KitchenStation: 'Bếp Nóng 01', 
      Description: '', 
      ImageUrl: '' 
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setFormData({ ...item });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const url = editingItem
      ? `http://localhost:5000/api/v1/menu-items/${editingItem.MenuItemId}`
      : 'http://localhost:5000/api/v1/menu-items';

    try {
      const response = await fetch(url, {
        method: editingItem ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const result = await response.json();
      if (response.ok) {
        setMessageModal({ isOpen: true, type: 'success', title: 'THÀNH CÔNG', message: result.message });
        setIsModalOpen(false);
        fetchMenu();
      } else {
        setMessageModal({ isOpen: true, type: 'error', title: 'LỖI', message: result.message });
      }
    } catch (error) {
      setMessageModal({ isOpen: true, type: 'error', title: 'LỖI HỆ THỐNG', message: 'Không thể kết nối.' });
    }
  };


  const handleArchiveClick = (id, e) => {
    e.stopPropagation();
    setConfirmModal({ isOpen: true, itemId: id });
  };

  const handleStatusToggle = async (item, e) => {
    e.stopPropagation();
    const newStatus = item.Status === 'Available' ? 'OutOfStock' : 'Available';
    
    try {
      const response = await fetch(`http://localhost:5000/api/v1/menu-items/${item.MenuItemId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const result = await response.json();
      
      if (response.ok) {
        // Show success briefly if needed, or just refresh
        fetchMenu();
      } else {
        setMessageModal({ isOpen: true, type: 'error', title: 'LỖI', message: result.message });
      }
    } catch (err) {
      setMessageModal({ isOpen: true, type: 'error', title: 'LỖI HỆ THỐNG', message: 'Không thể cập nhật trạng thái món.' });
    }
  };

  const executeArchive = async () => {
    const id = confirmModal.itemId;
    setConfirmModal({ isOpen: false, itemId: null });
    try {
      const response = await fetch(`http://localhost:5000/api/v1/menu-items/${id}`, { method: 'DELETE' });
      const result = await response.json();
      setMessageModal({
        isOpen: true,
        type: response.ok ? 'success' : 'error',
        title: response.ok ? 'ĐÃ XÓA MÓN THÀNH CÔNG' : 'KHÔNG THỂ XÓA MÓN',
        message: result.message
      });
      if (response.ok) fetchMenu();
    } catch (err) {
      setMessageModal({ isOpen: true, type: 'error', title: 'LỖI HỆ THỐNG', message: 'Không thể kết nối đến server.' });
    }
  };



  const [activeRow, setActiveRow] = useState(0);

  return (
    <AdminLayout>
      <div className="flex flex-col w-full">
        {/*  Top Technical Header Strip  */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-space-md mb-space-lg">
          <div className="flex flex-col">
            <div className="flex items-center gap-space-xs font-label-sm text-label-sm uppercase tracking-widest text-admin-primary font-bold">
              <span>Ẩm Thực &amp; Bếp</span>
              <span className="text-outline-variant">/</span>
              <span className="text-on-surface-variant font-mono">Module 30 // PMS F&amp;B Engine</span>
              <span className="text-outline-variant">/</span>
              <span className="inline-flex items-center gap-1 text-admin-primary bg-admin-primary/10 px-space-xs py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-admin-primary animate-pulse"></span>
                POS Sync Live v4.2.1
              </span>
            </div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface font-semibold tracking-tight mt-0.5">
              Quản Lý Thực Đơn, Định Lượng &amp; Giá Thành Bếp
            </h1>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Hệ thống điều hành công thức chuẩn (SOP), quản trị food cost và liên động KDS bếp đa trạm thời gian thực.
            </p>
          </div>
          {/*  Terminal Utility Command Bar  */}
          <div className="flex flex-wrap items-center gap-space-xs">
            <button onClick={openAddModal} className="flex items-center gap-space-xs px-space-md py-space-sm bg-admin-primary-container text-on-admin-primary font-label-md text-label-md font-semibold rounded-lg hover:brightness-105 shadow-[0_0_12px_rgba(16,185,129,0.3)] transition-all cursor-pointer" type="button">
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              <span>+ Thêm Món Mới</span>
            </button>
          </div>
        </div>
        {/*  Operational KPI Metric Grid (4 Cards)  */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-space-md mb-space-lg">
          {/*  Card 1: Active SKUs  */}
          <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between relative overflow-hidden">
            <div className="flex items-center justify-between mb-space-xs">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-bold">Món Đang Phục Vụ</span>
              <span className="material-symbols-outlined text-[20px] text-admin-primary">restaurant_menu</span>
            </div>
            <div className="flex items-baseline gap-space-xs">
              <span className="font-headline-lg text-headline-lg font-bold text-on-surface font-mono">64</span>
              <span className="font-label-sm text-label-sm text-admin-primary font-semibold">Món Trực Tuyến</span>
            </div>
            <div className="flex items-center gap-space-sm pt-space-xs mt-space-xs text-on-surface-variant font-body-sm text-body-sm bg-surface-container-low px-space-xs py-1 rounded-md">
              <span>Khai vị: <strong className="text-on-surface font-mono">14</strong></span>
              <span>•</span>
              <span>Chính: <strong className="text-on-surface font-mono">22</strong></span>
              <span>•</span>
              <span>Bar: <strong className="text-on-surface font-mono">28</strong></span>
            </div>
          </div>
          {/*  Card 2: Food Cost & Margin  */}
          <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-space-xs">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-bold">Biên Lợi Nhuận Gộp TB</span>
              <span className="material-symbols-outlined text-[20px] text-admin-primary-container">percent</span>
            </div>
            <div className="flex items-baseline gap-space-xs">
              <span className="font-headline-lg text-headline-lg font-bold text-admin-primary font-mono">68.4%</span>
              <span className="font-label-sm text-label-sm text-admin-primary bg-admin-primary/10 px-1 rounded font-semibold">+3.4% v/s KPI</span>
            </div>
            <div className="flex items-center justify-between pt-space-xs mt-space-xs font-body-sm text-body-sm text-on-surface-variant">
              <span>Food Cost định mức:</span>
              <span className="font-mono font-bold text-on-surface">31.6% (Chuẩn: 35%)</span>
            </div>
          </div>
          {/*  Card 3: Out of Stock (86'd)  */}
          <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-space-xs">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-tertiary font-bold">Tạm Khóa POS (86'd List)</span>
              <span className="material-symbols-outlined text-[20px] text-tertiary">do_not_disturb_on</span>
            </div>
            <div className="flex items-baseline gap-space-xs">
              <span className="font-headline-lg text-headline-lg font-bold text-tertiary font-mono">03</span>
              <span className="font-label-sm text-label-sm text-tertiary font-medium">Món cạn nguyên liệu</span>
            </div>
            <div className="pt-space-xs mt-space-xs text-on-surface-variant font-label-sm text-label-sm truncate">
              <span className="text-on-surface font-semibold">Wagyu A5</span>, <span className="text-on-surface font-semibold">Risotto Nấm Truffle</span>, <span className="text-on-surface font-semibold">Yuzu Tart</span>
            </div>
          </div>
          {/*  Card 4: KDS Stations  */}
          <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-space-xs">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-bold">KDS Màn Hình Bếp Liên Động</span>
              <span className="material-symbols-outlined text-[20px] text-secondary">desktop_windows</span>
            </div>
            <div className="flex items-baseline gap-space-xs">
              <span className="font-headline-lg text-headline-lg font-bold text-on-surface font-mono">04/04</span>
              <span className="font-label-sm text-label-sm text-secondary font-semibold">Trạm Sẵn Sàng</span>
            </div>
            <div className="flex items-center gap-1 pt-space-xs mt-space-xs">
              <span className="px-1.5 py-0.5 rounded bg-surface-container font-label-sm text-[10px] text-on-surface font-mono font-medium">Bếp Nóng</span>
              <span className="px-1.5 py-0.5 rounded bg-surface-container font-label-sm text-[10px] text-on-surface font-mono font-medium">Bếp Lạnh</span>
              <span className="px-1.5 py-0.5 rounded bg-surface-container font-label-sm text-[10px] text-on-surface font-mono font-medium">Bếp Bánh</span>
              <span className="px-1.5 py-0.5 rounded bg-surface-container font-label-sm text-[10px] text-on-surface font-mono font-medium">Bar Quầy</span>
            </div>
          </div>
        </div>
        {/*  Primary Workspace: Catalog Engine & Specification Drawer (Bento Split)  */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
          {/*  Left Matrix: Menu Filters & Catalog Master Table (7 Cols)  */}
          <div className="lg:col-span-7 flex flex-col gap-space-md">
            {/*  Filter Segmented Tabs & Instant Keyword Search  */}
            <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col gap-space-md">
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-space-sm">
                {/*  Meal Period Badges / Categories  */}
                <div className="inline-flex p-1 bg-surface-container rounded-lg gap-1 overflow-x-auto">
                  <button onClick={() => setSelectedCategory('')} className={`px-space-sm py-1 rounded font-label-md text-label-md whitespace-nowrap ${selectedCategory === '' ? 'bg-surface-container-lowest shadow-sm text-admin-primary font-bold' : 'hover:bg-surface-container-high text-on-surface-variant'}`} type="button">
                    Tất Cả Món
                  </button>
                  <button onClick={() => setSelectedCategory('1')} className={`px-space-sm py-1 rounded font-label-md text-label-md whitespace-nowrap ${selectedCategory === '1' ? 'bg-surface-container-lowest shadow-sm text-admin-primary font-bold' : 'hover:bg-surface-container-high text-on-surface-variant'}`} type="button">
                    Bếp Nóng
                  </button>
                  <button onClick={() => setSelectedCategory('2')} className={`px-space-sm py-1 rounded font-label-md text-label-md whitespace-nowrap ${selectedCategory === '2' ? 'bg-surface-container-lowest shadow-sm text-admin-primary font-bold' : 'hover:bg-surface-container-high text-on-surface-variant'}`} type="button">
                    Bếp Lạnh
                  </button>
                  <button onClick={() => setSelectedCategory('3')} className={`px-space-sm py-1 rounded font-label-md text-label-md whitespace-nowrap ${selectedCategory === '3' ? 'bg-surface-container-lowest shadow-sm text-admin-primary font-bold' : 'hover:bg-surface-container-high text-on-surface-variant'}`} type="button">
                    Tráng Miệng
                  </button>
                  <button onClick={() => setSelectedCategory('4')} className={`px-space-sm py-1 rounded font-label-md text-label-md whitespace-nowrap ${selectedCategory === '4' ? 'bg-surface-container-lowest shadow-sm text-admin-primary font-bold' : 'hover:bg-surface-container-high text-on-surface-variant'}`} type="button">
                    Đồ Uống / Bar
                  </button>
                </div>
                
                {/* Filters */}
                <div className="flex gap-2 items-center w-full md:w-auto">
                  <select 
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="bg-surface pl-3 pr-8 py-1.5 rounded-lg text-body-sm font-body-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary border border-surface-container shadow-sm cursor-pointer font-medium"
                  >
                    <option value="">Tất Cả Trạng Thái</option>
                    <option value="Available">🟢 Đang Phục Vụ</option>
                    <option value="OutOfStock">🟠 Tạm Hết Món (86'd)</option>
                    <option value="Inactive">🔴 Ngừng Bán / Đã Khóa</option>
                  </select>

                  {/*  SKU Quick Lookup Field  */}
                  <div className="relative flex-1 min-w-[250px]">
                    <span className="material-symbols-outlined absolute left-2.5 top-2 text-[18px] text-on-surface-variant">search</span>
                    <input 
                      className="w-full bg-surface pl-8 pr-12 py-1.5 rounded-lg text-body-sm font-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-primary shadow-sm border border-surface-container" 
                      placeholder="Tìm theo tên món ăn hoặc mô tả..." 
                      type="text" 
                      value={keyword}
                      onChange={(e) => setKeyword(e.target.value)} 
                    />
                    <span className="absolute right-2 top-2 font-mono text-[10px] text-outline-variant bg-surface-container px-1 rounded">⌘K</span>
                  </div>
                </div>
              </div>
              {/*  Catalog Data Table  */}
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-surface-container-low text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider">
                      <th className="py-2.5 px-3 rounded-l-lg">Mã &amp; Tên Món</th>
                      <th className="py-2.5 px-3">Danh Mục</th>
                      <th className="py-2.5 px-3 text-right">Giá Niêm Yết</th>
                      <th className="py-2.5 px-3 text-center">Trạng Thái</th>
                      <th className="py-2.5 px-3 text-center rounded-r-lg">Thao Tác</th>
                    </tr>
                  </thead>

                  <tbody className="text-body-sm font-body-sm divide-y divide-surface-container-high/60">
                    {loading ? (
                      <tr>
                        <td colSpan="5" className="text-center py-10">
                          <div className="flex items-center justify-center gap-2 text-on-surface-variant font-medium">
                            <span className="w-5 h-5 border-2 border-admin-primary border-t-transparent rounded-full animate-spin"></span>
                            <span>Đang tải thực đơn...</span>
                          </div>
                        </td>
                      </tr>
                    ) : menuItems.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="text-center py-8">
                          <div className="flex flex-col items-center justify-center gap-1.5 text-on-surface-variant">
                            <span className="material-symbols-outlined text-[32px] text-outline">search_off</span>
                            <span className="font-semibold text-body-md">
                              {keyword 
                                ? 'Không tìm thấy món ăn phù hợp với từ khóa.' 
                                : selectedCategory
                                  ? 'Không tìm thấy món ăn trong danh mục đã chọn.'
                                  : status
                                    ? 'Không có món ăn phù hợp với trạng thái đã chọn.'
                                    : 'Chưa có món ăn nào trong CSDL'}
                            </span>
                            {(keyword || selectedCategory || status) && (
                              <button
                                type="button"
                                onClick={() => {
                                  setKeyword('');
                                  setSelectedCategory('');
                                  setStatus('');
                                }}
                                className="mt-2 px-3 py-1 bg-surface-container hover:bg-surface-container-highest text-primary font-bold text-xs rounded-lg transition-colors cursor-pointer"
                              >
                                Xóa tất cả bộ lọc
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      currentItems.map(item => (
                        <tr key={item.MenuItemId} onClick={() => { setActiveRow(item.MenuItemId); setEditingItem(item); setFormData({ ...item }); setIsModalOpen(true); }} 
                          className={`hover:bg-surface-container transition-all cursor-pointer ${
                            activeRow === item.MenuItemId 
                              ? (item.Status === 'Available' ? 'bg-[#10B981]/10' : 'bg-[#EF4444]/10') 
                              : (item.Status === 'Available' ? 'bg-transparent' : 'bg-[#EF4444]/5')
                          }`}
                        >
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              <div className={`w-1.5 h-8 rounded ${activeRow === item.MenuItemId ? (item.Status === 'Available' ? 'bg-[#10B981]' : 'bg-[#EF4444]') : 'bg-transparent'}`}></div>
                              <div className="flex flex-col">
                                <div className="flex items-center gap-1.5">
                                  <span className={`font-headline-sm text-body-md font-semibold text-on-surface ${item.Status !== 'Available' ? 'line-through opacity-80' : ''}`}>
                                    {item.ItemName}
                                  </span>
                                  {item.Status !== 'Available' && <span className="bg-[#EF4444] text-white font-label-sm text-[9px] px-1.5 py-0.5 rounded font-bold uppercase shadow-sm">86'D</span>}
                                </div>
                                <span className="font-mono text-label-sm text-on-surface-variant font-bold text-admin-primary">#MN-{item.MenuItemId}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <span className="inline-flex items-center gap-1 font-label-sm text-label-sm bg-surface-container text-on-surface px-2 py-0.5 rounded">
                              <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span> {item.MenuCategory ? item.MenuCategory.CategoryName : 'Chưa phân loại'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-on-surface">
                            {Number(item.Price).toLocaleString('vi-VN')} đ
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className={`inline-flex items-center gap-1 font-label-sm text-label-sm px-2.5 py-1 rounded-full font-bold ${item.Status === 'Available' ? 'bg-[#10B981]/15 text-[#10B981]' : item.Status === 'OutOfStock' ? 'bg-[#F59E0B]/15 text-[#F59E0B]' : 'bg-[#EF4444]/15 text-[#EF4444]'}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${item.Status === 'Available' ? 'bg-[#10B981]' : item.Status === 'OutOfStock' ? 'bg-[#F59E0B]' : 'bg-[#EF4444]'}`}></span>
                              {item.Status === 'Available' ? 'Đang Phục Vụ' : item.Status === 'OutOfStock' ? 'Tạm Hết' : 'Ngừng Bán'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button 
                                onClick={(e) => handleStatusToggle(item, e)}
                                className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${item.Status === 'Available' ? 'bg-[#10B981]/15 text-[#10B981] hover:bg-[#10B981]/30' : 'bg-[#EF4444]/15 text-[#EF4444] hover:bg-[#EF4444]/30'}`}
                                title={item.Status === 'Available' ? 'Đổi trạng thái: Tạm Hết' : 'Đổi trạng thái: Mở Bán'}
                              >
                                <span className="material-symbols-outlined text-[16px]">
                                  {item.Status === 'Available' ? 'toggle_on' : 'toggle_off'}
                                </span>
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); openEditModal(item); }} 
                                className="w-7 h-7 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface flex items-center justify-center transition-colors" 
                                title="Chỉnh sửa món"
                              >
                                <span className="material-symbols-outlined text-[15px]">edit</span>
                              </button>
                              {item.Status === 'Inactive' ? (
                                <button 
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    try {
                                      const res = await fetch(`http://localhost:5000/api/v1/menu-items/${item.MenuItemId}`, {
                                        method: 'PUT',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ Status: 'Available' })
                                      });
                                      if (res.ok) {
                                        setMessageModal({ isOpen: true, type: 'success', title: 'THÀNH CÔNG', message: 'Đã mở bán lại món ăn này!' });
                                        fetchMenu();
                                      }
                                    } catch (err) {
                                      setMessageModal({ isOpen: true, type: 'error', title: 'LỖI', message: 'Không thể kết nối.' });
                                    }
                                  }} 
                                  className="w-7 h-7 rounded-full bg-admin-primary/15 text-admin-primary flex items-center justify-center hover:bg-admin-primary/30 transition-colors" 
                                  title="Mở bán lại món này"
                                >
                                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                                </button>
                              ) : (
                                <button 
                                  onClick={(e) => handleArchiveClick(item.MenuItemId, e)} 
                                  className="w-7 h-7 rounded-full bg-error-container/50 text-error flex items-center justify-center hover:bg-error-container transition-colors" 
                                  title="Ngừng bán món ăn này"
                                >
                                  <span className="material-symbols-outlined text-[15px]">delete</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>

                </table>
              </div>
              {/*  Table Operational Footer Strip (Dynamic Pagination)  */}
              <div className="flex items-center justify-between pt-space-xs font-label-sm text-label-sm text-on-surface-variant">
                <span>
                  {menuItems.length > 0
                    ? `Hiển thị ${(currentPage - 1) * itemsPerPage + 1} - ${Math.min(currentPage * itemsPerPage, menuItems.length)} trên tổng số ${menuItems.length} món`
                    : 'Không có món ăn nào'}
                </span>
                <div className="flex items-center gap-space-xs">
                  <button 
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${currentPage <= 1 ? 'opacity-40 cursor-not-allowed bg-surface-container text-on-surface-variant' : 'bg-surface-container hover:bg-surface-container-high text-on-surface cursor-pointer'}`} 
                    type="button"
                    title="Trang trước"
                  >
                    <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                  </button>
                  <span className="font-mono font-semibold text-on-surface px-1">
                    {totalPages > 0 ? `${currentPage} / ${totalPages}` : '0 / 0'}
                  </span>
                  <button 
                    disabled={currentPage >= totalPages || totalPages === 0}
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${currentPage >= totalPages || totalPages === 0 ? 'opacity-40 cursor-not-allowed bg-surface-container text-on-surface-variant' : 'bg-surface-container hover:bg-surface-container-high text-on-surface cursor-pointer'}`} 
                    type="button"
                    title="Trang sau"
                  >
                    <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
          
{/*  Right Matrix: Dynamic Drawer (5 Cols)  */}
          <div className="lg:col-span-5 flex flex-col gap-space-md">
            <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm flex flex-col justify-between h-full border border-surface-container-highest">
              
              {isModalOpen ? (
                /* FORM VIEW */
                <MenuForm
                  isEditing={!!editingItem}
                  formData={formData}
                  setFormData={setFormData}
                  handleSave={handleSave}
                  onCancel={() => { setIsModalOpen(false); setActiveRow(null); }}
                  onDelete={() => setConfirmModal({ isOpen: true, itemId: editingItem?.MenuItemId })}
                />
              ) : (
                /* EMPTY PLACEHOLDER */
                <div className="flex flex-col items-center justify-center h-full text-center gap-4 py-20">
                  <div className="w-24 h-24 rounded-full bg-surface-container flex items-center justify-center">
                    <span className="material-symbols-outlined text-5xl text-outline-variant">pan_tool_alt</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    <h3 className="text-title-lg font-bold text-on-surface">Chưa chọn món ăn</h3>
                    <p className="text-body-md text-on-surface-variant max-w-xs mx-auto">Vui lòng chọn một món ăn từ danh sách bên trái để xem chi tiết, hoặc bấm Thêm Mới.</p>
                  </div>
                  <button type="button" onClick={openAddModal} className="mt-4 px-6 py-2.5 bg-admin-primary-container text-on-admin-primary font-bold rounded-lg hover:brightness-105 shadow transition-all">
                    + Thêm Món Mới
                  </button>
                </div>
              )}

            </div>
          </div>
</div>
      </div>


      {/* CONFIRM MODAL */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-container-lowest w-full max-w-md p-space-lg rounded-2xl shadow-xl flex flex-col items-center text-center gap-space-md border-t-4 border-error">
            <span className="material-symbols-outlined text-[48px] text-error mb-2">warning</span>
            <h2 className="text-headline-sm font-bold text-on-surface">Ngừng Kinh Doanh &amp; Lưu Trữ Món</h2>
            <p className="text-body-md text-on-surface-variant">Món ăn này sẽ được ẩn khỏi thực đơn bán hàng (xóa mềm). Toàn bộ lịch sử hóa đơn và dữ liệu trong CSDL vẫn được lưu trữ an toàn.</p>
            <div className="flex justify-center gap-3 mt-4 w-full">
              <button type="button" onClick={() => setConfirmModal({ isOpen: false, itemId: null })} className="flex-1 py-3 rounded-lg bg-surface-container text-on-surface font-semibold hover:bg-surface-container-high transition-colors">
                Hủy
              </button>
              <button type="button" onClick={executeArchive} className="flex-1 py-3 rounded-lg bg-error text-on-error font-bold hover:brightness-110 transition-colors shadow-lg">
                Xác Nhận Ẩn Món
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MESSAGE MODAL (SUCCESS/ERROR) */}
      {messageModal.isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-md">
          <div className="bg-surface-container-lowest w-full max-w-lg p-space-xl rounded-3xl shadow-2xl flex flex-col items-center text-center relative border border-surface-container-highest">

            {/* Floating Icon */}
            <div className={`absolute -top-8 w-16 h-16 rounded-full flex items-center justify-center shadow-lg border-4 border-surface-container-lowest ${messageModal.type === 'success' ? 'bg-[#10B981]' : 'bg-[#EF4444]'}`}>
              <span className="material-symbols-outlined text-white text-[32px] font-bold">
                {messageModal.type === 'success' ? 'check' : 'close'}
              </span>
            </div>

            <h2 className="text-headline-md font-extrabold text-on-surface mt-6 uppercase tracking-wide">
              {messageModal.title}
            </h2>

            <div className="mt-4 py-4 px-6 bg-surface-container/50 rounded-xl w-full border border-surface-container-high border-dashed">
              <p className="text-body-lg text-on-surface-variant font-medium">
                {messageModal.message}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setMessageModal({ isOpen: false, type: 'success', title: '', message: '' })}
              className={`mt-8 w-full py-4 rounded-xl font-bold uppercase tracking-wider text-white shadow-md hover:brightness-110 transition-all flex items-center justify-center gap-2 ${messageModal.type === 'success' ? 'bg-[#10B981]' : 'bg-[#EF4444]'}`}
            >
              [ Đóng / Quay về danh sách ]
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </div>
        </div>
      )}

    </AdminLayout>
  );
};

export default MenuManagement;
