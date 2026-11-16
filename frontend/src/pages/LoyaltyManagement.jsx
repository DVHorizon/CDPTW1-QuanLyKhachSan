import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/admin/layout/AdminLayout';
import {
  processTransaction,
  calculateBookingPrice,
  LOYALTY_TIERS
} from '../utils/loyaltyRules';

// --- MOCK FALLBACK DATA ---
const defaultStatsData = [
  { label: 'TỔNG HỘI VIÊN ĐĂNG KÝ', value: '14.820', subLeft: 'Hoạt động: 11.450', subRight: 'Tạm ngưng: 3.370', icon: 'badge' },
  { label: 'SỐ HẠNG THẺ PHÂN CẤP', value: '4 Hạng', isBadges: true, icon: 'layers' },
  { label: 'CHI TIÊU TB (ARPU/NĂM)', value: '45.200.000₫', subLeft: '+12.5% YoY', subRight: 'Kỳ so sánh Quý 3/2024', subLeftColor: 'text-green-600', icon: 'trending_up' },
  { label: 'QUỸ ĐIỂM CHƯA QUY ĐỔI', value: '4.280.000 PTS', subLeft: 'Dự phòng trách nhiệm:', subRight: '107.000.000 đ', subRightColor: 'text-red-600 font-bold', icon: 'account_balance_wallet' },
];

const defaultTiersData = [
  {
    id: 'TIER-01',
    code: 'Classic Blue',
    shortCode: 'Classic',
    badge: 'Tự động gia nhập',
    badgeColor: 'bg-blue-100 text-blue-700',
    pointsNeeded: 0,
    pointMultiplier: 1.0,
    memberCount: 8420,
    percent: 56.8,
    perks: [
      { icon: 'wifi', text: 'Wifi tốc độ cao' },
      { icon: 'percent', text: 'Giảm 5% F&B' },
      { icon: 'vpn_key', text: 'E-Key trên app' }
    ],
    colorClass: 'bg-slate-100 text-slate-800 border-slate-300',
    iconColor: 'text-slate-600 bg-slate-200',
    icon: 'credit_card',
    reqPoints: '0',
    reqNights: '0',
    reqSpend: '$0',
    activeCheckboxes: [true, false, false, false, false],
    progressColor: 'bg-slate-400',
    retentionPolicy: 'Tự động kích hoạt khi đăng ký tài khoản. Không áp dụng hạ hạng.'
  },
  {
    id: 'TIER-02',
    code: 'Silver Resident',
    shortCode: 'Silver',
    badge: 'Tích luỹ bậc 1',
    badgeColor: 'bg-sky-100 text-sky-700',
    pointsNeeded: 15000,
    pointMultiplier: 1.25,
    memberCount: 4150,
    percent: 28.0,
    perks: [
      { icon: 'schedule', text: 'Trả phòng trễ 13:00' },
      { icon: 'local_bar', text: 'Welcome Drink tại Bar' },
      { icon: 'percent', text: 'Giảm 10% F&B' },
      { icon: 'apartment', text: 'Đặt trước tầng cao' }
    ],
    colorClass: 'bg-gray-100 text-gray-800 border-gray-300',
    iconColor: 'text-gray-500 bg-gray-200',
    icon: 'stars',
    reqPoints: '15.000',
    reqNights: '10',
    reqSpend: '$1,000',
    activeCheckboxes: [false, false, true, true, false],
    progressColor: 'bg-gray-400',
    retentionPolicy: 'Hiệu lực 12 tháng. Duy trì tối thiểu 10.000 điểm hoặc 5 đêm/năm.'
  },
  {
    id: 'TIER-03',
    code: 'Gold Elite',
    shortCode: 'Gold',
    badge: 'Khách Sang Thường Xuyên',
    badgeColor: 'bg-amber-100 text-amber-700',
    pointsNeeded: 40000,
    pointMultiplier: 1.5,
    memberCount: 1820,
    percent: 12.3,
    perks: [
      { icon: 'arrow_upward', text: 'Nâng hạng phòng khả dụng' },
      { icon: 'restaurant', text: 'Buffet sáng 2 khách' },
      { icon: 'percent', text: 'Giảm 15% Spa' },
      { icon: 'schedule', text: 'Trả phòng trễ 14:00 bảo đảm' }
    ],
    colorClass: 'bg-amber-50 text-amber-900 border-amber-300',
    iconColor: 'text-amber-500 bg-amber-100',
    icon: 'workspace_premium',
    reqPoints: '40.000',
    reqNights: '25',
    reqSpend: '$4,000',
    activeCheckboxes: [true, true, true, true, true],
    progressColor: 'bg-amber-500',
    retentionPolicy: 'Hiệu lực duy trì 12 tháng kể từ ngày nâng hạng thành công. Tự động hạ 1 bậc nếu không đạt 70% định mức.'
  },
  {
    id: 'TIER-04',
    code: 'Black Lotus VIP',
    shortCode: 'Lotus',
    badge: 'Siêu Cao Cấp',
    badgeColor: 'bg-emerald-100 text-emerald-700',
    pointsNeeded: 100000,
    pointMultiplier: 2.0,
    memberCount: 430,
    percent: 2.9,
    perks: [
      { icon: 'directions_car', text: 'Đón tiễn Rolls-Royce/Maybach' },
      { icon: 'support_agent', text: 'Quản gia riêng 24/7' },
      { icon: 'history_toggle_off', text: 'Check-in linh hoạt 24h' },
      { icon: 'card_giftcard', text: 'Quà tặng sinh nhật trị giá cao' }
    ],
    colorClass: 'bg-slate-900 text-white border-slate-700',
    iconColor: 'text-slate-100 bg-slate-800',
    icon: 'diamond',
    reqPoints: '100.000',
    reqNights: '50',
    reqSpend: '$10,000',
    activeCheckboxes: [true, true, true, true, true],
    progressColor: 'bg-slate-900',
    retentionPolicy: 'Hiệu lực 12 tháng. Duy trì tối thiểu 70.000 điểm hoặc 42 đêm/năm để bảo lưu hạng.'
  }
];

const defaultPendingApprovals = [
  { id: 1, userId: 101, name: 'Nguyễn Hoàng Long', info: '41,500 pts • 26 đêm (Vượt TH03)', initials: 'NL', bg: 'bg-amber-100 text-amber-700', targetTierId: 3, targetTier: 'Gold Elite' },
  { id: 2, userId: 102, name: 'Vũ Thị Bích Trâm', info: '$4,250 USD chi tiêu F&B + Spa', initials: 'VT', bg: 'bg-amber-100 text-amber-700', targetTierId: 3, targetTier: 'Gold Elite' },
  { id: 3, userId: 103, name: 'Trần Anh Tuấn', info: '40,150 pts (Kỳ nghỉ Villa Ocean 04)', initials: 'TA', bg: 'bg-amber-100 text-amber-700', targetTierId: 3, targetTier: 'Gold Elite' },
];

const initialMemberData = [
  { id: 'MB-001', name: 'Nguyễn Văn A', email: 'nguyenvana@gmail.com', phone: '0901234567', tier: 'Black Lotus VIP', currentPoints: 125000, lifetimePoints: 125000, spend: 125000000, joinDate: '2023-01-15', status: 'Active' },
  { id: 'MB-002', name: 'Trần Thị B', email: 'tranthib@gmail.com', phone: '0912345678', tier: 'Gold Elite', currentPoints: 28000, lifetimePoints: 35000, spend: 85000000, joinDate: '2023-03-22', status: 'Active' },
  { id: 'MB-003', name: 'Lê Văn C', email: 'levanc@gmail.com', phone: '0987654321', tier: 'Silver Resident', currentPoints: 12000, lifetimePoints: 12000, spend: 35000000, joinDate: '2023-06-10', status: 'Inactive' },
  { id: 'MB-004', name: 'Phạm Thị D', email: 'phamthid@gmail.com', phone: '0976543210', tier: 'Classic Blue', currentPoints: 4500, lifetimePoints: 4500, spend: 15000000, joinDate: '2023-08-05', status: 'Active' },
];

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

const LoyaltyManagement = () => {
  const [stats, setStats] = useState(defaultStatsData);
  const [tiers, setTiers] = useState(defaultTiersData);
  const [selectedTier, setSelectedTier] = useState(defaultTiersData[2]); // Default Gold
  const [pendingApprovals, setPendingApprovals] = useState(defaultPendingApprovals);
  const [members, setMembers] = useState(initialMemberData);

  // Notification state
  const [notice, setNotice] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);

  // Form edit fields for selectedTier (SỬA HẠNG THẺ)
  const [editTierName, setEditTierName] = useState(defaultTiersData[2].code);
  const [editReqPoints, setEditReqPoints] = useState(defaultTiersData[2].reqPoints);
  const [editReqNights, setEditReqNights] = useState(defaultTiersData[2].reqNights);
  const [editReqSpend, setEditReqSpend] = useState(defaultTiersData[2].reqSpend);

  // Simulator states
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [simMemberId, setSimMemberId] = useState(initialMemberData[0].id);
  const [simAmount, setSimAmount] = useState(10000000);
  const [simType, setSimType] = useState('STAY');
  const [simResult, setSimResult] = useState(null);

  // Add Tier Modal states (THÊM HẠNG THẺ)
  const [isAddTierModalOpen, setIsAddTierModalOpen] = useState(false);
  const [isCreatingTier, setIsCreatingTier] = useState(false);
  const [newTierForm, setNewTierForm] = useState({
    tierName: '',
    tierCode: '',
    badgeName: 'Hội Viên Thượng Đỉnh',
    minPoints: 150000,
    minNights: 70,
    minSpendUsd: 15000,
    pointMultiplier: 2.5,
    discountRate: 0.20,
    perksText: 'Đưa đón trực thăng riêng, Bếp trưởng phục vụ tại phòng'
  });

  // Sync edit form when selectedTier changes
  useEffect(() => {
    if (selectedTier) {
      setEditTierName(selectedTier.code || '');
      setEditReqPoints(selectedTier.reqPoints || '0');
      setEditReqNights(selectedTier.reqNights || '0');
      setEditReqSpend(selectedTier.reqSpend || '$0');
    }
  }, [selectedTier]);

  // Fetch backend data on load
  const loadData = async () => {
    try {
      const [statsRes, tiersRes, pendingRes, membersRes] = await Promise.all([
        fetch('/api/loyalty/overview').then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('/api/loyalty/tiers').then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('/api/loyalty/pending-approvals').then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('/api/loyalty/members').then(r => r.ok ? r.json() : null).catch(() => null),
      ]);

      if (statsRes?.success && statsRes.stats) {
        setStats(statsRes.stats);
      }
      if (tiersRes?.success && Array.isArray(tiersRes.tiers) && tiersRes.tiers.length > 0) {
        setTiers(tiersRes.tiers);
        setSelectedTier(prev => tiersRes.tiers.find(t => t.id === prev.id) || tiersRes.tiers[2] || tiersRes.tiers[0]);
      }
      if (pendingRes?.success && Array.isArray(pendingRes.pendingApprovals)) {
        setPendingApprovals(pendingRes.pendingApprovals);
      }
      if (membersRes?.success && Array.isArray(membersRes.members) && membersRes.members.length > 0) {
        setMembers(membersRes.members);
        setSimMemberId(membersRes.members[0].id);
      }
    } catch (err) {
      console.warn('Backend loyalty fetch warning:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showNotice = (msg, type = 'success') => {
    setNotice({ msg, type });
    setTimeout(() => setNotice(null), 4000);
  };

  // --- CRUD CHỨC NĂNG HẠNG THẺ (TIERS) ---
  // 1. SỬA CẤU HÌNH HẠNG THẺ (UPDATE)
  const handleSaveTier = async () => {
    setIsSaving(true);
    try {
      const numericPoints = parseInt(String(editReqPoints).replace(/\D/g, ''), 10) || selectedTier.pointsNeeded;
      const numericNights = parseInt(String(editReqNights).replace(/\D/g, ''), 10) || 0;
      const numericSpend = parseFloat(String(editReqSpend).replace(/[^0-9.]/g, '')) || 0;

      const res = await fetch(`/api/loyalty/tiers/${selectedTier.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tierName: editTierName,
          pointsNeeded: numericPoints,
          minNights: numericNights,
          minSpendUsd: numericSpend,
          badge: selectedTier.badge,
          pointMultiplier: selectedTier.pointMultiplier,
          discountRate: selectedTier.discountRate,
          retentionPolicy: selectedTier.retentionPolicy
        })
      });

      const data = await res.json();
      if (data.success) {
        showNotice(data.message || `Đã lưu cấu hình hạng thẻ ${editTierName} thành công!`);
        await loadData();
      } else {
        showNotice(data.message || 'Lỗi khi lưu cấu hình', 'error');
      }
    } catch (err) {
      showNotice(err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // 2. THÊM HẠNG THẺ MỚI (CREATE)
  const handleCreateTier = async (e) => {
    e.preventDefault();
    if (!newTierForm.tierName.trim()) {
      showNotice('Vui lòng nhập tên hạng thẻ!', 'error');
      return;
    }
    setIsCreatingTier(true);
    try {
      const perksArr = newTierForm.perksText
        .split(',')
        .map(t => t.trim())
        .filter(Boolean)
        .map(text => ({ icon: 'stars', text }));

      const res = await fetch('/api/loyalty/tiers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tierName: newTierForm.tierName,
          tierCode: newTierForm.tierCode || undefined,
          badgeName: newTierForm.badgeName,
          minPoints: Number(newTierForm.minPoints) || 0,
          minNights: Number(newTierForm.minNights) || 0,
          minSpendUsd: Number(newTierForm.minSpendUsd) || 0,
          pointMultiplier: Number(newTierForm.pointMultiplier) || 1.0,
          discountRate: Number(newTierForm.discountRate) || 0.0,
          perks: perksArr
        })
      });

      const data = await res.json();
      if (data.success) {
        showNotice(data.message || 'Thêm hạng thẻ mới thành công!');
        setIsAddTierModalOpen(false);
        setNewTierForm({
          tierName: '',
          tierCode: '',
          badgeName: 'Hội Viên Thượng Đỉnh',
          minPoints: 150000,
          minNights: 70,
          minSpendUsd: 15000,
          pointMultiplier: 2.5,
          discountRate: 0.20,
          perksText: 'Đưa đón trực thăng riêng, Bếp trưởng phục vụ tại phòng'
        });
        await loadData();
      } else {
        showNotice(data.message || 'Lỗi khi tạo hạng thẻ', 'error');
      }
    } catch (err) {
      showNotice(err.message, 'error');
    } finally {
      setIsCreatingTier(false);
    }
  };

  // 3. XÓA HẠNG THẺ (DELETE)
  const handleDeleteTier = async () => {
    if (selectedTier.id === 'TIER-01' || selectedTier.tierId === 1) {
      showNotice('Không thể xóa hạng thẻ gốc mặc định Classic Blue!', 'error');
      return;
    }
    const confirmed = window.confirm(`Bạn có chắc chắn muốn xóa hạng thẻ "${selectedTier.code}" không? Các hội viên thuộc hạng này sẽ được chuyển về hạng Classic Blue.`);
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/loyalty/tiers/${selectedTier.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        showNotice(data.message || `Đã xóa hạng thẻ ${selectedTier.code} thành công!`);
        await loadData();
      } else {
        showNotice(data.message || 'Lỗi khi xóa hạng thẻ', 'error');
      }
    } catch (err) {
      showNotice(err.message, 'error');
    }
  };

  // --- CÁC HÀNH ĐỘNG HỆ THỐNG KHÁC ---
  // 4. Chạy lại thuật toán phân hạng thẻ
  const handleRecalculate = async () => {
    setIsRecalculating(true);
    try {
      const res = await fetch('/api/loyalty/recalculate', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showNotice(data.message || 'Đã chạy lại thuật toán phân hạng thành công!');
        await loadData();
      } else {
        showNotice(data.message || 'Lỗi khi chạy thuật toán', 'error');
      }
    } catch (err) {
      showNotice(err.message, 'error');
    } finally {
      setIsRecalculating(false);
    }
  };

  // 5. Xuất file CSV quy tắc
  const handleExportCsv = () => {
    window.open('/api/loyalty/export-rules', '_blank');
  };

  // 6. Duyệt nâng hạng
  const handleApproveUpgrade = async (user) => {
    try {
      const res = await fetch('/api/loyalty/approve-upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.userId,
          targetTierId: user.targetTierId || 3,
          targetTier: user.targetTier || 'Gold Elite'
        })
      });
      const data = await res.json();
      if (data.success) {
        showNotice(data.message || `Đã duyệt nâng hạng cho ${user.name}`);
        setPendingApprovals(prev => prev.filter(p => p.id !== user.id));
        await loadData();
      } else {
        showNotice(data.message || 'Lỗi khi duyệt', 'error');
      }
    } catch (err) {
      showNotice(err.message, 'error');
    }
  };

  // 7. Mô phỏng tích điểm
  const handleSimulate = async () => {
    try {
      const res = await fetch('/api/loyalty/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: simMemberId,
          amount: simAmount,
          type: simType,
          commit: false
        })
      });
      const data = await res.json();
      if (data.success) {
        setSimResult(data.transactionLog);
        setMembers(prev => prev.map(m => m.id === data.updatedMember.id ? data.updatedMember : m));
        return;
      }
    } catch (_) {}

    // Fallback local simulation if offline
    const memberToUpdate = members.find(m => m.id === simMemberId);
    if (!memberToUpdate) return;
    const { updatedMember, transactionLog } = processTransaction(memberToUpdate, simAmount, simType);
    setMembers(prev => prev.map(m => m.id === updatedMember.id ? { ...updatedMember, spend: m.spend + simAmount } : m));
    setSimResult(transactionLog);
  };

  const activeSimMember = members.find(m => m.id === simMemberId);
  const currentBookingDiscount = activeSimMember ? calculateBookingPrice(2000000, activeSimMember.tier) : null;

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 relative bg-[#F8F9FA] -mx-space-lg px-space-lg pt-4 pb-12 min-h-screen">

        {/* --- TOAST NOTICE BANNER --- */}
        {notice && (
          <div className={`p-4 rounded-xl border flex items-center justify-between shadow-md transition-all animate-in fade-in slide-in-from-top-2 ${notice.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined">{notice.type === 'error' ? 'error' : 'check_circle'}</span>
              <span className="text-sm font-semibold">{notice.msg}</span>
            </div>
            <button onClick={() => setNotice(null)} className="text-sm font-bold opacity-70 hover:opacity-100">✕</button>
          </div>
        )}

        {/* --- HEADER --- */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Cấu Hình Ma Trận Hạng Thẻ & Đặc Quyền Tích Điểm</h1>
            <p className="text-xs text-gray-500 mt-0.5">Phân hệ Quản lý Hội viên, chính sách đặc quyền & phân bổ tự động</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setIsSimulatorOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors font-semibold text-sm shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">science</span>
              Mô Phỏng Tích Điểm
            </button>
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 border border-gray-200 hover:bg-gray-200 transition-colors text-gray-700 font-semibold text-sm shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              Xuất File Quy Tắc (CSV)
            </button>
            <button
              onClick={handleRecalculate}
              disabled={isRecalculating}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#006064] hover:bg-[#004d40] text-white shadow-sm transition-colors font-semibold text-sm disabled:opacity-50"
            >
              <span className={`material-symbols-outlined text-[18px] ${isRecalculating ? 'animate-spin' : ''}`}>sync</span>
              {isRecalculating ? 'Đang Chạy Thuật Toán...' : 'Chạy Lại Thuật Toán Phân Hạng Thẻ'}
            </button>
            <button
              onClick={() => setIsAddTierModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1B5E20] hover:bg-[#144d18] text-white shadow-sm transition-colors font-semibold text-sm"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              Thêm Hạng Thẻ Mới
            </button>
          </div>
        </div>

        {/* --- STATS GRID --- */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {stats.map((stat, idx) => (
            <div key={idx} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider mb-1">{stat.label}</p>
                  <h3 className="text-3xl font-bold text-slate-800 font-mono tracking-tight">{stat.value}</h3>
                  {stat.isBadges && (
                    <div className="flex gap-1.5 mt-2">
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-bold rounded">Classic</span>
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-bold rounded">Silver</span>
                      <span className="px-2 py-0.5 bg-yellow-50 text-yellow-600 text-[10px] font-bold rounded">Gold</span>
                      <span className="px-2 py-0.5 bg-slate-800 text-white text-[10px] font-bold rounded">Lotus</span>
                    </div>
                  )}
                </div>
                <div className="w-8 h-8 rounded bg-gray-50 flex items-center justify-center text-gray-400 border border-gray-100">
                  <span className="material-symbols-outlined text-[18px]">{stat.icon}</span>
                </div>
              </div>
              {!stat.isBadges && (
                <div className="flex items-center justify-between text-[11px] text-gray-500 mt-3 pt-3 border-t border-gray-50">
                  <div className="flex items-center gap-1">
                    {stat.label === 'TỔNG HỘI VIÊN ĐĂNG KÝ' && <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>}
                    <span className={stat.subLeftColor || ''}>{stat.subLeft}</span>
                  </div>
                  <span className={stat.subRightColor || ''}>{stat.subRight}</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* --- MAIN SPLIT CONTENT --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* LEFT COLUMN: Tier List */}
          <div className="col-span-1 lg:col-span-7 flex flex-col gap-4">

            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wide">
                <span className="material-symbols-outlined text-[18px]">dns</span>
                DANH SÁCH PHÂN CẤP THẺ PMS ({tiers.length} TIERS)
              </h2>
              <span className="text-xs text-gray-500">Chu kỳ tính: 365 ngày liên tục</span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-200 h-2.5 flex rounded-full overflow-hidden shadow-inner">
              <div className="bg-[#90CAF9]" style={{ width: `${tiers[0]?.percent || 56.8}%` }}></div>
              <div className="bg-[#B0BEC5]" style={{ width: `${tiers[1]?.percent || 28.0}%` }}></div>
              <div className="bg-[#FFCA28]" style={{ width: `${tiers[2]?.percent || 12.3}%` }}></div>
              <div className="bg-[#263238]" style={{ width: `${tiers[3]?.percent || 2.9}%` }}></div>
            </div>
            <div className="flex justify-between text-[10px] text-gray-500 font-medium px-1">
              <span>{tiers[0]?.code} ({tiers[0]?.percent}%)</span>
              <span>{tiers[1]?.code} ({tiers[1]?.percent}%)</span>
              <span>{tiers[2]?.code} ({tiers[2]?.percent}%)</span>
              <span>{tiers[3]?.code} ({tiers[3]?.percent}%)</span>
            </div>

            {/* Tier Cards */}
            <div className="flex flex-col gap-3 mt-2">
              {tiers.map(tier => (
                <div
                  key={tier.id}
                  onClick={() => setSelectedTier(tier)}
                  className={`bg-white rounded-xl border ${selectedTier.id === tier.id ? 'border-amber-400 ring-1 ring-amber-400 shadow-md' : 'border-gray-200 shadow-sm'} p-4 flex flex-col gap-3 cursor-pointer hover:border-gray-300 transition-all relative overflow-hidden`}
                >
                  {selectedTier.id === tier.id && (
                    <div className="absolute right-0 top-0 bg-amber-400 text-amber-900 text-[10px] font-bold px-3 py-1 rounded-bl-lg">
                      ĐANG HIỆU CHỈNH
                    </div>
                  )}

                  <div className="flex justify-between items-start">
                    <div className="flex gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center border border-black/5 shadow-inner ${tier.iconColor}`}>
                        <span className="material-symbols-outlined text-[24px]">{tier.icon}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="bg-gray-100 text-gray-600 border border-gray-200 text-[10px] font-mono px-1.5 py-0.5 rounded font-bold">{tier.id}</span>
                          <span className="font-bold text-lg text-slate-800 tracking-tight">{tier.code}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${tier.badgeColor}`}>{tier.badge}</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Điều kiện: <span className="font-bold text-slate-700">{tier.pointsNeeded.toLocaleString()} Điểm</span> (Mỗi 10,000 đ = 1 Điểm + Tỉ lệ <span className="font-bold text-green-600">{Number(tier.pointMultiplier).toFixed(2)}x</span>)
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-slate-800 text-base">{tier.memberCount.toLocaleString()} Hội viên</div>
                      <div className="text-[11px] text-gray-500">Chiếm {tier.percent}% tổng</div>
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap mt-1">
                    {tier.perks.map((perk, i) => (
                      <span key={i} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium border ${tier.id === 'TIER-04' ? 'bg-slate-800 text-slate-200 border-slate-700' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                        <span className="material-symbols-outlined text-[14px] opacity-70">{perk.icon}</span>
                        {perk.text}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Info Banner */}
            <div className="bg-[#F1F8E9] border border-[#C5E1A5] p-4 rounded-xl flex gap-4 items-start mt-2">
              <img src="https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&q=80&w=120&h=80" alt="Resort" className="w-24 h-16 object-cover rounded-lg shadow-sm" />
              <div>
                <h3 className="text-sm font-bold text-[#33691E] uppercase tracking-wide mb-1">CÁCH THỨC KÍCH HOẠT ĐẶC QUYỀN TỰ ĐỘNG</h3>
                <p className="text-xs text-[#558B2F] leading-relaxed">
                  Khi khách check-in tại Tiền sảnh hoặc Đặt qua Mobile App, hệ thống PMS sẽ tự khóa phòng trống hạng cao và gửi thông báo F&B cho bộ phận liên quan theo quy tắc đã duyệt trên.
                </p>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: Tier Configuration Form (SỬA & XÓA) */}
          <div className="col-span-1 lg:col-span-5 bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden flex flex-col relative h-[860px]">

            {/* Form Header */}
            <div className="bg-gray-50 border-b border-gray-200 p-5 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-gray-400">tune</span>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Hiệu Chỉnh: {selectedTier.code}</h2>
                  <p className="text-[10px] text-gray-500 font-mono">{selectedTier.id} • HỆ SỐ NHÂN {Number(selectedTier.pointMultiplier).toFixed(2)}x</p>
                </div>
              </div>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-1 rounded border border-emerald-200 tracking-wider">ĐANG LƯU HÀNH</span>
            </div>

            {/* Form Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">

              {/* Fields */}
              <div>
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Thông Tin Hạng Thẻ</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Mã hạng thẻ</label>
                    <input type="text" readOnly value={selectedTier.id} className="w-full bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 font-mono outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Tên hiển thị khách hàng</label>
                    <input
                      type="text"
                      value={editTierName}
                      onChange={(e) => setEditTierName(e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-slate-800 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                    />
                  </div>
                </div>
              </div>

              {/* Emblem */}
              <div className="flex items-center justify-between bg-amber-50/50 border border-amber-200/60 rounded-xl p-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${selectedTier.iconColor} border border-black/5`}>
                    <span className="material-symbols-outlined">{selectedTier.icon}</span>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-800">{selectedTier.shortCode} Emblem SVG (Metallic Tone)</div>
                    <div className="text-[10px] text-gray-500">Hiển thị tại Keycard & Mobile App VIP Pass</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => showNotice('Biểu tượng Metallic Tone mặc định đang kích hoạt!')}
                  className="text-xs bg-white border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg font-medium hover:bg-gray-50 shadow-sm"
                >
                  Đổi Biểu Tượng
                </button>
              </div>

              {/* Requirement Metrics */}
              <div>
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Định Mức & Điều Kiện Nâng Hạng</h3>
                <div className="grid grid-cols-3 gap-0 rounded-xl overflow-hidden border border-gray-200 bg-gray-50 divide-x divide-gray-200">
                  <div className="p-3">
                    <div className="text-[10px] text-gray-500 uppercase font-semibold mb-1">Điểm tích lũy</div>
                    <input
                      type="text"
                      value={editReqPoints}
                      onChange={(e) => setEditReqPoints(e.target.value)}
                      className="text-base font-bold text-slate-800 bg-transparent w-full outline-none focus:bg-white rounded px-1"
                    />
                    <div className="text-[9px] text-gray-400">PTS/năm</div>
                  </div>
                  <div className="p-3">
                    <div className="text-[10px] text-gray-500 uppercase font-semibold mb-1">Đêm nghỉ PMS</div>
                    <input
                      type="text"
                      value={editReqNights}
                      onChange={(e) => setEditReqNights(e.target.value)}
                      className="text-base font-bold text-slate-800 bg-transparent w-full outline-none focus:bg-white rounded px-1"
                    />
                    <div className="text-[9px] text-gray-400">Đêm phòng</div>
                  </div>
                  <div className="p-3">
                    <div className="text-[10px] text-gray-500 uppercase font-semibold mb-1">Chi tiêu trực tiếp</div>
                    <input
                      type="text"
                      value={editReqSpend}
                      onChange={(e) => setEditReqSpend(e.target.value)}
                      className="text-base font-bold text-slate-800 bg-transparent w-full outline-none focus:bg-white rounded px-1"
                    />
                    <div className="text-[9px] text-gray-400">USD quy đổi</div>
                  </div>
                </div>
                <div className="text-[10px] text-gray-400 mt-2 italic">* Chỉ cần đạt 1 trong 3 tiêu chí trên là được nâng hạng tự động.</div>
              </div>

              {/* Perks */}
              <div>
                <div className="flex justify-between items-end mb-3">
                  <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Đặc Quyền Đồng Bộ Hệ Thống (PMS Perks)</h3>
                  <span className="text-[10px] text-emerald-600 font-semibold cursor-pointer">Chọn tất cả</span>
                </div>
                <div className="flex flex-col gap-2">
                  {[
                    { label: 'Nâng hạng phòng khả dụng (Available Room Upgrade)', active: selectedTier.activeCheckboxes?.[0] },
                    { label: 'Miễn phí Buffet sáng cho 02 khách/ngày', active: selectedTier.activeCheckboxes?.[1] },
                    { label: 'Bảo đảm trả phòng trễ đến 14:00 (Guaranteed Late Checkout)', active: selectedTier.activeCheckboxes?.[2] },
                    { label: 'Giảm 15% toàn bộ Liệu trình The Lotus Spa', active: selectedTier.activeCheckboxes?.[3] },
                    { label: 'Tặng 01 chai vang Sommelier Chào Mừng (Welcome Wine)', active: selectedTier.activeCheckboxes?.[4] }
                  ].map((perk, i) => (
                    <label key={i} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${perk.active ? 'bg-emerald-50/50 border-emerald-200' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                      <div className={`w-5 h-5 rounded flex items-center justify-center border ${perk.active ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-gray-300'}`}>
                        {perk.active && <span className="material-symbols-outlined text-[14px]">check</span>}
                      </div>
                      <span className={`text-xs font-semibold ${perk.active ? 'text-emerald-900' : 'text-gray-600'}`}>{perk.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Retention Policy */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-[16px] text-gray-500">update</span>
                  <h3 className="text-xs font-bold text-slate-800 uppercase">Chính Sách Duy Trì Hạng (Tier Retention Policy)</h3>
                </div>
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  {selectedTier.retentionPolicy || `Hiệu lực duy trì 12 tháng kể từ ngày nâng hạng thành công. Tự động hạ 1 bậc (xuống hạng liền kề) nếu không đạt tối thiểu 70% định mức trong năm kế tiếp.`}
                </p>
              </div>

              {/* Waiting list */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Hàng Đợi Chờ Duyệt Thăng Hạng Hôm Nay</h3>
                  <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">{pendingApprovals.length} Khách chờ</span>
                </div>
                <div className="flex flex-col gap-2">
                  {pendingApprovals.map(user => (
                    <div key={user.id} className="flex justify-between items-center p-3 rounded-xl border border-gray-100 bg-white shadow-sm hover:border-gray-200 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${user.bg}`}>
                          {user.initials}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-800">{user.name}</div>
                          <div className="text-[10px] text-gray-500">{user.info}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleApproveUpgrade(user)}
                        className="text-[10px] bg-[#006064] text-white font-bold px-3 py-1.5 rounded-md hover:bg-[#004d40] shadow-sm active:scale-95 transition-transform"
                      >
                        Duyệt Nâng
                      </button>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Form Footer: SỬA (Lưu) & XÓA (Delete) */}
            <div className="bg-gray-50 border-t border-gray-200 p-4 flex items-center justify-between gap-3 shrink-0">
              <div>
                {selectedTier.id !== 'TIER-01' && selectedTier.tierId !== 1 && (
                  <button
                    type="button"
                    onClick={handleDeleteTier}
                    className="px-4 py-2 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                    Xóa Hạng Thẻ
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditTierName(selectedTier.code);
                    setEditReqPoints(selectedTier.reqPoints);
                    setEditReqNights(selectedTier.reqNights);
                    setEditReqSpend(selectedTier.reqSpend);
                  }}
                  className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 text-xs font-semibold hover:bg-gray-50 shadow-sm"
                >
                  Khôi Phục
                </button>
                <button
                  type="button"
                  onClick={handleSaveTier}
                  disabled={isSaving}
                  className="px-5 py-2 rounded-lg bg-[#1B5E20] hover:bg-[#144d18] text-white text-xs font-semibold shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                >
                  <span className={`material-symbols-outlined text-[16px] ${isSaving ? 'animate-spin' : ''}`}>
                    {isSaving ? 'sync' : 'save'}
                  </span>
                  {isSaving ? 'Đang Lưu...' : 'Lưu Cấu Hình Hạng Thẻ'}
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* --- ADD TIER MODAL OVERLAY (THÊM HẠNG THẺ MỚI) --- */}
        {isAddTierModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-200">
              <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50">
                <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800">
                  <span className="material-symbols-outlined text-emerald-600">add_circle</span>
                  Thêm Hạng Thẻ PMS Mới
                </h2>
                <button onClick={() => setIsAddTierModalOpen(false)} className="text-gray-400 hover:text-red-500 transition-colors">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <form onSubmit={handleCreateTier} className="p-6 flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Tên Hạng Thẻ *</label>
                    <input
                      type="text"
                      required
                      placeholder="VD: Platinum Club"
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm font-medium focus:ring-2 focus:ring-emerald-500/30 outline-none"
                      value={newTierForm.tierName}
                      onChange={(e) => setNewTierForm({ ...newTierForm, tierName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Mã Thẻ (Code)</label>
                    <input
                      type="text"
                      placeholder="VD: TIER-05 (Để trống tự sinh)"
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm font-mono focus:ring-2 focus:ring-emerald-500/30 outline-none"
                      value={newTierForm.tierCode}
                      onChange={(e) => setNewTierForm({ ...newTierForm, tierCode: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Điểm Tích Luỹ</label>
                    <input
                      type="number"
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm font-bold focus:ring-2 focus:ring-emerald-500/30 outline-none"
                      value={newTierForm.minPoints}
                      onChange={(e) => setNewTierForm({ ...newTierForm, minPoints: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Đêm Nghỉ PMS</label>
                    <input
                      type="number"
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm font-bold focus:ring-2 focus:ring-emerald-500/30 outline-none"
                      value={newTierForm.minNights}
                      onChange={(e) => setNewTierForm({ ...newTierForm, minNights: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Chi Tiêu USD</label>
                    <input
                      type="number"
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm font-bold focus:ring-2 focus:ring-emerald-500/30 outline-none"
                      value={newTierForm.minSpendUsd}
                      onChange={(e) => setNewTierForm({ ...newTierForm, minSpendUsd: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Hệ Số Nhân Điểm (Multiplier)</label>
                    <input
                      type="number"
                      step="0.05"
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm font-bold text-green-700 focus:ring-2 focus:ring-emerald-500/30 outline-none"
                      value={newTierForm.pointMultiplier}
                      onChange={(e) => setNewTierForm({ ...newTierForm, pointMultiplier: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Giảm Giá Đặt Phòng (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm font-bold text-blue-700 focus:ring-2 focus:ring-emerald-500/30 outline-none"
                      value={newTierForm.discountRate}
                      onChange={(e) => setNewTierForm({ ...newTierForm, discountRate: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Danh Mục Đặc Quyền (Cách nhau dấu phẩy)</label>
                  <textarea
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs focus:ring-2 focus:ring-emerald-500/30 outline-none"
                    value={newTierForm.perksText}
                    onChange={(e) => setNewTierForm({ ...newTierForm, perksText: e.target.value })}
                  />
                </div>

                <div className="flex justify-end gap-3 mt-2 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsAddTierModalOpen(false)}
                    className="px-4 py-2 rounded-lg border border-gray-300 text-gray-600 text-sm font-semibold hover:bg-gray-50"
                  >
                    Huỷ
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingTier}
                    className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-md flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <span className={`material-symbols-outlined text-[18px] ${isCreatingTier ? 'animate-spin' : ''}`}>
                      {isCreatingTier ? 'sync' : 'add_circle'}
                    </span>
                    {isCreatingTier ? 'Đang Tạo...' : 'Tạo Hạng Thẻ Mới'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* --- SIMULATOR MODAL OVERLAY --- */}
        {isSimulatorOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-200">
              <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50">
                <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800">
                  <span className="material-symbols-outlined text-purple-600">magic_button</span>
                  Bộ Mô Phỏng Logic Tích Điểm & Thăng Hạng Tự Động
                </h2>
                <button onClick={() => { setIsSimulatorOpen(false); setSimResult(null); }} className="text-gray-400 hover:text-red-500 transition-colors">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="p-6 flex flex-col gap-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Chọn Hội Viên</label>
                    <select
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all font-medium text-slate-800"
                      value={simMemberId}
                      onChange={(e) => setSimMemberId(e.target.value)}
                    >
                      {members.map(m => (
                        <option key={m.id} value={m.id}>{m.name} ({m.tier}) - Điểm: {Number(m.currentPoints || 0).toLocaleString()}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Quyền Lợi Đặt Phòng Hiện Tại</label>
                    {currentBookingDiscount && (
                      <div className="px-4 py-2.5 rounded-xl border border-green-200 bg-green-50 text-green-800 text-sm flex items-center justify-between font-medium">
                        <span>Giảm giá đặt phòng:</span>
                        <span className="font-bold text-lg">{currentBookingDiscount.discountRate}%</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Loại Giao Dịch</label>
                    <select
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all font-medium text-slate-800"
                      value={simType}
                      onChange={(e) => setSimType(e.target.value)}
                    >
                      <option value="STAY">Lưu Trú (Phòng)</option>
                      <option value="FNB">Ăn Uống (F&B)</option>
                      <option value="SERVICE">Dịch Vụ Spa/Gym</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Số Tiền (VNĐ)</label>
                    <input
                      type="number"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all font-medium text-slate-800"
                      value={simAmount}
                      onChange={(e) => setSimAmount(Number(e.target.value))}
                    />
                  </div>
                </div>

                <button
                  onClick={handleSimulate}
                  className="w-full py-3.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-lg shadow-purple-600/20 transition-all flex items-center justify-center gap-2 text-base"
                >
                  <span className="material-symbols-outlined">payments</span>
                  Thực Hiện Giao Dịch & Tích Điểm
                </button>

                {simResult && (
                  <div className="mt-2 p-5 rounded-xl bg-gray-50 border border-gray-200 flex flex-col gap-3 animate-in fade-in zoom-in-95">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b border-gray-200 pb-3">
                      <span className="material-symbols-outlined text-green-600">check_circle</span>
                      Kết Quả Giao Dịch
                    </h3>
                    <div className="grid grid-cols-2 gap-y-3 text-sm">
                      <span className="text-gray-500 font-medium">Chi tiêu:</span>
                      <span className="font-mono font-bold text-slate-800">{formatCurrency(simResult.amount)}</span>

                      <span className="text-gray-500 font-medium">Điểm nhận được:</span>
                      <span className="font-mono font-bold text-green-600">+{Number(simResult.pointsEarned || 0).toLocaleString()} điểm</span>

                      <span className="text-gray-500 font-medium">Hạng trước GD:</span>
                      <span className="font-bold text-slate-800">{simResult.tierBefore}</span>

                      <span className="text-gray-500 font-medium">Hạng sau GD:</span>
                      <span className="font-bold flex items-center gap-2 text-slate-800">
                        {simResult.tierAfter}
                        {simResult.isUpgraded && <span className="px-2 py-0.5 rounded text-xs bg-amber-100 text-amber-800 animate-pulse border border-amber-200 shadow-sm">UPGRADED! 🎉</span>}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </AdminLayout>
  );
};

export default LoyaltyManagement;
