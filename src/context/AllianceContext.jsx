import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getMyAlliance } from '../api/alliances';
import { useAuth } from './AuthContext';
import { myRoleIn } from '../utils/allianceRoles';

// ====== Context بسيط بيمسك "تحالفي الحالي" ودوري فيه - نفس فلسفة
// InboxContext/WalletBalanceContext: مصدر واحد مشترك بدل ما كل صفحة تحالف
// (الداشبورد، الأعضاء، البريد، الإعلانات، المساعدة، التجمّعات، التعزيزات)
// تعمل نداء getMyAlliance بنفسها. مفيش أي بيانات وهمية هنا - بس تغليف
// api/alliances.js::getMyAlliance + اشتقاق دور المستخدم من alliance.members. ======

const AllianceContext = createContext(null);

export function AllianceProvider({ children }) {
  const { user } = useAuth();
  const [alliance, setAlliance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setAlliance(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getMyAlliance();
      setAlliance(data);
    } catch {
      setError('تعذر تحميل بيانات التحالف');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const myRole = myRoleIn(alliance, user?.id || user?._id);

  return (
    <AllianceContext.Provider value={{ alliance, myRole, loading, error, refresh, setAlliance }}>
      {children}
    </AllianceContext.Provider>
  );
}

export function useAlliance() {
  const ctx = useContext(AllianceContext);
  if (!ctx) throw new Error('useAlliance لازم يُستخدم داخل AllianceProvider');
  return ctx;
}
