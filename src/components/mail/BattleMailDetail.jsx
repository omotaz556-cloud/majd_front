import { Users, Gift, Hammer, ListOrdered, HeartHandshake, BrickWall, Building2, Clock, Swords, Skull, Shield } from 'lucide-react';
import ReportSection from './ReportSection';
import ArmySummaryCard from './ArmySummaryCard';
import BattleEventsTimeline from './BattleEventsTimeline';
import ParticipantsSection from './ParticipantsSection';
import { RESOURCE_META, RESOURCE_ORDER } from '../../utils/resourceMeta';
import { WINNER_LABELS } from '../../utils/battleReportLabels';
import { formatDuration } from '../../utils/duration';

// =============================================================================
// Battle Reports removal - المصدر الوحيد لتفاصيل معركة منتهية بقى رسالة
// البريد نفسها (metadata اللي sendBattleMail في الباك إند بعتها -
// battleConsequences.service.js) - مفيش تبويب/صفحة/راوت منفصل لتقارير
// المعارك خالص بعد كده. الكومبوننت ده بيتفتح جوه الرسالة نفسها (Mail tab
// في ReportsMailPanel وصفحة /inbox) لما نوع الرسالة يكون 'battle_report' -
// بيعرض بالظبط نفس المحتوى المطلوب: Victory/Defeat, Attacker/Defender,
// Battle time, Casualties, Loot, Rewards, Full battle summary.
// =============================================================================

function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('ar-EG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function BattleMailDetail({ metadata }) {
  if (!metadata) return null;

  const {
    role,
    winner,
    attacker_name: attackerName,
    defender_name: defenderName,
    battle_time: battleTime,
    duration_seconds: durationSeconds,
    casualties = {},
    initial_troops: initialTroops = {},
    loot = {},
    defender_participants: defenderParticipants = [],
    wall_damage: wallDamage = [],
    building_damage: buildingDamage = [],
    key_battle_events: keyBattleEvents = [],
  } = metadata;

  const isDraw = winner === 'draw';
  const won = winner === role;
  const resultLabel = isDraw ? 'تعادل' : won ? 'انتصار' : 'هزيمة';
  const resultAccent = isDraw ? 'text-gold' : won ? 'text-teal' : 'text-alert';
  const ResultIcon = isDraw ? Shield : won ? Swords : Skull;

  const lootedEntries = RESOURCE_ORDER.filter((key) => Number(loot.looted?.[key]) > 0);
  const hasLoot = lootedEntries.length > 0;

  return (
    <div className="flex flex-col gap-4">
      <div className={`glass-card rounded-2xl border p-5 text-center ${isDraw ? 'border-gold/30' : won ? 'border-teal/30' : 'border-alert/30'}`}>
        <div className={`mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-ink-800/60 ${resultAccent}`}>
          <ResultIcon size={22} />
        </div>
        <p className={`font-display text-xl font-extrabold ${resultAccent}`}>{resultLabel}</p>
        <p className="mt-1 text-sm text-bone/70">
          {attackerName} <Swords size={12} className="inline text-bone/40" /> {defenderName}
        </p>
        <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-bone/40">
          <Clock size={13} />
          {formatDateTime(battleTime)}
          {durationSeconds != null && <span> · استغرقت {formatDuration(durationSeconds * 1000)}</span>}
        </p>
        {winner && !isDraw && (
          <p className="mt-1 text-xs text-bone/40">الفائز: {WINNER_LABELS[winner] || winner}</p>
        )}
      </div>

      <ReportSection icon={Users} title="ملخص الجيوش">
        <div className="grid gap-4 sm:grid-cols-2">
          <ArmySummaryCard label="المهاجم" accent="gold" casualtiesTotals={casualties.attacker} initialTroops={initialTroops.attacker || []} />
          <ArmySummaryCard label="المدافع" accent="teal" casualtiesTotals={casualties.defender} initialTroops={initialTroops.defender || []} />
        </div>
      </ReportSection>

      {defenderParticipants.length > 0 && (
        <ReportSection icon={HeartHandshake} title="مشاركو الدفاع" accent="blue">
          <ParticipantsSection participants={defenderParticipants} />
        </ReportSection>
      )}

      <ReportSection icon={Gift} title="الغنائم">
        {hasLoot ? (
          <div className="grid grid-cols-3 gap-3">
            {lootedEntries.map((key) => {
              const meta = RESOURCE_META[key];
              const Icon = meta.icon;
              return (
                <div key={key} className="rounded-xl border border-ink-600 bg-ink-800/60 p-3 text-center">
                  <Icon size={18} className="mx-auto mb-1" style={{ color: meta.color }} />
                  <p className="font-mono text-lg text-bone">{Math.floor(loot.looted[key]).toLocaleString('en-US')}</p>
                  <p className="text-xs text-bone/50">{meta.label}</p>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-bone/50">لا توجد غنائم في هذه المعركة.</p>
        )}
      </ReportSection>

      {(wallDamage.length > 0 || buildingDamage.length > 0) && (
        <ReportSection icon={Hammer} title="الأضرار">
          <div className="flex flex-col gap-2 text-sm">
            {wallDamage.length > 0 && (
              <p className="flex items-center gap-1.5 text-bone/70">
                <BrickWall size={14} className="text-alert" />
                اتدمر {wallDamage.filter((w) => w.destroyed).length} من الأسوار، وباقي الأسوار خدت أضرار.
              </p>
            )}
            {buildingDamage.length > 0 && (
              <p className="flex items-center gap-1.5 text-bone/70">
                <Building2 size={14} className="text-alert" />
                اتدمر {buildingDamage.filter((b) => b.destroyed).length} من المباني، وباقي المباني خدت أضرار.
              </p>
            )}
          </div>
        </ReportSection>
      )}

      <ReportSection icon={ListOrdered} title="أهم أحداث المعركة">
        <BattleEventsTimeline events={keyBattleEvents} />
      </ReportSection>
    </div>
  );
}
