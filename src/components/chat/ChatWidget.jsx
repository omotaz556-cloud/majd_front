import { useEffect, useMemo, useRef, useState } from 'react';
import { MessageCircle, X, Send, ArrowRight, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import * as chatApi from '../../api/chat';

// ====== الفقاعة العائمة + نافذة الشات - متاحة من كل صفحات اللعبة طول ما
// اللاعب مسجّل دخوله.
//
// قائمة رسائل واحدة موحّدة (عام + خاص مع بعض) مرتبة زمنيًا - مفيش تبديل
// شاشات "عام/خاص" زي الأول. الرسالة الخاصة متمايزة بلون بنفسجي + badge
// "خاص" جنب اسم صاحبها، ومحدش تاني (غير الطرفين) بيشوفها. الرد على أي
// رسالة خاصة بيحصل من نفس صندوق الكتابة تحت - بس أول ما تدوس على اسم لاعب
// (في رسالة عامة أو من نتيجة بحث)، وضع الكتابة الحالي بيتحوّل "خاص معاه"
// لحد ما ترجع تدوس "رجوع للعام" فوق. ======

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
}

// isPrivate بيغيّر لون فقاعة الرسالة (تيل للعام، بنفسجي للخاص) + بيضيف
// badge "خاص" جنب الاسم عشان اللاعب يفرّق بصريًا فورًا من غير ما يحتاج
// يقرا محتوى الرسالة.
function MessageBubble({ message, isMine, isPrivate, onNameClick }) {
  const canOpenPrivate = !isMine && !isPrivate && onNameClick;

  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm ${
          isMine
            ? isPrivate
              ? 'rounded-br-sm bg-gradient-to-br from-pink-500 to-pink-600 text-bone'
              : 'rounded-br-sm bg-gradient-to-br from-teal-500 to-teal-600 text-bone'
            : isPrivate
              ? 'rounded-bl-sm border border-pink-500/30 bg-pink-700/25 text-bone/90'
              : 'rounded-bl-sm bg-ink-700 text-bone/90'
        }`}
      >
        <div className="mb-0.5 flex items-center gap-1.5">
          {canOpenPrivate ? (
            <button
              onClick={() => onNameClick(message.sender_id, message.sender_name)}
              className="text-[11px] font-bold text-gold-400 hover:underline"
            >
              {message.sender_name}
            </button>
          ) : (
            <span className={`text-[11px] font-bold ${isMine ? 'text-bone/80' : 'text-gold-400'}`}>
              {message.sender_name}
            </span>
          )}
          {isPrivate && (
            <span className="rounded bg-pink-500/30 px-1.5 py-[1px] text-[9px] font-bold text-pink-200">
              خاص
            </span>
          )}
        </div>
        <div className="whitespace-pre-wrap break-words">{message.body}</div>
        <div className={`mt-1 text-[10px] ${isMine ? 'text-bone/70' : 'text-bone/40'}`}>
          {formatTime(message.created_at)}
        </div>
      </div>
    </div>
  );
}

function MessageList({ messages, myUserId, onNameClick }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-bone/40">
        مفيش رسائل لسه - ابدأ المحادثة!
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
      {messages.map((m) => (
        <MessageBubble
          key={m._id}
          message={m}
          isMine={String(m.sender_id) === String(myUserId)}
          isPrivate={m.channel === 'private'}
          onNameClick={onNameClick}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}

function ComposeBar({ onSend, placeholder, disabled, disabledReason }) {
  const [value, setValue] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const handleSend = async () => {
    const trimmed = value.trim();
    if (!trimmed || sending || disabled) return;
    setSending(true);
    setError('');
    setValue('');
    try {
      await onSend(trimmed);
    } catch (err) {
      setValue(trimmed); // فشل الإرسال؟ نرجّع النص عشان اللاعب ميضطرش يكتبه تاني
      setError(err?.offline ? 'ده أوفلاين دلوقتي' : 'تعذر إرسال الرسالة');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="border-t border-ink-600">
      {(disabled || error) && (
        <div className="px-3 pt-1.5 text-[11px] font-bold text-alert">{disabledReason || error}</div>
      )}
      <div className="flex items-center gap-2 p-2.5">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          maxLength={1000}
          disabled={disabled}
          placeholder={placeholder}
          className="flex-1 rounded-lg border border-ink-600 bg-ink-800 px-3 py-2 text-sm text-bone placeholder:text-bone/35 focus:border-gold-500 focus:outline-none disabled:opacity-40"
        />
        <button
          onClick={handleSend}
          disabled={!value.trim() || sending || disabled}
          className="focus-ring flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-gold text-ink-950 disabled:opacity-40"
          aria-label="إرسال"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}

// ====== بحث عن لاعب لبدء محادثة خاصة جديدة من غير ما تكون بعتله رسالة قبل
// كده أصلًا. بيظهر حالة أونلاين/أوفلاين جنب كل نتيجة، ولو أوفلاين مينفعش
// تختاره خالص. ======
function UserSearchPanel({ onPick, onCancel, isUserOnline }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      return undefined;
    }
    setSearching(true);
    const timeout = setTimeout(async () => {
      try {
        const found = await chatApi.searchUsers(trimmed);
        setResults(found);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center gap-2 border-b border-ink-600 p-2.5">
        <button onClick={onCancel} className="focus-ring rounded-lg p-1 text-bone/50 hover:text-bone" aria-label="رجوع">
          <ArrowRight size={15} />
        </button>
        <Search size={15} className="text-bone/40" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="دوّر باسم لاعب أو رقمه..."
          className="flex-1 bg-transparent text-sm text-bone placeholder:text-bone/35 focus:outline-none"
        />
      </div>

      <div className="flex-1 overflow-y-auto p-1.5">
        {searching && <div className="px-3 py-2 text-xs text-bone/40">بيدوّر...</div>}
        {!searching && query.trim() && results.length === 0 && (
          <div className="px-3 py-2 text-xs text-bone/40">مفيش لاعب بالاسم أو الرقم ده</div>
        )}
        {!query.trim() && <div className="px-3 py-2 text-xs text-bone/40">اكتب اسم لاعب أو رقمه فوق</div>}
        {results.map((u) => {
          const online = isUserOnline(u.id);
          return (
            <button
              key={u.id}
              onClick={() => online && onPick(u.id, u.name)}
              disabled={!online}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-right text-sm text-bone/85 hover:bg-ink-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <span className="flex items-center gap-1.5">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${online ? 'bg-emerald-400' : 'bg-bone/30'}`}
                  aria-hidden="true"
                />
                {u.name}
                {!online && <span className="text-[10px] text-bone/40">(أوفلاين)</span>}
              </span>
              {u.player_id != null && <span className="text-xs text-bone/40">#{u.player_id}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function ChatWidget() {
  const { user } = useAuth();
  const { isOpen, setIsOpen, totalUnread, messages, isUserOnline, markAllRead, sendGlobal, sendPrivate } = useChat();

  // 'global' | 'search' | user_id - بس وضع "الكتابة الحالي" (مين هبعتله لو
  // كتبت دلوقتي)، مش شاشة منفصلة - القائمة نفسها (messages) ظاهرة كاملة
  // بكل الرسائل العامة والخاصة مع بعض بغض النظر عن الوضع ده.
  const [composeTarget, setComposeTarget] = useState('global');
  const [composeTargetName, setComposeTargetName] = useState('');

  useEffect(() => {
    if (isOpen) markAllRead();
  }, [isOpen, messages.length, markAllRead]);

  if (!user) return null;

  const openPrivateCompose = (otherUserId, otherUserName) => {
    setComposeTargetName(otherUserName);
    setComposeTarget(String(otherUserId));
  };

  const backToGlobalCompose = () => setComposeTarget('global');

  const isComposingPrivate = composeTarget !== 'global' && composeTarget !== 'search';
  const targetOffline = isComposingPrivate && !isUserOnline(composeTarget);

  return (
    <div className="fixed bottom-4 right-20 z-30 flex flex-col-reverse items-start gap-3">
      {isOpen && (
        <div className="flex h-[26rem] w-[21rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-ink-600 bg-ink-900/98 shadow-2xl backdrop-blur-xl">
          {/* رأس النافذة */}
          <div className="flex items-center justify-between border-b border-ink-600 bg-ink-950/60 px-3 py-2">
            <div className="flex items-center gap-2">
              {isComposingPrivate ? (
                <>
                  <button
                    onClick={backToGlobalCompose}
                    className="focus-ring rounded-lg p-1 text-bone/50 hover:text-bone"
                    aria-label="رجوع للعام"
                  >
                    <ArrowRight size={15} />
                  </button>
                  <span className="text-xs font-bold text-pink-300">
                    بتكتب خاص لـ {composeTargetName} - محدش تاني بيشوفه
                  </span>
                </>
              ) : composeTarget === 'search' ? (
                <span className="text-xs font-bold text-bone/70">بدء محادثة خاصة</span>
              ) : (
                <span className="text-xs font-bold text-bone/70">الشات - عام وخاص مع بعض</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {composeTarget === 'global' && (
                <button
                  onClick={() => setComposeTarget('search')}
                  className="focus-ring rounded-lg p-1 text-bone/50 hover:text-bone"
                  aria-label="بدء محادثة خاصة"
                  title="بدء محادثة خاصة مع لاعب"
                >
                  <Search size={15} />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="focus-ring rounded-lg p-1 text-bone/50 hover:text-bone"
                aria-label="قفل الشات"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* المحتوى */}
          {composeTarget === 'search' ? (
            <UserSearchPanel onPick={openPrivateCompose} onCancel={backToGlobalCompose} isUserOnline={isUserOnline} />
          ) : (
            <>
              <MessageList messages={messages} myUserId={user._id} onNameClick={openPrivateCompose} />
              {isComposingPrivate ? (
                <ComposeBar
                  onSend={(body) => sendPrivate(composeTarget, body)}
                  placeholder={`رسالة خاصة لـ ${composeTargetName}...`}
                  disabled={targetOffline}
                  disabledReason={targetOffline ? `${composeTargetName} ده أوفلاين دلوقتي` : ''}
                />
              ) : (
                <ComposeBar onSend={sendGlobal} placeholder="اكتب رسالة للجميع..." />
              )}
            </>
          )}
        </div>
      )}

      {/* الفقاعة العائمة نفسها */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="focus-ring relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-gold text-ink-950 shadow-glow-gold transition-transform hover:scale-105"
        aria-label={isOpen ? 'قفل الشات' : 'فتح الشات'}
      >
        {isOpen ? <X size={20} /> : <MessageCircle size={20} />}
        {!isOpen && totalUnread > 0 && (
          <span className="absolute -left-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-alert px-1 text-[11px] font-bold text-bone">
            {totalUnread > 9 ? '9+' : totalUnread}
          </span>
        )}
      </button>
    </div>
  );
}
