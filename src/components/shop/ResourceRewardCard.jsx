import { motion } from 'framer-motion';
import AdvertisementButton from '../../ads/components/AdvertisementButton';
import { RESOURCE_META } from '../../utils/resourceMeta';

/**
 * ====== ResourceRewardCard ======
 *
 * كارت واحد في بانل المتجر (داخل اللعبة - WorldMap) لمورد واحد (دهب/خشب/حجر)
 * - رقيقة فوق AdvertisementButton (kind: "resources", context: { resource })
 * بالظبط زي أي إجراء إعلان مكافئ تاني في المنصة. مفيش أي منطق منح هنا -
 * المبلغ الفعلي اللي هيتمنح بيتحدد من RESOURCE_REWARD_AMOUNTS في الباك إند
 * (rewardKinds.config.js)، مش بيتحسب أو يتفترض في الفرونت إند.
 *
 * Props:
 *   resource         : 'gold' | 'wood' | 'stone'
 *   onRewardCredited : بينادى بعد ما المكافأة تتمنح فعليًا (نفس تدفق
 *                      useRewardedAd → onRewardCredited)
 */
export default function ResourceRewardCard({ resource, onRewardCredited }) {
  const meta = RESOURCE_META[resource];
  if (!meta) return null;
  const Icon = meta.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-3 rounded-2xl border border-ink-600 bg-ink-800/80 p-5 text-center shadow-lg"
    >
      <div
        className="flex h-14 w-14 items-center justify-center rounded-full bg-ink-700/70"
        style={{ color: meta.color }}
      >
        <Icon size={28} />
      </div>
      <div>
        <h3 className="font-display text-lg font-bold text-bone">{meta.label}</h3>
        <p className="mt-0.5 text-xs text-bone/50">شاهد إعلان عشان تاخد كمية {meta.label}</p>
      </div>

      <AdvertisementButton
        kind="resources"
        context={{ resource }}
        label="شاهد إعلان"
        successLabel="تم إضافة المورد"
        resettable
        onRewardCredited={onRewardCredited}
      />
    </motion.div>
  );
}
