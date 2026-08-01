import { AlertTriangle, RotateCcw } from 'lucide-react';

// ====== حالة "خطأ" موحّدة (Error States) - بديل مشترك عن كل صفحة تكرر
// <p className="text-alert">...</p> بنفسها، مع زرار "إعادة المحاولة"
// اختياري بيعيد نداء التحميل بتاع الصفحة. ======
export default function ErrorState({ message = 'حصل خطأ غير متوقع', onRetry }) {
  return (
    <div className="glass-panel flex flex-col items-center gap-2 rounded-2xl px-6 py-10 text-center">
      <AlertTriangle className="text-alert" size={24} />
      <p className="text-sm text-bone/70">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="focus-ring mt-2 flex items-center gap-1.5 rounded-lg border border-ink-600 px-3 py-1.5 text-sm text-bone/70 hover:border-gold hover:text-gold"
        >
          <RotateCcw size={14} />
          إعادة المحاولة
        </button>
      )}
    </div>
  );
}
