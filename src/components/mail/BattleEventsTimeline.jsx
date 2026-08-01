import {
  Swords,
  Flame,
  Building2,
  Skull,
  Coins,
  PackageX,
  Trophy,
  Handshake,
  Circle,
} from 'lucide-react';
import { BATTLE_EVENT_LABELS } from '../../utils/battleReportLabels';

// أيقونة مناسبة لكل نوع حدث - عرض بصري بس (مفيش أنيميشن)، راجع
// eventGenerator.js في الباك إند لأنواع الأحداث الممكنة.
const EVENT_ICONS = {
  battle_started: Swords,
  wall_breached: Flame,
  towers_destroyed: Building2,
  buildings_destroyed: Building2,
  heavy_attacker_losses: Skull,
  heavy_defender_losses: Skull,
  resources_looted: Coins,
  loot_capped: PackageX,
  battle_ended: Trophy,
  battle_ended_draw: Handshake,
};

// ====== قائمة أحداث المعركة الرئيسية بترتيبها الزمني كما وصلت من
// battle.battle_result.key_battle_events - عرض ثابت بلا حركة (لا Replay). ======
export default function BattleEventsTimeline({ events = [] }) {
  if (events.length === 0) {
    return <p className="text-sm text-bone/50">لا توجد أحداث مسجّلة لهذه المعركة.</p>;
  }

  return (
    <ol className="space-y-3">
      {events.map((event, index) => {
        const Icon = EVENT_ICONS[event.type] || Circle;
        return (
          <li key={index} className="flex items-start gap-3">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-ink-600 bg-ink-800 text-gold">
              <Icon size={14} />
            </span>
            <div>
              <p className="text-sm font-semibold text-bone">
                {BATTLE_EVENT_LABELS[event.type] || event.type}
              </p>
              {event.message && <p className="text-xs text-bone/60">{event.message}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
