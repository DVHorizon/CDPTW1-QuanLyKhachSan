import React, { useState, useRef, useEffect } from 'react';
import MainLayout from '../../layouts/MainLayout';
import { sendChatMessageApi } from '../../api/aiApi';
import { cleanMessage, extractErrorCode, logSystemEvent } from '../../utils/toastSanitizer';

const QUICK_QUESTIONS = [
  'Khách sạn có dịch vụ giặt ủi lấy nhanh không?',
  'Hồ bơi vô cực mở cửa vào khung giờ nào?',
  'Giá dịch vụ xe Limousine đưa đón sân bay?',
  'Quy định giờ check-in nhận phòng và check-out trả phòng?',
  'Tôi cần gặp lễ tân hỗ trợ trực tiếp',
];

const INITIAL_GREETING = {
  id: 'welcome',
  senderType: 'AI',
  text: 'Kính chào quý khách! Tôi là Trợ lý AI Concierge của Grand Horizon Luxury Resort. Tôi có thể hỗ trợ quý khách giải đáp thắc mắc về các dịch vụ khách sạn (spa, giặt là, đưa đón, hồ bơi), tiện ích phòng, ẩm thực hoặc kết nối trực tiếp với Lễ tân 24/7.',
  time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
};

export default function ClientConcierge() {
  const [messages, setMessages] = useState([INITIAL_GREETING]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(() => {
    const saved = sessionStorage.getItem('gh_ai_conversation_id');
    return saved ? Number(saved) : null;
  });
  const [handoverActive, setHandoverActive] = useState(false);
  const [notice, setNotice] = useState(null);
  const messagesEndRef = useRef(null);

  const showNotice = (msg, type = 'error') => {
    const cleaned = cleanMessage(msg) || (type === 'error' ? 'Không thể gửi tin nhắn lúc này.' : 'Thao tác thành công.');
    logSystemEvent({
      code: extractErrorCode(msg),
      message: cleaned,
      rawMessage: msg?.message || String(msg || ''),
      type,
      context: 'ClientConciergePage',
    });
    setNotice({ text: cleaned, type });
    setTimeout(() => setNotice(null), 4000);
  };

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading]);

  const handleSend = async (customText = null) => {
    const raw = customText !== null ? customText : inputText;
    const text = String(raw || '').trim();
    if (!text) {
      showNotice('Vui lòng nhập nội dung câu hỏi trước khi gửi.', 'warning');
      return;
    }
    if (text.length > 1000) {
      showNotice('Tin nhắn không được vượt quá 1000 ký tự.', 'warning');
      return;
    }

    const userMsg = {
      id: `client-${Date.now()}`,
      senderType: 'Guest',
      text,
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (customText === null) setInputText('');
    setLoading(true);

    try {
      const res = await sendChatMessageApi({ message: text, conversationId });
      const payload = res?.data || {};
      if (payload.conversationId) {
        setConversationId(payload.conversationId);
        sessionStorage.setItem('gh_ai_conversation_id', String(payload.conversationId));
      }
      if (payload.handoverRequired || payload.suggestedEscalation || payload.status === 'HandedOver') {
        setHandoverActive(true);
      }
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          senderType: 'AI',
          text: payload.message || payload.answer || 'Cảm ơn quý khách, yêu cầu đã được ghi nhận.',
          time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (err) {
      showNotice(cleanMessage(err?.message) || 'Hệ thống trợ lý đang bận, vui lòng thử lại sau giây lát.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setConversationId(null);
    sessionStorage.removeItem('gh_ai_conversation_id');
    setHandoverActive(false);
    setMessages([INITIAL_GREETING]);
    showNotice('Đã làm mới phiên hội thoại với Trợ lý AI.', 'info');
  };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-3xl shadow-xl border border-[#e6e0d4] overflow-hidden flex flex-col h-[700px]">
          {/* Header */}
          <div className="bg-[#1c1917] text-white px-6 py-4 flex items-center justify-between border-b border-[#b9a277]/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#b9a277] text-[#1c1917] flex items-center justify-center font-bold text-base shadow-md">
                AI
              </div>
              <div>
                <h1 className="text-base font-bold text-[#fafaf8]">Grand Horizon AI Concierge</h1>
                <p className="text-xs text-[#d8cbb5]">
                  {handoverActive ? 'Đang chuyển giao Lễ tân trực tuyến' : 'Trợ lý ảo hỗ trợ thông tin & dịch vụ 24/7'}
                </p>
              </div>
            </div>
            <button
              onClick={handleReset}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-[#fafaf8] flex items-center gap-1.5 transition"
              title="Làm mới hội thoại"
            >
              <span className="material-symbols-outlined text-[16px]">refresh</span>
              <span>Làm mới</span>
            </button>
          </div>

          {/* Handover notification banner */}
          {handoverActive && (
            <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 flex items-center justify-between text-xs text-amber-900">
              <span className="font-medium">Phiên hội thoại đã được chuyển tiếp tới Lễ tân để hỗ trợ trực tiếp.</span>
              <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-bold">Ưu tiên xử lý</span>
            </div>
          )}

          {/* Local alert notice */}
          {notice && (
            <div
              className={`px-6 py-2 text-xs font-medium border-b ${
                notice.type === 'error'
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : notice.type === 'warning'
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
              }`}
            >
              {notice.text}
            </div>
          )}

          {/* Message List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#fafaf8]">
            {messages.map((m) => {
              const isGuest = m.senderType === 'Guest';
              return (
                <div key={m.id} className={`flex flex-col ${isGuest ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-5 py-3 text-sm leading-relaxed shadow-sm ${
                      isGuest
                        ? 'bg-[#1c1917] text-white rounded-br-none'
                        : 'bg-white text-stone-800 border border-[#e6e0d4] rounded-bl-none'
                    }`}
                  >
                    {!isGuest && (
                      <div className="text-[11px] font-bold text-[#9a8052] mb-1">Grand Horizon Concierge</div>
                    )}
                    <p className="whitespace-pre-line">{m.text}</p>
                  </div>
                  <span className="text-[10px] text-stone-400 mt-1 px-1">{m.time}</span>
                </div>
              );
            })}
            {loading && (
              <div className="flex items-start">
                <div className="bg-white border border-[#e6e0d4] rounded-2xl px-4 py-2.5 text-xs text-stone-500 flex items-center gap-2 shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-[#b9a277] animate-bounce" />
                  <span>Trợ lý AI đang tìm kiếm câu trả lời...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick prompt chips */}
          <div className="px-6 py-2.5 bg-stone-50 border-t border-stone-200 flex gap-2 overflow-x-auto no-scrollbar">
            {QUICK_QUESTIONS.map((q, idx) => (
              <button
                key={idx}
                type="button"
                disabled={loading}
                onClick={() => handleSend(q)}
                className="shrink-0 text-xs px-3.5 py-1.5 rounded-full bg-white border border-[#d8cbb5] text-stone-700 hover:bg-[#b9a277] hover:text-white hover:border-[#b9a277] transition shadow-xs"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-4 bg-white border-t border-stone-200 flex items-center gap-3"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Nhập thắc mắc về dịch vụ, tiện ích, phòng..."
              maxLength={1000}
              className="flex-1 text-sm px-4 py-3 rounded-2xl border border-stone-300 focus:outline-hidden focus:border-[#b9a277] text-stone-800"
            />
            <button
              type="submit"
              disabled={loading || !inputText.trim()}
              className="px-6 py-3 rounded-2xl bg-[#b9a277] hover:bg-[#a38b5f] disabled:opacity-50 text-white text-sm font-semibold transition flex items-center gap-1.5 shadow-sm"
            >
              <span>Gửi</span>
              <span className="material-symbols-outlined text-[18px]">send</span>
            </button>
          </form>
        </div>
      </div>
    </MainLayout>
  );
}
