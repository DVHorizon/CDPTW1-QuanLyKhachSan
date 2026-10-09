import React, { useState, useEffect } from 'react';
import AdminLayout from '../../../components/admin/layout/AdminLayout';

const KitchenDisplay = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Mock data for initial UI
  useEffect(() => {
    const mockOrders = [
      {
        orderId: 'ORD-1002',
        room: '804',
        time: '10:45 AM',
        status: 'Pending', // Pending, Cooking, Done
        items: [
          { name: 'Phở Bò Kobe', qty: 1, note: 'Không hành' },
          { name: 'Cà phê Sữa đá', qty: 2, note: '' }
        ]
      },
      {
        orderId: 'ORD-1003',
        room: '302',
        time: '10:50 AM',
        status: 'Cooking',
        items: [
          { name: 'Bò Bít Tết', qty: 1, note: 'Chín vừa (Medium)' }
        ]
      }
    ];
    setOrders(mockOrders);
    setLoading(false);
  }, []);

  return (
    <AdminLayout>
      <div className="flex flex-col w-full h-full">
        <div className="flex items-center justify-between mb-space-lg">
          <div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface font-semibold tracking-tight">
              Kitchen Display System (KDS)
            </h1>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Màn hình tiếp nhận và xử lý đơn món thời gian thực dành cho Bếp.
            </p>
          </div>
          <div className="flex gap-2">
             <span className="inline-flex items-center gap-1 text-admin-primary bg-admin-primary/10 px-space-md py-1.5 rounded-lg font-bold">
                <span className="w-2 h-2 rounded-full bg-admin-primary animate-pulse"></span>
                Kết nối Live
              </span>
          </div>
        </div>

        {/* KDS Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-space-md items-start">
          {orders.map(order => (
            <div key={order.orderId} className={`rounded-xl shadow-md overflow-hidden border-t-4 flex flex-col ${order.status === 'Pending' ? 'border-error bg-surface-container-lowest' : 'border-secondary bg-surface-container-lowest'}`}>
              
              {/* Header Ticket */}
              <div className={`p-space-sm flex justify-between items-center ${order.status === 'Pending' ? 'bg-error-container text-on-error-container' : 'bg-secondary-container text-on-secondary-container'}`}>
                <div className="flex flex-col">
                  <span className="font-bold text-headline-sm">{order.orderId}</span>
                  <span className="font-label-sm uppercase tracking-wider font-semibold opacity-80">Phòng {order.room}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="font-mono text-title-md font-bold">{order.time}</span>
                  <span className="font-label-sm font-semibold">{order.status === 'Pending' ? 'Đang Chờ' : 'Đang Nấu'}</span>
                </div>
              </div>

              {/* Items List */}
              <div className="p-space-md flex-1">
                <ul className="divide-y divide-surface-container-high/50">
                  {order.items.map((item, idx) => (
                    <li key={idx} className="py-2 flex flex-col">
                      <div className="flex justify-between items-start">
                        <span className="font-body-lg font-semibold text-on-surface flex-1">{item.name}</span>
                        <span className="font-mono font-bold text-on-surface ml-4 text-title-md">x{item.qty}</span>
                      </div>
                      {item.note && (
                        <span className="text-body-sm text-error font-medium mt-1 inline-flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">warning</span> {item.note}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Bar */}
              <div className="p-space-sm bg-surface-container-low flex gap-2">
                {order.status === 'Pending' && (
                  <button className="flex-1 py-2 bg-secondary text-on-secondary font-bold rounded hover:brightness-110 shadow-sm transition-all text-label-md">
                    Bắt đầu nấu
                  </button>
                )}
                {order.status === 'Cooking' && (
                  <button className="flex-1 py-2 bg-[#10B981] text-white font-bold rounded hover:brightness-110 shadow-sm transition-all text-label-md">
                    Hoàn Tất (Trả Món)
                  </button>
                )}
              </div>

            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
};

export default KitchenDisplay;
