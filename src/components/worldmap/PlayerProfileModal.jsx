import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Shield, Landmark, Building2, MapPin, CalendarDays, Loader2, UserPlus, Check } from 'lucide-react';
import { getMyAlliance, invitePlayer } from '../../api/alliances';
import { toastSuccess, toastError } from '../ui/toast';
import { useAuth } from '../../context/AuthContext';

function formatJoinDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long' });
}

// ====== زرار "ادعُ للتحالف" - بيبان بس لما: (1) اللاعب اللي بيشوف الملف قائد
// أو ضابط في تحالف، (2) اللاعب المستهدف مش عضو في نفس التحالف ده بالفعل.
// بيجيب تحالفي بنفسه أول ما المودال يتفتح (زي أي نداء عرض تاني هنا - مفيش
// أي حاجة متسربة من WorldMapPage) عشان يقرر يعرض الزرار ولا لأ من غير ما
// يحتاج أي تغيير في شكل profile الجايّة من /users/:id/profile. أي تحقق
// حقيقي لصلاحية الدعوة بيحصل في السيرفر برضه (allianceService.invitePlayer) -
// الشرط هنا مجرد تلميح بصري. ======
function InviteToAllianceButton({ targetUserId }) {
  const { user: me } = useAuth();
  const [myAlliance, setMyAlliance] = useState(undefined); // undefined = لسه بيحمّل
  const [inviting, setInviting] = useState(false);
  const [invited, setInvited] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getMyAlliance()
      .then((alliance) => {
        if (!cancelled) setMyAlliance(alliance);
      })
      .catch(() => {
        if (!cancelled) setMyAlliance(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (myAlliance === undefined || myAlliance === null || !targetUserId || !me?._id) return null;

  const idStr = (v) => v?.toString?.() ?? String(v);
  const myMembership = myAlliance.members.find((m) => idStr(m.user_id) === idStr(me._id));
  const targetIsMember = myAlliance.members.some((m) => idStr(m.user_id) === idStr(targetUserId));
  const canManage = myMembership && ['leader', 'officer'].includes(myMembership.role);

  if (!canManage || targetIsMember) return null;

  function handleInvite() {
    if (inviting || invited) return;
    setInviting(true);
    invitePlayer(myAlliance.id, targetUserId)
      .then(() => {
        setInvited(true);
        toastSuccess('اتبعتت دعوة الانضمام للتحالف');
      })
      .catch((err) => toastError(err.response?.data?.error || 'تعذر إرسال الدعوة'))
      .finally(() => setInviting(false));
  }

  return (
    <button
      type="button"
      onClick={handleInvite}
      disabled={inviting || invited}
      className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500/20 py-2.5 text-sm font-bold text-amber-300 hover:bg-amber-500/30 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {inviting ? (
        <Loader2 size={15} className="animate-spin" />
      ) : invited ? (
        <Check size={15} />
      ) : (
        <UserPlus size={15} />
      )}
      {invited ? 'اتبعتت الدعوة' : `ادعُ لتحالف [${myAlliance.tag}]`}
    </button>
  );
}

// ====== بانل ملف اللاعب العام (View Player Profile) - بيبان لما اللاعب
// يضغط "ملف اللاعب" وهو داخل مملكة لاعب حقيقي تاني. بيانات عامة محدودة بس
// (اسم/تحالف/مستوى المبنى الرئيسي/عدد المباني/تاريخ الانضمام/المسافة) -
// جاية من نقطة /users/:id/profile الجديدة. targetUserId بيوصل من
// WorldMapPage (نفس owner_id اللي بيتبعت لـ getPlayerProfile) عشان زرار
// "ادعُ للتحالف" يقدر يستخدمه من غير ما نحتاج نضيفه لشكل profile نفسه. ======
export default function PlayerProfileModal({ open, loading, profile, targetUserId, onClose }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="player-profile-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-stone-950/80 px-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose?.();
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 10 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-stone-950/95 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-label="ملف اللاعب"
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute left-3 top-3 z-10 rounded-lg bg-black/40 p-1.5 text-white/60 hover:text-white"
              aria-label="إغلاق"
            >
              <X size={18} />
            </button>

            <div className="flex flex-col items-center gap-2 bg-[radial-gradient(ellipse_at_50%_0%,rgba(245,197,66,.16)_0%,transparent_70%)] px-6 pb-4 pt-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-sky-500/15 text-sky-300">
                <User size={26} />
              </div>
              {!loading && profile && (
                <>
                  <p className="text-center text-base font-bold text-white">{profile.name}</p>
                  {profile.alliance_tag && (
                    <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300">
                      <Shield size={11} />
                      [{profile.alliance_tag}] {profile.alliance_name}
                    </span>
                  )}
                </>
              )}
            </div>

            <div className="px-5 pb-5">
              {loading || !profile ? (
                <div className="flex items-center justify-center gap-2 py-8 text-sm text-white/60">
                  <Loader2 size={16} className="animate-spin text-sky-400" />
                  جاري تحميل الملف الشخصي...
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <StatTile icon={<Landmark size={15} />} label="المبنى الرئيسي" value={`مستوى ${profile.town_hall_level}`} />
                    <StatTile icon={<Building2 size={15} />} label="عدد المباني" value={profile.building_count} />
                    {typeof profile.distance_slots === 'number' && (
                      <StatTile icon={<MapPin size={15} />} label="المسافة" value={`${profile.distance_slots} خانة`} />
                    )}
                    <StatTile icon={<CalendarDays size={15} />} label="عضو منذ" value={formatJoinDate(profile.member_since)} />
                  </div>

                  <div className="mt-4">
                    <InviteToAllianceButton targetUserId={targetUserId} />
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function StatTile({ icon, label, value }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-2 py-2.5 text-center">
      <span className="text-amber-300">{icon}</span>
      <span className="text-[10px] text-white/45">{label}</span>
      <span className="text-xs font-bold text-white">{value}</span>
    </div>
  );
}
