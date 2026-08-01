import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getUnreadCount } from '../api/inbox';
import { useAuth } from './AuthContext';

// Context بسيط بيمسك عدد رسائل صندوق الوارد الغير مقروءة عشان الـ Navbar
// (وأي كومبوننت تاني لاحقًا) يعرض شارة العدد من غير ما كل واحد يعمل الاستعلام
// بتاعه لوحده. بنعمل polling كل 30 ثانية - بسيط وكافي، مفيش حاجة real-time
// حقيقية (زي websockets) مطلوبة هنا.

const POLL_INTERVAL_MS = 30000;

const InboxContext = createContext(null);

export function InboxProvider({ children }) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const count = await getUnreadCount();
      setUnreadCount(count);
    } catch {
      // فشل بسيط في تحديث العداد مش مبرر لكسر أي حاجة تانية في الواجهة
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return undefined;
    }

    refresh();
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [user, refresh]);

  return (
    <InboxContext.Provider value={{ unreadCount, refresh }}>{children}</InboxContext.Provider>
  );
}

export function useInbox() {
  const ctx = useContext(InboxContext);
  if (!ctx) return { unreadCount: 0, refresh: async () => {} };
  return ctx;
}
