import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import RewardPopupShell from './RewardPopupShell';
import AdvertisementButton from '../../ads/components/AdvertisementButton';
import { RESOURCE_META } from '../../utils/resourceMeta';
import { toastCoins } from '../ui/toast';

/**
 * ====== HourlyGiftPopup ======
 *
 * بوب أب "هدية الساعة" - بيحل محل الكارت الدائم اللي كان في GamesPage.
 * زي DailyRewardPopup بالظبط: الظهور/الإخفاء التلقائي مسؤولية
 * useRewardPopups (بيتفتح بس لما الكولداون يخلص فعليًا على السيرفر). بعد
 * الاستلام (مشاهدة الإعلان تخلص + RewardSession تتكمّل) بيختفي تمامًا -
 * والكولداون الجديد (ساعة واحدة افتراضيًا) بيبدأ وقت الاستلام نفسه على
 * السيرفر (last_hourly_gift_at بيتسجّل جوّه executeReward وقت /complete، مش
 * وقت ما البوب أب ظهر) - راجع rewardSession.service.js. لو اتقفل من غير
 * استلام، بيظهر badge صغير على أيقونة الهدايا في WorldHUD لحد ما يستلم.
 */
export default function HourlyGiftPopup({ open, onClose, onClaimed }) {
  const [lastGift, setLastGift] = useState(null);

  return (
    <RewardPopupShell open={open} onClose={onClose}>
      <div className="flex flex-col items-center text-center">
        <motion.div
          initial={{ scale: 0.6, rotate: 8 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 16 }}
          className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl border border-teal/40 bg-teal/10"
        >
          <Sparkles size={30} className="text-teal" />
        </motion.div>

        <h2 className="font-display text-xl font-extrabold text-bone">هدية الساعة</h2>
        <p className="mt-1.5 text-sm text-bone/60">
          شاهد إعلان قصير واكسب جايزة مفاجئة - نوع وكمية الجايزة بتختلف كل مرة.
        </p>

        {lastGift && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-teal/30 bg-teal/10 px-3 py-2 text-sm text-teal">
            {(() => {
              const meta = RESOURCE_META[lastGift.resource];
              if (!meta) return null;
              const Icon = meta.icon;
              return (
                <>
                  <Icon size={16} style={{ color: meta.color }} />
                  <span className="font-bold">
                    +{Math.floor(lastGift.amount).toLocaleString('en-US')} {meta.label}
                  </span>
                </>
              );
            })()}
          </div>
        )}

        <div className="mt-6 w-full">
          {!lastGift ? (
            <AdvertisementButton
              kind="hourly_gift"
              label="شاهد إعلان → استلم هدية"
              successLabel="تم استلام الهدية!"
              onRewardCredited={(result) => {
                const granted = result?.grantedSummary || null;
                if (granted?.resource && granted?.amount) {
                  setLastGift(granted);
                  const meta = RESOURCE_META[granted.resource];
                  toastCoins(`هدية الساعة: +${Math.floor(granted.amount).toLocaleString('en-US')} ${meta?.label || ''}`);
                }
                onClaimed?.(result);
              }}
            />
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="focus-ring w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-bone/70 hover:text-bone"
            >
              إغلاق
            </button>
          )}
        </div>
      </div>
    </RewardPopupShell>
  );
}
