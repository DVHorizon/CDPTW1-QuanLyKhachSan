/**
 * frontend/src/api/aiApi.js
 * API Client cho Phân hệ Trợ lý AI Concierge (C13) & Quản trị Cơ sở Tri thức AI (C14)
 */

const BASE_URL = 'http://localhost:5000/api/v1/ai';

const getAuthHeaders = () => {
  const token =
    localStorage.getItem('hotel_token') ||
    localStorage.getItem('token') ||
    localStorage.getItem('authToken');
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

/**
 * 1. Gửi tin nhắn hội thoại tới AI Concierge (C13)
 */
export const sendChatMessageApi = async ({ message, conversationId = null }) => {
  const res = await fetch(`${BASE_URL}/chatbot`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      message,
      ...(conversationId ? { conversationId } : {}),
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw data;
  return data;
};

/**
 * 2. Lấy danh sách Cơ sở tri thức AI (C14)
 */
export const fetchKnowledgeBaseApi = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.category && params.category !== 'All') query.append('category', params.category);
  if (params.status && params.status !== 'All') query.append('status', params.status);
  if (params.search && String(params.search).trim()) query.append('search', String(params.search).trim());

  const url = `${BASE_URL}/knowledge-base${query.toString() ? `?${query.toString()}` : ''}`;
  const res = await fetch(url, {
    headers: getAuthHeaders(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw data;
  return data;
};

/**
 * 3. Thêm mới kịch bản tri thức AI (Chỉ Admin - C14)
 */
export const createKnowledgeItemApi = async (payload) => {
  const res = await fetch(`${BASE_URL}/knowledge-base`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw data;
  return data;
};

/**
 * 4. Cập nhật kịch bản tri thức AI (Chỉ Admin - C14)
 */
export const updateKnowledgeItemApi = async (id, payload) => {
  const res = await fetch(`${BASE_URL}/knowledge-base/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw data;
  return data;
};

/**
 * 5. Bật / Tắt trạng thái kích hoạt kịch bản tri thức AI (Chỉ Admin - C14)
 */
export const toggleKnowledgeStatusApi = async (id, status) => {
  const res = await fetch(`${BASE_URL}/knowledge-base/${id}/status`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(status ? { status } : {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw data;
  return data;
};

/**
 * 6. Xóa kịch bản tri thức AI (Chỉ Admin - C14)
 */
export const deleteKnowledgeItemApi = async (id) => {
  const res = await fetch(`${BASE_URL}/knowledge-base/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw data;
  return data;
};

/**
 * 7. Kiểm thử độ tương đồng & chính xác câu trả lời AI (Relevance Sandbox - C14)
 */
export const testKnowledgeRelevanceApi = async (queryText) => {
  const query = new URLSearchParams({ query: String(queryText || '').trim() });
  const res = await fetch(`${BASE_URL}/knowledge-base/test?${query.toString()}`, {
    headers: getAuthHeaders(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw data;
  return data;
};

/**
 * 8. Lấy danh sách phiên hội thoại của khách hàng cho Lễ tân / Quản lý (C13)
 */
export const fetchConversationsApi = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.status && params.status !== 'All') query.append('status', params.status);

  const url = `${BASE_URL}/conversations${query.toString() ? `?${query.toString()}` : ''}`;
  const res = await fetch(url, {
    headers: getAuthHeaders(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw data;
  return data;
};

/**
 * 9. Xem chi tiết lịch sử tin nhắn của một phiên hội thoại (C13)
 */
export const fetchConversationDetailApi = async (conversationId) => {
  const res = await fetch(`${BASE_URL}/conversations/${conversationId}`, {
    headers: getAuthHeaders(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw data;
  return data;
};

/**
 * 10. Nhân viên Lễ tân tiếp nhận xử lý hội thoại (Handover - C13)
 */
export const claimHandoverApi = async (conversationId) => {
  const res = await fetch(`${BASE_URL}/conversations/${conversationId}/handover`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw data;
  return data;
};

/**
 * 11. Nhân viên gửi tin nhắn phản hồi trực tiếp cho khách hàng (C13)
 */
export const sendStaffReplyApi = async (conversationId, message) => {
  const res = await fetch(`${BASE_URL}/conversations/${conversationId}/messages`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ message }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw data;
  return data;
};

/**
 * 12. Hoàn tất và đóng phiên hội thoại (C13)
 */
export const resolveConversationApi = async (conversationId) => {
  const res = await fetch(`${BASE_URL}/conversations/${conversationId}/resolve`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw data;
  return data;
};
