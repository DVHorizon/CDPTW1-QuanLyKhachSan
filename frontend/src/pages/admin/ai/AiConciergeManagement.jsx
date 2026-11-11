import React, { useState, useEffect, useMemo } from 'react';
import AdminLayout from '../../../components/admin/layout/AdminLayout';
import {
  fetchKnowledgeBaseApi,
  createKnowledgeItemApi,
  updateKnowledgeItemApi,
  toggleKnowledgeStatusApi,
  deleteKnowledgeItemApi,
  testKnowledgeRelevanceApi,
  fetchConversationsApi,
  claimHandoverApi,
  sendStaffReplyApi,
  resolveConversationApi,
} from '../../../api/aiApi';
import {
  cleanMessage,
  extractErrorCode,
  logSystemEvent,
} from '../../../utils/toastSanitizer';

const CATEGORY_OPTIONS = [
  { value: 'Services', label: 'Dịch vụ & Tiện ích (Services)' },
  { value: 'Rooms', label: 'Hạng phòng & Thiết bị (Rooms)' },
  { value: 'Rules', label: 'Nội quy lưu trú (Rules)' },
  { value: 'F&B', label: 'Nhà hàng & Ẩm thực (F&B)' },
  { value: 'Payment', label: 'Thanh toán & Hóa đơn (Payment)' },
  { value: 'Policy', label: 'Chính sách hoàn hủy (Policy)' },
  { value: 'Other', label: 'Thông tin khác (Other)' },
];

const CATEGORY_LABELS_VI = {
  Services: 'Dịch vụ & Tiện ích',
  'Dịch vụ': 'Dịch vụ & Tiện ích',
  Amenities: 'Dịch vụ & Tiện ích',
  Rooms: 'Hạng phòng',
  Phòng: 'Hạng phòng',
  Rules: 'Nội quy lưu trú',
  'Nội quy': 'Nội quy lưu trú',
  'F&B': 'Nhà hàng & Ẩm thực',
  'Ẩm thực': 'Nhà hàng & Ẩm thực',
  Payment: 'Thanh toán & Hóa đơn',
  'Thanh toán': 'Thanh toán & Hóa đơn',
  Policy: 'Chính sách',
  'Chính sách': 'Chính sách',
  Other: 'Khác',
  Khác: 'Khác',
  General: 'Chung',
};

const FALLBACK_KB_ITEMS = [
  {
    id: 1,
    knowledgeId: 1,
    question: 'Khách sạn có dịch vụ giặt ủi (laundry) không và chi phí thế nào?',
    answer:
      'Dạ khách sạn Grand Horizon cung cấp dịch vụ giặt ủi, hấp sấy lấy nhanh trong 4 giờ với mức giá từ 350.000đ/lượt.',
    category: 'Services',
    keywords: 'giặt ủi, laundry, giặt là, hấp sấy',
    status: 'Active',
  },
  {
    id: 2,
    knowledgeId: 2,
    question: 'Hồ bơi vô cực (swimming pool) mở cửa từ mấy giờ?',
    answer:
      'Dạ hồ bơi vô cực tầng thượng mở cửa phục vụ miễn phí từ 06:00 sáng đến 22:00 tối hàng ngày.',
    category: 'Services',
    keywords: 'hồ bơi, bể bơi, swimming pool, bơi lội',
    status: 'Active',
  },
  {
    id: 3,
    knowledgeId: 3,
    question: 'Quy định giờ nhận phòng (check-in) và trả phòng (check-out)?',
    answer:
      'Dạ giờ nhận phòng tiêu chuẩn từ 14:00 chiều và trả phòng trước 12:00 trưa.',
    category: 'Rules',
    keywords: 'check-in, check-out, nhận phòng, trả phòng',
    status: 'Active',
  },
];

const SAMPLE_SANDBOX_QUERIES = [
  'Khách sạn có dịch vụ giặt ủi lấy nhanh không?',
  'Bể bơi vô cực mở cửa mấy giờ?',
  'Cho tôi hỏi về dịch vụ xe đưa đón sân bay?',
  'Giờ nhận phòng check-in và trả phòng là mấy giờ?',
];

const AiConciergeManagement = () => {
  const [activeTab, setActiveTab] = useState('kb'); // 'kb' | 'sandbox' | 'inbox'
  const [toast, setToast] = useState(null);

  // State cho Tab 1: Knowledge Base CRUD (C14)
  const [kbItems, setKbItems] = useState([]);
  const [kbLoading, setKbLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    question: '',
    answer: '',
    category: 'Services',
    keywords: '',
    status: 'Active',
  });

  // State cho Tab 2: Relevance Sandbox (C14)
  const [sandboxQuery, setSandboxQuery] = useState(SAMPLE_SANDBOX_QUERIES[0]);
  const [sandboxResult, setSandboxResult] = useState(null);
  const [sandboxLoading, setSandboxLoading] = useState(false);

  // State cho Tab 3: Live Handover Inbox (C13)
  const [conversations, setConversations] = useState([]);
  const [convFilterStatus, setConvFilterStatus] = useState('All');
  const [selectedConvId, setSelectedConvId] = useState(null);
  const [staffReplyText, setStaffReplyText] = useState('');
  const [convLoading, setConvLoading] = useState(false);

  const showSanitizedToast = (rawMsgOrErr, type = 'info') => {
    const code = extractErrorCode(rawMsgOrErr);
    const cleaned =
      cleanMessage(rawMsgOrErr) ||
      (type === 'error'
        ? 'Đã xảy ra sự cố khi xử lý yêu cầu. Vui lòng thử lại.'
        : 'Thao tác đã được thực hiện thành công.');
    logSystemEvent({
      code,
      message: cleaned,
      rawMessage: rawMsgOrErr?.message || String(rawMsgOrErr || ''),
      type,
      context: 'AiConciergeManagement',
    });
    setToast({ text: cleaned, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Tải danh sách Knowledge Base
  const loadKnowledgeBase = async () => {
    setKbLoading(true);
    try {
      const res = await fetchKnowledgeBaseApi({
        category: selectedCategory,
        status: selectedStatus,
        search: searchKeyword,
      });
      const list = Array.isArray(res?.data) ? res.data : FALLBACK_KB_ITEMS;
      setKbItems(list);
    } catch (error) {
      setKbItems(FALLBACK_KB_ITEMS);
      showSanitizedToast(error, 'error');
    } finally {
      setKbLoading(false);
    }
  };

  // Tải danh sách hội thoại khách hàng (Handover Inbox)
  const loadConversations = async () => {
    setConvLoading(true);
    try {
      const res = await fetchConversationsApi({ status: convFilterStatus });
      const list = Array.isArray(res?.data) ? res.data : [];
      setConversations(list);
      if (list.length > 0 && !selectedConvId) {
        setSelectedConvId(list[0].conversationId);
      }
    } catch (error) {
      showSanitizedToast(error, 'error');
    } finally {
      setConvLoading(false);
    }
  };

  useEffect(() => {
    loadKnowledgeBase();
  }, [selectedCategory, selectedStatus]);

  useEffect(() => {
    if (activeTab === 'inbox') {
      loadConversations();
    }
  }, [activeTab, convFilterStatus]);

  const filteredKbItems = useMemo(() => {
    if (!searchKeyword.trim()) return kbItems;
    const kw = searchKeyword.toLowerCase().trim();
    return kbItems.filter((item) => {
      const q = String(item.question || item.Question || '').toLowerCase();
      const a = String(item.answer || item.Answer || '').toLowerCase();
      const k = String(item.keywords || item.Keywords || '').toLowerCase();
      return q.includes(kw) || a.includes(kw) || k.includes(kw);
    });
  }, [kbItems, searchKeyword]);

  const selectedConversation = useMemo(() => {
    return (
      conversations.find((c) => Number(c.conversationId) === Number(selectedConvId)) ||
      conversations[0] ||
      null
    );
  }, [conversations, selectedConvId]);

  // Mở modal thêm/sửa tri thức
  const handleOpenModal = (item = null) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        question: item.question || item.Question || '',
        answer: item.answer || item.Answer || '',
        category: item.category || item.Category || 'Services',
        keywords: item.keywords || item.Keywords || '',
        status: item.status || item.Status || 'Active',
      });
    } else {
      setEditingItem(null);
      setFormData({
        question: '',
        answer: '',
        category: 'Services',
        keywords: '',
        status: 'Active',
      });
    }
    setIsModalOpen(true);
  };

  const handleSaveKnowledge = async (e) => {
    e.preventDefault();
    if (!formData.question.trim() || !formData.answer.trim()) {
      showSanitizedToast('Câu hỏi và câu trả lời không được để trống.', 'warning');
      return;
    }

    try {
      if (editingItem) {
        const id = editingItem.knowledgeId || editingItem.id || editingItem.KnowledgeId;
        const res = await updateKnowledgeItemApi(id, formData);
        showSanitizedToast(res?.message || 'Cập nhật tri thức AI thành công.', 'success');
      } else {
        const res = await createKnowledgeItemApi(formData);
        showSanitizedToast(res?.message || 'Thêm mới tri thức AI thành công.', 'success');
      }
      setIsModalOpen(false);
      await loadKnowledgeBase();
    } catch (error) {
      showSanitizedToast(error, 'error');
    }
  };

  const handleToggleStatus = async (item) => {
    const id = item.knowledgeId || item.id || item.KnowledgeId;
    const currentStatus = item.status || item.Status || 'Active';
    const nextStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';

    try {
      const res = await toggleKnowledgeStatusApi(id, nextStatus);
      showSanitizedToast(
        res?.message ||
          `Đã chuyển trạng thái sang ${nextStatus === 'Active' ? 'Đang kích hoạt' : 'Tạm ngưng'}.`,
        'success'
      );
      await loadKnowledgeBase();
    } catch (error) {
      showSanitizedToast(error, 'error');
    }
  };

  const handleDeleteKnowledge = async (item) => {
    const id = item.knowledgeId || item.id || item.KnowledgeId;
    try {
      const res = await deleteKnowledgeItemApi(id);
      showSanitizedToast(res?.message || 'Đã xóa bản ghi tri thức thành công.', 'success');
      await loadKnowledgeBase();
    } catch (error) {
      showSanitizedToast(error, 'error');
    }
  };

  // Kiểm thử độ chính xác AI (Relevance Sandbox)
  const handleRunSandboxTest = async (e) => {
    if (e) e.preventDefault();
    if (!sandboxQuery.trim()) {
      showSanitizedToast('Vui lòng nhập câu hỏi giả lập để kiểm thử.', 'warning');
      return;
    }

    setSandboxLoading(true);
    try {
      const res = await testKnowledgeRelevanceApi(sandboxQuery);
      setSandboxResult(res?.data || null);
      showSanitizedToast('Đã hoàn tất phân tích độ khớp ngữ nghĩa AI.', 'success');
    } catch (error) {
      showSanitizedToast(error, 'error');
    } finally {
      setSandboxLoading(false);
    }
  };

  // Tiếp nhận Handover
  const handleClaimHandover = async (conversationId) => {
    try {
      const res = await claimHandoverApi(conversationId);
      showSanitizedToast(res?.message || 'Đã tiếp nhận phiên hội thoại thành công.', 'success');
      await loadConversations();
    } catch (error) {
      showSanitizedToast(error, 'error');
    }
  };

  // Gửi phản hồi của Lễ tân cho khách
  const handleSendStaffReply = async (e) => {
    e.preventDefault();
    if (!selectedConversation) return;
    if (!staffReplyText.trim()) {
      showSanitizedToast('Vui lòng nhập nội dung phản hồi cho khách hàng.', 'warning');
      return;
    }

    try {
      const res = await sendStaffReplyApi(
        selectedConversation.conversationId,
        staffReplyText.trim()
      );
      setStaffReplyText('');
      showSanitizedToast(res?.message || 'Đã gửi phản hồi tới khách hàng.', 'success');
      await loadConversations();
    } catch (error) {
      showSanitizedToast(error, 'error');
    }
  };

  // Hoàn tất & đóng phiên hỗ trợ
  const handleResolveConversation = async (conversationId) => {
    try {
      const res = await resolveConversationApi(conversationId);
      showSanitizedToast(res?.message || 'Đã hoàn tất và đóng phiên hỗ trợ.', 'success');
      await loadConversations();
    } catch (error) {
      showSanitizedToast(error, 'error');
    }
  };

  const stats = useMemo(() => {
    const total = kbItems.length;
    const activeCount = kbItems.filter((i) => (i.status || i.Status) === 'Active').length;
    const handoverCount = conversations.filter(
      (c) => (c.status || c.Status) === 'HandedOver'
    ).length;
    return { total, activeCount, handoverCount };
  }, [kbItems, conversations]);

  return (
    <AdminLayout>
      <div className="py-6 space-y-6">
        {/* Thông báo Toast chuẩn hóa tiếng Việt */}
        {toast && (
          <div
            className={`fixed top-20 right-6 z-50 px-5 py-3.5 rounded-xl shadow-lg border text-sm font-medium flex items-center gap-2.5 transition-all ${
              toast.type === 'error'
                ? 'bg-red-50 text-red-800 border-red-200'
                : toast.type === 'warning'
                ? 'bg-amber-50 text-amber-900 border-amber-200'
                : 'bg-emerald-50 text-emerald-900 border-emerald-200'
            }`}
          >
            <span>{toast.text}</span>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-stone-200 shadow-xs">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-700 bg-amber-50 px-3 py-1 rounded-full">
              Trí Tuệ Nhân Tạo • C13 & C14
            </span>
            <h1 className="text-2xl font-bold text-stone-900 mt-2">
              Trung Tâm Quản Trị AI Concierge & Cơ Sở Tri Thức
            </h1>
            <p className="text-sm text-stone-500 mt-1">
              Huấn luyện kịch bản hỏi đáp khách sạn, kiểm thử độ chính xác ngữ nghĩa và tiếp nhận hội thoại trực tiếp từ khách lưu trú.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleOpenModal(null)}
              className="px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-sm font-medium transition flex items-center gap-2 shadow-xs"
            >
              <span>+ Thêm kịch bản tri thức</span>
            </button>
          </div>
        </div>

        {/* Thẻ KPI tổng quan */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
            <div className="text-xs font-medium text-stone-500 uppercase">
              Tổng kịch bản tri thức (C14)
            </div>
            <div className="text-2xl font-bold text-stone-900 mt-1">
              {stats.total} kịch bản
            </div>
            <div className="text-xs text-emerald-600 mt-1">
              Đang kích hoạt: {stats.activeCount} bản ghi
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
            <div className="text-xs font-medium text-stone-500 uppercase">
              Độ sẵn sàng AI Concierge (C13)
            </div>
            <div className="text-2xl font-bold text-emerald-700 mt-1">
              Trực tuyến 24/7
            </div>
            <div className="text-xs text-stone-500 mt-1">
              Chống Prompt Injection & tự động nhận diện khiếu nại
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
            <div className="text-xs font-medium text-stone-500 uppercase">
              Yêu cầu chuyển Lễ tân (Handover)
            </div>
            <div className="text-2xl font-bold text-amber-700 mt-1">
              {stats.handoverCount} phiên cần hỗ trợ
            </div>
            <div className="text-xs text-stone-500 mt-1">
              Ưu tiên tiếp nhận từ khách lưu trú
            </div>
          </div>
        </div>

        {/* Thanh chuyển Tab */}
        <div className="flex flex-wrap gap-2 border-b border-stone-200 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab('kb')}
            className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition ${
              activeTab === 'kb'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            1. Quản Trị Cơ Sở Tri Thức (C14)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sandbox')}
            className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition ${
              activeTab === 'sandbox'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            2. Kiểm Thử Độ Chính Xác AI (Sandbox C14)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('inbox')}
            className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition ${
              activeTab === 'inbox'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            3. Giám Sát Hội Thoại & Tiếp Nhận Hỗ Trợ (C13)
          </button>
        </div>

        {/* TAB 1: QUẢN TRỊ CƠ SỞ TRI THỨC (C14) */}
        {activeTab === 'kb' && (
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-6 space-y-5">
            <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3.5 py-2 rounded-xl border border-stone-300 text-sm text-stone-800 bg-white"
                >
                  <option value="All">Tất cả danh mục</option>
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="px-3.5 py-2 rounded-xl border border-stone-300 text-sm text-stone-800 bg-white"
                >
                  <option value="All">Mọi trạng thái</option>
                  <option value="Active">Đang kích hoạt (Active)</option>
                  <option value="Inactive">Tạm ngưng (Inactive)</option>
                </select>
              </div>

              <div className="flex items-center gap-2 w-full md:w-80">
                <input
                  type="text"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  placeholder="Tìm câu hỏi, từ khóa, nội dung..."
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-sm"
                />
              </div>
            </div>

            {kbLoading ? (
              <div className="py-12 text-center text-sm text-stone-500">
                Đang tải dữ liệu cơ sở tri thức AI...
              </div>
            ) : filteredKbItems.length === 0 ? (
              <div className="py-12 text-center text-sm text-stone-500">
                Không tìm thấy bản ghi tri thức nào khớp với bộ lọc hiện tại.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-stone-200 text-xs uppercase text-stone-500">
                      <th className="py-3 px-3">Mã</th>
                      <th className="py-3 px-3">Danh mục</th>
                      <th className="py-3 px-3">Câu hỏi mẫu & Từ khóa</th>
                      <th className="py-3 px-3">Câu trả lời chuẩn của AI</th>
                      <th className="py-3 px-3">Trạng thái</th>
                      <th className="py-3 px-3 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200 text-sm">
                    {filteredKbItems.map((item) => {
                      const id = item.knowledgeId || item.id || item.KnowledgeId;
                      const isActive = (item.status || item.Status) === 'Active';
                      const rawCat = item.category || item.Category || 'Services';
                      return (
                        <tr key={id} className="hover:bg-stone-50/80">
                          <td className="py-3.5 px-3 font-semibold text-stone-700">
                            #{id}
                          </td>
                          <td className="py-3.5 px-3">
                            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-stone-100 text-stone-800">
                              {CATEGORY_LABELS_VI[rawCat] || rawCat}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 max-w-xs">
                            <div className="font-semibold text-stone-900">
                              {item.question || item.Question}
                            </div>
                            {(item.keywords || item.Keywords) && (
                              <div className="text-xs text-stone-500 mt-1">
                                Từ khóa: {item.keywords || item.Keywords}
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-3 max-w-md text-stone-700">
                            <p className="line-clamp-3">
                              {item.answer || item.Answer}
                            </p>
                          </td>
                          <td className="py-3.5 px-3">
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(item)}
                              className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                                isActive
                                  ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                  : 'bg-stone-200 text-stone-700 hover:bg-stone-300'
                              }`}
                            >
                              {isActive ? 'Đang bật' : 'Tạm tắt'}
                            </button>
                          </td>
                          <td className="py-3.5 px-3 text-right space-x-2 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleOpenModal(item)}
                              className="px-3 py-1.5 rounded-lg border border-stone-300 text-xs font-medium text-stone-700 hover:bg-stone-100"
                            >
                              Chỉnh sửa
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteKnowledge(item)}
                              className="px-3 py-1.5 rounded-lg border border-red-200 text-xs font-medium text-red-700 hover:bg-red-50"
                            >
                              Xóa
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: KIỂM THỬ ĐỘ CHÍNH XÁC AI (RELEVANCE SANDBOX - C14) */}
        {activeTab === 'sandbox' && (
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-6 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-stone-900">
                Phòng Thử Nghiệm Độ Tương Đồng Ngữ Nghĩa AI (Relevance Sandbox)
              </h2>
              <p className="text-sm text-stone-500 mt-1">
                Nhập câu hỏi bất kỳ của khách hàng (có dấu hoặc không dấu) để kiểm tra kịch bản tri thức được AI Concierge lựa chọn và điểm số độ tin cậy.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {SAMPLE_SANDBOX_QUERIES.map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSandboxQuery(q)}
                  className="text-xs px-3 py-1.5 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 transition"
                >
                  {q}
                </button>
              ))}
            </div>

            <form onSubmit={handleRunSandboxTest} className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={sandboxQuery}
                onChange={(e) => setSandboxQuery(e.target.value)}
                placeholder="Nhập câu hỏi thử nghiệm (VD: Khách sạn có dịch vụ giặt ủi không?)..."
                className="flex-1 px-4 py-2.5 rounded-xl border border-stone-300 text-sm"
              />
              <button
                type="submit"
                disabled={sandboxLoading}
                className="px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-sm font-medium transition"
              >
                {sandboxLoading ? 'Đang phân tích...' : 'Kiểm thử độ khớp AI'}
              </button>
            </form>

            {sandboxResult && (
              <div className="p-5 rounded-2xl bg-stone-50 border border-stone-200 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <span className="text-xs font-semibold uppercase text-stone-500">
                      Kết quả khớp tốt nhất
                    </span>
                    <h3 className="text-base font-bold text-stone-900 mt-0.5">
                      {sandboxResult.matchedItem?.question ||
                        sandboxResult.matchedItem?.Question}
                    </h3>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-stone-500 block">
                      Điểm tương đồng (Relevance Score)
                    </span>
                    <span className="text-xl font-bold text-emerald-700">
                      {Math.round(Number(sandboxResult.relevanceScore || 0.85) * 100)}%
                    </span>
                  </div>
                </div>

                {/* Thanh phần trăm độ chính xác */}
                <div className="w-full h-2.5 bg-stone-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round(Number(sandboxResult.relevanceScore || 0.85) * 100)
                      )}%`,
                    }}
                  />
                </div>

                <div className="bg-white p-4 rounded-xl border border-stone-200 text-sm text-stone-800">
                  <div className="text-xs font-semibold text-stone-500 mb-1">
                    Phản hồi trích xuất từ Knowledge Base:
                  </div>
                  <p>
                    {sandboxResult.matchedItem?.answer ||
                      sandboxResult.matchedItem?.Answer}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: GIÁM SÁT HỘI THOẠI & TIẾP NHẬN HỖ TRỢ (LIVE HANDOVER INBOX - C13) */}
        {activeTab === 'inbox' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Danh sách phiên hội thoại */}
            <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-stone-900">
                  Phiên Hội Thoại Khách Hàng
                </h2>
                <select
                  value={convFilterStatus}
                  onChange={(e) => setConvFilterStatus(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-stone-300 text-xs"
                >
                  <option value="All">Tất cả</option>
                  <option value="HandedOver">Cần hỗ trợ (HandedOver)</option>
                  <option value="Open">AI đang trả lời (Open)</option>
                  <option value="Closed">Đã đóng (Closed)</option>
                </select>
              </div>

              {convLoading ? (
                <div className="py-8 text-center text-xs text-stone-500">
                  Đang tải danh sách hội thoại...
                </div>
              ) : conversations.length === 0 ? (
                <div className="py-8 text-center text-xs text-stone-500">
                  Chưa có phiên hội thoại nào.
                </div>
              ) : (
                <div className="space-y-2 max-h-[480px] overflow-y-auto">
                  {conversations.map((conv) => {
                    const isSelected =
                      Number(selectedConversation?.conversationId) ===
                      Number(conv.conversationId);
                    const isHandover = (conv.status || conv.Status) === 'HandedOver';
                    return (
                      <button
                        key={conv.conversationId}
                        type="button"
                        onClick={() => setSelectedConvId(conv.conversationId)}
                        className={`w-full text-left p-3.5 rounded-xl border transition ${
                          isSelected
                            ? 'bg-stone-900 text-white border-stone-900'
                            : 'bg-stone-50 hover:bg-stone-100 text-stone-800 border-stone-200'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-sm">
                            {conv.guestName || `Phiên #${conv.conversationId}`}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                              isHandover
                                ? 'bg-amber-200 text-amber-950'
                                : conv.status === 'Closed'
                                ? 'bg-stone-200 text-stone-700'
                                : 'bg-emerald-100 text-emerald-900'
                            }`}
                          >
                            {isHandover
                              ? 'Cần Lễ tân'
                              : conv.status === 'Closed'
                              ? 'Đã hoàn tất'
                              : 'AI tự động'}
                          </span>
                        </div>
                        <p
                          className={`text-xs mt-1.5 line-clamp-2 ${
                            isSelected ? 'text-stone-300' : 'text-stone-500'
                          }`}
                        >
                          {conv.lastMessage}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Chi tiết luồng chat và công cụ tiếp nhận của Lễ tân */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-200 shadow-xs p-5 flex flex-col justify-between min-h-[480px]">
              {selectedConversation ? (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-stone-200">
                    <div>
                      <h3 className="text-base font-bold text-stone-900">
                        {selectedConversation.guestName} (Mã phiên #
                        {selectedConversation.conversationId})
                      </h3>
                      <p className="text-xs text-stone-500">
                        Trạng thái:{' '}
                        <span className="font-semibold text-stone-800">
                          {selectedConversation.status === 'HandedOver'
                            ? 'Đang do Nhân viên tiếp nhận (HandedOver)'
                            : selectedConversation.status === 'Closed'
                            ? 'Đã đóng phiên hỗ trợ'
                            : 'AI Concierge đang tự động phản hồi'}
                        </span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {selectedConversation.status !== 'Closed' && (
                        <button
                          type="button"
                          onClick={() =>
                            handleClaimHandover(selectedConversation.conversationId)
                          }
                          className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition"
                        >
                          Tiếp nhận hỗ trợ
                        </button>
                      )}
                      {selectedConversation.status !== 'Closed' && (
                        <button
                          type="button"
                          onClick={() =>
                            handleResolveConversation(
                              selectedConversation.conversationId
                            )
                          }
                          className="px-3.5 py-2 rounded-xl border border-stone-300 hover:bg-stone-100 text-stone-700 text-xs font-semibold transition"
                        >
                          Hoàn tất & Đóng phiên
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Lịch sử tin nhắn */}
                  <div className="flex-1 py-4 space-y-3 max-h-[340px] overflow-y-auto">
                    {(selectedConversation.messages || []).map((m, idx) => {
                      const isGuest = m.senderType === 'Guest';
                      const isStaff = m.senderType === 'Staff';
                      return (
                        <div
                          key={m.messageId || idx}
                          className={`flex flex-col ${
                            isGuest ? 'items-start' : 'items-end'
                          }`}
                        >
                          <div
                            className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                              isGuest
                                ? 'bg-stone-100 text-stone-900'
                                : isStaff
                                ? 'bg-amber-700 text-white'
                                : 'bg-stone-900 text-white'
                            }`}
                          >
                            <div className="text-[10px] font-semibold opacity-75 mb-0.5">
                              {isGuest
                                ? 'Khách lưu trú'
                                : isStaff
                                ? 'Nhân viên Lễ tân'
                                : m.senderType === 'System'
                                ? 'Hệ thống Điều phối'
                                : 'AI Concierge'}
                            </div>
                            <p>{m.messageText}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Khung nhập phản hồi trực tiếp của nhân viên */}
                  <form
                    onSubmit={handleSendStaffReply}
                    className="pt-3 border-t border-stone-200 flex items-center gap-2"
                  >
                    <input
                      type="text"
                      value={staffReplyText}
                      onChange={(e) => setStaffReplyText(e.target.value)}
                      placeholder="Nhập phản hồi trực tiếp của Lễ tân gửi tới khách hàng..."
                      className="flex-1 px-4 py-2.5 rounded-xl border border-stone-300 text-sm"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-sm font-medium transition"
                    >
                      Gửi phản hồi
                    </button>
                  </form>
                </>
              ) : (
                <div className="py-16 text-center text-sm text-stone-500">
                  Chọn một phiên hội thoại bên trái để xem nội dung và tiếp nhận hỗ trợ.
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODAL THÊM / CẬP NHẬT TRI THỨC AI (C14) */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-stone-200">
              <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                <h3 className="text-lg font-bold text-stone-900">
                  {editingItem
                    ? 'Cập Nhật Kịch Bản Tri Thức AI'
                    : 'Thêm Mới Kịch Bản Tri Thức AI'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="text-stone-400 hover:text-stone-700 text-sm font-bold"
                >
                  Đóng
                </button>
              </div>

              <form onSubmit={handleSaveKnowledge} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-stone-600 mb-1">
                    Danh mục tri thức *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, category: e.target.value }))
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm"
                  >
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-stone-600 mb-1">
                    Câu hỏi mẫu của khách hàng *
                  </label>
                  <input
                    type="text"
                    value={formData.question}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, question: e.target.value }))
                    }
                    placeholder="VD: Khách sạn có dịch vụ đưa đón sân bay không?"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-stone-600 mb-1">
                    Câu trả lời chuẩn của AI Concierge *
                  </label>
                  <textarea
                    rows={4}
                    value={formData.answer}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, answer: e.target.value }))
                    }
                    placeholder="Nhập câu trả lời lịch sự, đầy đủ thông tin..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-stone-600 mb-1">
                    Từ khóa nhận diện (phân cách bằng dấu phẩy)
                  </label>
                  <input
                    type="text"
                    value={formData.keywords}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, keywords: e.target.value }))
                    }
                    placeholder="VD: đưa đón sân bay, limousine, xe đón, airport"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-stone-300 text-sm text-stone-700 hover:bg-stone-100"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-sm font-semibold"
                  >
                    {editingItem ? 'Lưu cập nhật' : 'Tạo kịch bản'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AiConciergeManagement;
