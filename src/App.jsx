import { lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { Toaster } from 'sonner';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import AnimatedBackground from './components/ui/AnimatedBackground';
import LiveBattleHud from './components/ui/LiveBattleHud';
import ChatWidget from './components/chat/ChatWidget';
import LandingPage from './pages/LandingPage';
import { useAuth } from './context/AuthContext';
import { useTheme } from './context/ThemeContext';

// كل صفحة بقت بتتحمّل بس وقت ما المستخدم يزورها (code-splitting) بدل ما كل
// صفحات الموقع (بما فيها الألعاب ولوحة الأدمن) تتحمّل مع أول تحميل للموقع.
// ده بيقلل حجم الباندل الأولي بشكل كبير وبيسرّع أول ظهور للموقع.
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const WorldMapPage = lazy(() => import('./pages/WorldMapPage'));
const GamesPage = lazy(() => import('./pages/GamesPage'));
const InboxPage = lazy(() => import('./pages/InboxPage'));
const PaymentCallbackPage = lazy(() => import('./pages/PaymentCallbackPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const WatchBattlePage = lazy(() => import('./pages/WatchBattlePage'));
// ====== Hospital, Repair, Battle History/Report, and every Alliance system
// (dashboard/members/mail/announcements/help/rallies/reinforcements) used to
// be standalone routes/pages here. They're now in-game overlays reached from
// inside WorldMapPage (Castle Info panel, damaged defense structures, the
// WorldHUD mail icon, and AlliancePanel's tabs) - see
// components/worldmap/panels/*, components/alliance/*Tab.jsx, and
// components/worldmap/AlliancePanel.jsx. No routes for them anymore. ======
// ====== Arcade system (multi-game arcade: GamesListPage, RankingPage,
// LeaderboardPage, ChallengesListPage/ChallengeDetailPage, GameShell) has
// been fully removed - the platform is now a single strategy game
// (Battle Plan / castle-engine, see WorldMapPage). No routes for the old
// arcade pages remain. ======

function RouteFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Loader2 className="animate-spin text-gold" size={28} />
    </div>
  );
}

// الجذر "/" بيفرق حسب حالة الدخول: زائر يشوف صفحة الهبوط التسويقية،
// ومستخدم مسجّل دخوله يتحوّل لصفحة الألعاب (/games) بدل ما يدخل خريطة
// العالم على طول.
function HomeRoute() {
  const { user } = useAuth();
  return user ? <Navigate to="/games" replace /> : <LandingPage />;
}

// Wrapper بسيط بيدي كل صفحة انتقال ناعم (fade + slide خفيف) لما الـ route يتغير،
// من غير أي تعديل على منطق الصفحات نفسها.
function PageTransition({ children }) {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export default function App() {
  const { theme } = useTheme();
  const location = useLocation();
  const { user } = useAuth();
  // خريطة العالم (Phase 1) محتاجة الشاشة كلها زي أي لعبة إستراتيجية حقيقية -
  // بنشيل الـ Navbar وخلفية الموقع بس لمسار "/world".
  const isFullScreenGame = location.pathname === '/world';
  return (
    <div className="min-h-screen">
      {!isFullScreenGame && <AnimatedBackground />}
      {createPortal(
        <Toaster
          position="top-center"
          dir="ltr"
          theme={theme}
          richColors
          style={{ zIndex: 2147483647 }}
          toastOptions={{
            style: {
              background: 'rgb(var(--panel-1) / 0.96)',
              border: '1px solid rgba(234,177,60,0.22)',
              color: 'rgb(var(--bone))',
              backdropFilter: 'blur(10px)',
            },
          }}
        />,
        document.body
      )}
      <LiveBattleHud />
      <ChatWidget />
      {!isFullScreenGame && <Navbar />}
      <PageTransition>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/" element={<HomeRoute />} />
            <Route
              path="/world"
              element={
                <ProtectedRoute>
                  <WorldMapPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/games"
              element={
                <ProtectedRoute>
                  <GamesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inbox"
              element={
                <ProtectedRoute>
                  <InboxPage />
                </ProtectedRoute>
              }
            />
            {/* ====== صفحة "متابعة المعركة" العامة - متاحة لأي مستخدم مسجّل
            دخول (مش بس صاحب القلعة أو حليفه) بمعرفة march_id في الرابط. ====== */}
            <Route
              path="/battles/:marchId"
              element={
                <ProtectedRoute>
                  <WatchBattlePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/wallet/deposit/callback"
              element={
                <ProtectedRoute>
                  <PaymentCallbackPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AdminPage />
                </AdminRoute>
              }
            />
          </Routes>
        </Suspense>
      </PageTransition>
    </div>
  );
}