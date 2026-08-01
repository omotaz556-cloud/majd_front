import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Flag, Castle, Tent, Users, Clock, LogIn, LogOut, Ban, ScrollText, Swords, Gift, Percent, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { canManage } from '../../utils/allianceRoles';
import { listMyAllianceRallies, getRallyStatus, joinRally, leaveRally, cancelRally } from '../../api/rally';
import { getMyCastle, getTroopTypes } from '../../api/castle';
import { toastSuccess, toastError } from '../ui/toast';
import EmptyState from '../ui/EmptyState';
import ErrorState from '../ui/ErrorState';
import { SkeletonRow } from '../ui/Loaders';
import { useCountdown, formatCountdown } from '../../utils/useCountdown';
import TroopStackPicker from './TroopStackPicker';
import RallyStatusBadge from './RallyStatusBadge';
import RallyCard from './RallyCard';
import { RESOURCE_META, RESOURCE_ORDER } from '../../utils/resourceMeta';

// ====== تجمّعات التحالف - نفس محتوى AllianceRalliesPage +
// RallyDetailPage القديمين مدموجين هنا (قائمة + تفاصيل جوّه نفس التبويب،
// التنقل بينهم بحالة محلية selectedRallyId بدل راوت /alliance/rallies/:id). ======

const CANCEL_REASON_LABELS = {
  manual: 'اتلغى يدوي بواسطة قائد/ضابط',
  no_participants: 'اتلغى تلقائي - مفيش مشاركين',
  target_missing: 'اتلغى تلقائي - الهدف مبقاش موجود',
  target_now_allied: 'اتلغى تلقائي - الهدف بقى حليف',
};

function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('ar-EG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function AllianceRalliesTab({ alliance, myRole, onViewBattle }) {
  const [rallies, setRallies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [selectedRallyId, setSelectedRallyId] = useState(null);

  function load() {
    if (!alliance) return;
    setLoading(true);
    setErr(null);
    listMyAllianceRallies()
      .then(setRallies)
      .catch(() => setErr('تعذر تحميل تجمّعات التحالف'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alliance?.id]);

  if (selectedRallyId) {
    return (
      <RallyDetail
        rallyId={selectedRallyId}
        alliance={alliance}
        myRole={myRole}
        onBack={() => {
          setSelectedRallyId(null);
          load();
        }}
        onViewBattle={onViewBattle}
      />
    );
  }

  return (
    <div>
      <p className="mb-3 text-xs text-white/50">كل تجمّعات تحالفك - انضم بجيشك قبل ما العد التنازلي يخلص</p>

      {err && <ErrorState message={err} onRetry={load} />}

      {!err && (
        <div className="flex flex-col gap-2.5">
          {loading && Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)}

          {!loading && rallies.length === 0 && (
            <EmptyState icon={Flag} title="مفيش تجمّعات لسه" subtitle="أي تجمّع تبدأه من نافذة الهجوم أو ينشئه قائد/ضابط التحالف هيظهر هنا" />
          )}

          {!loading && rallies.map((r, i) => <RallyCard key={r.id} rally={r} index={i} onSelect={setSelectedRallyId} />)}
        </div>
      )}
    </div>
  );
}

function RallyDetail({ rallyId, alliance, myRole, onBack, onViewBattle }) {
  const { user } = useAuth();
  const myUserId = user?.id || user?._id;

  const [rally, setRally] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const [castle, setCastle] = useState(null);
  const [troopTypes, setTroopTypes] = useState([]);
  const [selected, setSelected] = useState({});
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  function load() {
    setLoading(true);
    setErr(null);
    getRallyStatus(rallyId)
      .then(setRally)
      .catch((e) => setErr(e.response?.data?.error || 'تعذر تحميل التجمّع'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rallyId]);

  useEffect(() => {
    getMyCastle().then(setCastle).catch(() => {});
    getTroopTypes().then((data) => setTroopTypes(data.troop_types)).catch(() => {});
  }, []);

  const remainingSeed =
    rally?.status === 'gathering' ? Math.max(0, Math.floor((new Date(rally.launch_at).getTime() - Date.now()) / 1000)) : 0;
  const remaining = useCountdown(remainingSeed);

  useEffect(() => {
    if (rally?.status === 'gathering' && remaining === 0) {
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining]);

  function memberName(userId) {
    return alliance?.members?.find((m) => String(m.user_id) === String(userId))?.name || 'عضو سابق';
  }

  function troopLabel(key) {
    return troopTypes.find((t) => t.key === key)?.name || key;
  }

  async function handleJoin() {
    const troopsToSend = Object.entries(selected)
      .filter(([, qty]) => qty > 0)
      .map(([key, qty]) => ({ key, quantity: qty }));
    if (troopsToSend.length === 0) {
      toastError('اختَر وحدات الأول عشان تنضم للتجمّع');
      return;
    }
    setJoining(true);
    try {
      const updated = await joinRally(rallyId, troopsToSend);
      setRally(updated);
      setSelected({});
      getMyCastle().then(setCastle).catch(() => {});
      toastSuccess('انضممت للتجمّع بجيشك');
    } catch (e) {
      toastError(e.response?.data?.error || 'تعذر الانضمام للتجمّع');
    } finally {
      setJoining(false);
    }
  }

  async function handleLeave() {
    setLeaving(true);
    try {
      const updated = await leaveRally(rallyId);
      setRally(updated);
      getMyCastle().then(setCastle).catch(() => {});
      toastSuccess('سِبت التجمّع ورجعلك جيشك');
    } catch (e) {
      toastError(e.response?.data?.error || 'تعذر ترك التجمّع');
    } finally {
      setLeaving(false);
    }
  }

  async function handleCancel() {
    setCancelling(true);
    try {
      const updated = await cancelRally(rallyId);
      setRally(updated);
      toastSuccess('اتلغى التجمّع ورجع جيوش كل المشاركين');
    } catch (e) {
      toastError(e.response?.data?.error || 'تعذر إلغاء التجمّع');
    } finally {
      setCancelling(false);
    }
  }

  const BackButton = (
    <button type="button" onClick={onBack} className="mb-3 flex items-center gap-1.5 text-xs text-white/50 hover:text-amber-300">
      <ArrowRight size={13} /> رجوع لكل التجمّعات
    </button>
  );

  if (loading) {
    return (
      <div>
        {BackButton}
        <SkeletonRow />
      </div>
    );
  }

  if (err || !rally) {
    return (
      <div>
        {BackButton}
        <ErrorState message={err || 'التجمّع غير موجود'} onRetry={load} />
      </div>
    );
  }

  const myParticipation = rally.participants?.find((p) => String(p.user_id) === String(myUserId)) || null;
  const iCanManage = canManage(myRole);
  const isGathering = rally.status === 'gathering';

  return (
    <div>
      {BackButton}

      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <span className={`shrink-0 rounded-lg p-2 ${rally.target_is_npc ? 'bg-alert/10 text-alert' : 'bg-sky-500/10 text-sky-300'}`}>
              {rally.target_is_npc ? <Tent size={18} /> : <Castle size={18} />}
            </span>
            <div>
              <p className="flex items-center gap-1.5 text-sm font-bold text-white">
                <Flag className="text-amber-300" size={14} />
                تجمّع على {rally.target_name || 'هدف غير معروف'}
              </p>
              <p className="mt-0.5 text-[11px] text-white/50">أنشأه {memberName(rally.created_by)} · {formatDateTime(rally.created_at)}</p>
            </div>
          </div>
          <RallyStatusBadge status={rally.status} />
        </div>

        {isGathering && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-400/20 bg-amber-500/5 px-3.5 py-2.5">
            <Clock className="text-amber-300" size={16} />
            <span className="font-mono text-base font-bold text-amber-300">{formatCountdown(remaining)}</span>
            <span className="text-[11px] text-white/50">لحد ما يتنفّذ التجمّع</span>
          </div>
        )}

        {rally.status === 'cancelled' && (
          <p className="mt-3 text-xs text-white/60">{CANCEL_REASON_LABELS[rally.cancelled_reason] || 'اتلغى'}</p>
        )}

        {rally.status === 'resolved' && rally.battle_id && (
          <button
            type="button"
            onClick={() => onViewBattle?.(rally.battle_id)}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-teal-500/20 px-3.5 py-2 text-xs font-bold text-teal-300 hover:bg-teal-500/30"
          >
            <Swords size={13} />
            شاهد تقرير المعركة
          </button>
        )}

        {isGathering && (
          <div className="mt-3 flex flex-wrap gap-2">
            {myParticipation && (
              <button
                type="button"
                onClick={handleLeave}
                disabled={leaving}
                className="flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-xs text-white/70 hover:text-red-300 disabled:opacity-40"
              >
                <LogOut size={13} />
                {leaving ? 'جاري ترك التجمّع...' : 'سيب التجمّع'}
              </button>
            )}
            {iCanManage && (
              <button
                type="button"
                onClick={handleCancel}
                disabled={cancelling}
                className="flex items-center gap-1.5 rounded-lg bg-red-500/15 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/25 disabled:opacity-40"
              >
                <Ban size={13} />
                {cancelling ? 'جاري الإلغاء...' : 'ألغِ التجمّع'}
              </button>
            )}
          </div>
        )}
      </div>

      {isGathering && (
        <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-4">
          <h2 className="flex items-center gap-1.5 text-xs font-bold text-white">
            <LogIn className="text-amber-300" size={14} />
            {myParticipation ? 'زوّد مساهمتك بالتجمّع' : 'انضم بجيشك'}
          </h2>
          <div className="mt-2.5">
            <TroopStackPicker army={castle?.army} selected={selected} onChange={setSelected} />
          </div>
          <button
            type="button"
            onClick={handleJoin}
            disabled={joining}
            className="mt-2.5 flex items-center gap-1.5 rounded-lg bg-teal-500/20 px-3.5 py-1.5 text-xs font-bold text-teal-300 hover:bg-teal-500/30 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <LogIn size={13} />
            {joining ? 'جاري الانضمام...' : 'انضم للتجمّع'}
          </button>
        </div>
      )}

      <div className="mt-3">
        <h2 className="flex items-center gap-1.5 text-xs font-bold text-white">
          <Users className="text-amber-300" size={14} />
          المشاركين ({rally.participants?.length || 0})
        </h2>
        <div className="mt-2 flex flex-col gap-1.5">
          {(!rally.participants || rally.participants.length === 0) && (
            <p className="rounded-lg border border-dashed border-white/10 py-5 text-center text-[11px] text-white/40">لسه محدش انضم للتجمّع ده</p>
          )}
          {rally.participants?.map((p, i) => (
            <motion.div
              key={`${p.user_id}-${i}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.2) }}
              className="flex items-center justify-between gap-2.5 rounded-lg border border-white/10 bg-white/5 p-3"
            >
              <span className="flex items-center gap-1.5 text-xs font-bold text-white">
                <ScrollText size={13} className="text-teal-300" />
                {memberName(p.user_id)}
                {String(p.user_id) === String(myUserId) && <span className="text-[11px] font-normal text-amber-300">(انت)</span>}
              </span>
              <span className="truncate text-[11px] text-white/50">
                {p.troops?.map((t) => `${troopLabel(t.key)} ×${t.count.toLocaleString('ar-EG')}`).join('، ') || '—'}
              </span>
            </motion.div>
          ))}
        </div>
      </div>

      {rally.status === 'resolved' && rally.report && (
        <div className="mt-3">
          <h2 className="flex items-center gap-1.5 text-xs font-bold text-white">
            <Percent className="text-amber-300" size={14} />
            توزيع مساهمات التجمّع
          </h2>

          {RESOURCE_ORDER.some((key) => Number(rally.report.total_loot?.[key]) > 0) && (
            <p className="mt-1 flex items-center gap-1.5 text-[11px] text-white/50">
              <Gift size={11} className="text-amber-300" />
              إجمالي الغنيمة:{' '}
              {RESOURCE_ORDER.filter((key) => Number(rally.report.total_loot?.[key]) > 0)
                .map((key) => `${Math.floor(rally.report.total_loot[key]).toLocaleString('ar-EG')} ${RESOURCE_META[key].label}`)
                .join('، ')}
            </p>
          )}

          <div className="mt-2 flex flex-col gap-1.5">
            {rally.report.participants?.map((p, i) => {
              const lootEntries = RESOURCE_ORDER.filter((key) => Number(p.loot_share?.[key]) > 0);
              return (
                <motion.div
                  key={`${p.user_id}-${i}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.2) }}
                  className="flex flex-col gap-1.5 rounded-lg border border-white/10 bg-white/5 p-3"
                >
                  <div className="flex items-center justify-between gap-2.5">
                    <span className="flex items-center gap-1.5 text-xs font-bold text-white">
                      <ScrollText size={13} className="text-teal-300" />
                      {memberName(p.user_id)}
                    </span>
                    <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-bold text-amber-300">
                      {Math.round((p.contribution_percent || 0) * 10) / 10}%
                    </span>
                  </div>
                  {lootEntries.length > 0 && (
                    <p className="flex items-center gap-1.5 text-[11px] text-white/50">
                      <Gift size={11} className="text-amber-300" />
                      {lootEntries.map((key) => `${Math.floor(p.loot_share[key]).toLocaleString('ar-EG')} ${RESOURCE_META[key].label}`).join('، ')}
                    </p>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
