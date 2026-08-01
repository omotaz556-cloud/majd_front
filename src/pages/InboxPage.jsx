import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Mail,
  MailOpen,
  Building2,
  Trophy,
  RotateCcw,
  Megaphone,
  CheckCheck,
  Eye,
  Gift,
  MessageCircle,
  Swords,
  Skull,
  Shield,
  ShieldAlert,
  ChevronDown,
  Trash2,
} from 'lucide-react';
import { listInbox, markMessageAsRead, markAllAsRead, deleteMessage } from '../api/inbox';
import { useInbox } from '../context/InboxContext';
import { SkeletonRow } from '../components/ui/Loaders';
import { toastError, toastCoins } from '../components/ui/toast';
import { RESOURCE_ORDER } from '../utils/resourceMeta';
import BattleMailDetail from '../components/mail/BattleMailDetail';
// ====== Battle Reports removal - نفس زرار الإعلان المكافئ الموحّد
// (AdvertisementButton) المستخدم في ReportsMailPanel جوّه اللعبة - هنا
// برضه عشان "شاهد إعلان → ضاعف الغنيمة" يبقى متاح من صفحة /inbox المستقلة
// كمان، مش بس من البانل جوّه مشهد اللعبة. ======
import AdvertisementButton from '../ads/components/AdvertisementButton';
import { useSound } from '../components/ui/SoundProvider';

// أيقونة ولون مناسبين لكل نوع رسالة - أي نوع مش معروف بيرجع للأيقونة
// الافتراضية (Mail) من غير ما يكسر العرض
const TYPE_META = {
  building_upgrade_complete: { icon: Building2, className: 'text-teal' },
  challenge_reward: { icon: Trophy, className: 'text-gold' },
  challenge_refund: { icon: RotateCcw, className: 'text-bone/60' },
  admin_broadcast: { icon: Megaphone, className: 'text-gold' },
  scout_report: { icon: Eye, className: 'text-sky-300' },
  resources_received: { icon: Gift, className: 'text-emerald-300' },
  private_message: { icon: MessageCircle, className: 'text-sky-300' },
  march_under_attack_started: { icon: ShieldAlert, className: 'text-red-400' },
  ally_under_attack: { icon: Swords, className: 'text-red-400' },
  march_battle_started_defender: { icon: ShieldAlert, className: 'text-red-400' },
  march_battle_started: { icon: Swords, className: 'text-amber-300' },
};

// ====== *** إضافة: أنواع الرسائل المرتبطة بمعركة لسه شغالة (metadata.march_id
// موجود) - أي رسالة من الأنواع دي بتاخد زرار "شاهد المعركة" يوديها مباشرة
// لصفحة المتابعة اللايف العامة (/battles/:marchId)، سواء كانت لصاحب القلعة
// نفسه أو لأي حليف استلم ally_under_attack. ====== Battle Reports removal:
// 'battle_report' نفسها (المعركة المنتهية) عمدًا مش هنا - دي بتتفتح/تتوسّع
// جوّه صفها في القايمة تحت (BattleReportMessageCard)، مش بتودي لصفحة لايف
// خارجية (مفيش حاجة لايف تتابعها، المعركة خلصت خلاص). ======
const BATTLE_LINK_TYPES = new Set([
  'march_under_attack_started',
  'ally_under_attack',
  'march_battle_started_defender',
  'march_departed_attack',
  'march_battle_started',
]);

// ====== أيقونة/لون رسالة تقرير المعركة (battle_report) بتختلف حسب نتيجتها
// من منظور اللاعب اللي استلمها (metadata.role/winner). ======
function battleReportMeta(metadata) {
  if (!metadata) return { icon: Swords, className: 'text-bone/60' };
  const won = metadata.winner === metadata.role;
  const isDraw = metadata.winner === 'draw';
  if (isDraw) return { icon: Shield, className: 'text-gold' };
  return won ? { icon: Trophy, className: 'text-teal' } : { icon: Skull, className: 'text-alert' };
}

function formatDateTime(iso) {
  return new Date(iso).toLocaleString('ar-EG', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ====== كارت رسالة تقرير معركة - بيتوسّع جوّه نفس الصف عشان يعرض ملخص
// المعركة الكامل (BattleMailDetail) - نفس الكومبوننت المستخدم جوّه
// ReportsMailPanel (بانل اللعبة)، عشان الاتنين (صفحة /inbox المستقلة
// والبانل جوّه المشهد) يعرضوا نفس التقرير بالظبط من نفس مصدر البيانات
// (رسالة البريد). ======
function BattleReportMessageCard({ message, expanded, onToggle, onRead, onDelete, deletingId }) {
  const meta = battleReportMeta(message.metadata);
  const Icon = meta.icon;
  const sounds = useSound();
  const [doubledAmounts, setDoubledAmounts] = useState(null);

  const metadata = message.metadata || {};
  const hasLoot = RESOURCE_ORDER.some((key) => Number(metadata.loot?.looted?.[key]) > 0);
  const rewardEligible = metadata.role === 'attacker' && metadata.winner === 'attacker' && hasLoot;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass-panel overflow-hidden rounded-2xl border transition-all ${
        message.is_read ? 'border-ink-600 opacity-70' : 'border-gold/30'
      }`}
    >
      <div className="flex items-start gap-1">
        <button
          type="button"
          onClick={() => {
            onRead(message);
            onToggle(message.id);
          }}
          className="flex flex-1 items-start gap-3 p-4 text-right"
        >
          <span className={`mt-0.5 shrink-0 ${meta.className}`}>
            {message.is_read ? <MailOpen size={18} /> : <Icon size={18} />}
          </span>
          <span className="flex-1">
            <span className="flex items-center gap-2">
              <span className="font-display font-bold text-bone">{message.title}</span>
              {!message.is_read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />}
            </span>
            {message.body && <span className="mt-1 block text-sm text-bone/60">{message.body}</span>}
            <span className="mt-1.5 block text-xs text-bone/40">{formatDateTime(message.created_at)}</span>
          </span>
          <ChevronDown size={16} className={`mt-1 shrink-0 text-bone/40 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>

        {message.is_read && (
          <button
            type="button"
            onClick={() => onDelete(message)}
            disabled={deletingId === message.id}
            title="حذف الرسالة"
            className="focus-ring mt-4 shrink-0 rounded-lg p-1.5 text-bone/40 hover:bg-alert/10 hover:text-alert disabled:opacity-40"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {expanded && (
        <div className="border-t border-ink-600 p-4">
          <BattleMailDetail metadata={metadata} />

          {rewardEligible && (
            <div className="mx-auto mt-5 flex max-w-xs flex-col gap-2.5">
              {!doubledAmounts && (
                <AdvertisementButton
                  kind="double_reward"
                  context={{ battleId: metadata.battle_id }}
                  label="شاهد إعلان → ضاعف الغنيمة"
                  successLabel="تم مضاعفة الغنيمة"
                  onRewardCredited={(result_) => {
                    const granted = result_?.grantedSummary?.doubled || null;
                    setDoubledAmounts(granted || {});
                    sounds.reward?.();
                    toastCoins('تم مضاعفة غنيمة المعركة!');
                  }}
                />
              )}

              {doubledAmounts && (
                <div className="rounded-lg border border-teal/30 bg-teal/10 p-3 text-center text-sm text-teal">
                  <p className="font-bold">تم مضاعفة الغنيمة!</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

export default function InboxPage() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const { refresh: refreshUnreadCount } = useInbox();

  function load() {
    setLoading(true);
    listInbox({ limit: 50 })
      .then((data) => setMessages(data.messages))
      .catch(() => setErr('تعذر تحميل صندوق الوارد'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleOpen(message) {
    if (message.is_read) return;
    setMessages((prev) => prev.map((m) => (m.id === message.id ? { ...m, is_read: true } : m)));
    try {
      await markMessageAsRead(message.id);
      refreshUnreadCount();
    } catch {
      // لو فشل التحديث، نسيب الرسالة زي ما كانت من غير ما نزعج اللاعب بتوست خطأ
      setMessages((prev) => prev.map((m) => (m.id === message.id ? { ...m, is_read: false } : m)));
    }
  }

  async function handleMarkAllRead() {
    setMarkingAll(true);
    try {
      await markAllAsRead();
      setMessages((prev) => prev.map((m) => ({ ...m, is_read: true })));
      refreshUnreadCount();
    } catch {
      toastError('تعذر تعليم كل الرسائل كمقروءة');
    } finally {
      setMarkingAll(false);
    }
  }

  function toggleExpanded(id) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  async function handleDelete(message) {
    if (deletingId) return; // امنع نداءات متزامنة أثناء وجود عملية حذف شغالة بالفعل
    setDeletingId(message.id);
    const previous = messages;
    // تحديث تفاؤلي: نشيل الرسالة من الواجهة فورًا، ولو الطلب فشل نرجعها تاني
    setMessages((prev) => prev.filter((m) => m.id !== message.id));
    if (expandedId === message.id) setExpandedId(null);

    try {
      await deleteMessage(message.id);
    } catch {
      setMessages(previous);
      toastError('تعذر حذف الرسالة');
    } finally {
      setDeletingId(null);
    }
  }

  const hasUnread = messages.some((m) => !m.is_read);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 font-display text-2xl font-extrabold text-bone">
          <Mail className="text-gold" size={26} />
          صندوق الوارد
        </h1>
        {hasUnread && (
          <button
            onClick={handleMarkAllRead}
            disabled={markingAll}
            className="focus-ring flex items-center gap-1.5 rounded-lg border border-ink-600 px-3 py-1.5 text-sm text-bone/70 hover:border-gold hover:text-gold disabled:opacity-40"
          >
            <CheckCheck size={14} />
            {markingAll ? 'جاري التعليم...' : 'تعليم الكل كمقروء'}
          </button>
        )}
      </div>
      <p className="mt-2 text-bone/60">إشعارات قلعتك، تقارير معاركك، وأي إعلانات عامة من فريق مجد</p>

      {err && <p className="mt-10 text-alert">{err}</p>}

      <div className="mt-8 flex flex-col gap-2.5">
        {loading && Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}

        {!loading &&
          messages.map((m) => {
            if (m.type === 'battle_report') {
              return (
                <BattleReportMessageCard
                  key={m.id}
                  message={m}
                  expanded={expandedId === m.id}
                  onToggle={toggleExpanded}
                  onRead={handleOpen}
                  onDelete={handleDelete}
                  deletingId={deletingId}
                />
              );
            }

            const meta = TYPE_META[m.type] || { icon: Mail, className: 'text-bone/60' };
            const Icon = meta.icon;
            const marchId = BATTLE_LINK_TYPES.has(m.type) ? m.metadata?.march_id : null;
            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`glass-panel flex items-start gap-3 rounded-2xl p-4 text-right transition-all hover:border-gold/40 ${
                  m.is_read ? 'opacity-60' : ''
                }`}
              >
                <button type="button" onClick={() => handleOpen(m)} className="flex flex-1 items-start gap-3 text-right">
                  <span className={`mt-0.5 shrink-0 ${meta.className}`}>
                    {m.is_read ? <MailOpen size={18} /> : <Icon size={18} />}
                  </span>
                  <span className="flex-1">
                    <span className="flex items-center gap-2">
                      <span className="font-display font-bold text-bone">{m.title}</span>
                      {!m.is_read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />}
                    </span>
                    {m.body && <span className="mt-1 block text-sm text-bone/60">{m.body}</span>}
                    <span className="mt-1.5 block text-xs text-bone/40">{formatDateTime(m.created_at)}</span>
                  </span>
                </button>
                {marchId && (
                  <Link
                    to={`/battles/${marchId}`}
                    onClick={() => handleOpen(m)}
                    className="mt-0.5 flex shrink-0 items-center gap-1.5 rounded-lg bg-gold/15 px-2.5 py-1.5 text-xs font-bold text-gold hover:bg-gold/25"
                  >
                    <Swords size={12} />
                    شاهد المعركة
                  </Link>
                )}
                {m.is_read && (
                  <button
                    type="button"
                    onClick={() => handleDelete(m)}
                    disabled={deletingId === m.id}
                    title="حذف الرسالة"
                    className="focus-ring mt-0.5 shrink-0 rounded-lg p-1.5 text-bone/40 hover:bg-alert/10 hover:text-alert disabled:opacity-40"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </motion.div>
            );
          })}

        {!loading && messages.length === 0 && (
          <p className="text-bone/50">صندوق الوارد فاضي دلوقتي</p>
        )}
      </div>
    </div>
  );
}