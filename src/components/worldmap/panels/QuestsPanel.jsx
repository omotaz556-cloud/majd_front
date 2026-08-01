import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ScrollText,
  Hammer,
  Swords,
  Target,
  Pickaxe,
  Flag,
  Coins,
  CheckCircle2,
  Gift,
} from 'lucide-react';
import { getMyQuests, claimQuestReward } from '../../../api/quests';
import { toastSuccess, toastError } from '../../ui/toast';
import EmptyState from '../../ui/EmptyState';
import ErrorState from '../../ui/ErrorState';
import { CoinSpinner } from '../../ui/Loaders';
import PanelShell from './PanelShell';

// =============================================================================
// Quests Panel (in-game) - "📜 المهام اليومية" - بيتفتح من زرار "المهام" جوّه
// WorldHUD (activePanel === 'quests' في WorldMapPage). قائمة مهام قصيرة
// (3 مهام) بتتجدد تلقائيًا كل يوم من الباك إند (quest.service.js) - صعوبتها
// ومكافآتها بتزيد لوحدها مع مستوى المبنى الرئيسي بتاع اللاعب، فمفيش أي
// إعداد يدوي مطلوب هنا. اللاعب بس بيشوف تقدمه ويستلم المكافأة لما المهمة
// تخلص - باقي التتبع بيحصل تلقائيًا في الخلفية وقت اللعب العادي (ترقية
// مبنى/تدريب/هجوم/حصاد/تعزيز حليف). ======
// =============================================================================

const ICONS = {
  hammer: Hammer,
  swords: Swords,
  target: Target,
  pickaxe: Pickaxe,
  flag: Flag,
};

const RESOURCE_META = {
  gold: { label: 'ذهب', color: 'text-amber-300' },
  wood: { label: 'خشب', color: 'text-emerald-300' },
  stone: { label: 'حجر', color: 'text-slate-300' },
};

function RewardChips({ reward }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {['gold', 'wood', 'stone'].map((res) =>
        reward?.[res] > 0 ? (
          <span
            key={res}
            className={`rounded-md bg-white/5 px-2 py-0.5 font-mono text-[11px] ${RESOURCE_META[res].color}`}
          >
            +{reward[res]} {RESOURCE_META[res].label}
          </span>
        ) : null
      )}
      {reward?.coins > 0 && (
        <span className="flex items-center gap-1 rounded-md bg-amber-400/15 px-2 py-0.5 font-mono text-[11px] font-bold text-amber-300">
          <Coins size={11} />+{reward.coins}
        </span>
      )}
    </div>
  );
}

function QuestCard({ quest, index, onClaim, claiming }) {
  const Icon = ICONS[quest.icon] || Target;
  const pct = Math.min(100, Math.round((quest.progress / Math.max(1, quest.target)) * 100));
  const isCompleted = quest.status === 'completed';
  const isClaimed = quest.status === 'claimed';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.05, 0.2) }}
      className={`rounded-xl border p-3.5 transition-colors ${
        isClaimed
          ? 'border-white/5 bg-white/[0.02] opacity-60'
          : isCompleted
            ? 'border-emerald-400/40 bg-emerald-400/5'
            : 'border-white/10 bg-white/[0.03]'
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
            isCompleted || isClaimed ? 'bg-emerald-400/15 text-emerald-300' : 'bg-amber-400/10 text-amber-300'
          }`}
        >
          {isClaimed ? <CheckCircle2 size={17} /> : <Icon size={17} />}
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-white">{quest.title}</p>
          <p className="mt-0.5 text-xs text-white/50">{quest.description}</p>

          <div className="mt-2.5 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full rounded-full ${isCompleted || isClaimed ? 'bg-emerald-400' : 'bg-amber-400'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="shrink-0 font-mono text-[11px] text-white/40">
              {Math.min(quest.progress, quest.target)}/{quest.target}
            </span>
          </div>

          <div className="mt-2.5 flex items-center justify-between gap-2">
            <RewardChips reward={quest.reward} />

            {isClaimed && <span className="text-[11px] text-white/30">تم الاستلام</span>}

            {isCompleted && (
              <button
                type="button"
                onClick={() => onClaim(quest)}
                disabled={claiming}
                className="focus-ring flex shrink-0 items-center gap-1 rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 px-3 py-1.5 text-xs font-bold text-stone-950 disabled:opacity-50"
              >
                <Gift size={13} />
                {claiming ? 'جاري الاستلام...' : 'استلم'}
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function QuestsPanelContent() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState(null);

  function load() {
    setLoading(true);
    getMyQuests()
      .then((res) => {
        setData(res);
        setErr(null);
      })
      .catch(() => setErr('تعذر تحميل المهام اليومية الآن'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleClaim(quest) {
    setClaimingId(quest._id);
    try {
      const res = await claimQuestReward(quest._id);
      setData((prev) => ({ ...prev, quests: res.quests }));
      toastSuccess(`استلمت مكافأة "${quest.title}" 🎁`);
    } catch (e) {
      toastError(e.response?.data?.error || 'تعذر استلام المكافأة');
    } finally {
      setClaimingId(null);
    }
  }

  const quests = data?.quests || [];
  const claimableCount = quests.filter((q) => q.status === 'completed').length;

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ScrollText size={18} className="text-amber-300" />
          <h2 className="font-bold text-white">المهام اليومية</h2>
        </div>
        {claimableCount > 0 && (
          <span className="rounded-full bg-emerald-400/15 px-2.5 py-0.5 text-xs font-bold text-emerald-300">
            {claimableCount} جاهزة للاستلام
          </span>
        )}
      </div>

      <p className="mb-4 text-xs text-white/40">
        بتتجدد كل يوم تلقائيًا، وصعوبتها ومكافآتها بتكبر مع تقدمك في المستوى.
      </p>

      {err && <ErrorState message={err} onRetry={load} />}

      {loading && !data && <CoinSpinner label="جاري تحميل المهام..." />}

      {!loading && quests.length === 0 && (
        <EmptyState icon={ScrollText} title="لسه مفيش مهام" subtitle="ارجع تاني بعد شوية" />
      )}

      {quests.length > 0 && (
        <div className="flex flex-col gap-2.5">
          {quests.map((q, i) => (
            <QuestCard key={q._id} quest={q} index={i} onClaim={handleClaim} claiming={claimingId === q._id} />
          ))}
        </div>
      )}
    </div>
  );
}

// ====== نقطة الدخول - بتتفتح من زرار "المهام" في WorldHUD (نفس فلسفة
// RankingPanel/HospitalPanel: بانل جوّه مشهد اللعبة، مش راوت/صفحة مستقلة). ======
export default function QuestsPanel({ open, onClose }) {
  return (
    <PanelShell open={open} onClose={onClose} title="📜 المهام اليومية" icon={ScrollText}>
      <QuestsPanelContent />
    </PanelShell>
  );
}
