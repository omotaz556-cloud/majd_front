import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Search,
  Loader2,
  MapPin,
  Shield,
  Crown,
  Hash,
  Swords,
  Bookmark,
  BookmarkCheck,
  Navigation,
  Trash2,
} from 'lucide-react';
import { searchWorld } from '../../api/castle';
import { getBookmarks, isCastleBookmarked, toggleCastleBookmark, removeBookmark } from '../../utils/castleBookmarks';
import { formatCompactNumber } from '../../utils/format';
import { toastError } from '../ui/toast';

// ====== بانل "بحث العالم" (World Search) - بيبان لما اللاعب يضغط زرار البحث
// في WorldHUD. تلات أجزاء: (1) تبويب البحث (اسم/رقم لاعب/رقم مملكة مع بعض
// في نفس الصندوق - الباك إند بيفحص الثلاثة تلقائيًا)، (2) فورم "اذهب
// للإحداثيات" (X,Y) مصغّر تحت صندوق البحث مباشرة، و(3) تبويب "المفضّلة"
// (Bookmarks) - قايمة القلاع المحفوظة محليًا (castleBookmarks.js) مع نفس
// أزرار "اذهب للقلعة". onGoToCastle(result) بيتنده بنتيجة فيها map_slot
// عشان الصفحة الأب تحرّك الكاميرا وتقفل البانل - مفيش أي منطق كاميرا هنا. ======
export default function WorldSearchModal({ open, onClose, onGoToCastle, onGoToCoordinates }) {
  const [tab, setTab] = useState('search');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [bookmarks, setBookmarks] = useState([]);
  const [coordX, setCoordX] = useState('');
  const [coordY, setCoordY] = useState('');
  // بنستخدم counter بس عشان نجبر إعادة تقييم isCastleBookmarked في نتائج
  // البحث بعد أي toggle - القايمة نفسها (results) متغيرتش، بس حالة
  // الحفظ بتاعتها اتغيّرت في localStorage.
  const [bookmarkTick, setBookmarkTick] = useState(0);

  useEffect(() => {
    if (!open) return;
    setBookmarks(getBookmarks());
  }, [open, tab, bookmarkTick]);

  useEffect(() => {
    if (!open) {
      // تصفير الحالة وقت القفل عشان أي فتحة جديدة تبدأ نضيفة
      setQuery('');
      setResults([]);
      setSearched(false);
      setTab('search');
      setCoordX('');
      setCoordY('');
    }
  }, [open]);

  function runSearch(e) {
    e?.preventDefault();
    const trimmed = query.trim();
    if (!trimmed || searching) return;
    setSearching(true);
    setSearched(true);
    searchWorld(trimmed)
      .then((data) => setResults(data || []))
      .catch((err) => {
        toastError(err.response?.data?.error || 'تعذر تنفيذ البحث');
        setResults([]);
      })
      .finally(() => setSearching(false));
  }

  function handleToggleBookmark(result) {
    const next = toggleCastleBookmark(result);
    setBookmarkTick((n) => n + 1);
    return next;
  }

  function handleRemoveBookmark(castleId) {
    removeBookmark(castleId);
    setBookmarkTick((n) => n + 1);
  }

  function handleGoToCoordinates(e) {
    e.preventDefault();
    const x = Number(coordX);
    const y = Number(coordY);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    onGoToCoordinates?.(x, y);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="world-search-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="pointer-events-auto fixed inset-0 z-50 flex items-end justify-center bg-stone-950/70 backdrop-blur-sm sm:items-center"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose?.();
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="relative flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-white/10 bg-stone-950/95 shadow-2xl sm:rounded-2xl"
            role="dialog"
            aria-modal="true"
            aria-label="بحث العالم"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div className="flex items-center gap-2 text-white">
                <Search size={16} className="text-amber-300" />
                <h3 className="font-bold">بحث العالم</h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="إغلاق"
                className="rounded-lg bg-white/5 p-1.5 text-white/60 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            {/* ====== تبديل بين البحث والمفضّلة ====== */}
            <div className="flex gap-2 border-b border-white/10 px-3 py-2">
              <TabButton label="بحث" active={tab === 'search'} onClick={() => setTab('search')} />
              <TabButton
                label="المفضّلة"
                badge={bookmarks.length}
                active={tab === 'bookmarks'}
                onClick={() => setTab('bookmarks')}
              />
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              {tab === 'search' && (
                <>
                  {/* ====== صندوق البحث - اسم اللاعب أو رقم اللاعب (Player ID)
                      أو رقم المملكة (Kingdom ID)، الباك إند بيفحص الثلاثة مع
                      بعض تلقائيًا من نفس النص. ====== */}
                  <form onSubmit={runSearch} className="flex gap-2">
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="اسم اللاعب، رقم اللاعب، أو رقم المملكة..."
                      className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-amber-400/50 focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={!query.trim() || searching}
                      className="flex items-center gap-1.5 rounded-lg bg-amber-500/90 px-3 py-2 text-sm font-bold text-stone-900 transition-opacity hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {searching ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
                      بحث
                    </button>
                  </form>

                  {/* ====== "اذهب للإحداثيات" - X,Y مباشرة ====== */}
                  <form onSubmit={handleGoToCoordinates} className="mt-3 flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                    <Navigation size={14} className="shrink-0 text-sky-300" />
                    <span className="shrink-0 text-xs text-white/60">اذهب للإحداثيات</span>
                    <input
                      type="number"
                      value={coordX}
                      onChange={(e) => setCoordX(e.target.value)}
                      placeholder="X"
                      className="w-16 rounded-md border border-white/10 bg-black/20 px-2 py-1 text-center text-xs text-white placeholder:text-white/30 focus:border-sky-400/50 focus:outline-none"
                    />
                    <input
                      type="number"
                      value={coordY}
                      onChange={(e) => setCoordY(e.target.value)}
                      placeholder="Y"
                      className="w-16 rounded-md border border-white/10 bg-black/20 px-2 py-1 text-center text-xs text-white placeholder:text-white/30 focus:border-sky-400/50 focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={coordX === '' || coordY === ''}
                      className="ms-auto rounded-md bg-sky-500/20 px-3 py-1.5 text-xs font-bold text-sky-300 hover:bg-sky-500/30 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      اذهب
                    </button>
                  </form>

                  <div className="mt-3">
                    <SearchResults
                      loading={searching}
                      searched={searched}
                      results={results}
                      onGoToCastle={onGoToCastle}
                      onToggleBookmark={handleToggleBookmark}
                    />
                  </div>
                </>
              )}

              {tab === 'bookmarks' && (
                <BookmarksList bookmarks={bookmarks} onGoToCastle={onGoToCastle} onRemove={handleRemoveBookmark} />
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function TabButton({ label, badge, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex-1 rounded-lg py-2 text-xs font-bold transition-colors ${
        active ? 'bg-amber-500/20 text-amber-300' : 'bg-white/5 text-white/60 hover:text-white'
      }`}
    >
      {label}
      {Boolean(badge) && (
        <span className="ms-1.5 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] text-white">{badge}</span>
      )}
    </button>
  );
}

function SearchResults({ loading, searched, results, onGoToCastle, onToggleBookmark }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 text-white/50">
        <Loader2 className="animate-spin" size={22} />
      </div>
    );
  }

  if (!searched) {
    return (
      <p className="px-2 py-8 text-center text-sm text-white/50">
        دوّر على أي لاعب بالاسم، رقم اللاعب، أو رقم المملكة.
      </p>
    );
  }

  if (results.length === 0) {
    return <p className="px-2 py-8 text-center text-sm text-white/50">مفيش نتايج مطابقة - جرّب اسم أو رقم تاني.</p>;
  }

  return (
    <div className="space-y-2.5">
      {results.map((r) => (
        <ResultCard key={r.castle_id} result={r} onGoToCastle={onGoToCastle} onToggleBookmark={onToggleBookmark} />
      ))}
    </div>
  );
}

function BookmarksList({ bookmarks, onGoToCastle, onRemove }) {
  if (bookmarks.length === 0) {
    return (
      <p className="px-2 py-8 text-center text-sm text-white/50">
        لسه معندكش قلاع مفضّلة - دوّر في تبويب "بحث" واحفظ اللي يهمّك للرجوع ليه بسرعة.
      </p>
    );
  }

  return (
    <div className="space-y-2.5">
      {bookmarks.map((b) => (
        <ResultCard
          key={b.castle_id}
          result={b}
          onGoToCastle={onGoToCastle}
          onToggleBookmark={() => onRemove(b.castle_id)}
          forceBookmarked
        />
      ))}
    </div>
  );
}

// ====== بطاقة نتيجة واحدة (بحث أو مفضّلة) - حالة "محفوظة؟" بتتحسب مباشرة
// من localStorage في كل render (من غير useState محلي) عشان تفضل متزامنة مع
// أي toggle حصل من مكان تاني (تبويب المفضّلة مثلًا) - أي تغيير في
// bookmarkTick بالأب بيعمل re-render هنا فيتحسب من جديد أوتوماتيك. ======
function ResultCard({ result, onGoToCastle, onToggleBookmark, forceBookmarked = false }) {
  const bookmarked = forceBookmarked || isCastleBookmarked(result.castle_id);

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 truncate font-bold text-white">
            <Crown size={13} className="shrink-0 text-amber-300" />
            {result.player_name}
            {result.alliance_tag && (
              <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
                <Shield size={9} /> {result.alliance_tag}
              </span>
            )}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-white/50">
            <span className="flex items-center gap-1">
              <Hash size={10} /> لاعب #{result.player_id ?? '—'}
            </span>
            <span className="flex items-center gap-1">
              <Hash size={10} /> مملكة #{result.kingdom_id ?? '—'}
            </span>
            <span className="flex items-center gap-1">
              <Swords size={10} className="text-red-300" /> {formatCompactNumber(result.power)}
            </span>
            <span className="flex items-center gap-1">
              <MapPin size={10} /> ({result.coordinates.x}, {result.coordinates.y})
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            // bookmarked مش state محلي - بيتحسب مباشرة من localStorage كل
            // render (شوف تعليق الفنكشن فوق)، وonToggleBookmark (اللي بيغيّر
            // bookmarkTick في الأب) هو اللي بيجبر إعادة الحساب ده تلقائيًا -
            // مفيش أي state هنا نحدّثه إحنا بنفسنا.
            onToggleBookmark(result);
          }}
          aria-label={bookmarked ? 'شيل من المفضّلة' : 'أضف للمفضّلة'}
          className={`shrink-0 rounded-lg p-1.5 transition-colors ${
            forceBookmarked
              ? 'text-red-300 hover:bg-red-500/10'
              : bookmarked
                ? 'text-amber-300 hover:bg-amber-500/10'
                : 'text-white/40 hover:bg-white/10 hover:text-white'
          }`}
        >
          {forceBookmarked ? <Trash2 size={16} /> : bookmarked ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
        </button>
      </div>

      <button
        type="button"
        onClick={() => onGoToCastle(result)}
        className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg bg-amber-500/15 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-500/25"
      >
        <Navigation size={13} />
        اذهب للقلعة
      </button>
    </div>
  );
}
