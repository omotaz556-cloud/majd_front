import { Castle, Eye, Gift, Loader2, LogOut, MapPin, MessageCircle, Shield, ShieldPlus, Swords, Tent, User, Users, Crown, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDuration } from '../../utils/duration';

// ====== شريط "زيارة مملكة" - بيظهر فوق كل حاجة لما اللاعب يكون داخل مملكة
// لاعب/معسكر تاني (visit mode) بدل بوب أب معاينة منفصل. بيعرض اسم صاحب
// القلعة/المعسكر + مستواه + تحالفه + مسافته، وأي جيوش هجوم "ماشية" حاليًا
// تجاه القلعة دي (لو موجودة)، مع أفعال "دخول المملكة": هجوم (أو ملحوظة
// الحلفاء)، استكشاف، إرسال موارد (لو حليف)، ملف اللاعب، ورسالة - زي أي
// لعبة MMO استراتيجية حقيقية. الاستكشاف متاح حتى لمعسكرات NPC (استطلاع
// قبل الهجوم)، أما إرسال الموارد/الملف الشخصي/الرسالة فبتتطلب لاعب حقيقي
// (مش NPC) - كل حاجة تانية (المدينة/البناء/التحالف/العالم) بتتقفل من
// WorldHUD نفسه وقت الزيارة (شوف prop "visiting" في WorldHUD). ======
export default function VisitKingdomBar({
  loading,
  data,
  commander,
  now,
  onAttack,
  onScout,
  onSendResources,
  onSendReinforcements,
  onViewProfile,
  onMessage,
  onExit,
}) {
  if (loading && !data) {
    return (
      <div className="pointer-events-none absolute inset-x-0 top-0 z-40 flex justify-center p-3 sm:p-4">
        <div className="pointer-events-auto flex items-center gap-2 rounded-xl border border-amber-400/30 bg-stone-950/90 px-4 py-2 text-sm text-white/80 shadow-lg backdrop-blur-sm">
          <Loader2 size={16} className="animate-spin text-amber-400" />
          جاري الدخول للمملكة...
        </div>
      </div>
    );
  }

  if (!data) return null;

  const displayName = data.is_npc ? data.name : data.owner_name || 'قلعة لاعب';
  const canAttack = !data.is_same_alliance;
  const isRealPlayer = !data.is_npc;
  const canSendResources = isRealPlayer && data.is_same_alliance;
  // ====== Phase 1 (Reinforcement & Battle System) - Requirement 1: زر "إرسال
  // تعزيزات" بيبان بس لحلفاء حقيقيين (نفس شرط إرسال الموارد بالظبط - الباك
  // إند (allianceReinforcement.service.js::sendReinforcement) بيرفض أي حد مش
  // في نفس التحالف أو معسكر NPC أو قلعتك انت نفسها). ======
  const canSendReinforcement = isRealPlayer && data.is_same_alliance;
  const incoming = data.incoming_marches || [];

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-40 flex flex-col items-center gap-2 p-3 sm:p-4">
      <div className="pointer-events-auto flex w-full max-w-2xl flex-wrap items-center gap-2 rounded-2xl border border-amber-400/30 bg-stone-950/90 px-4 py-2.5 shadow-2xl backdrop-blur-sm">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
            data.is_npc ? 'bg-red-500/20 text-red-300' : 'bg-sky-500/20 text-sky-300'
          }`}
        >
          {data.is_npc ? <Tent size={16} /> : <Castle size={16} />}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-white">{displayName}</p>
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/50">
            <span>مستوى {data.town_hall_level ?? data.buildings?.find((b) => b.key === 'town_hall')?.level ?? 1}</span>
            {typeof data.distance_slots === 'number' && (
              <span className="flex items-center gap-1">
                <MapPin size={10} /> {data.distance_slots} خانة
              </span>
            )}
            {data.alliance_tag && (
              <span className={`flex items-center gap-1 ${data.is_same_alliance ? 'text-emerald-300' : 'text-white/60'}`}>
                <Shield size={10} /> {data.alliance_tag}
              </span>
            )}
            {/* ====== NEW: درجة صعوبة معسكر NPC (اسمها + ترتيبها بين كل
                الدرجات) - جاية من formatCastle.npc_tier (شوف
                npcTiers.config.npcTierInfo في الباك إند). null للاعبين
                الحقيقيين فمبتظهرش. ====== */}
            {data.npc_tier && (
              <span className="flex items-center gap-1 text-amber-300">
                <Star size={10} /> {data.npc_tier.name_ar} ({data.npc_tier.difficulty_rank}/{data.npc_tier.difficulty_out_of})
              </span>
            )}
            {/* ====== NEW (NPC Faction System) - اسم مملكة/فصيل الـ NPC (بندقة/
                مملكة الشمال/إمبراطورية الصحراء/عشيرة الشرق/لوردات التمرد) -
                جاي من formatCastle.npc_faction (شوف factions.config.factionInfo
                في الباك إند). null للاعبين الحقيقيين فمبتظهرش. ====== */}
            {data.npc_faction && (
              <span className="flex items-center gap-1 text-fuchsia-300">
                <Shield size={10} /> {data.npc_faction.name_ar}
              </span>
            )}
            {/* ====== NEW: اسم القائد الدفاعي - جاي من getDefenseView (شوف
                WorldMapPage.handleEnterKingdom) بدل ما يفضل مخزّن في الباك
                إند بس من غير ما يتعرض أبدًا. ====== */}
            {commander?.name && (
              <span className="flex items-center gap-1 text-rose-300">
                <Crown size={10} /> {commander.name}
              </span>
            )}
            {/* ====== NEW: مضاعف المكافآت الحقيقي (reward_multiplier) - بس
                للمعسكرات اللي مضاعفها أعلى من 1 (عشان مايبانش "×1" لكل
                قرية عادية من غير أي فايدة). ====== */}
            {typeof data.reward_multiplier === 'number' && data.reward_multiplier > 1 && (
              <span className="flex items-center gap-1 text-emerald-300">
                <Gift size={10} /> مكافآت ×{data.reward_multiplier.toFixed(1)}
              </span>
            )}
            {/* ====== Phase 1 (Reinforcement & Battle System) - Requirement 3:
                تعزيزات حلفاء واقفة فعليًا جوه القلعة دي بتبان هنا (إجمالي عدد
                الجنود من كل التعزيزات مع بعض) - data.reinforcements جاية من
                viewCastle في الباك إند. ====== */}
            {Array.isArray(data.reinforcements) && data.reinforcements.length > 0 && (
              <span className="flex items-center gap-1 text-sky-300">
                <Users size={10} />
                تعزيزات حلفاء: {data.reinforcements.reduce((sum, r) => sum + r.troops.reduce((s, t) => s + t.count, 0), 0).toLocaleString('ar-EG')}
              </span>
            )}
          </div>
        </div>

        {canAttack ? (
          <button
            type="button"
            onClick={onAttack}
            className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/15 px-3 py-1.5 text-xs font-bold text-red-300 hover:bg-red-500/25"
          >
            <Swords size={13} />
            هجوم
          </button>
        ) : (
          <span className="rounded-lg bg-emerald-500/10 px-2.5 py-1.5 text-xs font-bold text-emerald-300">حليف</span>
        )}

        <button
          type="button"
          onClick={onExit}
          className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-bold text-white/80 hover:bg-white/10"
        >
          <LogOut size={13} />
          خروج
        </button>
      </div>

      {/* ====== أفعال إضافية جوه المملكة: استكشاف (دايمًا متاح حتى لمعسكرات
          NPC)، إرسال موارد (لو حليف)، ملف اللاعب ورسالة (للاعبين الحقيقيين
          بس) ====== */}
      <div className="pointer-events-auto flex w-full max-w-2xl flex-wrap items-center justify-center gap-1.5">
        <ActionButton icon={<Eye size={13} />} label="استكشاف" onClick={onScout} />
        {canSendResources && (
          <ActionButton icon={<Gift size={13} />} label="إرسال موارد" onClick={onSendResources} />
        )}
        {canSendReinforcement && (
          <ActionButton icon={<ShieldPlus size={13} />} label="إرسال تعزيزات" onClick={onSendReinforcements} />
        )}
        {isRealPlayer && (
          <>
            <ActionButton icon={<User size={13} />} label="ملف اللاعب" onClick={onViewProfile} />
            <ActionButton icon={<MessageCircle size={13} />} label="رسالة" onClick={onMessage} />
          </>
        )}
      </div>

      {/* ====== *** تعديل: بقينا نعرض الجيوش "الماشية" و"الشغالة لايف" مع
          بعض هنا (مش الماشية بس زي قبل كده) - كل صف بقى فيه زرار "شاهد
          المعركة" يوديه مباشرة لصفحة المتابعة اللايف العامة (/battles/:id)،
          متاحة لأي زائر هنا (مش بس حليف صاحب القلعة أو المهاجم نفسه) - ده
          اللي كان ناقص قبل كده: مفيش أي طريقة لزائر عادي يوصل لمشاهدة
          معركة شغالة على قلعة بيزورها. ****** */}
      {incoming.length > 0 && (
        <div className="pointer-events-auto flex flex-wrap justify-center gap-1.5">
          {incoming.map((m) => {
            const isBattling = m.status === 'battling';
            const targetIso = isBattling ? m.battle_ends_at : m.arrives_at;
            const remaining = new Date(targetIso).getTime() - (now ?? Date.now());
            const troopCount = (m.troops || []).reduce((sum, t) => sum + t.count, 0);
            return (
              <span
                key={m.id}
                className="flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-950/80 px-2.5 py-1 text-[11px] font-bold text-red-300"
              >
                <Users size={11} />
                {isBattling
                  ? `المعركة شغالة لايف (${troopCount.toLocaleString('ar-EG')}) - هتتحسم خلال ${formatDuration(remaining)}`
                  : `جيش ماشي (${troopCount.toLocaleString('ar-EG')}) - يوصل خلال ${formatDuration(remaining)}`}
                <Link
                  to={`/battles/${m.id}`}
                  className="mr-0.5 flex items-center gap-1 rounded-full bg-red-500/20 px-2 py-0.5 text-red-200 hover:bg-red-500/35"
                >
                  <Eye size={10} />
                  شاهد
                </Link>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ActionButton({ icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-bold text-white/80 hover:bg-white/10"
    >
      {icon}
      {label}
    </button>
  );
}
