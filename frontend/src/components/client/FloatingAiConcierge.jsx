import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  sendChatMessageApi,
  fetchConversationDetailApi,
} from '../../api/aiApi';
import {
  cleanMessage,
  extractErrorCode,
  logSystemEvent,
} from '../../utils/toastSanitizer';
import { useDraggable } from '../../hooks/useDraggable';
import {
  computeExpandedPosition,
  computeCollapsedPosition,
} from '../../utils/draggableUtils';

const QUICK_SUGGESTIONS = [
  'Khách sạn có dịch vụ giặt ủi không?',
  'Hồ bơi vô cực mở cửa mấy giờ?',
  'Xe Limousine đưa đón sân bay giá bao nhiêu?',
  'Quy định giờ nhận và trả phòng?',
  'Tôi cần gặp lễ tân hỗ trợ trực tiếp',
];

const INITIAL_WELCOME_MESSAGE = {
  id: 'welcome-msg',
  senderType: 'AI',
  text: 'Xin chào quý khách! Tôi là Trợ lý AI Concierge của Grand Horizon Luxury Hotel. Tôi có thể hỗ trợ quý khách tra cứu dịch vụ giặt ủi, hồ bơi vô cực, ẩm thực, đưa đón sân bay hoặc kết nối trực tiếp với Lễ tân 24/7 ạ.',
  time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
};

const FloatingAiConcierge = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([INITIAL_WELCOME_MESSAGE]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(() => {
    const saved = sessionStorage.getItem('gh_ai_conversation_id');
    return saved ? Number(saved) : null;
  });
  const [handoverActive, setHandoverActive] = useState(false);
  const [uiNotice, setUiNotice] = useState(null);
  const messagesEndRef = useRef(null);

  const {
    position,
    setPosition,
    targetRef,
    getHandleProps,
    isDragging,
    suppressClickRef,
  } = useDraggable({ margin: 16, dragThreshold: 5 });

  const handleToggleOpen = () => {
    if (isDragging || suppressClickRef.current) return;

    if (!isOpen) {
      if (targetRef.current && typeof window !== 'undefined') {
        const bubbleRect = targetRef.current.getBoundingClientRect();
        const expandedWidth = window.innerWidth >= 640 ? 410 : 370;
        const actualExpandedWidth = Math.min(
          expandedWidth,
          Math.max(280, window.innerWidth - 32)
        );
        const expandedHeight = 540;
        const nextPos = computeExpandedPosition(
          bubbleRect,
          actualExpandedWidth,
          expandedHeight,
          window.innerWidth,
          window.innerHeight,
          16
        );
        setPosition(nextPos);
      }
      setIsOpen(true);
    } else {
      if (targetRef.current && typeof window !== 'undefined') {
        const windowRect = targetRef.current.getBoundingClientRect();
        const bubbleWidth = 230;
        const bubbleHeight = 56;
        const nextPos = computeCollapsedPosition(
          windowRect,
          bubbleWidth,
          bubbleHeight,
          window.innerWidth,
          window.innerHeight,
          16
        );
        setPosition(nextPos);
      }
      setIsOpen(false);
    }
  };

  const showSanitizedNotice = (rawErrOrMsg, type = 'error') => {
    const code = extractErrorCode(rawErrOrMsg);
    const cleaned =
      cleanMessage(rawErrOrMsg) ||
      (type === 'error'
        ? 'Không thể gửi tin nhắn lúc này, vui lòng thử lại.'
        : 'Thao tác thành công.');
    logSystemEvent({
      code,
      message: cleaned,
      rawMessage: rawErrOrMsg?.message || String(rawErrOrMsg || ''),
      type,
      context: 'FloatingAiConcierge',
    });
    setUiNotice({ text: cleaned, type });
    setTimeout(() => setUiNotice(null), 4000);
  };

  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, loading]);

  // Đồng bộ lịch sử tin nhắn thực tế từ Server (bao gồm tin nhắn của Lễ tân khi test trên cùng 1 tài khoản/trình duyệt)
  const syncConversationFromServer = useCallback(
    async (targetConvId = null) => {
      const activeId = targetConvId || conversationId;
      if (!activeId) return;
      try {
        const res = await fetchConversationDetailApi(activeId);
        const detail = res?.data;
        if (!detail) return;

        setHandoverActive(detail.status === 'HandedOver');

        if (Array.isArray(detail.messages) && detail.messages.length > 0) {
          const mapped = detail.messages.map((m, idx) => ({
            id: m.messageId ? `srv-${m.messageId}` : `srv-idx-${idx}`,
            senderType: m.senderType || 'AI',
            text: cleanMessage(m.messageText) || m.messageText,
            time: m.messageTime
              ? new Date(m.messageTime).toLocaleTimeString('vi-VN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : new Date().toLocaleTimeString('vi-VN', {
                  hour: '2-digit',
                  minute: '2-digit',
                }),
          }));
          setMessages([INITIAL_WELCOME_MESSAGE, ...mapped]);
        }
      } catch (_) {
        // Bỏ qua lỗi ngầm định khi polling
      }
    },
    [conversationId]
  );

  useEffect(() => {
    const handleStaffReplied = (event) => {
      const targetId = event?.detail?.conversationId || conversationId;
      if (targetId && (!conversationId || Number(targetId) === Number(conversationId))) {
        if (!conversationId) {
          setConversationId(Number(targetId));
          sessionStorage.setItem('gh_ai_conversation_id', String(targetId));
        }
        syncConversationFromServer(targetId);
      }
    };

    window.addEventListener('gh-ai-staff-replied', handleStaffReplied);

    let pollTimer = null;
    if (isOpen && conversationId) {
      syncConversationFromServer(conversationId);
      pollTimer = setInterval(() => {
        syncConversationFromServer(conversationId);
      }, 4000);
    }

    return () => {
      window.removeEventListener('gh-ai-staff-replied', handleStaffReplied);
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [isOpen, conversationId, syncConversationFromServer]);

  const handleSendMessage = async (customText = null) => {
    const rawMsg = customText !== null ? customText : inputText;
    const trimmed = String(rawMsg || '').trim();

    if (!trimmed) {
      showSanitizedNotice('Vui lòng nhập nội dung câu hỏi trước khi gửi.', 'warning');
      return;
    }

    if (trimmed.length > 1000) {
      showSanitizedNotice('Tin nhắn không được vượt quá 1000 ký tự.', 'warning');
      return;
    }

    const userMsg = {
      id: `guest-${Date.now()}`,
      senderType: 'Guest',
      text: trimmed,
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (customText === null) {
      setInputText('');
    }
    setLoading(true);

    try {
      const response = await sendChatMessageApi({
        message: trimmed,
        conversationId,
      });

      const payload = response?.data || {};
      if (payload.conversationId) {
        setConversationId(payload.conversationId);
        sessionStorage.setItem('gh_ai_conversation_id', String(payload.conversationId));
        window.dispatchEvent(
          new CustomEvent('gh-ai-chat-updated', {
            detail: { conversationId: payload.conversationId },
          })
        );
      }

      if (payload.handoverRequired || payload.suggestedEscalation || payload.status === 'HandedOver') {
        setHandoverActive(true);
      } else if (payload.status === 'Open') {
        setHandoverActive(false);
      }

      const replyText =
        payload.reply ||
        payload.message ||
        'Dạ yêu cầu của quý khách đã được ghi nhận. Bộ phận Concierge sẵn sàng phục vụ quý khách.';

      const aiMsg = {
        id: `ai-${Date.now()}`,
        senderType: payload.handoverRequired ? 'System' : 'AI',
        text: cleanMessage(replyText) || replyText,
        score: payload.relevanceScore,
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (error) {
      showSanitizedNotice(error, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResetConversation = () => {
    sessionStorage.removeItem('gh_ai_conversation_id');
    setConversationId(null);
    setHandoverActive(false);
    setMessages([INITIAL_WELCOME_MESSAGE]);
    showSanitizedNotice('Đã làm mới phiên trò chuyện cùng AI Concierge.', 'info');
  };

  return (
    <div
      ref={targetRef}
      style={
        position
          ? {
              position: 'fixed',
              left: `${position.x}px`,
              top: `${position.y}px`,
              right: 'auto',
              bottom: 'auto',
            }
          : undefined
      }
      className={
        position
          ? 'fixed z-50 font-sans'
          : 'fixed bottom-6 right-6 z-50 font-sans'
      }
    >
      {/* Khung cửa sổ Chat */}
      {isOpen && (
        <div className="mb-4 w-[370px] sm:w-[410px] max-w-[calc(100vw-32px)] max-h-[calc(100vh-32px)] bg-white rounded-2xl shadow-2xl border border-[#e6e0d4] overflow-hidden flex flex-col transition-shadow duration-200">
          {/* Header sang trọng (Drag handle khi mở) */}
          <div
            {...getHandleProps({
              isInteractiveChild: (e) =>
                Boolean(
                  e.target &&
                    e.target.closest &&
                    e.target.closest('button, input, textarea, a, select, [data-no-drag]')
                ),
            })}
            className="bg-[#1c1917] text-white px-5 py-4 flex items-center justify-between border-b border-[#b9a277]/30 cursor-grab active:cursor-grabbing select-none"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#b9a277]/20 border border-[#b9a277] flex items-center justify-center text-[#b9a277]">
                <span className="material-symbols-outlined text-xl">smart_toy</span>
              </div>
              <div>
                <h3 className="text-sm font-semibold tracking-wide text-white flex items-center gap-2">
                  AI Concierge 24/7
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </h3>
                <p className="text-xs text-[#d6cec2]">
                  {handoverActive
                    ? 'Đang kết nối Lễ tân trực tiếp'
                    : 'Trợ lý thông minh Grand Horizon'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1" data-no-drag>
              <button
                type="button"
                onClick={handleResetConversation}
                title="Làm mới hội thoại"
                className="p-1.5 rounded-lg text-stone-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">refresh</span>
              </button>
              <button
                type="button"
                onClick={handleToggleOpen}
                title="Thu gọn"
                className="p-1.5 rounded-lg text-stone-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>
          </div>

          {/* Thanh trạng thái chuyển tiếp Lễ tân nếu đang Handover */}
          {handoverActive && (
            <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between text-xs text-amber-900">
              <span className="font-medium">
                Phiên hội thoại đã chuyển tới bộ phận Lễ tân hỗ trợ.
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-200/70 text-amber-900 font-semibold">
                Ưu tiên
              </span>
            </div>
          )}

          {/* Thông báo Sanitized Toast nội cục */}
          {uiNotice && (
            <div
              className={`px-4 py-2 text-xs font-medium border-b ${
                uiNotice.type === 'error'
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : uiNotice.type === 'warning'
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
              }`}
            >
              {uiNotice.text}
            </div>
          )}

          {/* Danh sách tin nhắn */}
          <div className="h-[340px] overflow-y-auto p-4 space-y-3 bg-[#fafaf8]">
            {messages.map((msg) => {
              const isGuest = msg.senderType === 'Guest';
              const isSystem = msg.senderType === 'System';
              const isStaff = msg.senderType === 'Staff';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    isGuest ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
                      isGuest
                        ? 'bg-[#1c1917] text-white rounded-br-xs'
                        : isStaff
                        ? 'bg-amber-700 text-white rounded-bl-xs'
                        : isSystem
                        ? 'bg-amber-50 text-amber-950 border border-amber-300 rounded-bl-xs'
                        : 'bg-white text-stone-800 border border-[#e6e0d4] rounded-bl-xs'
                    }`}
                  >
                    {!isGuest && (
                      <div
                        className={`text-[11px] font-semibold mb-1 flex items-center justify-between gap-2 ${
                          isStaff ? 'text-amber-100' : 'text-[#9a8052]'
                        }`}
                      >
                        <span>
                          {isStaff
                            ? 'Chuyên viên Lễ tân'
                            : isSystem
                            ? 'Điều phối Lễ tân'
                            : 'Grand Horizon Concierge'}
                        </span>
                      </div>
                    )}
                    <p className="whitespace-pre-line">{msg.text}</p>
                  </div>
                  <span className="text-[10px] text-stone-400 mt-1 px-1">
                    {msg.time}
                  </span>
                </div>
              );
            })}

            {loading && (
              <div className="flex items-start">
                <div className="bg-white border border-[#e6e0d4] rounded-2xl px-4 py-2.5 text-xs text-stone-500 flex items-center gap-2 shadow-xs">
                  <span className="inline-block w-2 h-2 rounded-full bg-[#b9a277] animate-bounce" />
                  <span>Trợ lý AI đang tra cứu thông tin...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Gợi ý câu hỏi nhanh (Quick Chips) */}
          <div className="px-3 py-2 bg-stone-50 border-t border-stone-200/80 flex gap-1.5 overflow-x-auto no-scrollbar">
            {QUICK_SUGGESTIONS.map((chip, index) => (
              <button
                key={index}
                type="button"
                disabled={loading}
                onClick={() => handleSendMessage(chip)}
                className="shrink-0 text-xs px-3 py-1.5 rounded-full bg-white border border-[#d8cbb5] text-stone-700 hover:bg-[#b9a277] hover:text-white hover:border-[#b9a277] transition"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Ô nhập tin nhắn */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-white border-t border-stone-200 flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Nhập câu hỏi về dịch vụ, tiện ích..."
              maxLength={1050}
              className="flex-1 text-sm px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-hidden focus:border-[#b9a277] text-stone-800"
            />
            <button
              type="submit"
              disabled={loading || !inputText.trim()}
              className="px-4 py-2.5 rounded-xl bg-[#b9a277] hover:bg-[#a38b5f] disabled:opacity-50 text-white text-sm font-medium transition flex items-center gap-1"
            >
              <span>Gửi</span>
            </button>
          </form>
        </div>
      )}

      {/* Nút mở Widget nổi (Drag handle khi thu gọn) */}
      <button
        type="button"
        {...(!isOpen ? getHandleProps() : {})}
        onClick={handleToggleOpen}
        className={`group flex items-center gap-3 bg-[#1c1917] hover:bg-stone-800 text-white px-5 py-3.5 rounded-full shadow-xl border border-[#b9a277]/60 transition-all duration-200 select-none ${
          !isOpen ? 'cursor-grab active:cursor-grabbing' : ''
        }`}
      >
        <span className="w-8 h-8 rounded-full bg-[#b9a277] text-[#1c1917] flex items-center justify-center font-bold text-sm">
          AI
        </span>
        <div className="text-left">
          <div className="text-xs font-semibold tracking-wide text-[#e5d5b5]">
            Trợ Lý AI Concierge
          </div>
          <div className="text-[11px] text-stone-300">
            Hỗ trợ dịch vụ & phòng 24/7
          </div>
        </div>
      </button>
    </div>
  );
};

export default FloatingAiConcierge;
