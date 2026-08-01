import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { getMyWallet } from '../api/wallet';
import { useAuth } from './AuthContext';

// Context بسيط بيمسك آخر رصيد معروف للمحفظة عشان أكتر من كومبوننت (Navbar،
// صفحة المحفظة، لوحة الألعاب) يشوفوا نفس الرقم لحظياً وبيقدروا يعرفوا "الفرق"
// (delta) اللي حصل عشان نعمل عليه أنيميشن +Coins. لسه بننادي نفس
// GET /wallet/me الموجود بالفعل - مفيش أي endpoint جديد ولا منطق أعمال جديد.

const WalletBalanceContext = createContext(null);

export function WalletBalanceProvider({ children }) {
  const { user } = useAuth();
  const [balance, setBalance] = useState(null);
  const [lastDelta, setLastDelta] = useState(0);
  const prevRef = useRef(null);

  const refresh = useCallback(async () => {
    if (!user) return null;
    try {
      const w = await getMyWallet();
      setBalance((current) => {
        if (prevRef.current !== null && w.balance > prevRef.current) {
          setLastDelta(w.balance - prevRef.current);
        }
        prevRef.current = w.balance;
        return w.balance;
      });
      return w;
    } catch {
      return null;
    }
  }, [user]);

  useEffect(() => {
    if (user) refresh();
    else {
      setBalance(null);
      prevRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return (
    <WalletBalanceContext.Provider value={{ balance, lastDelta, refresh }}>
      {children}
    </WalletBalanceContext.Provider>
  );
}

export function useWalletBalance() {
  const ctx = useContext(WalletBalanceContext);
  if (!ctx) return { balance: null, lastDelta: 0, refresh: async () => {} };
  return ctx;
}
