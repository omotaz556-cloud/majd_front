import { useEffect, useState } from 'react';
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
} from 'lucide-react';
import { listInbox, markMessageAsRead, markAllAsRead } from '../../../api/inbox';
import { useInbox } from '../../../context/InboxContext';
import { SkeletonRow } from '../../ui/Loaders';
import { toastError, toastCoins } from '../../ui/toast';
import { RESOURCE_ORDER } from '../../../utils/resourceMeta';
import BattleMailDetail from '../../mail/BattleMailDetail';
import PanelShell from './PanelShell';
// ====== Issue 1 fix: نفس زرار الإعلان المكافئ الموحّد المستخدم في كل
// اللعبة (BattleOutcomeModal/ShopPanel) - هنا برضه عشان "شاهد إعلان →
// ضاعف الغنيمة" يبقى متاح مباشرة من رسالة تقرير المعركة نفسها (مفيش شاشة
// تقرير منفصلة تانية بعد كده - راجع تعليق "Battle Reports removal" تحت). ======
import AdvertisementButton from '../../../ads/components/AdvertisementButton';
import { useSound } from '../../ui/SoundProvider';

// =============================================================================
// Battle Reports removal - تبويب "تقارير المعارك" المنفصل (وصفحاته/راوتاته/
// الـ endpoint القديم GET /battles/history) اتشال بالكامل. البريد
// (InboxMessage) بقى المصدر الوحيد لأي تقرير معركة منتهية - راجع
// battleConsequences.service.js::sendBattleMail في الباك إند، اللي بيبعت
// رسالة نوعها 'battle_report' لحظة ما المعركة تتحسم فعليًا (status:
// 'finished') وبس، وبيحط كل تفاصيل الملخص الكامل جوه metadata الرسالة
// نفسها. لسه تبع البانل ده تبويب واحد بس: "الرسائل" (نفس api/inbox.js زي ما
// هو) - أي رسالة نوعها 'battle_report' بتتفتح/تتوسّع جوّه نفس الصف عشان
// تعرض ملخص المعركة كامل (BattleMailDetail) من غير أي صفحة/تبويب منفصل.
//
// مهم جدًا: طول ما المعركة لسه ماشية/شغالة (marching/battling)، مفيش أي
// رسالة بريد بتتبعت خالص - أي إشعار وقتها (march_battle_started,
// march_battle_started_defender, ally_under_attack...) بيبلّغ إن المعركة
// "بدأت"/"شغالة" بس من غير أي كشف لنتيجتها (كسب/خسارة) - نفس فلسفة
// march.service.js::beginBattle/notifyAllianceOfAttack زي ما هي، من غير أي
// تعديل هنا.
// =============================================================================

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

// ====== أيقونة/لون رسالة تقرير المعركة (battle_report) بتختلف حسب نتيجتها
// من منظور اللاعب اللي استلمها (metadata.role/winner) - مش نوع ثابت زي باقي
// الأنواع فوق. ======
function battleReportMeta(metadata) {
  if (!metadata) return { icon: Swords, className: 'text-bone/60' };
  const won = metadata.winner === metadata.role;
  const isDraw = metadata.winner === 'draw';
  if (isDraw) return { icon: Shield, className: 'text-gold' };
  return won ? { icon: Trophy, className: 'text-teal' } : { icon: Skull, className: 'text-alert' };
}

function formatDateTime(iso) {
  return new Date(iso).toLocaleString('ar-EG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// ====== كارت رسالة تقرير معركة - نسخة موسّعة من كارت الرسالة العادي، بتفتح/
// تقفل ملخص المعركة الكامل (BattleMailDetail) جوّه نفس الصف لما تتضغط، زي
// أي رسالة تانية بالظبط - من غير أي navigation أو بانل منفصل. ======
function BattleReportMessageCard({ message, expanded, onToggle, onRead }) {
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
      <button
        type="button"
        onClick={() => {
          onRead(message);
          onToggle(message.id);
        }}
        className="flex w-full items-start gap-3 p-4 text-right"
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

      {expanded && (
        <div className="border-t border-ink-600 p-4">
          <BattleMailDetail metadata={metadata} />

          {/* ====== Issue 1 fix: "شاهد إعلان → ضاعف الغنيمة" متاح مباشرة من
              رسالة المعركة نفسها - بس للمهاجم لما يكسب وفيه غنيمة فعلية. ====== */}
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

function MailTab() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
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

  const hasUnread = messages.some((m) => !m.is_read);

  return (
    <div className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-bone/50">إشعارات قلعتك، تقارير معاركك، وأي إعلانات عامة</p>
        {hasUnread && (
          <button
            onClick={handleMarkAllRead}
            disabled={markingAll}
            className="focus-ring flex items-center gap-1.5 rounded-lg border border-ink-600 px-3 py-1.5 text-xs text-bone/70 hover:border-gold hover:text-gold disabled:opacity-40"
          >
            <CheckCheck size={13} />
            {markingAll ? 'جاري التعليم...' : 'تعليم الكل كمقروء'}
          </button>
        )}
      </div>

      {err && <p className="mt-6 text-alert">{err}</p>}

      <div className="mt-4 flex flex-col gap-2.5">
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
                />
              );
            }

            const meta = TYPE_META[m.type] || { icon: Mail, className: 'text-bone/60' };
            const Icon = meta.icon;
            return (
              <motion.button
                key={m.id}
                type="button"
                onClick={() => handleOpen(m)}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`glass-panel flex items-start gap-3 rounded-2xl p-4 text-right transition-all hover:border-gold/40 ${
                  m.is_read ? 'opacity-60' : ''
                }`}
              >
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
              </motion.button>
            );
          })}

        {!loading && messages.length === 0 && <p className="text-bone/50">صندوق الوارد فاضي دلوقتي</p>}
      </div>
    </div>
  );
}

// ====== نقطة الدخول - بتتفتح من زرار "الرسائل" الموجود في WorldHUD جوّه
// مشهد اللعبة. البانل بقى تبويب واحد بس (الرسائل) - تبويب "تقارير المعارك"
// المنفصل اتشال بالكامل (راجع تعليق "Battle Reports removal" فوق). فتح
// رسالة تقرير معركة بعينها بيحصل من جوّه قايمة الرسائل نفسها (توسيع الصف)،
// مش عن طريق أي معرّف معركة يتمرر من بره. ======
export default function ReportsMailPanel({ open, onClose }) {
  return (
    <PanelShell open={open} onClose={onClose} title="الرسائل" icon={Mail} maxWidth="max-w-3xl">
      <MailTab />
    </PanelShell>
  );
}
