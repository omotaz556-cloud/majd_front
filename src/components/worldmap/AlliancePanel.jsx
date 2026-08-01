import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Loader2,
  Shield,
  Users,
  Crown,
  Star,
  Plus,
  Search,
  LogOut,
  UserPlus,
  Check,
  Ban,
  ArrowLeftRight,
  Trash2,
  Mail,
  Megaphone,
  HandHelping,
  Flag,
} from 'lucide-react';
import { toastSuccess, toastError } from '../ui/toast';
import {
  getMyAlliance,
  createAlliance,
  updateAlliance,
  disbandAlliance,
  listAlliances,
  requestToJoin,
  cancelJoinRequest,
  getMyInvites,
  respondToInvite,
  getPendingRequests,
  respondToRequest,
  kickMember,
  leaveAlliance,
  setMemberRole,
  transferLeadership,
} from '../../api/alliances';
import AllianceMailTab from '../alliance/AllianceMailTab';
import AllianceAnnouncementsTab from '../alliance/AllianceAnnouncementsTab';
import AllianceHelpTab from '../alliance/AllianceHelpTab';
import AllianceRalliesTab from '../alliance/AllianceRalliesTab';
import AllianceReinforcementsTab from '../alliance/AllianceReinforcementsTab';

// ====== بانل "التحالفات" - نفس ستايل WorldPanel (شيت بيطلع من تحت على
// الموبايل / مودال في النص على الشاشة الكبيرة). بيدير حالتين رئيسيتين:
// - عندك تحالف بالفعل -> بانل إدارة (أعضاء، دعوات، طلبات، إعدادات)
// - معندكش تحالف -> بانل تصفّح/إنشاء/دعواتي المعلّقة ======
export default function AlliancePanel({ open, onClose, currentUserId, onViewBattle }) {
  const [myAlliance, setMyAlliance] = useState(null);
  const [loading, setLoading] = useState(false);

  function loadMyAlliance() {
    setLoading(true);
    getMyAlliance()
      .then((alliance) => setMyAlliance(alliance))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (open) loadMyAlliance();
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="alliance-panel-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="pointer-events-auto fixed inset-0 z-40 flex items-end justify-center bg-stone-950/70 backdrop-blur-sm sm:items-center"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose?.();
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-white/10 bg-stone-950/95 shadow-2xl sm:rounded-2xl"
            role="dialog"
            aria-modal="true"
            aria-label="التحالفات"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div className="flex items-center gap-2 text-white">
                <Shield size={16} className="text-amber-300" />
                <h3 className="font-bold">التحالف</h3>
              </div>
              <button type="button" onClick={onClose} aria-label="إغلاق" className="rounded-lg bg-white/5 p-1.5 text-white/60 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              {loading && (
                <div className="flex items-center justify-center py-14 text-white/50">
                  <Loader2 className="animate-spin" size={22} />
                </div>
              )}

              {!loading && myAlliance && (
                <MyAllianceView
                  alliance={myAlliance}
                  currentUserId={currentUserId}
                  onChanged={loadMyAlliance}
                  onLeftOrDisbanded={() => setMyAlliance(null)}
                  onViewBattle={onViewBattle}
                />
              )}

              {!loading && !myAlliance && <NoAllianceView onJoined={loadMyAlliance} />}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ====================================================================
// حالة "معندكش تحالف" - تبويبات: تصفّح التحالفات / إنشاء تحالف / دعواتي
// ====================================================================
function NoAllianceView({ onJoined }) {
  const [tab, setTab] = useState('browse');

  return (
    <div>
      <div className="mb-3 flex gap-2">
        <MiniTabButton label="تصفّح" active={tab === 'browse'} onClick={() => setTab('browse')} />
        <MiniTabButton label="إنشاء" active={tab === 'create'} onClick={() => setTab('create')} />
        <MiniTabButton label="دعواتي" active={tab === 'invites'} onClick={() => setTab('invites')} />
      </div>

      {tab === 'browse' && <BrowseAlliances onJoined={onJoined} />}
      {tab === 'create' && <CreateAllianceForm onCreated={onJoined} />}
      {tab === 'invites' && <MyInvites onJoined={onJoined} />}
    </div>
  );
}

function MiniTabButton({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3 py-2 text-xs font-bold transition-colors ${
        active ? 'bg-amber-500/20 text-amber-300' : 'bg-white/5 text-white/60 hover:text-white'
      }`}
    >
      {label}
    </button>
  );
}

function BrowseAlliances({ onJoined }) {
  const [query, setQuery] = useState('');
  const [alliances, setAlliances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [requestingId, setRequestingId] = useState(null);
  const [requestedIds, setRequestedIds] = useState(new Set());

  function load(search) {
    setLoading(true);
    listAlliances(search)
      .then((data) => setAlliances(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSearch(e) {
    e.preventDefault();
    load(query);
  }

  function handleRequestJoin(allianceId) {
    if (requestingId) return;
    setRequestingId(allianceId);
    requestToJoin(allianceId)
      .then(() => {
        setRequestedIds((prev) => new Set(prev).add(allianceId));
        toastSuccess('اتبعت طلب الانضمام - استنى موافقة قائد/ضابط التحالف');
      })
      .catch((err) => toastError(err.response?.data?.error || 'حصل خطأ - حاول تاني'))
      .finally(() => setRequestingId(null));
  }

  return (
    <div>
      <form onSubmit={handleSearch} className="mb-3 flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="دوّر باسم أو اختصار التحالف..."
          className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-amber-400/50 focus:outline-none"
        />
        <button type="submit" className="flex items-center justify-center rounded-lg bg-white/10 px-3 text-white/70 hover:text-white">
          <Search size={15} />
        </button>
      </form>

      {loading && (
        <div className="flex items-center justify-center py-10 text-white/50">
          <Loader2 className="animate-spin" size={22} />
        </div>
      )}

      {!loading && alliances.length === 0 && (
        <p className="px-2 py-8 text-center text-sm text-white/50">مفيش تحالفات ظاهرة - جرّب كلمة بحث تانية.</p>
      )}

      {!loading && alliances.length > 0 && (
        <div className="space-y-2.5">
          {alliances.map((a) => (
            <div key={a.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-bold text-white">
                    <span className="text-amber-300">[{a.tag}]</span> {a.name}
                  </p>
                  <p className="flex items-center gap-1 text-[11px] text-white/50">
                    <Users size={11} /> {a.member_count}/{a.max_members} عضو
                  </p>
                </div>
                <button
                  type="button"
                  disabled={requestingId === a.id || requestedIds.has(a.id)}
                  onClick={() => handleRequestJoin(a.id)}
                  className="flex items-center gap-1.5 rounded-lg bg-amber-500/20 px-3 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-500/30 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {requestingId === a.id ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : requestedIds.has(a.id) ? (
                    <Check size={12} />
                  ) : (
                    <UserPlus size={12} />
                  )}
                  {requestedIds.has(a.id) ? 'اتبعت الطلب' : 'اطلب انضمام'}
                </button>
              </div>
              {a.description && <p className="mt-2 text-[11px] text-white/40">{a.description}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CreateAllianceForm({ onCreated }) {
  const [name, setName] = useState('');
  const [tag, setTag] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    createAlliance({ name, tag, description })
      .then(() => {
        toastSuccess('اتأسس التحالف! 🛡️');
        onCreated?.();
      })
      .catch((err) => toastError(err.response?.data?.error || 'حصل خطأ - حاول تاني'))
      .finally(() => setSubmitting(false));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-bold text-white/70">اسم التحالف</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          required
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-amber-400/50 focus:outline-none"
          placeholder="مثال: فرسان الشمال"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-bold text-white/70">الاختصار (2-5 حروف/أرقام إنجليزية)</label>
        <input
          type="text"
          value={tag}
          onChange={(e) => setTag(e.target.value.toUpperCase())}
          maxLength={5}
          required
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm uppercase tracking-widest text-white placeholder:text-white/30 focus:border-amber-400/50 focus:outline-none"
          placeholder="KOTN"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-bold text-white/70">الوصف (اختياري)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
          rows={3}
          className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-amber-400/50 focus:outline-none"
          placeholder="اكتب حاجة عن التحالف بتاعك..."
        />
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-b from-amber-400 to-amber-600 py-2 text-sm font-bold text-stone-900 shadow disabled:cursor-not-allowed disabled:opacity-40"
      >
        {submitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
        {submitting ? 'جاري الإنشاء...' : 'أسّس التحالف'}
      </button>
    </form>
  );
}

function MyInvites({ onJoined }) {
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [respondingId, setRespondingId] = useState(null);

  function load() {
    setLoading(true);
    getMyInvites()
      .then((data) => setInvites(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  function respond(inviteId, accept) {
    if (respondingId) return;
    setRespondingId(inviteId);
    respondToInvite(inviteId, accept)
      .then((result) => {
        if (result.joined) {
          toastSuccess('انضممت للتحالف! 🛡️');
          onJoined?.();
        } else {
          toastSuccess('اترفضت الدعوة');
          setInvites((prev) => prev.filter((i) => i.id !== inviteId));
        }
      })
      .catch((err) => toastError(err.response?.data?.error || 'حصل خطأ - حاول تاني'))
      .finally(() => setRespondingId(null));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 text-white/50">
        <Loader2 className="animate-spin" size={22} />
      </div>
    );
  }

  if (invites.length === 0) {
    return <p className="px-2 py-8 text-center text-sm text-white/50">مفيش دعوات تحالف وصلتلك لسه.</p>;
  }

  return (
    <div className="space-y-2.5">
      {invites.map((invite) => (
        <div key={invite.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="font-bold text-white">
              <span className="text-amber-300">[{invite.alliance?.tag}]</span> {invite.alliance?.name}
            </p>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={respondingId === invite.id}
                onClick={() => respond(invite.id, true)}
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 disabled:opacity-40"
                aria-label="قبول"
              >
                {respondingId === invite.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={13} />}
              </button>
              <button
                type="button"
                disabled={respondingId === invite.id}
                onClick={() => respond(invite.id, false)}
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 disabled:opacity-40"
                aria-label="رفض"
              >
                <Ban size={13} />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ====================================================================
// حالة "عندك تحالف" - إدارة الأعضاء/الدعوات/الطلبات/الإعدادات
// ====================================================================
function MyAllianceView({ alliance, currentUserId, onChanged, onLeftOrDisbanded, onViewBattle }) {
  const [tab, setTab] = useState('members');
  const me = alliance.members.find((m) => m.user_id === currentUserId || m.user_id?.toString?.() === currentUserId);
  const myRole = me?.role || 'member';
  const isLeaderOrOfficer = myRole === 'leader' || myRole === 'officer';

  return (
    <div>
      <div className="mb-3 rounded-xl border border-amber-400/20 bg-amber-500/5 p-3">
        <p className="font-bold text-white">
          <span className="text-amber-300">[{alliance.tag}]</span> {alliance.name}
        </p>
        <p className="mt-1 flex items-center gap-1 text-[11px] text-white/50">
          <Users size={11} /> {alliance.member_count}/{alliance.max_members} عضو
        </p>
        {alliance.description && <p className="mt-1.5 text-[11px] text-white/40">{alliance.description}</p>}
      </div>

      {/* ====== كل أنظمة التحالف (البريد/الإعلانات/المساعدة/التجمّعات/
          التعزيزات) بقت تبويبات هنا جوّه نفس البانل - مفيش راوتات مستقلة
          ليها ولا صفحات، عشان اللاعب يفضل جوّه مشهد اللعبة. ====== */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        <MiniTabButton label="الأعضاء" active={tab === 'members'} onClick={() => setTab('members')} />
        {isLeaderOrOfficer && <MiniTabButton label="الطلبات" active={tab === 'requests'} onClick={() => setTab('requests')} />}
        <MiniTabButton label="البريد" active={tab === 'mail'} onClick={() => setTab('mail')} />
        <MiniTabButton label="الإعلانات" active={tab === 'announcements'} onClick={() => setTab('announcements')} />
        <MiniTabButton label="مساعدة" active={tab === 'help'} onClick={() => setTab('help')} />
        <MiniTabButton label="التجمّعات" active={tab === 'rallies'} onClick={() => setTab('rallies')} />
        <MiniTabButton label="التعزيزات" active={tab === 'reinforcements'} onClick={() => setTab('reinforcements')} />
        <MiniTabButton label="إعدادات" active={tab === 'settings'} onClick={() => setTab('settings')} />
      </div>

      {tab === 'members' && (
        <MembersList
          alliance={alliance}
          myRole={myRole}
          currentUserId={currentUserId}
          onChanged={onChanged}
        />
      )}
      {tab === 'requests' && isLeaderOrOfficer && <RequestsList allianceId={alliance.id} onChanged={onChanged} />}
      {tab === 'mail' && <AllianceMailTab alliance={alliance} myRole={myRole} />}
      {tab === 'announcements' && <AllianceAnnouncementsTab alliance={alliance} myRole={myRole} />}
      {tab === 'help' && <AllianceHelpTab alliance={alliance} myRole={myRole} />}
      {tab === 'rallies' && <AllianceRalliesTab alliance={alliance} myRole={myRole} onViewBattle={onViewBattle} />}
      {tab === 'reinforcements' && <AllianceReinforcementsTab alliance={alliance} />}
      {tab === 'settings' && (
        <SettingsView
          alliance={alliance}
          myRole={myRole}
          currentUserId={currentUserId}
          onChanged={onChanged}
          onLeftOrDisbanded={onLeftOrDisbanded}
        />
      )}
    </div>
  );
}

function RoleBadge({ role }) {
  if (role === 'leader') {
    return (
      <span className="flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300">
        <Crown size={10} /> قائد
      </span>
    );
  }
  if (role === 'officer') {
    return (
      <span className="flex items-center gap-1 rounded-full bg-sky-500/20 px-2 py-0.5 text-[10px] font-bold text-sky-300">
        <Star size={10} /> ضابط
      </span>
    );
  }
  return null;
}

function MembersList({ alliance, myRole, currentUserId, onChanged }) {
  const [actingId, setActingId] = useState(null);

  function idStr(v) {
    return v?.toString?.() ?? String(v);
  }

  function canKick(target) {
    if (idStr(target.user_id) === idStr(currentUserId)) return false;
    if (target.role === 'leader') return false;
    if (myRole === 'leader') return true;
    if (myRole === 'officer') return target.role === 'member';
    return false;
  }

  function handleKick(target) {
    if (actingId) return;
    setActingId(target.user_id);
    kickMember(alliance.id, target.user_id)
      .then(() => {
        toastSuccess(`اتطرد ${target.name || 'العضو'} من التحالف`);
        onChanged?.();
      })
      .catch((err) => toastError(err.response?.data?.error || 'حصل خطأ - حاول تاني'))
      .finally(() => setActingId(null));
  }

  function handlePromoteDemote(target, role) {
    if (actingId) return;
    setActingId(target.user_id);
    setMemberRole(alliance.id, target.user_id, role)
      .then(() => {
        toastSuccess(role === 'officer' ? `اترقّى ${target.name}` : `اترجّع ${target.name} عضو عادي`);
        onChanged?.();
      })
      .catch((err) => toastError(err.response?.data?.error || 'حصل خطأ - حاول تاني'))
      .finally(() => setActingId(null));
  }

  function handleTransfer(target) {
    if (actingId) return;
    if (!window.confirm(`متأكد إنك عايز تنقل القيادة لـ ${target.name}؟`)) return;
    setActingId(target.user_id);
    transferLeadership(alliance.id, target.user_id)
      .then(() => {
        toastSuccess(`القيادة اتنقلت لـ ${target.name}`);
        onChanged?.();
      })
      .catch((err) => toastError(err.response?.data?.error || 'حصل خطأ - حاول تاني'))
      .finally(() => setActingId(null));
  }

  return (
    <div className="space-y-2">
      {alliance.members.map((m) => {
        const isMe = idStr(m.user_id) === idStr(currentUserId);
        const busy = actingId && idStr(actingId) === idStr(m.user_id);
        return (
          <div key={idStr(m.user_id)} className="flex items-center justify-between gap-2 rounded-lg bg-white/5 px-3 py-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-xs font-black text-white/70">
                {(m.name || '?')[0]?.toUpperCase()}
              </div>
              <div>
                <p className="flex items-center gap-1.5 text-xs font-bold text-white">
                  {m.name || 'لاعب'} {isMe && <span className="text-white/40">(أنت)</span>}
                </p>
                <RoleBadge role={m.role} />
              </div>
            </div>

            {!isMe && (
              <div className="flex items-center gap-1">
                {myRole === 'leader' && m.role === 'member' && (
                  <IconAction label="رقّي لضابط" onClick={() => handlePromoteDemote(m, 'officer')} busy={busy} icon={Star} />
                )}
                {myRole === 'leader' && m.role === 'officer' && (
                  <IconAction label="نزّل لعضو" onClick={() => handlePromoteDemote(m, 'member')} busy={busy} icon={Star} muted />
                )}
                {myRole === 'leader' && (
                  <IconAction label="انقل القيادة" onClick={() => handleTransfer(m)} busy={busy} icon={ArrowLeftRight} />
                )}
                {canKick(m) && <IconAction label="اطرد" onClick={() => handleKick(m)} busy={busy} icon={Ban} danger />}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function IconAction({ label, onClick, busy, icon: Icon, danger, muted }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-label={label}
      title={label}
      className={`flex h-7 w-7 items-center justify-center rounded-lg disabled:opacity-40 ${
        danger
          ? 'bg-red-500/15 text-red-300 hover:bg-red-500/25'
          : muted
            ? 'bg-white/5 text-white/40 hover:text-white/70'
            : 'bg-sky-500/15 text-sky-300 hover:bg-sky-500/25'
      }`}
    >
      {busy ? <Loader2 size={12} className="animate-spin" /> : <Icon size={12} />}
    </button>
  );
}

function RequestsList({ allianceId, onChanged }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [respondingId, setRespondingId] = useState(null);

  function load() {
    setLoading(true);
    getPendingRequests(allianceId)
      .then((data) => setRequests(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allianceId]);

  function respond(requestId, accept) {
    if (respondingId) return;
    setRespondingId(requestId);
    respondToRequest(allianceId, requestId, accept)
      .then((result) => {
        setRequests((prev) => prev.filter((r) => r.id !== requestId));
        if (result.joined) {
          toastSuccess('انضم العضو للتحالف');
          onChanged?.();
        } else {
          toastSuccess('اترفض طلب الانضمام');
        }
      })
      .catch((err) => toastError(err.response?.data?.error || 'حصل خطأ - حاول تاني'))
      .finally(() => setRespondingId(null));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 text-white/50">
        <Loader2 className="animate-spin" size={22} />
      </div>
    );
  }

  if (requests.length === 0) {
    return <p className="px-2 py-8 text-center text-sm text-white/50">مفيش طلبات انضمام معلّقة دلوقتي.</p>;
  }

  return (
    <div className="space-y-2.5">
      {requests.map((r) => (
        <div key={r.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Mail size={14} className="text-white/40" />
              <p className="text-sm font-bold text-white">{r.user_name || 'لاعب'}</p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={respondingId === r.id}
                onClick={() => respond(r.id, true)}
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 disabled:opacity-40"
                aria-label="قبول"
              >
                {respondingId === r.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={13} />}
              </button>
              <button
                type="button"
                disabled={respondingId === r.id}
                onClick={() => respond(r.id, false)}
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 disabled:opacity-40"
                aria-label="رفض"
              >
                <Ban size={13} />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function SettingsView({ alliance, myRole, currentUserId, onChanged, onLeftOrDisbanded }) {
  const [name, setName] = useState(alliance.name);
  const [description, setDescription] = useState(alliance.description || '');
  const [savingInfo, setSavingInfo] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [disbanding, setDisbanding] = useState(false);

  const isLeader = myRole === 'leader';
  const isOnlyMember = alliance.member_count === 1;

  function handleSaveInfo(e) {
    e.preventDefault();
    if (savingInfo) return;
    setSavingInfo(true);
    updateAlliance(alliance.id, { name, description })
      .then(() => {
        toastSuccess('اتحدّثت بيانات التحالف');
        onChanged?.();
      })
      .catch((err) => toastError(err.response?.data?.error || 'حصل خطأ - حاول تاني'))
      .finally(() => setSavingInfo(false));
  }

  function handleLeave() {
    if (leaving) return;
    if (!window.confirm('متأكد إنك عايز تسيب التحالف؟')) return;
    setLeaving(true);
    leaveAlliance(alliance.id)
      .then(() => {
        toastSuccess('سِبت التحالف');
        onLeftOrDisbanded?.();
      })
      .catch((err) => toastError(err.response?.data?.error || 'حصل خطأ - حاول تاني'))
      .finally(() => setLeaving(false));
  }

  function handleDisband() {
    if (disbanding) return;
    if (!window.confirm('متأكد إنك عايز تحل التحالف نهائيًا؟ الإجراء ده مينفعش يترجع.')) return;
    setDisbanding(true);
    disbandAlliance(alliance.id)
      .then(() => {
        toastSuccess('اتحل التحالف');
        onLeftOrDisbanded?.();
      })
      .catch((err) => toastError(err.response?.data?.error || 'حصل خطأ - حاول تاني'))
      .finally(() => setDisbanding(false));
  }

  return (
    <div className="space-y-4">
      {isLeader && (
        <form onSubmit={handleSaveInfo} className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-3">
          <p className="text-xs font-bold text-white/70">بيانات التحالف</p>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white focus:border-amber-400/50 focus:outline-none"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            rows={3}
            className="w-full resize-none rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white focus:border-amber-400/50 focus:outline-none"
          />
          <button
            type="submit"
            disabled={savingInfo}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-white/10 py-2 text-sm font-bold text-white hover:bg-white/20 disabled:opacity-40"
          >
            {savingInfo ? <Loader2 size={14} className="animate-spin" /> : null}
            حفظ
          </button>
        </form>
      )}

      {!isLeader && (
        <button
          type="button"
          onClick={handleLeave}
          disabled={leaving}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-500/15 py-2.5 text-sm font-bold text-red-300 hover:bg-red-500/25 disabled:opacity-40"
        >
          {leaving ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
          سيب التحالف
        </button>
      )}

      {isLeader && isOnlyMember && (
        <button
          type="button"
          onClick={handleDisband}
          disabled={disbanding}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-500/15 py-2.5 text-sm font-bold text-red-300 hover:bg-red-500/25 disabled:opacity-40"
        >
          {disbanding ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
          حل التحالف
        </button>
      )}

      {isLeader && !isOnlyMember && (
        <p className="text-center text-[11px] text-white/40">
          لازم تطرد كل الأعضاء التانيين أو تنقل القيادة قبل ما تقدر تحل التحالف أو تسيبه.
        </p>
      )}
    </div>
  );
}
