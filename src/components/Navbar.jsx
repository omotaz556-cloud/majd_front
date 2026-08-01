import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Volume2, VolumeX, Menu, X, Sun, Moon, Mail, Settings } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useInbox } from '../context/InboxContext';
import { useTheme } from '../context/ThemeContext';
import { useSound } from './ui/SoundProvider';
import AccountSettingsModal from './AccountSettingsModal';

const navLinkClass = ({ isActive }) =>
  `relative px-3 py-2 text-sm font-body transition-colors after:absolute after:inset-x-3 after:-bottom-[1px] after:h-[2px] after:rounded-full after:transition-all ${
    isActive
      ? 'text-bone after:bg-gold'
      : 'text-bone/55 after:bg-transparent hover:text-bone hover:after:bg-bone/25'
  }`;

const mobileNavLinkClass = ({ isActive }) =>
  `rounded-lg px-3 py-2.5 text-sm font-body transition-colors ${
    isActive ? 'bg-gold/10 text-gold' : 'text-bone/70 hover:bg-ink-700 hover:text-bone'
  }`;

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { unreadCount } = useInbox();
  const { enabled, toggle, sounds } = useSound();
  const { isDark, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountSettingsOpen, setAccountSettingsOpen] = useState(false);

  return (
    <header className="marquee-lights marquee-lights-bottom sticky top-0 z-20 border-b border-ink-600/80 bg-ink-950/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5">
        <Link
          to="/"
          className="flex items-center gap-2 font-display text-xl font-extrabold tracking-tight text-bone"
          onClick={() => sounds.click?.()}
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-gold text-sm font-black text-ink-950 shadow-glow-gold">
            م
          </span>
          مجد
        </Link>

        {user && (
          <nav className="hidden gap-1 md:flex">
            <NavLink to="/games" className={navLinkClass} onClick={() => sounds.click?.()}>
              الألعاب
            </NavLink>
            {/* ====== خريطة العالم بقت متاحة من صفحة "الألعاب" (/games) بدل
                ما يكون ليها رابط مباشر في البار - شوف GamesPage.jsx.
                التحالف/سجل المعارك/المستشفى/الإصلاح/المتجر لسه بانلات جوّه
                مشهد اللعبة نفسه (خريطة العالم) بدل صفحات مستقلة هنا - شوف
                WorldHUD وAlliancePanel وCastleInfoModal وShopPanel في
                WorldMapPage. ====== */}
            {user.role === 'admin' && (
              <NavLink to="/admin" className={navLinkClass} onClick={() => sounds.click?.()}>
                لوحة التحكم
              </NavLink>
            )}
          </nav>
        )}

        {!user && (
          <nav className="hidden gap-1 md:flex">
            <NavLink to="/" end className={navLinkClass}>
              الرئيسية
            </NavLink>
          </nav>
        )}

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              sounds.click?.();
              toggleTheme();
            }}
            aria-label={isDark ? 'الوضع الفاتح' : 'الوضع الغامق'}
            title={isDark ? 'الوضع الفاتح' : 'الوضع الغامق'}
            className="focus-ring rounded-lg p-1.5 text-bone/60 transition-colors hover:text-gold"
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {user ? (
            <>
              <button
                onClick={toggle}
                aria-label={enabled ? 'كتم الأصوات' : 'تفعيل الأصوات'}
                className="focus-ring hidden rounded-lg p-1.5 text-bone/50 hover:text-bone sm:inline-flex"
                title={enabled ? 'كتم الأصوات' : 'تفعيل الأصوات'}
              >
                {enabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
              </button>

              <button
                onClick={() => {
                  sounds.click?.();
                  setAccountSettingsOpen(true);
                }}
                aria-label="تغيير كلمه المرور"
                title="تغيير كلمه المرور"
                className="focus-ring rounded-lg p-1.5 text-bone/60 transition-colors hover:text-gold"
              >
                <Settings size={16} />
              </button>

              <Link
                to="/inbox"
                aria-label="صندوق الوارد"
                title="صندوق الوارد"
                className="focus-ring relative rounded-lg p-1.5 text-bone/60 transition-colors hover:text-gold"
                onClick={() => sounds.click?.()}
              >
                <Mail size={17} />
                {unreadCount > 0 && (
                  <span className="absolute -left-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-alert px-1 text-[10px] font-bold text-bone">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>

              {/* ====== زرار رصيد الكوينز وصفحة المحفظة القديمة (WalletPage +
                  RewardedAdButton) اتشالوا بالكامل من الواجهة - مفيش راوت
                  /wallet ولا رابط ليه من الـ Navbar دلوقتي. الإعلانات
                  المكافئة بقت جزء من جيمبلاي القلعة نفسه (شوف BattleOutcomeModal
                  وShopPanel وDailyRewardPopup) بدل زرار مستقل في المحفظة.
                  useCoinFly.registerTarget already no-ops safely when مفيش
                  target مسجّل، فمفيش أي كسر في أنيميشن طيران الكوينز. ====== */}

              <span className="hidden text-sm text-bone/55 lg:inline">{user.name}</span>
              <button
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
                className="focus-ring hidden rounded-lg border border-ink-600 px-3 py-1.5 text-sm text-bone/60 hover:border-alert hover:text-alert sm:block"
              >
                خروج
              </button>

              {/* زرار فتح/قفل منيو الموبايل - بديل الروابط اللي بتختفي تحت شاشة md */}
              <button
                onClick={() => setMenuOpen((o) => !o)}
                aria-label={menuOpen ? 'قفل القائمة' : 'فتح القائمة'}
                aria-expanded={menuOpen}
                className="focus-ring rounded-lg p-1.5 text-bone/80 hover:text-bone md:hidden"
              >
                {menuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="focus-ring btn-outline hidden rounded-lg px-4 py-1.5 text-sm sm:inline-flex"
              >
                تسجيل الدخول
              </Link>
              <Link
                to="/register"
                className="focus-ring btn-gradient-teal rounded-lg px-4 py-1.5 text-sm"
              >
                إنشاء حساب
              </Link>
            </>
          )}
        </div>
      </div>

      {/* قائمة الموبايل: نفس روابط الـ nav العلوي، ظاهرة كـ dropdown تحت الهيدر بدل ما تختفي خالص */}
      {user && menuOpen && (
        <nav className="flex flex-col gap-1 border-t border-ink-600 bg-ink-950/95 px-4 py-3 md:hidden">
          <NavLink
            to="/games"
            className={mobileNavLinkClass}
            onClick={() => {
              sounds.click?.();
              setMenuOpen(false);
            }}
          >
            الألعاب
          </NavLink>
          {/* ====== خريطة العالم بقت متاحة من صفحة "الألعاب" بدل رابط مباشر
              هنا - نفس التعليق الموجود في قائمة الديسكتوب فوق. التحالف/سجل
              المعارك/المستشفى/الإصلاح/المتجر لسه بانلات جوّه مشهد اللعبة. ====== */}
          <NavLink
            to="/inbox"
            className={mobileNavLinkClass}
            onClick={() => {
              sounds.click?.();
              setMenuOpen(false);
            }}
          >
            صندوق الوارد{unreadCount > 0 ? ` (${unreadCount > 9 ? '9+' : unreadCount})` : ''}
          </NavLink>
          <button
            onClick={() => {
              sounds.click?.();
              setAccountSettingsOpen(true);
              setMenuOpen(false);
            }}
            className={`${mobileNavLinkClass({ isActive: false })} text-right`}
          >
           تغيير كلمه المرور
          </button>
          {user.role === 'admin' && (
            <NavLink
              to="/admin"
              className={mobileNavLinkClass}
              onClick={() => {
                sounds.click?.();
                setMenuOpen(false);
              }}
            >
              لوحة التحكم
            </NavLink>
          )}
          <button
            onClick={() => {
              logout();
              navigate('/login');
              setMenuOpen(false);
            }}
            className="mt-1 rounded-lg border border-ink-600 px-3 py-2.5 text-right text-sm text-bone/60 hover:border-alert hover:text-alert"
          >
            خروج
          </button>
        </nav>
      )}

      <AccountSettingsModal
        open={accountSettingsOpen}
        onClose={() => setAccountSettingsOpen(false)}
        authProvider={user?.auth_provider}
      />
    </header>
  );
}