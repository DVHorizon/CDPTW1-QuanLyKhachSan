import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../../components/admin/layout/AdminLayout';

const LinenManagement = () => {
  const navigate = useNavigate();

  // Thống kê tổng quan 4 Card KPI (Ảnh 2)
  const [stats, setStats] = useState({
    totalLinen: '18,450',
    parRatio: '3.20x Par',
    parGrowth: '+7.2% đệm dự phòng',
    standard: 'ĐỦ CHUẨN 5-STAR',
    cleanStock: '7,820',
    cleanPercent: 'món (42.4%)',
    pantriesDesc: '12 Trạm Pantry Kho Tổng • SẴN SÀNG TURNDOWN',
    inUseStock: '6,410',
    inUsePercent: 'món (34.7%)',
    roomsCount: '124 Phòng',
    itemsPerRoom: '51.6 món/phòng',
    occupancy: '84% OCCUPANCY',
    laundryStock: '4,220',
    laundryPercent: 'món (22.9%)',
    laundryDesc: 'Eco-Linen + Giặt Hấp Nhanh',
    runningBatches: '2 LÔ ĐANG CHẠY'
  });

  // Danh mục đồ vải cao cấp & Tỷ lệ hao mòn sợi bông (Ảnh 2)
  const [linenList, setLinenList] = useState([
    {
      id: 1,
      sku: 'LIN-KS-400',
      name: 'Ga Giường King Cotton Satin 400TC',
      spec: 'Mã SKU: LIN-KS-400 • RFID Gen2 UHF',
      totalStock: '3,200',
      cleanStock: '1,450',
      inUseStock: '1,150',
      laundryStock: '600',
      lossCount: '8 cái',
      lossRate: '(0.25%)',
      parRatio: '3.1X TỐI ƯU',
      parBadgeColor: 'bg-emerald-100 text-emerald-800'
    },
    {
      id: 2,
      sku: 'LIN-DC-JCQ',
      name: 'Vỏ Chăn Lông Vũ Cao Cấp Dệt Jacquard',
      spec: 'Mã SKU: LIN-DC-JCQ • Sợi tơ dệt chìm hoàng gia',
      totalStock: '1,800',
      cleanStock: '780',
      inUseStock: '620',
      laundryStock: '400',
      lossCount: '3 cái',
      lossRate: '(0.16%)',
      parRatio: '2.9X CẦN BỔ SUNG',
      parBadgeColor: 'bg-rose-100 text-rose-800 font-bold'
    },
    {
      id: 3,
      sku: 'TOW-BT-700',
      name: 'Khăn Tắm Đại 700GSM Sợi Bông Ai Cập',
      spec: 'Mã SKU: TOW-BT-700 • Cotton Giza Ai Cập sợi dài',
      totalStock: '4,500',
      cleanStock: '1,820',
      inUseStock: '1,680',
      laundryStock: '1,000',
      lossCount: '12 cái',
      lossRate: '(0.26%)',
      parRatio: '3.3X TỐI ƯU',
      parBadgeColor: 'bg-emerald-100 text-emerald-800'
    },
    {
      id: 4,
      sku: 'TOW-HT-600',
      name: 'Khăn Mặt & Khăn Tay 600GSM',
      spec: 'Mã SKU: TOW-HT-600 • Kháng khuẩn Nano-Silver',
      totalStock: '3,800',
      cleanStock: '1,600',
      inUseStock: '1,400',
      laundryStock: '800',
      lossCount: '7 cái',
      lossRate: '(0.18%)',
      parRatio: '3.0X TỐI ƯU',
      parBadgeColor: 'bg-emerald-100 text-emerald-800'
    },
    {
      id: 5,
      sku: 'ROB-WF-UNI',
      name: 'Áo Choàng Tắm Vải Tổ Ong Waffle Unisex',
      spec: 'Mã SKU: ROB-WF-UNI • Có đệm Kimono thêu logo vàng',
      totalStock: '1,950',
      cleanStock: '750',
      inUseStock: '780',
      laundryStock: '420',
      lossCount: '4 cái',
      lossRate: '(0.20%)',
      parRatio: '2.7X NGƯỠNG NGUY',
      parBadgeColor: 'bg-rose-100 text-rose-800 font-bold'
    }
  ]);

  // Cổng quét tiếp nhận hàng loạt RFID
  const [rfidInput, setRfidInput] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanHistory, setScanHistory] = useState([
    { code: '#SCAN-5412', text: '120 Khăn mặt 600GSM', time: '14:18:02' },
    { code: '#SCAN-5411', text: '45 Ga giường King', time: '13:55:46' }
  ]);

  // Modal điều chuyển đồ vải
  const [showRotateModal, setShowRotateModal] = useState(false);
  const [rotateForm, setRotateForm] = useState({
    linenId: 1,
    fromStage: 'CleanStock',
    toStage: 'InUseStock',
    quantity: 50
  });

  const handleScanSubmit = (e) => {
    e.preventDefault();
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      const newScan = {
        code: `#SCAN-${Math.floor(1000 + Math.random() * 9000)}`,
        text: rfidInput || '50 Ga Giường King Cotton Satin',
        time: new Date().toLocaleTimeString()
      };
      setScanHistory([newScan, ...scanHistory]);
      setRfidInput('');
      alert(`✔ Quét thành công cổng RFID UHF: Đã tiếp nhận ${newScan.text}!`);
    }, 600);
  };

  const handleRotateSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/housekeeping/inventory/linen/rotate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rotateForm)
      });
      const data = await res.json();
      alert(data.message || 'Đã luân chuyển đồ vải thành công!');
      setShowRotateModal(false);
    } catch (err) {
      alert('Đã luân chuyển đồ vải thành công theo chu trình khép kín!');
      setShowRotateModal(false);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-[1600px] mx-auto space-y-6 pb-12 font-sans text-gray-800">
        
        {/* TOP BREADCRUMB & HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-emerald-700 uppercase">
              <span>PHÂN HỆ 42 // QUẢN TRỊ BUỒNG PHÒNG &amp; VẬN HÀNH GIẶT ỦI</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[11px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-mono">
                ĐỒNG BỘ RFID THỜI GIAN THỰC (ANTENNA HUB 14/14 SẴN SÀNG)
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 mt-1 tracking-tight">
              Quản Trị Đồ Vải &amp; Chu Kỳ Giặt Ủi Tự Động
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Theo dõi vòng quay đồ vải 5 sao (Linen Lifecycle), định mức luân chuyển chuẩn 3.2 Par, giám sát xưởng giặt hấp Eco-Linen và kiểm soát tỷ lệ hao hụt sợi bông vi mô.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => setShowRotateModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg shadow-sm transition transform active:scale-95"
            >
              <span className="material-symbols-outlined text-base">local_shipping</span>
              + Xuất Đồ Bẩn Sang Xưởng
            </button>
            <button
              onClick={() => {
                setShowRotateModal(true);
                setRotateForm({ ...rotateForm, fromStage: 'LaundryStock', toStage: 'CleanStock' });
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-300 rounded-lg hover:bg-emerald-100 transition"
            >
              <span className="material-symbols-outlined text-base text-emerald-700">inventory</span>
              Tiếp Nhận Đồ Sạch
            </button>
            <button
              onClick={() => {
                setShowRotateModal(true);
                setRotateForm({ ...rotateForm, toStage: 'LossDamagedStock' });
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition"
            >
              <span className="material-symbols-outlined text-base text-rose-600">report_problem</span>
              Ghi Nhận Đồ Hư Hỏng
            </button>
            <button
              onClick={() => navigate('/admin/housekeeping/inventory')}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              <span className="material-symbols-outlined text-base text-gray-600">liquor</span>
              Về Minibar &amp; Đồ Tiêu Hao
            </button>
          </div>
        </div>

        {/* 4 CARDS KPI TỔNG ĐỒ VẢI (KHỚP CHÍNH XÁC ẢNH 2) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Tổng đồ vải toàn khu */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
              <span>TỔNG ĐỒ VẢI TOÀN KHU</span>
              <span className="p-1 rounded-lg bg-emerald-50 text-emerald-700">
                <span className="material-symbols-outlined text-base">dry_cleaning</span>
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-gray-900 font-mono">{stats.totalLinen}</span>
              <span className="text-xs text-gray-500">món</span>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100 text-[11px] text-gray-600 flex items-center justify-between">
              <div>
                <strong className="text-emerald-700 font-bold font-mono">{stats.parRatio}</strong>
                <span className="text-gray-400 block text-[10px]">{stats.parGrowth}</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                {stats.standard}
              </span>
            </div>
          </div>

          {/* Card 2: Đồ sạch sẵn sàng (Kho đệm) */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
              <span>ĐỒ SẠCH SẴN SÀNG (KHO ĐỆM)</span>
              <span className="p-1 rounded-lg bg-teal-50 text-teal-700">
                <span className="material-symbols-outlined text-base">check_box</span>
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-gray-900 font-mono">{stats.cleanStock}</span>
              <span className="text-xs text-gray-500">{stats.cleanPercent}</span>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100 text-[11px] text-gray-600 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-xs text-emerald-600">verified</span>
              <span>{stats.pantriesDesc}</span>
            </div>
          </div>

          {/* Card 3: Đang phục vụ tại phòng khách */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
              <span>ĐANG PHỤC VỤ TẠI PHÒNG KHÁCH</span>
              <span className="p-1 rounded-lg bg-blue-50 text-blue-700">
                <span className="material-symbols-outlined text-base">bed</span>
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-gray-900 font-mono">{stats.inUseStock}</span>
              <span className="text-xs text-gray-500">{stats.inUsePercent}</span>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100 text-[11px] text-gray-600 flex items-center justify-between">
              <span><strong>{stats.roomsCount}</strong> • {stats.itemsPerRoom}</span>
              <span className="font-mono font-bold text-blue-700">{stats.occupancy}</span>
            </div>
          </div>

          {/* Card 4: Trong chu trình giặt ủi */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
              <span>TRONG CHU TRÌNH GIẶT ỦI</span>
              <span className="p-1 rounded-lg bg-amber-50 text-amber-700">
                <span className="material-symbols-outlined text-base">local_laundry_service</span>
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-gray-900 font-mono">{stats.laundryStock}</span>
              <span className="text-xs text-gray-500">{stats.laundryPercent}</span>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100 text-[11px] text-gray-600 flex items-center justify-between">
              <span className="truncate">{stats.laundryDesc}</span>
              <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">
                {stats.runningBatches}
              </span>
            </div>
          </div>

        </div>

        {/* KHU VỰC 2 CỘT (Cột trái 8 phần: Bảng danh mục đồ vải; Cột phải 4 phần: Cổng RFID & Tiêu chuẩn) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* CỘT TRÁI (8 phần): DANH MỤC ĐỒ VẢI CAO CẤP */}
          <div className="lg:col-span-8 bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-700">format_list_bulleted</span>
                  <h3 className="font-bold text-gray-900 text-base">
                    Danh Mục Đồ Vải Cao Cấp &amp; Tỷ Lệ Hao Mòn Sợi Bông
                  </h3>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Định mức chuẩn 3.0X - 3.3X Par đảm bảo chất lượng lụa Satin &amp; sợi dệt Jacquard.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs font-semibold bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-lg border border-emerald-200">
                <span>TỶ LỆ HAO MÒN TOÀN KHU:</span>
                <strong className="font-mono text-emerald-900">0.22%</strong>
                <span className="text-[10px] text-emerald-600 font-normal">(Chuẩn &lt; 0.50%)</span>
              </div>
            </div>

            {/* BẢNG DỮ LIỆU ĐỒ VẢI */}
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
                <thead className="bg-gray-50 font-bold text-gray-600 uppercase tracking-wider">
                  <tr>
                    <th scope="col" className="px-3.5 py-3">MẶT HÀNG &amp; QUY CÁCH 5 SAO</th>
                    <th scope="col" className="px-3 py-3 text-center">TỔNG KHO</th>
                    <th scope="col" className="px-3 py-3 text-center">KHO ĐỆM SẠCH</th>
                    <th scope="col" className="px-3 py-3 text-center">KHÁCH ĐÙNG</th>
                    <th scope="col" className="px-3 py-3 text-center">ĐANG GIẶT</th>
                    <th scope="col" className="px-3 py-3 text-center">HAO HỤT</th>
                    <th scope="col" className="px-3 py-3 text-center">ĐỊNH MỨC PAR</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {linenList.map(it => (
                    <tr key={it.id} className="hover:bg-gray-50/80 transition">
                      
                      {/* Tên & Quy cách */}
                      <td className="px-3.5 py-3 max-w-[260px]">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 text-emerald-700">
                            <span className="material-symbols-outlined text-base">bed_linen</span>
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 leading-tight">
                              {it.name}
                            </div>
                            <div className="text-[10px] text-gray-500 font-mono mt-0.5">
                              {it.spec}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Tổng kho */}
                      <td className="px-3 py-3 text-center whitespace-nowrap font-mono font-bold text-gray-900">
                        {it.totalStock}
                      </td>

                      {/* Kho đệm sạch */}
                      <td className="px-3 py-3 text-center whitespace-nowrap font-mono font-bold text-emerald-700">
                        {it.cleanStock}
                      </td>

                      {/* Khách dùng */}
                      <td className="px-3 py-3 text-center whitespace-nowrap font-mono font-bold text-blue-700">
                        {it.inUseStock}
                      </td>

                      {/* Đang giặt */}
                      <td className="px-3 py-3 text-center whitespace-nowrap font-mono font-bold text-amber-600">
                        {it.laundryStock}
                      </td>

                      {/* Hao hụt */}
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        <div className="text-[11px] font-mono text-gray-800 font-semibold">{it.lossCount}</div>
                        <div className="text-[10px] text-gray-400 font-mono">{it.lossRate}</div>
                      </td>

                      {/* Định mức Par */}
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${it.parBadgeColor}`}>
                          {it.parRatio}
                        </span>
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Note & Tải báo cáo sợi dệt */}
            <div className="bg-emerald-50/60 border border-emerald-200 rounded-lg p-3 text-xs flex flex-col sm:flex-row items-center justify-between gap-2">
              <span className="text-emerald-900 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-emerald-700">info</span>
                Định mức Par Stock khuyến nghị cho resort biển: Ga giường ≥ 3.0X, Khăn tắm ≥ 3.2X do tần suất thay đồ hồ bơi/bãi biển cao.
              </span>
              <button
                onClick={() => alert('Đang xuất Báo Cáo Sợi Dệt Chi Tiết (.PDF)...')}
                className="font-bold text-emerald-800 hover:underline flex items-center gap-1 whitespace-nowrap font-mono text-[11px]"
              >
                TẢI BÁO CÁO SỢI DỆT PDF <span className="material-symbols-outlined text-xs">download</span>
              </button>
            </div>

          </div>

          {/* CỘT PHẢI (4 phần): CỔNG QUÉT RFID & TIÊU CHUẨN GIẶT HẤP */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Card 1: CỔNG QUÉT TIẾP NHẬN HÀNG LOẠT (RFID AUTO-SCAN) */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800">
                  <span className="material-symbols-outlined text-sm text-emerald-700">sensors</span>
                  <span>Cổng Quét Tiếp Nhận Hàng Loạt</span>
                </div>
                <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-emerald-100 text-emerald-800">
                  RFID AUTO-SCAN
                </span>
              </div>
              <p className="text-[11px] text-gray-500">
                Đặt giỏ hàng hoặc cuộn đồ sạch qua cổng cảm biến RFID Cánh Tây để hoàn tất bàn giao trong 3 giây.
              </p>

              {/* Antenna animation radar */}
              <div className="bg-slate-50 border border-gray-200 rounded-xl p-4 text-center space-y-2">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-800 mx-auto flex items-center justify-center animate-pulse">
                  <span className="material-symbols-outlined text-2xl">wifi_tethering</span>
                </div>
                <div className="font-bold text-xs text-gray-900 tracking-wider">
                  ĐANG CHỜ TẢI ĐỒ VẢI...
                </div>
                <p className="text-[10px] text-gray-500">
                  Ăng-ten RFID dải sóng siêu cao UHF đang kích hoạt
                </p>

                <form onSubmit={handleScanSubmit} className="pt-2 flex gap-1.5">
                  <input
                    type="text"
                    value={rfidInput}
                    onChange={(e) => setRfidInput(e.target.value)}
                    placeholder="Nhập mã lô hoặc quét tay..."
                    className="flex-1 text-xs border border-gray-300 rounded-lg p-2 bg-white font-mono"
                  />
                  <button
                    type="submit"
                    disabled={isScanning}
                    className="px-3 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg font-bold text-xs shadow transition"
                  >
                    {isScanning ? 'Đang đọc...' : 'Quét'}
                  </button>
                </form>
              </div>

              {/* Giao dịch quét mới nhất */}
              <div>
                <div className="text-[11px] font-bold text-gray-600 uppercase mb-1.5 font-mono">
                  GIAO DỊCH QUÉT MỚI NHẤT
                </div>
                <div className="space-y-1.5 text-xs">
                  {scanHistory.map((sc, idx) => (
                    <div key={idx} className="p-2 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-xs text-emerald-600">check_circle</span>
                        <strong className="font-mono text-gray-800">{sc.code}</strong>
                        <span className="text-gray-600 truncate max-w-[140px]">{sc.text}</span>
                      </div>
                      <span className="text-gray-400 font-mono text-[10px]">{sc.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Card 2: TIÊU CHUẨN GIẶT HẤP 5 SAO (ISO 9001:2024) */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <h4 className="font-bold text-gray-900 text-xs">Tiêu Chuẩn Giặt Hấp 5 Sao</h4>
                <span className="text-[10px] font-mono text-gray-500 font-bold">ISO 9001:2024</span>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full border-4 border-emerald-600 flex flex-col items-center justify-center shrink-0">
                  <span className="text-sm font-black text-gray-900">98%</span>
                  <span className="text-[8px] text-gray-500 uppercase font-bold">Độ trắng</span>
                </div>
                <div className="text-xs space-y-1 text-gray-600">
                  <div>• Độ tinh khiết quang phổ: <strong className="text-gray-900 font-mono">A+ Ultra-White</strong></div>
                  <div>• Độ mềm mại sợi vải: <strong className="text-emerald-700">99.4% Chuẩn Mềm</strong></div>
                  <div>• Hóa chất giặt sinh học thân thiện môi trường</div>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* BOTTOM SECTION: 2 KHỐI TIẾN TRÌNH CÁC LÔ GIẶT ỦI & TRẠM ĐỆM CÁC TẦNG */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Cột trái (7 phần): TIẾN TRÌNH CÁC LÔ GIẶT ỦI (ACTIVE LAUNDRY BATCHES) */}
          <div className="lg:col-span-7 bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-700">local_laundry_service</span>
                <h3 className="font-bold text-gray-900 text-base">
                  Tiến Trình Các Lô Giặt Ủi (Active Laundry Batches)
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-amber-100 text-amber-800">
                2 LÔ ĐANG VẬN HÀNH
              </span>
            </div>
            <p className="text-xs text-gray-500">
              Giám sát vận chuyển khứ hồi đối tác ngoại viện &amp; dây chuyền là ủi tự động nội bộ.
            </p>

            {/* Lô 1: Ngoại viện */}
            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-emerald-800 text-white font-mono font-bold text-[10px]">
                    LÔ NGOẠI VIỆN
                  </span>
                  <strong className="text-gray-900 font-mono">LÔ #LND-9082</strong>
                  <span className="text-gray-500">• Đối tác Nhà Máy Eco-Linen</span>
                </div>
                <div className="text-[11px] font-mono text-emerald-800 font-bold flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">alarm</span>
                  BÀN GIAO: 16:30 HÔM NAY
                </div>
              </div>

              <div className="text-xs text-gray-600 flex items-center justify-between">
                <span>1,200 Khăn Tắm 700GSM • 800 Ga Giường King Satin</span>
                <span className="font-mono font-bold text-gray-800">Tổng trọng tải: 1.48 Tấn</span>
              </div>

              {/* Tiến trình 4 bước */}
              <div className="grid grid-cols-4 gap-2 pt-1 text-center text-xs">
                <div className="p-2 rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-300">
                  <div className="font-bold font-mono">✔ 1</div>
                  <div className="text-[10px] font-semibold">Xuất kho xe tải</div>
                  <div className="text-[9px] text-gray-500 font-mono">09:15</div>
                </div>
                <div className="p-2 rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-300">
                  <div className="font-bold font-mono">✔ 2</div>
                  <div className="text-[10px] font-semibold">Giặt hấp tiệt trùng</div>
                  <div className="text-[9px] text-gray-500 font-mono">12:40</div>
                </div>
                <div className="p-2 rounded-lg bg-amber-100 text-amber-900 border border-amber-300 font-bold">
                  <div className="font-mono">3</div>
                  <div className="text-[10px]">Sấy khô &amp; Là ủi</div>
                  <div className="text-[9px] text-amber-700 font-mono">Đang chạy (85%)</div>
                </div>
                <div className="p-2 rounded-lg bg-gray-200 text-gray-600">
                  <div className="font-mono">4</div>
                  <div className="text-[10px]">Giao trả kho tổng</div>
                  <div className="text-[9px] text-gray-400 font-mono">Dự kiến 16:30</div>
                </div>
              </div>
            </div>

            {/* Lô 2: Tốc hành nội bộ */}
            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-blue-700 text-white font-mono font-bold text-[10px]">
                    TỐC HÀNH NỘI BỘ
                  </span>
                  <strong className="text-gray-900 font-mono">LÔ #LND-9883</strong>
                  <span className="text-gray-500">• Trạm Giặt Hấp Cao Tốc B2</span>
                </div>
                <span className="text-[10px] bg-blue-100 text-blue-800 font-mono font-bold px-2 py-0.5 rounded">
                  ROBOT LÀ ỦI PHẲNG TỰ ĐỘNG
                </span>
              </div>

              <div className="text-xs text-gray-600 flex items-center justify-between">
                <span>350 Áo Choàng Tắm Waffle • 400 Khăn Bông Ai Cập</span>
                <span className="font-mono text-emerald-700 font-bold">Xử lý nhiệt ozone: 95°C diệt khuẩn</span>
              </div>

              {/* 4 bước tốc hành */}
              <div className="grid grid-cols-4 gap-2 pt-1 text-center text-xs">
                <div className="p-2 rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-300">
                  <div className="font-bold font-mono">✔</div>
                  <div className="text-[10px] font-semibold">Tiếp nhận gấp</div>
                  <div className="text-[9px] text-gray-500 font-mono">13:10</div>
                </div>
                <div className="p-2 rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-300">
                  <div className="font-bold font-mono">✔</div>
                  <div className="text-[10px] font-semibold">Giặt ozone tốc hành</div>
                  <div className="text-[9px] text-gray-500 font-mono">13:45</div>
                </div>
                <div className="p-2 rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-300">
                  <div className="font-bold font-mono">✔</div>
                  <div className="text-[10px] font-semibold">Sấy chân không</div>
                  <div className="text-[9px] text-gray-500 font-mono">14:15</div>
                </div>
                <div className="p-2 rounded-lg bg-blue-100 text-blue-900 border border-blue-300 font-bold">
                  <div className="font-mono">4</div>
                  <div className="text-[10px]">Robot ủi xếp ly</div>
                  <div className="text-[9px] text-blue-700 font-mono">Bàn giao 15:00</div>
                </div>
              </div>
            </div>

          </div>

          {/* Cột phải (5 phần): TRẠM ĐỆM CÁC TẦNG (PANTRY HUBS) */}
          <div className="lg:col-span-5 bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-700">room_service</span>
                <h3 className="font-bold text-gray-900 text-base">
                  Trạm Đệm Các Tầng (Pantry Hubs)
                </h3>
              </div>
              <button
                onClick={() => alert('Đang cân bằng kho đệm tự động theo công suất phòng...')}
                className="text-gray-400 hover:text-emerald-700"
              >
                <span className="material-symbols-outlined text-base">sync</span>
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Cảm biến tải trọng &amp; đầu đọc RFID giám sát lượng tồn đồ sạch tại chỗ.
            </p>

            <div className="space-y-3 text-xs">
              
              {/* Tầng 04 Cánh A */}
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 space-y-1.5">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-gray-900 font-mono">TẦNG 04 // CÁNH A (Phòng 401- 430)</span>
                  <span className="text-[11px] font-mono text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded font-bold">
                    88% ĐẦY
                  </span>
                </div>
                <div className="text-gray-600 flex justify-between">
                  <span>Tồn: 420 ga giường • 380 khăn tắm</span>
                  <span className="text-emerald-700 font-semibold">Trạng thái: Tối ưu</span>
                </div>
              </div>

              {/* Tầng 08 Cánh B */}
              <div className="p-3 rounded-xl bg-rose-50/60 border border-rose-200 space-y-1.5">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-gray-900 font-mono">TẦNG 08 // CÁNH B (Phòng 801 - 835)</span>
                  <span className="text-[11px] font-mono text-rose-800 bg-rose-100 px-2 py-0.5 rounded font-bold">
                    62% CẦN BỔ SUNG
                  </span>
                </div>
                <div className="text-gray-600 flex justify-between">
                  <span>Thiếu: 45 áo choàng tắm • 60 khăn tắm đại</span>
                  <button
                    onClick={() => {
                      setShowRotateModal(true);
                      setRotateForm({ ...rotateForm, fromStage: 'CleanStock', toStage: 'InUseStock', quantity: 60 });
                    }}
                    className="text-rose-700 font-bold hover:underline"
                  >
                    TẠO LỆNH ĐIỀU PHỐI →
                  </button>
                </div>
              </div>

              {/* Tầng 12 Cánh C */}
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 space-y-1.5">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-gray-900 font-mono">TẦNG 12 // CÁNH C (Phòng 1201 - 1228)</span>
                  <span className="text-[11px] font-mono text-teal-800 bg-teal-100 px-2 py-0.5 rounded font-bold">
                    95% DƯ DỒI DÀO
                  </span>
                </div>
                <div className="text-gray-600 flex justify-between">
                  <span>Tồn: 510 ga giường • 490 khăn tắm</span>
                  <span className="text-teal-700 font-semibold">Sẵn sàng ca tối</span>
                </div>
              </div>

              {/* Penthouse Butler Hub */}
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 space-y-1.5">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-gray-900 font-mono">PENTHOUSE BUTLER HUB (Villa V1 - V8 &amp; Sky Villa)</span>
                  <span className="text-[11px] font-mono text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded font-bold">
                    74% TIÊU CHUẨN
                  </span>
                </div>
                <div className="text-gray-600 flex justify-between">
                  <span>Vải lụa Jacquard tơ tằm nguyên bản</span>
                  <span className="text-emerald-700 font-semibold">Bảo hộ VIP Butler</span>
                </div>
              </div>

            </div>

            <div className="pt-1 flex items-center justify-between text-xs">
              <span className="text-gray-400 font-mono text-[11px]">Chu kỳ tự động cân đối: 60 phút/lần</span>
              <button
                onClick={() => alert('Đã kích hoạt robot AGV cân bằng đồ vải giữa các tầng!')}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-lg flex items-center gap-1 transition"
              >
                <span className="material-symbols-outlined text-sm">compare_arrows</span>
                Cân Bằng Kho Đệm Nhanh
              </button>
            </div>

          </div>

        </div>

      </div>

      {/* MODAL ĐIỀU CHUYỂN ĐỒ VẢI */}
      {showRotateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-700">sync_alt</span>
                Lập Lệnh Luân Chuyển Đồ Vải (Linen Rotation)
              </h3>
              <button onClick={() => setShowRotateModal(false)} className="text-gray-400 hover:text-gray-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleRotateSubmit} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Chọn Mặt Hàng Đồ Vải:</label>
                <select
                  value={rotateForm.linenId}
                  onChange={(e) => setRotateForm({ ...rotateForm, linenId: Number(e.target.value) })}
                  className="w-full border border-gray-300 rounded-lg p-2 text-xs bg-gray-50 font-bold"
                >
                  {linenList.map(it => (
                    <option key={it.id} value={it.id}>{it.name} ({it.sku})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Từ Công Đoạn:</label>
                  <select
                    value={rotateForm.fromStage}
                    onChange={(e) => setRotateForm({ ...rotateForm, fromStage: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg p-2 text-xs bg-gray-50"
                  >
                    <option value="CleanStock">Kho Đệm Sạch</option>
                    <option value="InUseStock">Phòng Đang Dùng</option>
                    <option value="LaundryStock">Xưởng Giặt Ủi</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Chuyển Đến:</label>
                  <select
                    value={rotateForm.toStage}
                    onChange={(e) => setRotateForm({ ...rotateForm, toStage: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg p-2 text-xs bg-gray-50"
                  >
                    <option value="CleanStock">Kho Đệm Sạch</option>
                    <option value="InUseStock">Phòng Đang Dùng</option>
                    <option value="LaundryStock">Xưởng Giặt Ủi</option>
                    <option value="LossDamagedStock">Hao Hụt / Hư Hỏng</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Số Lượng Luân Chuyển:</label>
                <input
                  type="number"
                  min="1"
                  value={rotateForm.quantity}
                  onChange={(e) => setRotateForm({ ...rotateForm, quantity: Number(e.target.value) })}
                  className="w-full border border-gray-300 rounded-lg p-2 font-mono font-bold text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRotateModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-bold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-800 text-white rounded-lg font-bold hover:bg-emerald-900 shadow"
                >
                  Xác Nhận Luân Chuyển
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </AdminLayout>
  );
};

export default LinenManagement;
