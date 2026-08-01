import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as chatApi from '../api/chat';
import { connectSocket } from '../api/socket';
import { useAuth } from './AuthContext';

// ====== Context الشات - قائمة رسائل واحدة موحّدة (شات عام + خاص مع بعض)
// مرتبة زمنيًا، بدل تبويبات منفصلة. كل رسالة عندها channel ('global' أو
// 'private') وبتتعرض في نفس القائمة بس بلون/badge مختلف لو خاصة. الرسائل
// الخاصة بين طرفين بس - أي طرف تالت (حتى لو فاتح الشات في نفس اللحظة)
// مش هيشوفها خالص، لا في الـ state ولا في أي بث سوكيت (الباك إند بيبعتها
// بس لغرفة المرسِل وغرفة المستقبِل - راجع chat.controller.js::postPrivateMessage).
//
// كمان بيمسك حالة الحضور (Presence): مين أونلاين دلوقتي فعليًا (متصل
// بويب سوكيت)، عشان نمنع بدء محادثة خاصة مع حد أوفلاين من الفرونت إند
// (والباك إند بيرفضها برضه لو حصلت محاولة - الفرونت هنا بس بيمنع المحاولة
// من الأساس ويوضّح السبب فورًا). ======

const ChatContext = createContext(null);

export function ChatProvider({ children }) {
  const { user } = useAuth();

  const [isOpen, setIsOpen] = useState(false);

  // ====== قائمة موحّدة لكل الرسائل (عامة + خاصة بتاعتي) مرتبة بالأحدث
  // (created_at تصاعديًا، زي أي شات عادي من فوق لتحت). ======
  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState([]);

  // ====== عدّاد غير مقروء - مفتاح 'global' أو other_user_id، بيتصفّر لما
  // اللاعب يشوف الرسالة فعليًا (النافذة مفتوحة). ما بقاش فيه "تبويب نشط"
  // منفصل زي الأول - طول ما النافذة مفتوحة، كل حاجة بتتحسب "مقروءة". ======
  const [unreadByThread, setUnreadByThread] = useState({});

  // ====== مين أونلاين دلوقتي - Set من user_id (string) - بيتحدّث من غير
  // ما نحتاج polling، من أحداث chat:online_snapshot/user_online/user_offline. ======
  const [onlineUserIds, setOnlineUserIds] = useState(() => new Set());

  const isOpenRef = useRef(isOpen);
  isOpenRef.current = isOpen;

  const totalUnread = Object.values(unreadByThread).reduce((sum, n) => sum + n, 0);

  const isUserOnline = useCallback((userId) => onlineUserIds.has(String(userId)), [onlineUserIds]);

  const markThreadRead = useCallback((threadKey) => {
    setUnreadByThread((prev) => {
      if (!prev[threadKey]) return prev;
      const next = { ...prev };
      delete next[threadKey];
      return next;
    });
  }, []);

  // ====== لما النافذة تتفتح، كل حاجة اتشافت تتحسب مقروءة فورًا (مفيش
  // تبويبات نتنقل بينها بقى - القائمة كلها ظاهرة مع بعض). ======
  const markAllRead = useCallback(() => {
    setUnreadByThread({});
  }, []);

  const loadInitialMessages = useCallback(async () => {
    const [globalMessages, conversationList] = await Promise.all([
      chatApi.getGlobalMessages(),
      chatApi.getConversations().catch(() => []),
    ]);

    setConversations(conversationList);

    // ====== بنجيب تاريخ آخر محادثة خاصة لكل "طرف تاني" ظاهر في قائمة
    // conversations (عشان القائمة الموحّدة تبقى فيها كل الخاص اللي حصل قبل
    // كده، مش بس اللي هيوصل لايف من دلوقتي). ======
    const privateHistories = await Promise.all(
      conversationList.map((c) =>
        chatApi.getPrivateMessages(c.other_user_id).catch(() => null)
      )
    );

    const privateMessages = privateHistories
      .filter(Boolean)
      .flatMap((h) => h.messages.map((m) => ({ ...m, channel: 'private' })));

    const merged = [...globalMessages.map((m) => ({ ...m, channel: 'global' })), ...privateMessages];
    merged.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    setMessages(merged);
  }, []);

  const sendGlobal = useCallback(async (body) => {
    const message = await chatApi.sendGlobalMessage(body);
    setMessages((prev) => {
      if (prev.some((m) => m._id === message._id)) return prev;
      return [...prev, { ...message, channel: 'global' }];
    });
    return message;
  }, []);

  const sendPrivate = useCallback(async (otherUserId, body) => {
    // ====== مش بنبعت الطلب أصلًا لو الطرف التاني أوفلاين - نفس القاعدة
    // اللي الباك إند بيفرضها (chat.service.js::sendPrivateMessage)، بس هنا
    // بنمنعها بدري في الواجهة عشان اللاعب ياخد رد فعل فوري من غير استنى
    // round-trip للسيرفر. ======
    if (!isUserOnline(otherUserId)) {
      const err = new Error('اللاعب ده أوفلاين دلوقتي - متقدرش تبعتله رسالة خاصة');
      err.offline = true;
      throw err;
    }

    const message = await chatApi.sendPrivateMessage(otherUserId, body);
    setMessages((prev) => {
      if (prev.some((m) => m._id === message._id)) return prev;
      return [...prev, { ...message, channel: 'private' }];
    });
    chatApi.getConversations().then(setConversations).catch(() => {});
    return message;
  }, [isUserOnline]);

  // ====== أول ما اللاعب يسجّل دخول: نجيب كل الرسائل (عام + خاص) دفعة واحدة
  // عشان القائمة الموحّدة تكون جاهزة من غير ما نحتاج نفتح النافذة الأول. ======
  useEffect(() => {
    if (!user) {
      setMessages([]);
      setConversations([]);
      setUnreadByThread({});
      setOnlineUserIds(new Set());
      return;
    }
    loadInitialMessages().catch(() => {});
    chatApi.getOnlineUsers().then((ids) => setOnlineUserIds(new Set(ids.map(String)))).catch(() => {});
  }, [user, loadInitialMessages]);

  // ====== اتصال الويب سوكيت - استقبال رسائل الشات (عام/خاص) وأحداث الحضور
  // لحظيًا. ======
  useEffect(() => {
    if (!user) return undefined;

    const token = localStorage.getItem('majd_token');
    const socket = connectSocket(token);
    if (!socket) return undefined;

    const appendMessage = (message, channel, threadKey) => {
      setMessages((prev) => {
        if (prev.some((m) => m._id === message._id)) return prev;
        return [...prev, { ...message, channel }];
      });

      const isSenderMe = String(message.sender_id) === String(user._id);
      if (!isOpenRef.current && !isSenderMe) {
        setUnreadByThread((prev) => ({ ...prev, [threadKey]: (prev[threadKey] || 0) + 1 }));
      }
    };

    const handleGlobalMessage = (message) => {
      appendMessage(message, 'global', 'global');
    };

    const handlePrivateMessage = (message) => {
      const otherUserId =
        String(message.sender_id) === String(user._id) ? String(message.recipient_id) : String(message.sender_id);
      appendMessage(message, 'private', otherUserId);
      chatApi.getConversations().then(setConversations).catch(() => {});
    };

    const handleOnlineSnapshot = ({ user_ids } = {}) => {
      setOnlineUserIds(new Set((user_ids || []).map(String)));
    };

    const handleUserOnline = ({ user_id } = {}) => {
      if (!user_id) return;
      setOnlineUserIds((prev) => new Set(prev).add(String(user_id)));
    };

    const handleUserOffline = ({ user_id } = {}) => {
      if (!user_id) return;
      setOnlineUserIds((prev) => {
        const next = new Set(prev);
        next.delete(String(user_id));
        return next;
      });
    };

    socket.on('chat:global_message', handleGlobalMessage);
    socket.on('chat:private_message', handlePrivateMessage);
    socket.on('chat:online_snapshot', handleOnlineSnapshot);
    socket.on('chat:user_online', handleUserOnline);
    socket.on('chat:user_offline', handleUserOffline);

    return () => {
      socket.off('chat:global_message', handleGlobalMessage);
      socket.off('chat:private_message', handlePrivateMessage);
      socket.off('chat:online_snapshot', handleOnlineSnapshot);
      socket.off('chat:user_online', handleUserOnline);
      socket.off('chat:user_offline', handleUserOffline);
    };
  }, [user]);

  const value = useMemo(
    () => ({
      isOpen,
      setIsOpen,
      totalUnread,
      unreadByThread,
      messages,
      conversations,
      isUserOnline,
      markAllRead,
      markThreadRead,
      sendGlobal,
      sendPrivate,
    }),
    [isOpen, totalUnread, unreadByThread, messages, conversations, isUserOnline, markAllRead, markThreadRead, sendGlobal, sendPrivate]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat لازم يُستخدم داخل ChatProvider');
  return ctx;
}
