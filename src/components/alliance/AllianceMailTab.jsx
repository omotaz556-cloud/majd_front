import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, MailOpen, CheckCheck, Send, X, PenSquare } from 'lucide-react';
import { useAlliance } from '../../context/AllianceContext';
import { canManage } from '../../utils/allianceRoles';
import { listMail, markMailRead, markAllMailRead, sendMail } from '../../api/allianceMail';
import { toastSuccess, toastError } from '../ui/toast';
import EmptyState from '../ui/EmptyState';
import ErrorState from '../ui/ErrorState';
import { SkeletonRow } from '../ui/Loaders';

// ====== بريد التحالف - نفس محتوى صفحة AllianceMailPage القديمة، دلوقتي
// تبويب جوّه AlliancePanel (البانل اللي بيتفتح من مشهد اللعبة) بدل ما يكون
// راوت مستقل. بيستخدم useAlliance() نفسه اللي البانل الأب شغال بيه. ======

function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('ar-EG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function AllianceMailTab({ alliance, myRole }) {
  const [mail, setMail] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);

  function load() {
    if (!alliance) return;
    setLoading(true);
    setErr(null);
    listMail(alliance.id, { limit: 50 })
      .then(setMail)
      .catch(() => setErr('تعذر تحميل بريد التحالف'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alliance?.id]);

  function senderName(senderId) {
    return alliance?.members?.find((m) => String(m.user_id) === String(senderId))?.name || 'عضو سابق';
  }

  async function handleOpen(m) {
    setSelectedId(m.id);
    if (m.is_read) return;
    setMail((prev) => prev.map((x) => (x.id === m.id ? { ...x, is_read: true } : x)));
    try {
      await markMailRead(alliance.id, m.id);
    } catch {
      setMail((prev) => prev.map((x) => (x.id === m.id ? { ...x, is_read: false } : x)));
    }
  }

  async function handleMarkAllRead() {
    setMarkingAll(true);
    try {
      await markAllMailRead(alliance.id);
      setMail((prev) => prev.map((x) => ({ ...x, is_read: true })));
    } catch {
      toastError('تعذر تعليم كل الرسائل كمقروءة');
    } finally {
      setMarkingAll(false);
    }
  }

  const selected = mail.find((m) => m.id === selectedId) || null;
  const hasUnread = mail.some((m) => !m.is_read);
  const iCanSend = canManage(myRole);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs text-white/50">بريد التحالف</p>
        <div className="flex items-center gap-1.5">
          {hasUnread && (
            <button
              onClick={handleMarkAllRead}
              disabled={markingAll}
              className="flex items-center gap-1 rounded-lg bg-white/5 px-2.5 py-1.5 text-[11px] font-bold text-white/60 hover:text-white disabled:opacity-40"
            >
              <CheckCheck size={12} />
              تعليم الكل
            </button>
          )}
          {iCanSend && (
            <button
              onClick={() => setComposeOpen(true)}
              className="flex items-center gap-1 rounded-lg bg-amber-500/20 px-2.5 py-1.5 text-[11px] font-bold text-amber-300 hover:bg-amber-500/30"
            >
              <PenSquare size={12} />
              رسالة جديدة
            </button>
          )}
        </div>
      </div>

      {err && <ErrorState message={err} onRetry={load} />}

      {!err && !selected && (
        <div className="space-y-2">
          {loading && Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)}

          {!loading && mail.length === 0 && (
            <EmptyState icon={Mail} title="مفيش رسائل بريد لسه" subtitle="أي بريد يبعته القائد أو الضابط هيظهر هنا" />
          )}

          {!loading &&
            mail.map((m, i) => (
              <motion.button
                key={m.id}
                type="button"
                onClick={() => handleOpen(m)}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.2) }}
                className={`flex w-full items-start gap-2.5 rounded-xl border border-white/10 bg-white/5 p-3 text-right transition-colors hover:border-amber-400/30 ${
                  m.is_read ? 'opacity-60' : ''
                }`}
              >
                <span className="mt-0.5 shrink-0 text-teal-300">
                  {m.is_read ? <MailOpen size={15} /> : <Mail size={15} className="text-amber-300" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-xs font-bold text-white">{m.title}</span>
                    {!m.is_read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />}
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] text-white/50">{m.body}</span>
                  <span className="mt-0.5 block text-[10px] text-white/30">{formatDateTime(m.sent_at)}</span>
                </span>
              </motion.button>
            ))}
        </div>
      )}

      {!err && selected && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-bold text-white">{selected.title}</p>
              <p className="mt-1 flex items-center gap-1.5 text-[11px] text-white/50">
                <Send size={11} />
                من {senderName(selected.sender_id)} · {formatDateTime(selected.sent_at)}
              </p>
            </div>
            <button onClick={() => setSelectedId(null)} className="rounded-lg p-1 text-white/40 hover:text-white" aria-label="رجوع">
              <X size={15} />
            </button>
          </div>
          <p className="mt-3 whitespace-pre-wrap text-xs leading-relaxed text-white/80">{selected.body}</p>
        </motion.div>
      )}

      {composeOpen && (
        <ComposeMailModal
          allianceId={alliance.id}
          onClose={() => setComposeOpen(false)}
          onSent={() => {
            setComposeOpen(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function ComposeMailModal({ allianceId, onClose, onSent }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      setFormError('لازم تكتب عنوان ونص الرسالة');
      return;
    }
    setSending(true);
    setFormError(null);
    try {
      await sendMail(allianceId, { title: title.trim(), body: body.trim() });
      toastSuccess('تم إرسال الرسالة لكل أعضاء التحالف');
      onSent();
    } catch (err) {
      setFormError(err.response?.data?.error || 'تعذر إرسال الرسالة');
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-stone-950/80 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl border border-white/10 bg-stone-950 p-5"
      >
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-bold text-white">
            <PenSquare className="text-amber-300" size={16} />
            رسالة جديدة لكل الأعضاء
          </h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-white/50 hover:text-white">
            <X size={15} />
          </button>
        </div>

        <div className="mt-3 flex flex-col gap-2.5">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="عنوان الرسالة"
            maxLength={200}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-amber-400/50 focus:outline-none"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="نص الرسالة..."
            maxLength={2000}
            rows={5}
            className="resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-amber-400/50 focus:outline-none"
          />
          {formError && <p className="text-xs text-red-300">{formError}</p>}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-white/10 px-4 py-1.5 text-xs text-white/70 hover:text-white">
            إلغاء
          </button>
          <button
            type="submit"
            disabled={sending}
            className="rounded-lg bg-gradient-to-b from-amber-400 to-amber-600 px-4 py-1.5 text-xs font-bold text-stone-900 disabled:opacity-50"
          >
            {sending ? 'جاري الإرسال...' : 'إرسال'}
          </button>
        </div>
      </motion.form>
    </div>
  );
}
