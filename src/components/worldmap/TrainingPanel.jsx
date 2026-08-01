import { useState } from 'react';
import { Swords, Shield, Heart, Plus, Minus, Clock, Loader2, X, Lock, Users, Gem, Zap } from 'lucide-react';
import { RESOURCE_META, RESOURCE_ORDER } from '../../utils/resourceMeta';
import { formatDuration, formatDurationLabel } from '../../utils/duration';
import { useWalletBalance } from '../../context/WalletBalanceContext';
import { useAuth } from '../../context/AuthContext';

// ====== بانل تدريب الوحدات - جزء إضافي جوه BuildingInfoModal لما المبنى
// المختار يكون الثكنة (barracks) - كل حاجة (أنواع الوحدات، الجيش الحالي،
// طابور التدريب) جايه جاهزة من الباك إند (castle/troop-types + castle/me)
// من غير ما الفرونت إند يفترض أي رقم بنفسه، عدا حساب "التكلفة الإجمالية
// = تكلفة الوحدة × العدد" اللي بيتعمل هنا لحظيًا عشان اللاعب يشوفه وهو
// لسه بيغيّر العدّاد من غير ما يبعت طلب لكل تغيير. ======
export default function TrainingPanel({
  troopTypes,
  troopTypesLoading,
  army,
  trainingQueue,
  maxQueueSize,
  resources,
  now,
  submittingKey,
  cancelSubmittingId,
  speedupSubmittingId,
  onTrain,
  onTrainPremium,
  onCancel,
  onSpeedup,
}) {
  const queueFull = (trainingQueue?.length || 0) >= (maxQueueSize || 1);

  return (
    <div className="mt-2 border-t border-white/10 pt-4">
      {/* ====== جيشك الحالي ====== */}
      <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-white/70">
        <Users size={13} />
        جيشك الحالي
      </p>
      {army && army.length > 0 ? (
        <div className="mb-4 flex flex-wrap gap-2">
          {army.map((stack) => (
            <span
              key={stack.key}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white/80"
            >
              <Swords size={12} className="text-amber-300" />
              {stack.name}
              <span className="font-mono text-white">{stack.count.toLocaleString('ar-EG')}</span>
            </span>
          ))}
        </div>
      ) : (
        <p className="mb-4 text-xs text-white/40">لسه معندكش أي جنود متدرَّبين - ابدأ أول أمر تدريب تحت.</p>
      )}

      {/* ====== طابور التدريب ====== */}
      {trainingQueue && trainingQueue.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 flex items-center justify-between text-xs font-bold text-white/70">
            <span>طابور التدريب</span>
            <span className="font-mono text-white/40">
              {trainingQueue.length}/{maxQueueSize}
            </span>
          </p>
          <ul className="space-y-1.5">
            {trainingQueue.map((order) => (
              <li
                key={order.id}
                className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5">
                    <Clock size={13} />
                    {order.quantity.toLocaleString('ar-EG')}× {order.name}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="font-mono">
                      {formatDuration(new Date(order.completes_at).getTime() - (now ?? Date.now()))}
                    </span>
                    <button
                      type="button"
                      onClick={() => onCancel?.(order.id)}
                      disabled={cancelSubmittingId === order.id || speedupSubmittingId === order.id}
                      className="rounded-md bg-black/30 p-1 text-white/50 hover:text-white disabled:opacity-40"
                      aria-label="إلغاء أمر التدريب"
                    >
                      {cancelSubmittingId === order.id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <X size={12} />
                      )}
                    </button>
                  </span>
                </div>

                {/* ====== تسريع فوري بالجواهر - التكلفة جاهزة من الباك إند
                    (speedup_gem_cost) وبتتغيّر تلقائيًا مع الوقت المتبقي. ====== */}
                {onSpeedup && (
                  <button
                    type="button"
                    onClick={() => onSpeedup(order.id)}
                    disabled={cancelSubmittingId === order.id || speedupSubmittingId === order.id}
                    className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-md bg-gradient-to-b from-fuchsia-400 to-fuchsia-600 py-1.5 text-[11px] font-bold text-white shadow transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {speedupSubmittingId === order.id ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Gem size={12} />
                    )}
                    {speedupSubmittingId === order.id
                      ? 'جاري التسريع...'
                      : `سرّع فورًا بـ ${order.speedup_gem_cost?.toLocaleString('ar-EG')} جوهرة`}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ====== درّب وحدات جديدة ====== */}
      <p className="mb-2 text-xs font-bold text-white/70">درّب وحدات جديدة</p>
      {troopTypesLoading && (
        <div className="flex items-center justify-center py-6 text-white/50">
          <Loader2 className="animate-spin" size={18} />
        </div>
      )}
      {!troopTypesLoading && (
        <div className="space-y-2.5">
          {(troopTypes || []).map((troop) =>
            troop.is_premium ? (
              <PremiumTroopCard
                key={troop.key}
                troop={troop}
                submitting={submittingKey === troop.key}
                disabledOther={Boolean(submittingKey) && submittingKey !== troop.key}
                onTrain={(quantity) => onTrainPremium?.(troop.key, quantity)}
              />
            ) : (
              <TroopCard
                key={troop.key}
                troop={troop}
                resources={resources}
                queueFull={queueFull}
                submitting={submittingKey === troop.key}
                disabledOther={Boolean(submittingKey) && submittingKey !== troop.key}
                onTrain={(quantity) => onTrain?.(troop.key, quantity)}
              />
            )
          )}
        </div>
      )}
    </div>
  );
}

// ====== كارت وحدة مميّزة (بالجواهر/رصيد المحفظة) - مختلفة عن TroopCard
// العادية في 3 حاجات: (1) التكلفة بالجواهر (رصيد المحفظة) مش الموارد،
// بنستخدم useWalletBalance عشان نعرف الرصيد الحالي ونحسب canAfford بيه،
// (2) مفيش أي اعتماد على queueFull (الوحدة بتتدرب فورًا من غير طابور -
// train_seconds: 0 من الباك إند)، (3) مفيش عدّاد وقت تدريب يتعرض خالص. ======
function PremiumTroopCard({ troop, submitting, disabledOther, onTrain }) {
  const [quantity, setQuantity] = useState(1);
  const { balance } = useWalletBalance();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const gemCost = troop.gem_cost_per_unit * quantity;
  // ====== حساب الأدمن عنده Unlimited Gems فعليًا على الباك إند
  // (castle.service.js::startPremiumTraining بيتجاهل خصم المحفظة تمامًا
  // لو isAdmin). فالفرونت إند لازم يعكس ده هنا برضه، وإلا الزرار هيفضل
  // يتقفل على الرصيد المعروض بس، حتى لو الطلب هيعدي عادي فعليًا. ======
  const canAfford = isAdmin || (balance != null && balance >= gemCost);
  const disabled = !troop.unlocked || !canAfford || submitting || disabledOther || quantity < 1;

  function adjust(delta) {
    setQuantity((q) => Math.min(500, Math.max(1, q + delta)));
  }

  return (
    <div
      className={`rounded-xl border border-fuchsia-400/30 bg-gradient-to-b from-fuchsia-500/10 to-white/5 p-3 ${
        !troop.unlocked ? 'opacity-60' : ''
      }`}
    >
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <div>
          <p className="flex items-center gap-1.5 font-bold text-white">
            {troop.name}
            <span className="flex items-center gap-1 rounded-full bg-fuchsia-500/20 px-1.5 py-0.5 text-[10px] font-bold text-fuchsia-300">
              <Gem size={10} />
              مميّزة
            </span>
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-white/50">{troop.description}</p>
        </div>
      </div>

      {/* ====== إحصائيات الوحدة (هجوم/دفاع/إتش بي) ====== */}
      <div className="mb-2 flex items-center gap-3 text-[11px] text-white/50">
        <span className="flex items-center gap-1">
          <Swords size={11} className="text-red-400" />
          {troop.stats.attack}
        </span>
        <span className="flex items-center gap-1">
          <Shield size={11} className="text-sky-400" />
          {troop.stats.defense}
        </span>
        <span className="flex items-center gap-1">
          <Heart size={11} className="text-pink-400" />
          {troop.stats.hp}
        </span>
        <span className="flex items-center gap-1 text-emerald-300">
          <Zap size={11} />
          فوري
        </span>
      </div>

      {!troop.unlocked ? (
        <p className="flex items-center gap-1.5 text-xs text-red-400">
          <Lock size={12} />
          لازم ترقّي الثكنة لمستوى {troop.requires_barracks_level} عشان تفتح الوحدة دي
        </p>
      ) : (
        <>
          {/* ====== عدّاد الكمية ====== */}
          <div className="mb-2 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => adjust(-1)}
              className="rounded-lg bg-white/10 p-1.5 text-white/70 hover:bg-white/20"
              aria-label="تقليل العدد"
            >
              <Minus size={13} />
            </button>
            <input
              type="number"
              inputMode="numeric"
              value={quantity}
              onChange={(e) => setQuantity(Math.min(500, Math.max(1, Number(e.target.value) || 1)))}
              className="w-14 rounded-lg border border-white/10 bg-black/30 py-1 text-center font-mono text-sm text-white"
            />
            <button
              type="button"
              onClick={() => adjust(1)}
              className="rounded-lg bg-white/10 p-1.5 text-white/70 hover:bg-white/20"
              aria-label="زيادة العدد"
            >
              <Plus size={13} />
            </button>
          </div>

          <div className="mb-2 flex flex-wrap items-center justify-center gap-2">
            <span
              className={`flex items-center gap-1 rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-xs ${
                canAfford ? 'text-fuchsia-300' : 'text-red-400'
              }`}
            >
              <Gem size={12} />
              {gemCost.toLocaleString('ar-EG')}
            </span>
          </div>

          {!canAfford && <p className="mb-2 text-center text-xs text-red-400">رصيد المحفظة مش كفاية للعدد ده لسه</p>}

          <button
            type="button"
            disabled={disabled}
            onClick={() => onTrain(quantity)}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-b from-fuchsia-400 to-fuchsia-600 py-2 text-sm font-bold text-white shadow transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Gem size={14} />}
            {submitting ? 'جاري التدريب...' : 'درّب بالجواهر'}
          </button>
        </>
      )}
    </div>
  );
}

function TroopCard({ troop, resources, queueFull, submitting, disabledOther, onTrain }) {
  const [quantity, setQuantity] = useState(1);

  const cost = {
    gold: troop.cost_per_unit.gold * quantity,
    wood: troop.cost_per_unit.wood * quantity,
    stone: troop.cost_per_unit.stone * quantity,
  };
  const totalSeconds = troop.seconds_per_unit * quantity;

  const missing = resources ? RESOURCE_ORDER.filter((k) => cost[k] > 0 && resources[k].stored < cost[k]) : [];
  const canAfford = missing.length === 0;
  const disabled =
    !troop.unlocked || !canAfford || queueFull || submitting || disabledOther || quantity < 1;

  function adjust(delta) {
    setQuantity((q) => Math.min(500, Math.max(1, q + delta)));
  }

  return (
    <div className={`rounded-xl border border-white/10 bg-white/5 p-3 ${!troop.unlocked ? 'opacity-60' : ''}`}>
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <div>
          <p className="font-bold text-white">{troop.name}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-white/50">{troop.description}</p>
        </div>
      </div>

      {/* ====== إحصائيات الوحدة (هجوم/دفاع/إتش بي) ====== */}
      <div className="mb-2 flex items-center gap-3 text-[11px] text-white/50">
        <span className="flex items-center gap-1">
          <Swords size={11} className="text-red-400" />
          {troop.stats.attack}
        </span>
        <span className="flex items-center gap-1">
          <Shield size={11} className="text-sky-400" />
          {troop.stats.defense}
        </span>
        <span className="flex items-center gap-1">
          <Heart size={11} className="text-pink-400" />
          {troop.stats.hp}
        </span>
      </div>

      {!troop.unlocked ? (
        <p className="flex items-center gap-1.5 text-xs text-red-400">
          <Lock size={12} />
          لازم ترقّي الثكنة لمستوى {troop.requires_barracks_level} عشان تفتح الوحدة دي
        </p>
      ) : (
        <>
          {/* ====== عدّاد الكمية ====== */}
          <div className="mb-2 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => adjust(-1)}
              className="rounded-lg bg-white/10 p-1.5 text-white/70 hover:bg-white/20"
              aria-label="تقليل العدد"
            >
              <Minus size={13} />
            </button>
            <input
              type="number"
              inputMode="numeric"
              value={quantity}
              onChange={(e) => setQuantity(Math.min(500, Math.max(1, Number(e.target.value) || 1)))}
              className="w-14 rounded-lg border border-white/10 bg-black/30 py-1 text-center font-mono text-sm text-white"
            />
            <button
              type="button"
              onClick={() => adjust(1)}
              className="rounded-lg bg-white/10 p-1.5 text-white/70 hover:bg-white/20"
              aria-label="زيادة العدد"
            >
              <Plus size={13} />
            </button>
          </div>

          <div className="mb-2 flex flex-wrap items-center justify-center gap-2">
            {RESOURCE_ORDER.filter((k) => cost[k] > 0).map((k) => {
              const meta = RESOURCE_META[k];
              const Icon = meta.icon;
              const has = resources && resources[k].stored >= cost[k];
              return (
                <span
                  key={k}
                  className={`flex items-center gap-1 rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-xs ${has ? 'text-white/80' : 'text-red-400'}`}
                >
                  <Icon size={12} style={{ color: meta.color }} />
                  {cost[k].toLocaleString('ar-EG')}
                </span>
              );
            })}
            <span className="flex items-center gap-1 rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-xs text-white/60">
              <Clock size={12} />
              {formatDurationLabel(totalSeconds)}
            </span>
          </div>

          {!canAfford && <p className="mb-2 text-center text-xs text-red-400">الموارد مش كفاية للعدد ده لسه</p>}
          {canAfford && queueFull && (
            <p className="mb-2 text-center text-xs text-white/50">طابور التدريب مليان - استنى أمر يخلص أو رقّي الثكنة</p>
          )}

          <button
            type="button"
            disabled={disabled}
            onClick={() => onTrain(quantity)}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-b from-amber-400 to-amber-600 py-2 text-sm font-bold text-stone-900 shadow transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Swords size={14} />}
            {submitting ? 'جاري البدء...' : 'درّب'}
          </button>
        </>
      )}
    </div>
  );
}
