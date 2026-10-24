import type { Localized } from '../data/museum';

const en = (english: string, arabic: string): Localized => ({ en: english, ar: arabic });

/**
 * Strings for the visit planner, crowd model, suggestions and rewards.
 * Kept in a separate object and merged into NAV_STRINGS so the main dictionary
 * stays readable. Arabic is the primary text, English the toggle.
 */
export const SMART_STRINGS: Record<string, Localized> = {
  'plan.open': en('Plan a visit', 'خطّط زيارة'),
  'plan.title': en('Plan your visit', 'خطّط زيارتك'),
  'plan.sub': en(
    'Choose the time you have and what you came to see. The plan is built on this device and stays inside your time budget.',
    'اختر الوقت المتاح وما جئت لرؤيته. تُبنى الخطة على هذا الجهاز وتبقى داخل وقتك.'
  ),
  'plan.time': en('Time', 'الوقت'),
  'plan.minutes': en('min', 'دقيقة'),
  'plan.interests': en('Interests', 'الاهتمامات'),
  'plan.interestsNote': en('Pick at least one. Others are still included, at lower weight.', 'اختر واحدة على الأقل. تُضمّ القطع الأخرى بوزن أقل.'),
  'plan.stairs': en('Avoid stairs', 'تجنّب السلالم'),
  'plan.stairsNote': en('Upper-floor artifacts are left out with a reason.', 'تُستبعد قطع الطابق العلوي مع ذكر السبب.'),
  'plan.speed': en('Walking speed', 'سرعة السير'),
  'plan.build': en('Build the plan', 'ابنِ الخطة'),
  'plan.rebuild': en('Rebuild', 'أعد الحساب'),
  'plan.total': en('Total', 'الإجمالي'),
  'plan.walk': en('Walking', 'السير'),
  'plan.dwell': en('At the artifacts', 'عند القطع'),
  'plan.stops': en('Stops', 'المحطات'),
  'plan.value': en('Value', 'القيمة'),
  'plan.baseline': en('Value-only baseline', 'خط الأساس بالقيمة فقط'),
  'plan.compute': en('Computed in', 'زمن الحساب'),
  'plan.empty': en('No stop fits this budget. Add time or drop a filter.', 'لا توجد محطة تناسب هذا الوقت. أضف وقتًا أو غيّر الاهتمامات.'),
  'plan.skipped': en('Left out', 'لم تُدرج'),
  'plan.reason.budget': en('Out of time', 'انتهى الوقت'),
  'plan.reason.stairs': en('Stairs only', 'السلالم وحدها'),
  'plan.reason.closed': en('Hall closed', 'القاعة مغلقة'),
  'plan.reason.unreachable': en('No path', 'لا مسار'),
  'plan.begin': en('Start the visit', 'ابدأ الجولة'),
  'plan.stop': en('Stop the visit', 'أوقف الجولة'),
  'plan.running': en('Visit in progress', 'الجولة جارية'),
  'plan.nextStop': en('Next stop', 'المحطة التالية'),
  'plan.eta': en('Arrive after', 'الوصول بعد'),
  'plan.behind': en('You are behind the plan. Rebuild the remaining stops?', 'أنت متأخر عن الخطة. أعِد ترتيب المحطات المتبقية؟'),
  'plan.replan': en('Rebuild remaining stops', 'أعد ترتيب المحطات المتبقية'),
  'plan.placeholder': en(
    'Dwell times, importance and interest weights are placeholders for this prototype, not museum data.',
    'أوقات التوقف والأهمية والأوزان بيانات مؤقتة لهذا النموذج، وليست بيانات المتحف.'
  ),
  'plan.addStop': en('Add to my visit', 'أضف إلى جولتي'),
  'plan.alreadyPlanned': en('Already in your plan', 'مضاف إلى خطتك'),
  'plan.crowdOn': en('Crowd-aware routing is on', 'توجيه يتجنّب الزحام'),
  'plan.openRewards': en('Points and rewards', 'النقاط والمكافآت'),

  'crowd.title': en('Crowd', 'الزحام'),
  'crowd.simulated': en('Simulated', 'محاكاة'),
  'crowd.overlay': en('Crowd overlay', 'طبقة الزحام'),
  'crowd.overlayOn': en('Hide overlay', 'أخفِ الطبقة'),
  'crowd.legend': en('Hall occupancy', 'إشغال القاعات'),
  'crowd.note': en(
    'Simulated from hall capacity, not measured from people. No visitor data is collected.',
    'محاكاة من سعة القاعات، وليست قياسًا للزوار. لا تُجمع أي بيانات عن الزوار.'
  ),
  'crowd.quiet': en('Quiet', 'هادئ'),
  'crowd.busy': en('Busy', 'متوسط'),
  'crowd.crowded': en('Crowded', 'مزدحم'),
  'crowd.unknown': en('Unknown', 'غير معروف'),

  'settings.avoidCrowd': en('Avoid crowded halls', 'تجنّب القاعات المزدحمة'),
  'settings.avoidCrowdNote': en(
    'Routes and plans pay extra for halls the simulated crowd reports busy. Never blocks a route.',
    'يزيد وزن القاعات المزدحمة في المسار والخطة. لا يمنع أي مسار.'
  ),
  'settings.plan': en('Visit planner', 'مخطّط الزيارة'),
  'settings.planNote': en('Order the artifacts around your time and interests.', 'رتّب القطع حسب وقتك واهتماماتك.'),
  'settings.rewards': en('Points and rewards', 'النقاط والمكافآت'),

  'suggest.title': en('A quieter hall', 'قاعة أهدأ'),
  'suggest.body': en('The next hall is crowded.', 'القاعة التالية مزدحمة.'),
  'suggest.alternative': en('A similar artifact is in a quiet hall.', 'توجد قطعة مشابهة في قاعة هادئة.'),
  'suggest.extra': en('Extra walk', 'زيادة السير'),
  'suggest.accept': en('Take me there', 'خذني إليها'),
  'suggest.dismiss': en('Not now', 'ليس الآن'),

  'rewards.title': en('Points and rewards', 'النقاط والمكافآت'),
  'rewards.sub': en(
    'Stored on this device only. No account, no ranking, no sharing.',
    'محفوظة على هذا الجهاز فقط. لا حساب، لا ترتيب، لا مشاركة.'
  ),
  'rewards.today': en('Today', 'اليوم'),
  'rewards.total': en('Total', 'الإجمالي'),
  'rewards.cap': en('Daily cap', 'الحد اليومي'),
  'rewards.badges': en('Badges', 'الشارات'),
  'rewards.history': en('History', 'السجل'),
  'rewards.empty': en('No points yet. Scan an artifact QR to start.', 'لا نقاط بعد. امسح رمز قطعة للبدء.'),
  'rewards.reset': en('Reset points', 'أعِد ضبط النقاط'),
  'rewards.resetConfirm': en('Tap again to confirm', 'اضغط مرة أخرى للتأكيد'),
  'rewards.catalogue': en('Reward list', 'قائمة المكافآت'),
  'rewards.catalogueNote': en(
    'Placeholder list. The museum decides the real rewards and their conditions.',
    'قائمة مؤقتة. يقرر المتحف المكافآت الحقيقية وشروطها.'
  ),
  'rewards.cost': en('points', 'نقطة'),
  'rewards.earned': en('Earned', 'مكتسبة'),
  'rewards.locked': en('Locked', 'مقفلة'),
  'rewards.quietRule': en('Quiet-hall points need a QR scan inside that hall.', 'نقاط القاعة الهادئة تحتاج مسح رمز داخل القاعة نفسها.'),
  'rewards.noSpeed': en('No points for speed, and none for staying in a crowded hall.', 'لا نقاط للسرعة، ولا نقاط للبقاء في قاعة مزدحمة.'),

  'eval.smartTitle': en('Visitor planner and crowd routing', 'مخطّط الزيارة وتوجيه الزحام'),
  'eval.smartBody': en(
    'Nine plans (3 interest profiles × 45/90/150 min) and ten seeded start/target pairs. Every number below is computed by the same modules the screens use.',
    'تسع خطط (٣ اهتمامات × ٤٥/٩٠/١٥٠ دقيقة) وعشر أزواج بداية وهدف. كل رقم أدناه محسوب بالوحدات نفسها التي تستخدمها الشاشات.'
  ),
  'eval.run': en('Run evaluation', 'شغّل التقييم'),
  'eval.profile': en('Profile', 'الاهتمام'),
  'eval.budget': en('Budget', 'الوقت'),
  'eval.planned': en('Planned', 'المخطّط'),
  'eval.stops': en('Stops', 'المحطات'),
  'eval.value': en('Value', 'القيمة'),
  'eval.baseline': en('Baseline', 'خط الأساس'),
  'eval.compute': en('Compute', 'الحساب'),
  'eval.withinBudget': en('All plans inside their budget', 'كل الخطط داخل وقتها'),
  'eval.outOfBudget': en('A plan exceeded its budget', 'خطة تجاوزت وقتها'),
  'eval.crowdSummary': en('Crowd-weighted vs plain route', 'المسار مع الزحام مقابل المسار العادي'),
  'eval.avgLength': en('Average length', 'متوسط الطول'),
  'eval.avgExposure': en('Average crowd exposure', 'متوسط التعرّض للزحام'),
  'eval.changed': en('Routes changed', 'مسارات تغيّرت'),
  'eval.exportJson': en('Export JSON', 'تصدير JSON'),
  'eval.exportCsv': en('Export CSV', 'تصدير CSV'),
  'eval.note': en(
    'Crowd levels come from the simulated source at a fixed clock. The remote feed is a stub and reports nothing.',
    'مستويات الزحام من المصدر المحاكى بساعة ثابتة. المصدر البعيد هيكل فقط ولا يُرجع بيانات.'
  )
};
