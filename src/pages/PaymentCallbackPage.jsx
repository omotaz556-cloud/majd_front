import { useEffect, useRef, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { getDepositStatus } from '../api/payments';

/**
 * ====== صفحة الرجوع من Moyasar بعد الدفع ======
 * Moyasar بيعمل redirect للمتصفح لـ callback_url مع بارامترات query (زي id, status).
 * الرصيد الحقيقي مبيتحدثش من هنا خالص - ده بيحصل من webhook السيرفر لسيرفر.
 * الصفحة دي بس بتستعلم (polling) عن حالة الإيداع لحد ما تستقر (paid/failed)،
 * لأن الـ webhook ممكن ياخد كام ثانية يوصل بعد ما اللاعب يرجع للصفحة دي.
 */

const POLL_INTERVAL_MS = 2000;
const MAX_POLLS = 12; // حوالي 24 ثانية قبل ما نستسلم ونطلب من اللاعب يتأكد من المحفظة يدوياً

export default function PaymentCallbackPage() {
  const [searchParams] = useSearchParams();
  // مهم: given_id (بتاعنا إحنا) ليها الأولوية على id (بتاع Moyasar نفسها) -
  // الـ id الراجع من Moyasar في الـ redirect مختلف عن الـ given_id المخزّن في
  // DepositIntent، فلو استخدمناه هيفشل الاستعلام دايماً. راجع payment.service.js
  const paymentId = searchParams.get('given_id') || searchParams.get('id');

  const [status, setStatus] = useState('checking'); // checking | paid | failed | timeout | not_found
  const [amount, setAmount] = useState(null);
  const [failureReason, setFailureReason] = useState(null);
  const pollCountRef = useRef(0);

  useEffect(() => {
    if (!paymentId) {
      setStatus('not_found');
      return;
    }

    let cancelled = false;

    async function poll() {
      try {
        const data = await getDepositStatus(paymentId);
        if (cancelled) return;

        setAmount(data.amount);

        if (data.status === 'paid') {
          setStatus('paid');
          return;
        }
        if (data.status === 'failed') {
          setStatus('failed');
          setFailureReason(data.failure_reason);
          return;
        }

        // لسه pending - نحاول تاني لحد ما نوصل للحد الأقصى
        pollCountRef.current += 1;
        if (pollCountRef.current >= MAX_POLLS) {
          setStatus('timeout');
          return;
        }
        setTimeout(poll, POLL_INTERVAL_MS);
      } catch {
        if (!cancelled) setStatus('not_found');
      }
    }

    poll();
    return () => {
      cancelled = true;
    };
  }, [paymentId]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-20 text-center">
      {status === 'checking' && (
        <>
          <Loader2 className="animate-spin text-gold" size={40} />
          <p className="mt-4 text-bone/70">جاري تأكيد نتيجة الدفع...</p>
          <p className="mt-1 text-xs text-bone/40">ده ممكن ياخد شوية ثواني</p>
        </>
      )}

      {status === 'paid' && (
        <>
          <CheckCircle2 className="text-teal" size={48} />
          <h1 className="mt-4 font-display text-xl font-bold text-bone">تم الشحن بنجاح</h1>
          <p className="mt-2 text-bone/60">
            {amount ? `تمت إضافة ${amount} إلى محفظتك` : 'تمت إضافة الرصيد لمحفظتك'}
          </p>
        </>
      )}

      {status === 'failed' && (
        <>
          <XCircle className="text-alert" size={48} />
          <h1 className="mt-4 font-display text-xl font-bold text-bone">فشلت عملية الدفع</h1>
          <p className="mt-2 text-bone/60">
            {failureReason ? `السبب: ${failureReason}` : 'حصل خطأ أثناء تنفيذ عملية الدفع، متتوصلش أي مبلغ من كارتك'}
          </p>
          <Link
            to="/games"
            className="focus-ring mt-6 rounded-lg border border-ink-600 px-6 py-2.5 text-bone/70 hover:border-gold hover:text-gold"
          >
            حاول تاني
          </Link>
        </>
      )}

      {status === 'timeout' && (
        <>
          <Loader2 className="text-bone/40" size={40} />
          <h1 className="mt-4 font-display text-xl font-bold text-bone">لسه بنأكد العملية</h1>
          <p className="mt-2 text-bone/60">
            الدفع بياخد وقت أطول من المتوقع للتأكيد. رصيدك هيتحدث تلقائياً أول ما يتأكد.
          </p>
        </>
      )}

      {status === 'not_found' && (
        <>
          <XCircle className="text-alert" size={48} />
          <h1 className="mt-4 font-display text-xl font-bold text-bone">مش لاقيين عملية الدفع دي</h1>
          <p className="mt-2 text-bone/60">تأكد إنك جاي من رابط الدفع الصحيح</p>
        </>
      )}
    </div>
  );
}