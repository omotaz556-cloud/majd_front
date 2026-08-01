// خلفية ثابتة (صورة واحدة + تدرّج تعتيم) بدل المشهد المتحرك القديم
// (SVG + Canvas بيرسم جسيمات كل فريم). الهدف: خفة على الموقع، بدون
// أي جافاسكريبت شغّال بالخلفية، الصورة نفسها متبقاة كافتراضي بالمتصفح.
export default function AnimatedBackground() {
  return (
    <div className="gaming-bg" aria-hidden="true">
      <div className="gaming-bg__image" />
      <div className="gaming-bg__fade" />
    </div>
  );
}
