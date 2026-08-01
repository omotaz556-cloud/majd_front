import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageCircle, Loader2, Send } from 'lucide-react';

const MAX_LENGTH = 1000;

// ====== بانل رسالة خاصة للاعب (Message Player) - بيبان لما اللاعب يضغط
// "رسالة" وهو داخل مملكة لاعب حقيقي تاني. بيتبعت لصندوق وارد المستقبِل
// (category: 'player', type: 'private_message') عن طريق /inbox/message. ======
export default function MessagePlayerModal({ open, targetName, submitting, onClose, onSubmit }) {
  const [body, setBody] = useState('');

  useEffect(() => {
    if (open) setBody('');
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    function handleKey(e) {
      if (e.key === 'Escape') onClose?.();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed || submitting) return;
    onSubmit?.(trimmed);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="message-player-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-stone-950/80 px-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !submitting) onClose?.();
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 10 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-stone-950/95 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-label="رسالة للاعب"
          >
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="absolute left-3 top-3 z-10 rounded-lg bg-black/40 p-1.5 text-white/60 hover:text-white disabled:opacity-40"
              aria-label="إغلاق"
            >
              <X size={18} />
            </button>

            <div className="flex flex-col items-center gap-2 bg-[radial-gradient(ellipse_at_50%_0%,rgba(56,189,248,.16)_0%,transparent_70%)] px-6 pb-4 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-500/15 text-sky-300">
                <MessageCircle size={22} />
              </div>
              <p className="text-center text-sm font-bold text-white/90">إرسال رسالة</p>
              <p className="truncate text-center text-xs text-white/50">إلى {targetName || 'لاعب'}</p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-2 px-5 pb-5">
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value.slice(0, MAX_LENGTH))}
                disabled={submitting}
                rows={4}
                placeholder="اكتب رسالتك هنا..."
                className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-400/50 disabled:opacity-40"
              />
              <span className="self-end text-[11px] text-white/35">
                {body.length}/{MAX_LENGTH}
              </span>

              <button
                type="submit"
                disabled={!body.trim() || submitting}
                className="flex items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-bold text-stone-950 hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {submitting ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    جاري الإرسال...
                  </>
                ) : (
                  <>
                    <Send size={15} />
                    إرسال
                  </>
                )}
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
