import { useState } from 'react';
import {
  Coins,
  TreePine,
  Mountain,
  Users,
  Gem,
  Plus,
  Minus,
  Maximize,
  LocateFixed,
  Home,
  Castle,
  Hammer,
  Trophy,
  Globe2,
  Menu,
  ShieldPlus,
  Flag,
  Search,
  IdCard,
  Mail,
  ScrollText,
  ShoppingBag,
  Gift,
} from 'lucide-react';

function Pill({ icon: Icon, iconColor, value, sub }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-stone-950/80 px-3 py-1.5 shadow-lg backdrop-blur-sm">
      <Icon size={16} style={{ color: iconColor }} />
      <span className="font-mono text-sm font-bold text-white">{value}</span>
      {sub}
    </div>
  );
}

function SideButton({ icon: Icon, label, badge, active, onClick, disabled = false }) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`relative flex w-16 flex-col items-center gap-1 rounded-xl border px-1.5 py-2 shadow-lg backdrop-blur-sm transition-colors ${
        disabled
          ? 'cursor-not-allowed border-white/5 bg-stone-950/50 text-white/25'
          : active
            ? 'border-amber-400/60 bg-stone-900/90 text-amber-300'
            : 'border-white/10 bg-stone-950/80 text-white/85 hover:bg-stone-900/90'
      }`}
    >
      {badge ? (
        <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white">
          {badge}
        </span>
      ) : null}
      <Icon size={20} />
      <span className="text-[10px] font-semibold">{label}</span>
    </button>
  );
}

function IconButton({ icon: Icon, label, onClick, badge, active }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`relative flex h-10 w-10 items-center justify-center rounded-xl border shadow-lg backdrop-blur-sm transition-colors ${
        active
          ? 'border-amber-400/60 bg-stone-900/90 text-amber-300'
          : 'border-white/10 bg-stone-950/80 text-white/85 hover:bg-stone-900/90'
      }`}
    >
      {badge ? (
        <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white">
          {badge}
        </span>
      ) : null}
      <Icon size={18} />
    </button>
  );
}

export default function WorldHUD({
  resources,
  playerName,
  rank,
  onZoomIn,
  onZoomOut,
  onRecenter,
  onReturnToMyCastle,
  onFullscreen,
  activePanel,
  onSelectPanel,
  visiting = false,
  onOpenSearch,
  onOpenCastleInfo,
  onOpenReports,
  onOpenWallet,
  unreadMailCount = 0,
  onOpenRewards,
  giftBadgeCount = 0,
}) {
  // ====== زرار "القائمة" (فوق وتحت) بيعمل toggle لإخفاء/إظهار الشريط
  // الجانبي (معلوماتي/المدينة/بناء/دفاع/الترتيب/المهام/التحالف) - مفيد
  // خصوصًا على الشاشات الضيقة لما القوائم تحجب جزء من مشهد اللعبة. باقي
  // العناصر (الموارد، أدوات الكاميرا، زرار "العالم") بتفضل ظاهرة دايمًا. ======
  const [menuVisible, setMenuVisible] = useState(true);

  return (
    <div className="pointer-events-none absolute inset-0 z-10 font-sans">
      {/* ====== الشريط العلوي: اللاعب + الموارد + الجواهر ====== */}
      <div className="pointer-events-auto absolute inset-x-0 top-0 flex items-center gap-2 p-3 sm:p-4">
        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-stone-950/80 py-1.5 pl-1.5 pr-3 shadow-lg backdrop-blur-sm">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-amber-600 text-sm font-black text-stone-900">
            {playerName?.[0]?.toUpperCase() || 'P'}
          </div>
          <div className="leading-tight">
            <p className="text-xs font-bold text-white">{playerName}</p>
            <p className="flex items-center gap-1 text-[11px] text-amber-300">
              <Trophy size={11} /> {rank ? `#${rank.toLocaleString('en-US')}` : '—'}
            </p>
          </div>
        </div>

        <div className="hidden flex-1 items-center justify-center gap-2 sm:flex">
          <Pill icon={Coins} iconColor="#f5c542" value={resources.gold} />
          <Pill icon={TreePine} iconColor="#7bc86c" value={resources.wood} />
          <Pill icon={Mountain} iconColor="#b7bcc2" value={resources.stone} />
          <Pill icon={Users} iconColor="#9fb3c8" value={resources.population} />
        </div>

        <div className="ms-auto flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-stone-950/80 py-1.5 pl-2.5 pr-1.5 shadow-lg backdrop-blur-sm">
            <Gem size={16} className="text-sky-400" />
            <span className="font-mono text-sm font-bold text-white">{resources.gems}</span>
            <button
              type="button"
              onClick={onOpenWallet}
              aria-label="اشترِ جواهر"
              className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500 text-white hover:bg-emerald-400"
            >
              <Plus size={14} />
            </button>
          </div>
          <IconButton
            icon={Menu}
            label="القائمة"
            active={menuVisible}
            onClick={() => setMenuVisible((v) => !v)}
          />
        </div>
      </div>

      {/* نسخة الموارد المصغّرة للموبايل تحت الشريط العلوي */}
      <div className="pointer-events-auto absolute inset-x-3 top-16 flex items-center justify-center gap-1.5 sm:hidden">
        <Pill icon={Coins} iconColor="#f5c542" value={resources.gold} />
        <Pill icon={TreePine} iconColor="#7bc86c" value={resources.wood} />
        <Pill icon={Mountain} iconColor="#b7bcc2" value={resources.stone} />
      </div>

      {/* ====== الشريط الجانبي الشمال: أزرار التنقل الرئيسية - بيختفي/يظهر
          بزرار "القائمة" (فوق أو تحت) ====== */}
      {menuVisible && (
        <div className="pointer-events-auto absolute left-3 top-1/2 flex -translate-y-1/2 flex-col gap-2 sm:left-4">
          <SideButton icon={IdCard} label="معلوماتي" onClick={onOpenCastleInfo} />
          <SideButton icon={Castle} label="المدينة" badge={visiting ? null : 1} active={activePanel === 'city'} onClick={() => onSelectPanel('city')} disabled={visiting} />
          <SideButton icon={Hammer} label="بناء" active={activePanel === 'build'} onClick={() => onSelectPanel('build')} disabled={visiting} />
          <SideButton icon={ShieldPlus} label="دفاع" active={activePanel === 'defense'} onClick={() => onSelectPanel('defense')} disabled={visiting} />
          <SideButton icon={Trophy} label="الترتيب" active={activePanel === 'ranking'} onClick={() => onSelectPanel('ranking')} disabled={visiting} />
          <SideButton icon={ScrollText} label="المهام" active={activePanel === 'quests'} onClick={() => onSelectPanel('quests')} disabled={visiting} />
          <SideButton icon={ShoppingBag} label="المتجر" active={activePanel === 'shop'} onClick={() => onSelectPanel('shop')} disabled={visiting} />
          <SideButton icon={Flag} label="التحالف" active={activePanel === 'alliance'} onClick={() => onSelectPanel('alliance')} disabled={visiting} />
        </div>
      )}

      {/* ====== الشريط الجانبي اليمين: أدوات الكاميرا ====== */}
      <div className="pointer-events-auto absolute right-3 top-1/2 flex -translate-y-1/2 flex-col gap-2 sm:right-4">
        {/* ====== أيقونة "الهدايا" - المكافأة اليومية/هدية الساعة بتفتح
            تلقائيًا كبوب أب لما تبقى متاحة (شوف useRewardPopups.js). لو
            اللاعب قفل البوب أب من غير استلام، البادج هنا بتفضل ظاهرة لحد
            ما يستلم فعليًا، وضغطه على الأيقونة دي بيعيد فتح أي بوب أب
            متاح حاليًا يدويًا. ====== */}
        {onOpenRewards && (
          <IconButton
            icon={Gift}
            label="الهدايا"
            onClick={onOpenRewards}
            badge={giftBadgeCount > 0 ? giftBadgeCount : null}
          />
        )}
        <IconButton
          icon={Mail}
          label="الرسائل وتقارير المعارك"
          onClick={onOpenReports}
          badge={unreadMailCount > 0 ? (unreadMailCount > 9 ? '9+' : unreadMailCount) : null}
        />
        <IconButton icon={Search} label="بحث العالم" onClick={onOpenSearch} />
        <IconButton icon={Maximize} label="ملء الشاشة" onClick={onFullscreen} />
        <IconButton icon={Plus} label="تكبير" onClick={onZoomIn} />
        <IconButton icon={Minus} label="تصغير" onClick={onZoomOut} />
        <IconButton icon={LocateFixed} label="توسيط الكاميرا" onClick={onRecenter} />
        <IconButton icon={Home} label="ارجع لقلعتي" onClick={onReturnToMyCastle} />
      </div>

      {/* ====== الشريط السفلي ====== */}
      <div className="pointer-events-auto absolute inset-x-0 bottom-0 flex items-center justify-between p-3 sm:p-4">
        <SideButton icon={Globe2} label="العالم" active={activePanel === 'world'} onClick={() => onSelectPanel('world')} disabled={visiting} />
        <SideButton
          icon={Menu}
          label="القائمة"
          active={menuVisible}
          onClick={() => setMenuVisible((v) => !v)}
        />
      </div>
    </div>
  );
}
