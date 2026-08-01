import { useState } from 'react';
import { Megaphone, Send } from 'lucide-react';
import { sendBroadcast } from '../../api/admin';
import { toastSuccess } from '../../components/ui/toast';

const EMPTY_FORM = { title: '', body: '' };

export default function AdminInboxTab() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState(null);

  async function handleSend(e) {
    e.preventDefault();
    setSending(true);
    setErr(null);
    try {
      await sendBroadcast({ title: form.title.trim(), body: form.body.trim() });
      toastSuccess('اتبعتت الرسالة لكل اللاعبين');
      setForm(EMPTY_FORM);
    } catch (e2) {
      setErr(e2.response?.data?.error || 'تعذر إرسال الرسالة');
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <p className="mb-4 text-xs text-bone/40">
        إرسال إعلان عام بيوصل لصندوق وارد كل اللاعبين المسجلين حالياً - مش محتاج تختار لاعب
        معين
      </p>

      {err && <p className="mb-3 text-alert">{err}</p>}

      <form onSubmit={handleSend} className="flex max-w-xl flex-col gap-3 rounded-xl glass-card p-5">
        <div className="flex items-center gap-2 text-bone/70">
          <Megaphone size={16} className="text-gold" />
          <span className="text-sm font-bold">إعلان جديد لكل اللاعبين</span>
        </div>

        <input
          required
          maxLength={200}
          placeholder="عنوان الإعلان"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="focus-ring rounded-lg border border-ink-600 bg-ink-700 px-3 py-2 text-sm text-bone"
        />
        <textarea
          maxLength={2000}
          rows={4}
          placeholder="نص الإعلان (اختياري)"
          value={form.body}
          onChange={(e) => setForm({ ...form, body: e.target.value })}
          className="focus-ring resize-none rounded-lg border border-ink-600 bg-ink-700 px-3 py-2 text-sm text-bone"
        />

        <button
          type="submit"
          disabled={sending || !form.title.trim()}
          className="focus-ring flex items-center justify-center gap-1.5 rounded-lg btn-gradient-gold py-2 text-sm disabled:opacity-40"
        >
          <Send size={14} />
          {sending ? 'جاري الإرسال...' : 'إرسال للكل'}
        </button>
      </form>
    </div>
  );
}
