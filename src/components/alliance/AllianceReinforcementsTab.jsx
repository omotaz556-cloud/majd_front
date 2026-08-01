import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeftRight, ArrowDownToLine, ArrowUpFromLine, Undo2, X, Users } from 'lucide-react';
import { listIncomingReinforcements, listOutgoingReinforcements, recallReinforcement } from '../../api/allianceReinforcements';
import { getTroopTypes, getMarches } from '../../api/castle';
import { toastSuccess, toastError } from '../ui/toast';
import EmptyState from '../ui/EmptyState';
import ErrorState from '../ui/ErrorState';
import { SkeletonRow } from '../ui/Loaders';
import ReinforcementCard from './ReinforcementCard';
import PendingReinforcementMarch from './PendingReinforcementMarch';

// ====== تعزيزات التحالف - نفس محتوى AllianceReinforcementsPage القديمة،
// دلوقتي تبويب جوّه AlliancePanel بدل راوت مستقل. متاحة من هنا (واجهة
// التحالف) بدل مبنى سفارة مستقل - المشروع ده معندوش نوع مبنى "سفارة"
// حاليًا في كتالوج المباني (castle.config.js). ======

function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('ar-EG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function AllianceReinforcementsTab({ alliance }) {
  const [tab, setTab] = useState('incoming');
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [pendingOutgoing, setPendingOutgoing] = useState([]);
  const [troopTypes, setTroopTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [recallingId, setRecallingId] = useState(null);

  function load() {
    if (!alliance) return;
    setLoading(true);
    setErr(null);
    Promise.all([listIncomingReinforcements(), listOutgoingReinforcements(), getTroopTypes(), getMarches()])
      .then(([inc, out, types, marches]) => {
        setIncoming(inc);
        setOutgoing(out);
        setTroopTypes(types.troop_types);
        setPendingOutgoing(marches.filter((m) => m.direction === 'reinforcement' && m.status === 'traveling'));
      })
      .catch(() => setErr('تعذر تحميل التعزيزات'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alliance?.id]);

  function memberName(userId) {
    return alliance?.members?.find((m) => String(m.user_id) === String(userId))?.name || 'عضو سابق';
  }

  function troopLabel(key) {
    return troopTypes.find((t) => t.key === key)?.name || key;
  }

  async function handleRecall(reinforcementId) {
    setRecallingId(reinforcementId);
    try {
      await recallReinforcement(reinforcementId);
      setOutgoing((prev) => prev.filter((r) => r.id !== reinforcementId));
      if (selectedId === reinforcementId) setSelectedId(null);
      toastSuccess('اتسحبت التعزيزات وهي في طريقها لقلعتك');
    } catch (e) {
      toastError(e.response?.data?.error || 'تعذر سحب التعزيز');
    } finally {
      setRecallingId(null);
    }
  }

  const list = tab === 'incoming' ? incoming : outgoing;
  const selected = list.find((r) => r.id === selectedId) || null;

  return (
    <div>
      <p className="mb-3 text-xs text-white/50">جنود حلفائك الواقفة في قلعتك، وجنودك اللي بعتها لحلفائك</p>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            setTab('incoming');
            setSelectedId(null);
          }}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
            tab === 'incoming' ? 'bg-amber-500/15 text-amber-300' : 'bg-white/5 text-white/60 hover:text-white'
          }`}
        >
          <ArrowDownToLine size={13} />
          الوارد ({incoming.length})
        </button>
        <button
          type="button"
          onClick={() => {
            setTab('outgoing');
            setSelectedId(null);
          }}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
            tab === 'outgoing' ? 'bg-amber-500/15 text-amber-300' : 'bg-white/5 text-white/60 hover:text-white'
          }`}
        >
          <ArrowUpFromLine size={13} />
          الصادر ({outgoing.length + pendingOutgoing.length})
        </button>
      </div>

      {err && <ErrorState message={err} onRetry={load} />}

      {!err && (
        <div className="mt-3">
          {!selected && (
            <div className="flex flex-col gap-2">
              {loading && Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)}

              {!loading && tab === 'outgoing' && pendingOutgoing.length > 0 && (
                <div className="flex flex-col gap-2">
                  {pendingOutgoing.map((m, i) => (
                    <PendingReinforcementMarch key={m.id} march={m} troopLabel={troopLabel} index={i} />
                  ))}
                </div>
              )}

              {!loading && list.length === 0 && pendingOutgoing.length === 0 && (
                <EmptyState
                  icon={tab === 'incoming' ? ArrowDownToLine : ArrowUpFromLine}
                  title={tab === 'incoming' ? 'مفيش تعزيزات واقفة في قلعتك' : 'معندكش تعزيزات مبعوتة'}
                  subtitle={tab === 'incoming' ? 'أي جنود يبعتهالك حليف كتعزيز هيظهروا هنا' : 'الجنود اللي تبعتها لحلفائك كتعزيز هتظهر هنا'}
                />
              )}

              {!loading &&
                list.map((r, i) => (
                  <ReinforcementCard
                    key={r.id}
                    reinforcement={r}
                    tab={tab}
                    memberName={memberName}
                    troopLabel={troopLabel}
                    selected={selectedId === r.id}
                    onSelect={setSelectedId}
                    index={i}
                  />
                ))}
            </div>
          )}

          {selected && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-start justify-between gap-2.5">
                <div>
                  <p className="text-sm font-bold text-white">
                    {tab === 'incoming' ? `تعزيز من ${memberName(selected.origin_user_id)}` : `تعزيز عند ${memberName(selected.target_user_id)}`}
                  </p>
                  <p className="mt-1 text-[11px] text-white/50">واقف من {formatDateTime(selected.stationed_at)}</p>
                </div>
                <button onClick={() => setSelectedId(null)} className="rounded-lg p-1 text-white/40 hover:text-white" aria-label="رجوع">
                  <X size={15} />
                </button>
              </div>

              <h3 className="mt-3 flex items-center gap-1.5 text-[11px] font-bold text-white/70">
                <Users size={12} className="text-teal-300" />
                الوحدات
              </h3>
              <div className="mt-1.5 space-y-1.5">
                {selected.troops?.map((t) => (
                  <div key={t.key} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs">
                    <span className="text-white/80">{troopLabel(t.key)}</span>
                    <span className="font-mono font-bold text-white">{t.count.toLocaleString('ar-EG')}</span>
                  </div>
                ))}
              </div>

              {tab === 'outgoing' && (
                <button
                  type="button"
                  onClick={() => handleRecall(selected.id)}
                  disabled={recallingId === selected.id}
                  className="mt-3 flex items-center gap-1.5 rounded-lg bg-red-500/15 px-3.5 py-1.5 text-xs text-red-300 hover:bg-red-500/25 disabled:opacity-40"
                >
                  <Undo2 size={13} />
                  {recallingId === selected.id ? 'جاري السحب...' : 'استرجع التعزيز'}
                </button>
              )}
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}
