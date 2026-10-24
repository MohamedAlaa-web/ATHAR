import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLang } from '../i18n/LanguageContext';

const STEPS_EN = [
  { title: 'Welcome — the idea in 20 seconds', body: 'ATHAR turns a museum plaque into a cinematic story. This guided demo takes about two minutes: scan → story → facts → related artifact. Switch EN / عربي / FR anytime — layout flips RTL/LTR.', route: '/' },
  { title: 'Step 1 · Simulated scan', body: 'The scanner is a simulation: pick the royal mummy code and press Simulate Scan. No camera required.', route: '/scan' },
  { title: 'Step 2 · Artifact page', body: 'Each artifact has its own page: photo, why it matters, demo code — plus a Listen button for narration in your language.', route: '/artifact/royal-mummy' },
  { title: 'Step 3 · Cinematic story', body: 'Press Play on the real video. Five short chapters with selectable EN/AR/FR subtitles — labelled where scenes are interpretive.', route: '/artifact/royal-mummy/story' },
  { title: 'Step 4 · Historical facts', body: 'Story and evidence are separated: facts, context, what is known vs. uncertain, and source notes.', route: '/artifact/royal-mummy/facts' },
  { title: 'Step 5 · Related artifacts', body: 'Stories connect. Open a related coffin or statue — every card leads to a real page.', route: '/explore' }
];

const STEPS_AR = [
  { title: 'أهلاً — الفكرة في ٢٠ ثانية', body: 'يحوّل أثر لافتة المتحف إلى قصة سينمائية. يستغرق هذا العرض الموجّه دقيقتين: مسح ← قصة ← حقائق ← قطعة مرتبطة. بدّل EN / عربي / FR في أي وقت — يتقلب الاتجاه RTL/LTR.', route: '/' },
  { title: 'الخطوة ١ · مسح تجريبي', body: 'الماسح محاكاة: اختر رمز المومياء الملكية واضغط محاكاة المسح. لا حاجة للكاميرا.', route: '/scan' },
  { title: 'الخطوة ٢ · صفحة القطعة', body: 'لكل قطعة صفحة خاصة: الصورة وأهميتها والرمز التجريبي — مع زر استماع للسرد بلغتك.', route: '/artifact/royal-mummy' },
  { title: 'الخطوة ٣ · القصة السينمائية', body: 'اضغط تشغيل على الفيديو الحقيقي. خمسة فصول قصيرة مع ترجمة EN/AR/FR قابلة للاختيار — موسومة حيث المشاهد تأويلية.', route: '/artifact/royal-mummy/story' },
  { title: 'الخطوة ٤ · الحقائق التاريخية', body: 'القصة منفصلة عن الدليل: حقائق وسياق ومعروف مقابل غير مؤكد وملاحظات مصادر.', route: '/artifact/royal-mummy/facts' },
  { title: 'الخطوة ٥ · قطع مرتبطة', body: 'القصص تتصل. افتح تابوتًا أو تمثالًا مرتبطًا — كل بطاقة تؤدي لصفحة حقيقية.', route: '/explore' }
];

const STEPS_FR = [
  { title: 'Bienvenue — l’idée en 20 secondes', body: 'ATHAR transforme un cartel de musée en histoire cinématographique. Cette visite guidée dure environ deux minutes : scan → histoire → faits → objet lié. Basculez EN / عربي / FR à tout moment — la mise en page passe en RTL/LTR.', route: '/' },
  { title: 'Étape 1 · Scan simulé', body: 'Le scanner est une simulation : choisissez le code de la momie royale et appuyez sur Simuler le scan. Aucune caméra requise.', route: '/scan' },
  { title: 'Étape 2 · Page de l’objet', body: 'Chaque objet a sa page : photo, importance, code QR démo — et un bouton d’écoute pour la narration dans votre langue.', route: '/artifact/royal-mummy' },
  { title: 'Étape 3 · Histoire cinématographique', body: 'Appuyez sur Lecture sur la vraie vidéo. Cinq courts chapitres avec sous-titres EN/AR/FR sélectionnables — signalée quand les scènes sont interprétatives.', route: '/artifact/royal-mummy/story' },
  { title: 'Étape 4 · Faits historiques', body: 'Histoire et preuves sont séparées : faits, contexte, avéré contre incertain, et notes de sources.', route: '/artifact/royal-mummy/facts' },
  { title: 'Étape 5 · Objets liés', body: 'Les histoires se connectent. Ouvrez un cercueil ou une statue liée — chaque carte mène à une vraie page.', route: '/explore' }
];

export function PresentationDemo() {
  const { lang, tr } = useLang();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  const steps = lang === 'ar' ? STEPS_AR : lang === 'fr' ? STEPS_FR : STEPS_EN;

  const go = (i: number) => {
    setStep(i);
    navigate(steps[i].route);
  };

  return (
    <>
      <div className="demo-fab">
        <button className="btn btn-gold btn-sm" onClick={() => { setOpen(true); setStep(0); navigate('/'); }}>
          ▶ {tr('nav.presentation')}
        </button>
      </div>
      {open && (
        <div className="demo-overlay" role="dialog" aria-modal="true" aria-label={tr('demo.title')}>
          <div className="demo-sheet">
            <p className="kicker">{tr('demo.title')}</p>
            <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: 26, margin: '6px 0' }}>{steps[step].title}</h3>
            <p className="prose">{steps[step].body}</p>
            <div className="demo-steps" aria-hidden="true">
              {steps.map((_, i) => <span key={i} className={i <= step ? 'done' : ''} />)}
            </div>
            <p className="muted">Step {step + 1} / {steps.length} · {tr('brand.disclosure')}</p>
            <div className="back-row">
              {step > 0 && <button className="btn btn-ghost btn-sm" onClick={() => go(step - 1)}>{tr('demo.back')}</button>}
              {step < steps.length - 1
                ? <button className="btn btn-gold btn-sm" onClick={() => go(step + 1)}>{tr('demo.next')}</button>
                : <button className="btn btn-gold btn-sm" onClick={() => setOpen(false)}>{tr('demo.exit')}</button>}
              <button className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>{tr('demo.exit')}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
