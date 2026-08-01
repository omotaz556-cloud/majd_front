import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Medal, Crown, Flag, Search, Target, X } from 'lucide-react';
import { getVipRanking, searchVipRanking } from '../../../api/ranking';
import { formatCompactNumber } from '../../../utils/format';
import { useAuth } from '../../../context/AuthContext';
import EmptyState from '../../ui/EmptyState';
import ErrorState from '../../ui/ErrorState';
import { CoinSpinner } from '../../ui/Loaders';
import PanelShell from './PanelShell';

// =============================================================================
// Ranking Panel (in-game) - "🏆 VIP Ranking" - بيتفتح من زرار "الترتيب" جوّه
// WorldHUD (activePanel === 'ranking' في WorldMapPage). لوحة واحدة بس (مفيش
// تابات/فئات تانية) بتعرض أفضل 100 لاعب حسب "القوة الكلية" (Total Power)،
// اللي بتتحسب بالكامل في الباك إند (ranking.service.js) كمجموع قوة القلعة +
// قوة الجيش - القيمتين دول مش بيتعرضوا منفصلين هنا، بس الإجمالي. بيدعم بحث
// بالاسم (على مستوى التصنيف كامله، مش أفضل 100 بس)، وبيعمل refresh تلقائي
// دوري (polling) عشان يتحدّث لوحده لما قوة أي لاعب تتغيّر. بيفضل يورّي مركز
// اللاعب الحالي حتى لو خارج أفضل 100 (شريط ثابت تحت القائمة).
// =============================================================================

const REFRESH_INTERVAL_MS = 15000;

const MEDAL_STYLES = {
  1: { color: 'text-amber-300', bg: 'bg-amber-300/15', ring: 'ring-1 ring-amber-300/40' },
  2: { color: 'text-white/85', bg: 'bg-white/10', ring: 'ring-1 ring-white/25' },
  3: { color: 'text-[#c98a4b]', bg: 'bg-[#c98a4b]/15', ring: 'ring-1 ring-[#c98a4b]/35' },
};

function RankingRow({ row, isMe, index }) {
  const medal = MEDAL_STYLES[row.rank];
  return (
    <motion.li
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.02, 0.3) }}
      className={`flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 transition-colors ${
        isMe
          ? 'border-amber-400/60 bg-amber-400/10 shadow-[0_0_0_1px_rgba(251,191,36,0.15)]'
          : medal
            ? `border-transparent ${medal.bg}`
            : 'border-white/10 bg-white/[0.03]'
      }`}
    >
      <span className="flex min-w-0 items-center gap-3">
        {row.rank === 1 ? (
          <Crown size={16} className="shrink-0 text-amber-300 drop-shadow-[0_0_6px_rgba(252,211,77,.6)]" />
        ) : medal ? (
          <span className={`flex w-8 shrink-0 items-center gap-1 font-mono text-sm font-bold ${medal.color}`}>
            <Medal size={14} />#{row.rank}
          </span>
        ) : (
          <span className="w-8 shrink-0 font-mono text-sm text-white/40">#{row.rank}</span>
        )}
        <span className="min-w-0">
          <span className={`block truncate text-sm ${isMe ? 'font-bold text-amber-300' : 'text-white'}`}>
            {row.player_name} {isMe && <span className="text-xs text-amber-300/70">(أنت)</span>}
          </span>
          <span className="flex items-center gap-1 truncate text-[11px] text-white/40">
            {row.alliance_name ? (
              <>
                <Flag size={10} />
                {row.alliance_name}
              </>
            ) : (
              'بدون تحالف'
            )}
          </span>
        </span>
      </span>
      <span className="shrink-0 font-mono text-sm font-bold text-amber-300">
        {formatCompactNumber(row.total_power)}
      </span>
    </motion.li>
  );
}

function RankingPanelContent() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const pollRef = useRef(null);
  const searchDebounceRef = useRef(null);

  function load({ silent = false } = {}) {
    if (!silent) setLoading(true);
    getVipRanking()
      .then((res) => {
        setData(res);
        setErr(null);
      })
      .catch(() => {
        if (!silent) setErr('تعذر تحميل تصنيف الـ VIP الآن');
      })
      .finally(() => {
        if (!silent) setLoading(false);
      });
  }

  useEffect(() => {
    load();
    // ====== تحديث تلقائي دوري - عشان القائمة تتحدّث لوحدها لما قوة أي
    // لاعب تتغيّر (بناء/تدريب جيش...إلخ) من غير ما اللاعب يحتاج يعمل
    // refresh يدوي. ======
    pollRef.current = setInterval(() => load({ silent: true }), REFRESH_INTERVAL_MS);
    return () => clearInterval(pollRef.current);
  }, []);

  useEffect(() => {
    clearTimeout(searchDebounceRef.current);
    const q = query.trim();
    if (!q) {
      setSearchResults(null);
      setSearching(false);
      return;
    }
    setSearching(true);
    searchDebounceRef.current = setTimeout(() => {
      searchVipRanking(q)
        .then((res) => setSearchResults(res.results))
        .catch(() => setSearchResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(searchDebounceRef.current);
  }, [query]);

  const isSearching = query.trim().length > 0;
  const leaderboard = data?.leaderboard || [];
  const me = data?.me;

  // لو اللاعب الحالي موجود ضمن أفضل 100 أصلاً، مفيش داعي نكرر شريط منفصل
  // تحت القائمة - نكتفي بتظليل صفه في القائمة نفسها.
  const meInTop100 = useMemo(
    () => Boolean(me) && leaderboard.some((r) => r.player_id === me.player_id),
    [me, leaderboard]
  );

  return (
    <div className="p-4">
      {/* ------- عنوان اللوحة الوحيدة (مفيش تابات/فئات تانية) ------- */}
      <div className="mb-4 flex items-center gap-2">
        <Trophy size={18} className="text-amber-300" />
        <h2 className="font-bold text-white">🏆 VIP Ranking</h2>
      </div>

      {/* ------- بحث بالاسم ------- */}
      <div className="mb-4 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
        <Search size={15} className="shrink-0 text-white/40" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث باسم اللاعب..."
          className="w-full bg-transparent text-sm text-white placeholder:text-white/30 focus:outline-none"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="مسح البحث"
            className="shrink-0 text-white/40 hover:text-white"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {err && !isSearching && <ErrorState message={err} onRetry={load} />}

      {loading && !data && <CoinSpinner label="جاري تحميل التصنيف..." />}

      {/* ------- نتائج البحث ------- */}
      {isSearching && (
        <>
          {searching && !searchResults && <CoinSpinner label="جاري البحث..." />}
          {searchResults && searchResults.length === 0 && (
            <EmptyState icon={Search} title="مفيش لاعب بالاسم ده" subtitle="جرّب اسم مختلف أو تأكد من الإملاء" />
          )}
          {searchResults && searchResults.length > 0 && (
            <ol className="flex flex-col gap-1.5">
              {searchResults.map((row, i) => (
                <RankingRow key={row.player_id} row={row} isMe={row.player_id === user?._id} index={i} />
              ))}
            </ol>
          )}
        </>
      )}

      {/* ------- أفضل 100 لاعب ------- */}
      {!isSearching && !loading && data && (
        <>
          <p className="mb-3 text-xs text-white/40">أفضل {leaderboard.length} من {data.total_players} لاعب</p>

          {leaderboard.length === 0 && (
            <EmptyState icon={Trophy} title="لسه محدش ظاهر في التصنيف" subtitle="ابنِ قلعتك ودرّب جيشك عشان تدخل الترتيب" />
          )}

          {leaderboard.length > 0 && (
            <ol className="flex flex-col gap-1.5">
              {leaderboard.map((row, i) => (
                <RankingRow key={row.player_id} row={row} isMe={row.player_id === user?._id} index={i} />
              ))}
            </ol>
          )}

          {/* ------- مركز اللاعب الحالي حتى لو خارج أفضل 100 ------- */}
          {me && !meInTop100 && (
            <div className="mt-4 border-t border-white/10 pt-4">
              <p className="mb-2 flex items-center gap-1.5 text-xs text-white/40">
                <Target size={12} />
                مركزك الحالي
              </p>
              <ol>
                <RankingRow row={me} isMe index={0} />
              </ol>
            </div>
          )}

          {!me && user && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-dashed border-white/15 px-4 py-3 text-sm text-white/40">
              <Target size={14} />
              لسه معندكش قوة كافية تدخل التصنيف - طوّر مدينتك ودرّب جيشك.
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ====== نقطة الدخول - بتتفتح من زرار "الترتيب" في WorldHUD (نفس فلسفة
// HospitalPanel/RepairPanel: بانل جوّه مشهد اللعبة، مش راوت/صفحة مستقلة). ======
export default function RankingPanel({ open, onClose }) {
  return (
    <PanelShell open={open} onClose={onClose} title="🏆 VIP Ranking" icon={Trophy}>
      <RankingPanelContent />
    </PanelShell>
  );
}
