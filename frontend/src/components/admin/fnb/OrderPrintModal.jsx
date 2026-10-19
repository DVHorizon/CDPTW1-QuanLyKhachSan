import React from 'react';

/**
 * FEAT-FNB-11 (Mã truy vết: A4.11)
 * Modal in phiếu order chuyển bếp (KitchenTicket) hoặc hóa đơn tạm tính (ProvisionalBill)
 */
const OrderPrintModal = ({ isOpen, onClose, documentData, isLoading, onPrint, onReFetch }) => {
  if (!isOpen) return null;

  const isKitchen = documentData?.printType === 'KitchenTicket';
  const isProvisional = documentData?.printType === 'ProvisionalBill';

  const handleBrowserPrint = () => {
    window.print();
    if (onPrint) onPrint();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      {/* Container in ấn - có class print-container phục vụ CSS print */}
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header Modal (ẩn khi print) */}
        <div className="print:hidden p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[22px] text-emerald-400">
              {isKitchen ? 'soup_kitchen' : 'receipt_long'}
            </span>
            <div>
              <h3 className="font-bold text-sm">
                {isKitchen ? 'Phiếu Chuyển Bếp (Kitchen Order Ticket)' : 'Hóa Đơn Tạm Tính (Provisional Bill)'}
              </h3>
              <p className="text-[11px] text-slate-400">
                Mã: {documentData?.ticketId || documentData?.billNumber || 'Đang tạo...'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Nội dung phiếu in - Tối ưu cho Máy in nhiệt 80mm & Giấy in A4/A5 */}
        <div className="p-6 overflow-y-auto max-h-[75vh] font-mono text-slate-800 text-xs">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-500">
              <span className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin"></span>
              <p className="text-sm font-sans">Đang xử lý dữ liệu phiếu in...</p>
            </div>
          ) : !documentData ? (
            <div className="py-12 text-center text-red-500 font-sans">
              Không thể tạo phiếu order.
            </div>
          ) : isKitchen ? (
            /* ========================================================================= */
            /* 1. MẪU PHIẾU BẾP (KITCHEN TICKET)                                         */
            /* ========================================================================= */
            <div className="border border-dashed border-slate-300 p-5 bg-amber-50/20 rounded-lg">
              <div className="text-center border-b-2 border-slate-800 pb-3 mb-3">
                <h2 className="text-base font-extrabold tracking-wider uppercase">GRAND HORIZON RESORT</h2>
                <h3 className="text-sm font-bold mt-0.5">PHIẾU CHUYỂN BẾP (KOT)</h3>
                <div className="text-[11px] text-slate-500 mt-1">
                  Mã phiếu: <strong>{documentData.ticketId}</strong> • Đơn #{documentData.orderId}
                </div>
              </div>

              {/* Thông tin phòng & thời gian */}
              <div className="bg-slate-100 p-2.5 rounded mb-3 flex items-center justify-between font-sans">
                <div>
                  <span className="text-[11px] text-slate-500 block">Địa điểm phục vụ:</span>
                  <span className="text-base font-extrabold text-emerald-800">{documentData.destination}</span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-slate-500 block">Giờ in phiếu:</span>
                  <span className="font-bold font-mono text-slate-700">
                    {new Date(documentData.printTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
              </div>

              {/* Ghi chú toàn đơn nếu có */}
              {documentData.specialOrderNote && (
                <div className="mb-3 p-2 bg-red-50 border-l-4 border-red-500 text-red-700 font-sans text-xs font-bold">
                  ⚠️ GHI CHÚ ĐẶC BIỆT: {documentData.specialOrderNote}
                </div>
              )}

              {/* Danh sách món ăn gửi Bếp */}
              <div className="border-b-2 border-slate-800 pb-2 mb-3">
                <div className="flex font-bold pb-1 text-[11px] uppercase border-b border-slate-200">
                  <span className="w-10">SL</span>
                  <span className="flex-1">TÊN MÓN</span>
                  <span className="w-16 text-right">TRẠM</span>
                </div>
                <div className="divide-y divide-slate-200/80 mt-1">
                  {documentData.items?.map((item, idx) => (
                    <div key={idx} className="py-2 flex flex-col gap-1">
                      <div className="flex items-start">
                        <span className="w-10 text-base font-extrabold text-emerald-800">
                          x{item.quantity}
                        </span>
                        <span className="flex-1 text-sm font-bold text-slate-900 font-sans">
                          {item.itemName}
                        </span>
                        <span className="w-16 text-right text-[11px] font-bold text-slate-500 uppercase">
                          {item.kitchenStation}
                        </span>
                      </div>
                      {/* Highlight ghi chú món */}
                      {item.note && (
                        <div className="ml-10 text-xs text-red-600 font-bold italic bg-red-100/60 px-2 py-0.5 rounded border border-red-200 font-sans">
                          👉 Yêu cầu: {item.note}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 font-sans">
                <span>Nhân viên: {documentData.serverName}</span>
                <span className="text-emerald-700 font-bold">● Máy in Bếp: Sẵn sàng</span>
              </div>
            </div>
          ) : (
            /* ========================================================================= */
            /* 2. MẪU HÓA ĐƠN TẠM TÍNH (PROVISIONAL BILL)                                 */
            /* ========================================================================= */
            <div className="border border-slate-300 p-5 bg-white rounded-lg shadow-inner">
              <div className="text-center border-b border-slate-300 pb-3 mb-3 font-sans">
                <h2 className="text-base font-extrabold text-slate-900 tracking-wider">GRAND HORIZON RESORT &amp; SUITES</h2>
                <p className="text-[11px] text-slate-500">Bãi Trường, Dương Tơ, TP. Phú Quốc</p>
                <div className="mt-2 py-1 px-3 bg-amber-100 text-amber-900 font-bold text-xs uppercase tracking-wider rounded inline-block">
                  HÓA ĐƠN TẠM TÍNH (PROVISIONAL BILL)
                </div>
                <p className="text-[10px] text-slate-400 italic mt-1">
                  (Phiếu chỉ dùng để đối chiếu chi phí, không có giá trị thanh toán tài chính chính thức)
                </p>
              </div>

              {/* Thông tin phòng / bàn */}
              <div className="grid grid-cols-2 gap-2 text-xs mb-3 font-sans border-b border-slate-200 pb-3">
                <div>
                  <span className="text-slate-400 block">Số phòng / Bàn:</span>
                  <strong className="text-sm text-slate-800">{documentData.destination}</strong>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block">Số phiếu:</span>
                  <strong className="text-slate-800">{documentData.billNumber}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Thời điểm in:</span>
                  <span>{new Date(documentData.printTime).toLocaleString('vi-VN')}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block">Hình thức:</span>
                  <span className="font-semibold text-emerald-700">{documentData.paymentMode}</span>
                </div>
              </div>

              {/* Bảng kê món ăn */}
              <div className="mb-4">
                <div className="flex font-bold pb-1 text-[11px] uppercase border-b border-slate-800 text-slate-600">
                  <span className="flex-1">TÊN MÓN</span>
                  <span className="w-12 text-center">SL</span>
                  <span className="w-20 text-right">ĐƠN GIÁ</span>
                  <span className="w-24 text-right">THÀNH TIỀN</span>
                </div>
                <div className="divide-y divide-slate-100 mt-1">
                  {documentData.items?.map((item, idx) => (
                    <div key={idx} className="py-2 flex items-center font-sans text-xs">
                      <div className="flex-1 pr-2">
                        <span className="font-medium text-slate-800 block">{item.itemName}</span>
                        {item.note && <span className="text-[11px] text-slate-400 italic">({item.note})</span>}
                      </div>
                      <span className="w-12 text-center font-bold text-slate-700">x{item.quantity}</span>
                      <span className="w-20 text-right text-slate-600 font-mono">
                        {Number(item.unitPrice).toLocaleString('vi-VN')}
                      </span>
                      <span className="w-24 text-right font-bold text-slate-800 font-mono">
                        {Number(item.totalPrice).toLocaleString('vi-VN')} ₫
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tổng cộng */}
              <div className="border-t-2 border-slate-800 pt-3 flex flex-col gap-1.5 font-sans">
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Cộng tiền món (Subtotal):</span>
                  <span className="font-mono">{Number(documentData.subTotal).toLocaleString('vi-VN')} ₫</span>
                </div>
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Phí phục vụ (Service 5%):</span>
                  <span className="font-mono">{Number(documentData.serviceCharge).toLocaleString('vi-VN')} ₫</span>
                </div>
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Thuế VAT (8%):</span>
                  <span className="font-mono">{Number(documentData.vat).toLocaleString('vi-VN')} ₫</span>
                </div>
                <div className="flex justify-between text-base font-extrabold text-emerald-800 border-t border-slate-300 pt-2 mt-1">
                  <span>TỔNG TẠM TÍNH:</span>
                  <span className="font-mono">{Number(documentData.grandTotal).toLocaleString('vi-VN')} ₫</span>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-dashed border-slate-300 text-center text-[10px] text-slate-400 font-sans">
                Nhân viên phục vụ: {documentData.cashierName} • Trân trọng cảm ơn Quý khách!
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer (ẩn khi in) */}
        <div className="print:hidden p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <span className="text-xs text-slate-500">
            {isKitchen ? 'Máy in nhiệt tại quầy Bếp' : 'Chế độ xem trước hoặc in hóa đơn'}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              type="button"
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Đóng
            </button>
            <button
              onClick={handleBrowserPrint}
              disabled={isLoading || !documentData}
              type="button"
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 shadow-sm flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[16px]">print</span>
              <span>In Ngay</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default OrderPrintModal;
