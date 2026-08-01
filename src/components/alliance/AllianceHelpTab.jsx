import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { HandHelping, Hammer, HeartPulse, Wrench, Users, Clock, X, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { canManage } from '../../utils/allianceRoles';
import { listOpenHelpRequests, giveHelp, cancelHelpRequest } from '../../api/allianceHelp';
import { toastSuccess, toastError } from '../ui/toast';
import EmptyState from '../ui/EmptyState';
import ErrorState from '../ui/ErrorState';
import { SkeletonRow } from '../ui/Loaders';
import { useCountdown, formatCountdown } from '../../utils/useCountdown';

// ====== مساعدة التحالف - نفس محتوى AllianceHelpPage القديمة، دلوقتي تبويب
// جوّه AlliancePanel بدل راوت مستقل. ======

const HELP_TYPE_META = {
  building: { label: 'ترقية مبنى', icon: Hammer, accent: 'text-amber-300' },
  healing: { label: 'علاج جنود', icon: HeartPulse, accent: 'text-red-300' },
  repair: { label: 'إصلاح دفاعات', icon: Wrench, accent: 'text-teal-300' },
};

export default function AllianceHelpTab({ alliance, myRole }) {
  const { user } = useAuth();
  const myUserId = user?.id || user?._id;

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  function load() {
    if (!alliance) return;
    setLoading(true);
    setErr(null);
    listOpenHelpRequests(alliance.id, { limit: 50 })
      .then(setRequests)
      .catch(() => setErr('تعذر تحميل طلبات المساعدة'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alliance?.id]);

  function memberName(userId) {
    return alliance?.members?.find((m) => String(m.user_id) === String(userId))?.name || 'عضو سابق';
  }

  async function handleHelp(helpId) {
    try {
      const { help_request } = await giveHelp(alliance.id, helpId);
      if (help_request.status !== 'open') {
        setRequests((prev) => prev.filter((r) => r.id !== helpId));
      } else {
        setRequests((prev) => prev.map((r) => (r.id === helpId ? help_request : r)));
      }
      toastSuccess('اتبعتت مساعدتك!');
    } catch (e) {
      toastError(e.response?.data?.error || 'تعذر تقديم المساعدة');
    }
  }

  async function handleCancel(helpId) {
    try {
      await cancelHelpRequest(alliance.id, helpId);
      setRequests((prev) => prev.filter((r) => r.id !== helpId));
      toastSuccess('اتلغى طلب المساعدة');
    } catch (e) {
      toastError(e.response?.data?.error || 'تعذر إلغاء الطلب');
    }
  }

  return (
    <div>
      <p className="mb-3 text-xs text-white/50">اضغط "مساعدة" على طلبات أعضاء تحالفك عشان تقلل وقت انتظارهم</p>

      {err && <ErrorState message={err} onRetry={load} />}

      {!err && (
        <div className="flex flex-col gap-2">
          {loading && Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)}

          {!loading && requests.length === 0 && (
            <EmptyState icon={HandHelping} title="مفيش طلبات مساعدة مفتوحة دلوقتي" subtitle="أي طلب مساعدة يفتحه عضو هيظهر هنا" />
          )}

          {!loading &&
            requests.map((r, i) => (
              <HelpRequestCard
                key={r.id}
                request={r}
                index={i}
                requesterName={memberName(r.requester_id)}
                contributorNames={r.contributors.map((c) => memberName(c.user_id))}
                isOwner={String(r.requester_id) === String(myUserId)}
                alreadyHelped={r.contributors.some((c) => String(c.user_id) === String(myUserId))}
                canCancel={String(r.requester_id) === String(myUserId) || canManage(myRole)}
                onHelp={() => handleHelp(r.id)}
                onCancel={() => handleCancel(r.id)}
              />
            ))}
        </div>
      )}
    </div>
  );
}

function HelpRequestCard({ request, index, requesterName, contributorNames, isOwner, alreadyHelped, canCancel, onHelp, onCancel }) {
  const meta = HELP_TYPE_META[request.help_type] || HELP_TYPE_META.building;
  const Icon = meta.icon;
  const remaining = useCountdown(request.remaining_seconds);
  const isFull = request.help_count >= request.max_helps;
  const canHelp = !isOwner && !alreadyHelped && !isFull && remaining > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.2) }}
      className="flex flex-col gap-2.5 rounded-xl border border-white/10 bg-white/5 p-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-start gap-2.5">
        <span className={`mt-0.5 shrink-0 rounded-lg bg-white/5 p-1.5 ${meta.accent}`}>
          <Icon size={15} />
        </span>
        <div>
          <p className="text-xs font-bold text-white">{meta.label}</p>
          <p className="mt-0.5 text-[11px] text-white/50">طلبها {requesterName}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2.5 text-[11px] text-white/60">
            <span className="flex items-center gap-1">
              <Clock size={11} className="text-amber-300" />
              {remaining > 0 ? formatCountdown(remaining) : 'خلص الوقت'}
            </span>
            <span className="flex items-center gap-1">
              <Users size={11} className="text-teal-300" />
              {request.help_count}/{request.max_helps} ساعدوا
            </span>
          </div>
          {contributorNames.length > 0 && <p className="mt-1 truncate text-[10px] text-white/40">ساعد: {contributorNames.join('، ')}</p>}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 self-end sm:self-auto">
        {canCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex items-center gap-1 rounded-lg bg-white/5 px-2.5 py-1.5 text-[11px] text-white/60 hover:text-red-300"
          >
            <X size={11} />
            إلغاء
          </button>
        )}
        <button
          type="button"
          onClick={onHelp}
          disabled={!canHelp}
          className="flex items-center gap-1 rounded-lg bg-teal-500/20 px-2.5 py-1.5 text-[11px] font-bold text-teal-300 hover:bg-teal-500/30 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {alreadyHelped ? <Check size={11} /> : <HandHelping size={11} />}
          {isOwner ? 'طلبك انت' : alreadyHelped ? 'ساعدت' : isFull ? 'اكتمل' : 'مساعدة'}
        </button>
      </div>
    </motion.div>
  );
}
