import { Coins } from 'lucide-react';
import ResourceRewardCard from '../../shop/ResourceRewardCard';
import { RESOURCE_ORDER, RESOURCE_META } from '../../../utils/resourceMeta';
import { toastCoins } from '../../ui/toast';
import PanelShell from './PanelShell';

// =============================================================================
// Shop Panel (in-game) - "🛒 المتجر" - بيتفتح من زرار "المتجر" جوّه WorldHUD
// (activePanel === 'shop' في WorldMapPage) - نفس فلسفة HospitalPanel/
// RepairPanel/RankingPanel بالظبط: بانل جوّه مشهد اللعبة، مش راوت/صفحة
// مستقلة. فتح المتجر أو قفله ما بيغيّرش الصفحة ولا بيعمل reload للعبة -
// اللاعب فاضل جوّه نفس مشهد WorldMapPage طول الوقت.
//
// عرض كروت مكافآت موارد (دهب/خشب/حجر) - كل كارت بيستخدم AdvertisementButton
// (kind: "resources") بالظبط زي أي إجراء إعلان مكافئ تاني في المنصة (عن
// طريق ResourceRewardCard المشترك)، فمفيش أي تكرار لمنطق منح الموارد هنا.
// =============================================================================

function ShopPanelContent() {
  return (
    <div className="p-4">
      <div className="mb-4 text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-gold/10 text-gold">
          <Coins size={22} />
        </div>
        <p className="text-sm text-white/60">شاهد إعلان وخد موارد فورية لقلعتك</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {RESOURCE_ORDER.map((resource) => (
          <ResourceRewardCard
            key={resource}
            resource={resource}
            onRewardCredited={(result) => {
              const granted = result?.grantedSummary?.amount ?? result?.reward;
              const meta = RESOURCE_META[resource];
              toastCoins(granted ? `+${Math.floor(granted).toLocaleString('en-US')} ${meta.label}` : 'تم إضافة المورد');
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ====== نقطة الدخول - بتتفتح من زرار "المتجر" في WorldHUD (نفس فلسفة
// RankingPanel/QuestsPanel: بانل جوّه مشهد اللعبة). ======
export default function ShopPanel({ open, onClose }) {
  return (
    <PanelShell open={open} onClose={onClose} title="🛒 المتجر" icon={Coins}>
      <ShopPanelContent />
    </PanelShell>
  );
}
