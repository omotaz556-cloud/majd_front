import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Megaphone, History, PenSquare } from 'lucide-react';
import { isLeader } from '../../utils/allianceRoles';
import { publishAnnouncement, getCurrentAnnouncement, listAnnouncementHistory } from '../../api/allianceAnnouncements';
import { toastSuccess, toastError } from '../ui/toast';
import EmptyState from '../ui/EmptyState';
import ErrorState from '../ui/ErrorState';
import { SkeletonRow } from '../ui/Loaders';

// ====== إعلانات التحالف - نفس محتوى AllianceAnnouncementsPage القديمة،
// دلوقتي تبويب جوّه AlliancePanel بدل راوت مستقل. ======

function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function AllianceAnnouncementsTab({ alliance, myRole }) {
  const [current, setCurrent] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [publishOpen, setPublishOpen] = useState(false);

  function load() {
    if (!alliance) return;
    setLoading(true);
    setErr(null);
    Promise.all([getCurrentAnnouncement(alliance.id), listAnnouncementHistory(alliance.id, { limit: 30 })])
      .then(([cur, hist]) => {
        setCurrent(cur);
        setHistory(hist);
      })
      .catch(() => setErr('تعذر تحميل الإعلانات'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alliance?.id]);

  function authorName(authorId) {
    return alliance?.members?.find((m) => String(m.user_id) === String(authorId))?.name || 'عضو سابق';
  }

  const iCanPublish = isLeader(myRole);
  const previousHistory = current ? history.filter((h) => h.id !== current.id) : history;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs text-white/50">إعلانات التحالف</p>
        {iCanPublish && (
          <button
            onClick={() => setPublishOpen((o) => !o)}
            className="flex items-center gap-1 rounded-lg bg-amber-500/20 px-2.5 py-1.5 text-[11px] font-bold text-amber-300 hover:bg-amber-500/30"
          >
            <PenSquare size={12} />
            {publishOpen ? 'إلغاء' : 'نشر إعلان جديد'}
          </button>
        )}
      </div>

      {iCanPublish && publishOpen && (
        <PublishForm
          allianceId={alliance.id}
          onPublished={() => {
            setPublishOpen(false);
            load();
          }}
        />
      )}

      {err && <ErrorState message={err} onRetry={load} />}

      {!err && loading && (
        <div className="mt-3 flex flex-col gap-2">
          <SkeletonRow />
          <SkeletonRow />
        </div>
      )}

      {!err && !loading && (
        <>
          <p className="mt-4 text-[11px] font-bold text-white/40">الإعلان المثبّت حالياً</p>
          <div className="mt-1.5">
            {current ? (
              <div className="rounded-xl border border-amber-400/20 bg-amber-500/5 p-3.5">
                <p className="whitespace-pre-wrap text-xs leading-relaxed text-white/90">{current.body}</p>
                <p className="mt-2 text-[10px] text-white/40">
                  بواسطة {authorName(current.author_id)} · {formatDateTime(current.created_at)}
                </p>
              </div>
            ) : (
              <EmptyState icon={Megaphone} title="مفيش إعلان مثبّت حالياً" />
            )}
          </div>

          <p className="mt-4 flex items-center gap-1.5 text-[11px] font-bold text-white/40">
            <History size={12} />
            الإعلانات السابقة
          </p>
          <div className="mt-1.5 flex flex-col gap-2">
            {previousHistory.length === 0 && <p className="py-4 text-center text-xs text-white/40">مفيش إعلانات سابقة</p>}
            {previousHistory.map((a, i) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.2) }}
                className="rounded-xl border border-white/10 bg-white/5 p-3"
              >
                <p className="whitespace-pre-wrap text-xs text-white/70">{a.body}</p>
                <p className="mt-1.5 text-[10px] text-white/40">
                  بواسطة {authorName(a.author_id)} · {formatDateTime(a.created_at)}
                </p>
              </motion.div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function PublishForm({ allianceId, onPublished }) {
  const [body, setBody] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [formError, setFormError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!body.trim()) {
      setFormError('لازم تكتب نص الإعلان');
      return;
    }
    setPublishing(true);
    setFormError(null);
    try {
      await publishAnnouncement(allianceId, { body: body.trim() });
      toastSuccess('تم نشر الإعلان');
      setBody('');
      onPublished();
    } catch (err) {
      setFormError(err.response?.data?.error || 'تعذر نشر الإعلان');
    } finally {
      setPublishing(false);
    }
  }

  return (
    <motion.form
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      onSubmit={handleSubmit}
      className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3"
    >
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="اكتب نص الإعلان الجديد - هيبقى مثبّت لكل الأعضاء..."
        maxLength={2000}
        rows={4}
        className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-amber-400/50 focus:outline-none"
      />
      {formError && <p className="mt-1.5 text-xs text-red-300">{formError}</p>}
      <div className="mt-2 flex justify-end">
        <button
          type="submit"
          disabled={publishing}
          className="rounded-lg bg-gradient-to-b from-amber-400 to-amber-600 px-4 py-1.5 text-xs font-bold text-stone-900 disabled:opacity-50"
        >
          {publishing ? 'جاري النشر...' : 'نشر الإعلان'}
        </button>
      </div>
    </motion.form>
  );
}
