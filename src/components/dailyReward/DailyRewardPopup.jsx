import { useState } from 'react';
import { motion } from 'framer-motion';
import { Gift, Flame, Loader2 } from 'lucide-react';
import { claimDailyReward } from '../../api/dailyReward';
import RewardPopupShell from './RewardPopupShell';
import AdvertisementButton from '../../ads/components/AdvertisementButton';
import { RESOURCE_META, RESOURCE_ORDER } from '../../utils/resourceMeta';
import { toastCoins, toastError, toastSuccess } from '../ui/toast';

/**
 * ====== DailyRewardPopup ======
 *
 * بوب أب "المكافأة اليومية" - بيحل محل الكارت الدائم اللي كان في GamesPage.
 * الظهور/الإخفاء بالكامل مسؤولية useRewardPopups (شوف hooks/useRewardPopups.js):
 * ده بس مكوّن العرض + فعل الاستلام. بيتفتح تلقائيًا فوق خريطة العالم لما
 * يبقى فيه مكافأة متاحة (كل 24 ساعة - محسوبة بالكامل على السيرفر)، وبعد
 * الاستلام بيختفي تمامًا (onClaimed بيسكّر البوب أب). لو اتقفل من غير
 * استلام، البوب أب نفسه بيختفي بس الأهلية بتفضل صح - فبيظهر badge صغير على
 * أيقونة الهدايا في WorldHUD لحد ما يستلم فعليًا (الحالة دي بتتحدد من status
 * نفسه، مش من أي state محلي هنا).
 */
export default function DailyRewardPopup({ open, status, onClose, onClaimed }) {
  const [claiming, setClaiming] = useState(false);
  const [claimedAmounts, setClaimedAmounts] = useState(null);
  const [doubled, setDoubled] = useState(false);
  const [justClaimed, setJustClaimed] = useState(false);

  if (!status) return null;

  const handleClaim = async () => {
    setClaiming(true);
    try {
      const result = await claimDailyReward();
      setClaimedAmounts(result.granted || {});
      setJustClaimed(true);
      toastSuccess(`تم استلام مكافأة اليوم! (يوم ${result.current_streak} متتالي)`);
      onClaimed?.(result);
    } catch (err) {
      toastError(err?.response?.data?.error || 'تعذر استلام المكافأة اليومية');
    } finally {
      setClaiming(false);
    }
  };

  const displayedAmounts = claimedAmounts || status.preview_reward || {};
  const streakDay = justClaimed ? status.current_streak : status.next_streak;

  return (
    <RewardPopupShell open={open} onClose={onClose}>
      <div className="flex flex-col items-center text-center">
        <motion.div
          initial={{ scale: 0.6, rotate: -8 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 16 }}
          className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl border border-gold/40 bg-gold/10"
        >
          <Gift size={30} className="text-gold" />
        </motion.div>

        <h2 className="font-display text-xl font-extrabold text-bone">المكافأة اليومية</h2>
        <span className="mt-1.5 flex items-center gap-1 rounded-full bg-gold/10 px-2.5 py-1 text-xs font-bold text-gold">
          <Flame size={13} />
          يوم {streakDay} متتالي
        </span>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-sm">
          {RESOURCE_ORDER.filter((key) => Number(displayedAmounts[key]) > 0).map((key) => {
            const meta = RESOURCE_META[key];
            const Icon = meta.icon;
            return (
              <span key={key} className="flex items-center gap-1.5 rounded-lg bg-ink-700/60 px-2.5 py-1.5 text-bone/85">
                <Icon size={15} style={{ color: meta.color }} />+
                {Math.floor(displayedAmounts[key]).toLocaleString('en-US')}
              </span>
            );
          })}
        </div>

        <div className="mt-6 flex w-full flex-col gap-2.5">
          {!justClaimed ? (
            <button
              type="button"
              onClick={handleClaim}
              disabled={claiming}
              className="focus-ring flex w-full items-center justify-center gap-2 rounded-xl border border-gold/40 bg-gold/15 px-4 py-3 text-sm font-bold text-gold disabled:opacity-60"
            >
              {claiming ? <Loader2 size={16} className="animate-spin" /> : <Gift size={16} />}
              استلم المكافأة
            </button>
          ) : (
            <>
              {!doubled && (
                <AdvertisementButton
                  kind="daily_double"
                  label="شاهد إعلان → ضاعف المكافأة"
                  successLabel="تم مضاعفة المكافأة"
                  onRewardCredited={(result) => {
                    const granted = result?.grantedSummary?.granted || null;
                    if (granted) setClaimedAmounts(granted);
                    setDoubled(true);
                    toastCoins('تم مضاعفة المكافأة اليومية!');
                  }}
                />
              )}
              <button
                type="button"
                onClick={onClose}
                className="focus-ring w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-bone/70 hover:text-bone"
              >
                إغلاق
              </button>
            </>
          )}
        </div>
      </div>
    </RewardPopupShell>
  );
}
