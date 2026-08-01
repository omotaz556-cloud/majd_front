import { createContext, useContext, useEffect, useMemo, useState } from 'react';

// نظام الثيم: بيحفظ اختيار المستخدم (فاتح/غامق) في localStorage، ولو مفيش
// اختيار محفوظ بياخد افتراضي حسب إعدادات النظام. بيحط data-theme على <html>
// عشان كل متغيرات CSS (الألوان، الخلفية...) تتبدل تلقائيًا من غير ما نلمس
// أي كومبوننت تاني في المشروع.
const ThemeContext = createContext(null);
const STORAGE_KEY = 'majd-theme';

function getInitialTheme() {
  if (typeof window === 'undefined') return 'light';
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved === 'dark' || saved === 'light') return saved;
  return 'light';
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      isDark: theme === 'dark',
      setTheme,
      toggleTheme: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')),
    }),
    [theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme لازم يتستخدم جوه ThemeProvider');
  return ctx;
}

export default ThemeContext;
