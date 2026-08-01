// الباك إند بيخزن المبالغ كـ mongoose.Decimal128 (للدقة المالية)، وده لما بيترجع
// كـ JSON بيطلع بالشكل ده: { "$numberDecimal": "12.34" } مش رقم عادي.
// الدالة دي بتتعامل مع الحالتين (رقم عادي أو Decimal128) وترجع رقم JS دايماً.
export function toNumber(value) {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return parseFloat(value) || 0;
  if (typeof value === 'object' && '$numberDecimal' in value) {
    return parseFloat(value.$numberDecimal) || 0;
  }
  return Number(value) || 0;
}
