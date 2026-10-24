import type { Localized, UiLang } from '../data/museum';
import { SMART_STRINGS } from './i18n.smart';

type Entry = Record<string, Localized>;

const en = (enText: string, arText: string): Localized => ({ en: enText, ar: arText });

export const NAV_STRINGS: Record<string, Localized> = {
  'brand.tagline': en('Find your way. Leave no trace.', 'اعرف طريقك. بلا أثر رقمي.'),
  'common.back': en('Back', 'رجوع'),
  'common.close': en('Close', 'إغلاق'),
  'common.next': en('Next', 'التالي'),
  'common.start': en('Start', 'ابدأ'),
  'common.cancel': en('Cancel', 'إلغاء'),
  'common.retry': en('Try again', 'حاول مرة أخرى'),
  'common.placeholder': en('Placeholder', 'محتوى مؤقت'),
  'common.metres': en('m', 'م'),
  'common.details': en('Details', 'التفاصيل'),
  'common.floor': en('Floor', 'الطابق'),
  'common.ground': en('Ground floor', 'الطابق الأرضي'),
  'common.upper': en('Upper gallery', 'المعرض العلوي'),
  'common.you': en('You', 'أنت'),

  'nav.map': en('Map', 'الخريطة'),
  'nav.search': en('Search', 'البحث'),
  'nav.scan': en('Scan', 'مسح'),
  'nav.settings': en('Settings', 'الإعدادات'),

  'onboard.kicker': en('Grand Egyptian Museum · demo', 'المتحف المصري الكبير · عرض تجريبي'),
  'onboard.title': en('Your position, on your device.', 'موقعك، على جهازك فقط.'),
  'onboard.sub': en(
    'ATHAR guides you from where you stand to the artifact you came to see. Positioning is computed on this phone and never sent anywhere.',
    'يَرْشُدك «أثر» من مكانك إلى القطعة التي جئت لرؤيتها. يُحسب الموقع على هذا الهاتف ولا يُرسل إلى أي مكان.'
  ),
  'onboard.step.language': en('Choose your language', 'اختر لغتك'),
  'onboard.step.privacy': en('How it works', 'كيف يعمل'),
  'onboard.privacy.title': en('Private by design', 'الخصوصية بالتصميم'),
  'onboard.privacy.1': en('No account, no login, no personal data.', 'لا حساب، لا تسجيل دخول، لا بيانات شخصية.'),
  'onboard.privacy.2': en('No GPS. Positioning uses the floor plan, beacons and phone sensors only.', 'لا GPS. يعتمد تحديد الموقع على المخطط والمنارات وحساسات الهاتف فقط.'),
  'onboard.privacy.3': en('The camera opens only while you scan a QR code.', 'لا تُفتح الكاميرا إلا أثناء مسح رمز QR.'),
  'onboard.privacy.4': en('Sensors stop when navigation stops. Low-power mode halves the update rate.', 'تتوقف الحساسات عند إيقاف الملاحة. يقلل وضع الطاقة المنخفضة معدل التحديث إلى النصف.'),
  'onboard.step.start': en('Start exploring', 'ابدأ الاستكشاف'),
  'onboard.startDemo': en('Start simulated tour', 'ابدأ الجولة المحاكاة'),
  'onboard.startDemoNote': en('Recommended for this demo: a virtual visitor walks with simulated BLE beacons.', 'موصى به لهذا العرض: زائر افتراضي يسير مع منارات BLE محاكاة.'),
  'onboard.scanEntrance': en('Scan entrance QR', 'امسح رمز المدخل'),
  'onboard.scanEntranceNote': en('Use the real camera if you are at an ATHAR QR code.', 'استخدم الكاميرا الحقيقية إن كنت أمام رمز أثر.'),
  'onboard.tapMap': en('Set my position manually', 'تحديد موقعي يدويًا'),
  'onboard.tapMapNote': en('Presentation fallback: tap a point on the plan.', 'بديل للعرض التقديمي: اضغط نقطة على المخطط.'),
  'onboard.enterMuseum': en('Enter the museum', 'ادخل المتحف'),
  'onboard.placeholderNote': en(
    'All artifacts, coordinates and floor plans are placeholders for a university prototype — not official museum data.',
    'جميع القطع والإحداثيات والمخططات بيانات مؤقتة لنموذج جامعي — وليست بيانات رسمية للمتحف.'
  ),

  'map.title': en('Navigate the museum', 'تنقّل داخل المتحف'),
  'map.youAreHere': en('You are here', 'أنت هنا'),
  'map.positionUnknown': en('Position unknown', 'الموقع غير معروف'),
  'map.positionUnknownBody': en('Start a source to place the blue dot inside the museum.', 'ابدأ مصدرًا لتحديد النقطة الزرقاء داخل المتحف.'),
  'map.accuracy': en('Accuracy', 'الدقة'),
  'map.confidence': en('Confidence', 'الثقة'),
  'map.hall': en('Hall', 'القاعة'),
  'map.nearby': en('Nearby artifacts', 'قطع قريبة'),
  'sheet.expand': en('Expand panel', 'توسيع اللوحة'),
  'sheet.collapse': en('Collapse panel', 'طيّ اللوحة'),
  'map.searchPlaceholder': en('Search an artifact or hall', 'ابحث عن قطعة أو قاعة'),
  'map.demoTour': en('Simulated tour active', 'الجولة المحاكاة نشطة'),
  'map.source.sim': en('Simulated BLE', 'BLE محاكاة'),
  'map.source.motion': en('Phone motion', 'حركة الهاتف'),
  'map.source.manual': en('Manually placed', 'تحديد يدوي'),
  'map.source.qr': en('QR confirmed', 'مؤكد بـQR'),
  'map.source.ble': en('BLE hardware', 'عتاد BLE'),
  'map.pause': en('Pause tour', 'إيقاف الجولة'),
  'map.resume': en('Resume tour', 'استئناف الجولة'),
  'map.startDemo': en('Start simulated tour', 'ابدأ الجولة المحاكاة'),
  'map.stopNav': en('Stop navigation', 'إيقاف الملاحة'),
  'map.navigatingTo': en('Navigating to', 'في الطريق إلى'),
  'map.routeBanner': en('Next instruction', 'التعليمات التالية'),
  'map.distanceToTarget': en('to target', 'إلى الهدف'),
  'map.recalculating': en('Off route — recalculating…', 'خارج المسار — جارٍ إعادة الحساب…'),
  'map.arrived': en('You have arrived', 'لقد وصلت'),
  'map.arrivedBody': en('The artifact is within 3 m of your estimated position.', 'القطعة على بعد ٣ أمتار أو أقل من موقعك المقدَّر.'),
  'map.stairsOnly': en(
    'This destination is upstairs. Turn off “accessible route” or use the stairs.',
    'هذه الوجهة في الطابق العلوي. أوقف «المسار الميسّر» أو استخدم السلالم.'
  ),
  'map.targetClosed': en('That hall is closed right now.', 'هذه القاعة مغلقة حاليًا.'),
  'map.closed': en('No route: a hall on the way is closed.', 'لا يوجد طريق: إحدى القاعات في الطريق مغلقة.'),
  'map.noRoute': en('No route found.', 'لم يُعثر على طريق.'),
  'map.lowConfidence': en(
    'Position is uncertain. Scan the nearest artifact QR to reset it.',
    'الموقع غير مؤكد. امسح رمز QR لأقرب قطعة لإعادة ضبطه.'
  ),
  'map.scanNearest': en('Scan nearest QR', 'امسح أقرب رمز'),
  'map.legend.route': en('Route', 'المسار'),
  'map.legend.you': en('Your position', 'موقعك'),
  'map.legend.truth': en('Ground truth (simulation only)', 'الموقع الحقيقي (محاكاة فقط)'),
  'map.legend.beacon': en('Virtual beacon', 'منارة افتراضية'),
  'map.legend.closed': en('Closed hall', 'قاعة مغلقة'),
  'map.manualHint': en('Tap the plan to place yourself. Tap an artifact to open it.', 'اضغط على المخطط لتحديد موقعك. اضغط على قطعة لفتحها.'),
  'map.demoPath': en('Demo walkway', 'مسار العرض'),
  'map.offRoute': en('off route', 'خارج المسار'),

  'walker.title': en('Virtual walker', 'الزائر الافتراضي'),
  'walker.followRoute': en('Walk the route', 'سِر على المسار'),
  'walker.freeWalk': en('Free walk', 'سير حر'),
  'walker.following': en('Following the route', 'يسير على المسار'),
  'walker.free': en('Free walk', 'سير حر'),
  'walker.speed': en('Walking speed', 'سرعة السير'),
  'walker.noRoute': en('Pick a destination first; the walker will follow that route.', 'اختر وجهة أولًا وسيسير الزائر على مسارها.'),
  'walker.note': en('The walker is simulated. Nothing here uses a real sensor.', 'الزائر محاكاة بالكامل. لا شيء هنا يستخدم حساسًا حقيقيًا.'),

  'search.title': en('Search', 'البحث'),
  'search.placeholder': en('Artifact, hall, or category', 'قطعة، قاعة، أو تصنيف'),
  'search.all': en('All', 'الكل'),
  'search.recent': en('Recent', 'الأخيرة'),
  'search.clear': en('Clear recent items', 'مسح العناصر الأخيرة'),
  'search.results': en('Results', 'النتائج'),
  'search.noResults': en('Nothing matches that search.', 'لا توجد نتائج مطابقة.'),
  'search.category': en('Category', 'التصنيف'),
  'search.halls': en('Halls', 'القاعات'),
  'search.artifacts': en('Artifacts', 'القطع'),
  'search.away': en('away', 'بعيدًا'),
  'search.floorNote': en('Start positioning to see distances.', 'ابدأ تحديد الموقع لعرض المسافات.'),

  'artifact.placeholder': en('Placeholder content', 'محتوى مؤقت'),
  'artifact.about': en('About this artifact', 'عن هذه القطعة'),
  'artifact.cinematic': en('Cinematic experience', 'تجربة سينمائية'),
  'artifact.cinematicNote': en(
    'Video placeholder. The final experience would be produced and reviewed by the museum; nothing is generated here.',
    'عنصر فيديو مؤقت. ستُنتَج التجربة النهائية وتراجعها إدارة المتحف؛ لا يوجد توليد هنا.'
  ),
  'artifact.navigate': en('Navigate here', 'اذهب إلى هنا'),
  'artifact.scan': en('Scan this QR', 'امسح رمز QR'),
  'artifact.hall': en('Hall', 'القاعة'),
  'artifact.distance': en('Distance from you', 'المسافة منك'),
  'artifact.category': en('Category', 'التصنيف'),
  'artifact.floor': en('Floor', 'الطابق'),
  'artifact.related': en('Also nearby', 'قريب أيضًا'),
  'artifact.positionRequired': en('A position is needed before navigating.', 'يلزم تحديد موقع قبل بدء الملاحة.'),
  'artifact.qrCode': en('QR code', 'رمز QR'),
  'artifact.openInMap': en('Show on map', 'اعرض على الخريطة'),
  'artifact.noDescription': en('Placeholder description.', 'وصف مؤقت.'),

  'settings.title': en('Settings', 'الإعدادات'),
  'settings.language': en('Language', 'اللغة'),
  'settings.arabic': en('العربية', 'العربية'),
  'settings.english': en('English', 'English'),
  'settings.privacy': en('Privacy', 'الخصوصية'),
  'settings.privacyBody': en(
    'Position is computed only on this device. No location, scan or identifier is transmitted. No accounts. Settings stay in this browser.',
    'يُحسب الموقع على هذا الجهاز فقط. لا يُرسل الموقع أو المسح أو أي معرّف. لا حسابات. تبقى الإعدادات في هذا المتصفح.'
  ),
  'settings.navigation': en('Navigation', 'الملاحة'),
  'settings.accessible': en('Accessible route (avoid stairs)', 'مسار ميسّر (تجنب السلالم)'),
  'settings.accessibleNote': en('Upper-floor destinations will be reported as unreachable rather than via stairs.', 'ستُعتبر وجهات الطابق العلوي غير قابلة للوصول بدلًا من استخدام السلالم.'),
  'settings.lowPower': en('Low-power mode', 'وضع الطاقة المنخفضة'),
  'settings.lowPowerNote': en('BLE scans every 2 s instead of every second; the map redraws half as often.', 'تُمسح منارات BLE كل ثانيتين بدلًا من كل ثانية؛ تُرسم الخريطة نصف عدد المرات.'),
  'settings.simulation': en('Simulation', 'المحاكاة'),
  'settings.crowd': en('Crowd level', 'مستوى الزحام'),
  'settings.crowdNote': en('Raises BLE RSSI noise and dropouts in the simulated tour.', 'يزيد ضوضاء BLE وفقدان القياسات في الجولة المحاكاة.'),
  'settings.source': en('Positioning source', 'مصدر تحديد الموقع'),
  'settings.sourceSim': en('Simulated BLE tour', 'جولة BLE محاكاة'),
  'settings.sourceMotion': en('Phone sensors (PDR)', 'حساسات الهاتف (PDR)'),
  'settings.sourceManual': en('Tap to place', 'التحديد باللمس'),
  'settings.sourceQr': en('QR only', 'QR فقط'),
  'settings.startSource': en('Start', 'تشغيل'),
  'settings.stopSource': en('Stop', 'إيقاف'),
  'settings.sensorStatus': en('Sensor status', 'حالة الحساسات'),
  'settings.debug': en('Evaluation panel', 'لوحة التقييم'),
  'settings.debugNote': en('Also reachable by tapping the wordmark 7 times, or with ?debug=1.', 'يمكن الوصول أيضًا بالنقر على الشعار ٧ مرات أو بـ?debug=1.'),
  'settings.reset': en('Reset demo', 'إعادة ضبط العرض'),
  'settings.resetNote': en('Clears position, route, recent items and local preferences.', 'يمسح الموقع والمسار والعناصر الأخيرة والتفضيلات المحلية.'),
  'settings.live': en('Real sensors', 'حساسات حقيقية'),
  'settings.simulated': en('Simulated', 'محاكاة'),
  'settings.motionUnsupported': en('DeviceMotion is not available on this browser.', 'حساسات الحركة غير متاحة في هذا المتصفح.'),
  'settings.motionDenied': en('Motion permission was denied. Use simulation or tap-to-place.', 'رُفض إذن الحركة. استخدم المحاكاة أو التحديد باللمس.'),
  'settings.motionNoEvents': en(
    'No accelerometer data from this device (common on laptops). Use the simulated tour or tap the map.',
    'لا تصل بيانات تسارع من هذا الجهاز (شائع على الحواسيب). استخدم الجولة المحاكاة أو التحديد باللمس.'
  ),
  'settings.motionRelative': en('Heading is relative (compass unavailable); drift will be higher.', 'الاتجاه نسبي (البوصلة غير متاحة)؛ سيزيد الانحراف.'),
  'settings.motionActive': en('Live motion active. Walk with the phone; sensors stop when you stop.', 'تتبع الحركة نشط. امشِ بالهاتف؛ تتوقف الحساسات عند الإيقاف.'),
  'settings.bleStub': en('Real BLE: native only', 'BLE الحقيقي: نسخة أصلية فقط'),
  'settings.bleStubBody': en(
    'Browsers cannot scan BLE advertisements or read RSSI (iOS Safari cannot at all). A native bridge is documented but not implemented; this demo does not pretend otherwise.',
    'لا تستطيع المتصفحات مسح إعلانات BLE أو قراءة شدة الإشارة (Safari على iOS لا يستطيع إطلاقًا). جسر أصلي موثّق لكنه غير منفّذ؛ ولا يدّعي هذا العرض غير ذلك.'
  ),
  'settings.about': en('About', 'حول'),
  'settings.aboutBody': en(
    'ATHAR is a university prototype. Artifact text and floor plans are placeholders and not affiliated with the Grand Egyptian Museum.',
    'أثر نموذج جامعي. نصوص القطع والمخططات بيانات مؤقتة وليست تابعة للمتحف المصري الكبير.'
  ),
  'settings.openQr': en('Open QR scanner demo', 'افتح عرض ماسح QR'),
  'settings.deviceCheck': en('Device check', 'فحص الجهاز'),
  'settings.deviceCheckNote': en('Test the camera, QR decoding and motion sensors on this phone.', 'اختبر الكاميرا وفك ترميز QR وحساسات الحركة على هذا الهاتف.'),

  'deviceCheck.title': en('Device check', 'فحص الجهاز'),
  'deviceCheck.sub': en(
    'Real permission and real events only. A check passes only after this browser delivers data; an available API is reported as information, never as a pass.',
    'أذونات حقيقية وأحداث حقيقية فقط. لا ينجح أي فحص إلا بعد وصول بيانات من هذا المتصفح؛ وجود الواجهة البرمجية معلومة وليس نجاحًا.'
  ),
  'deviceCheck.camera': en('Camera', 'الكاميرا'),
  'deviceCheck.cameraBody': en(
    'Opening the camera asks for permission and reads real frames at about 4 fps. The stream stops when you close it or leave this page.',
    'فتح الكاميرا يطلب الإذن ويقرأ إطارات حقيقية بمعدل ٤ في الثانية تقريبًا. يتوقف البث عند الإغلاق أو مغادرة الصفحة.'
  ),
  'deviceCheck.openCamera': en('Open camera', 'افتح الكاميرا'),
  'deviceCheck.closeCamera': en('Close camera', 'أغلق الكاميرا'),
  'deviceCheck.cameraPermission': en('Camera permission', 'إذن الكاميرا'),
  'deviceCheck.cameraGranted': en('Permission granted and a live stream was opened.', 'مُنح الإذن وفُتح بث مباشر.'),
  'deviceCheck.cameraDenied': en('Permission denied by the browser or the user.', 'رُفض الإذن من المتصفح أو المستخدم.'),
  'deviceCheck.cameraWaiting': en('Waiting for the permission prompt. If none appears, this browser has no usable camera.', 'بانتظار طلب الإذن. إن لم يظهر طلب، فلا توجد كاميرا صالحة في هذا المتصفح.'),
  'deviceCheck.cameraUnsupported': en('No camera API here, or the page is not a secure context (HTTPS/localhost).', 'لا توجد واجهة كاميرا هنا، أو الصفحة ليست في سياق آمن (HTTPS/localhost).'),
  'deviceCheck.cameraError': en('The camera could not be opened.', 'تعذّر فتح الكاميرا.'),
  'deviceCheck.frames': en('frames read', 'إطارًا مقروءًا'),
  'deviceCheck.qr': en('QR decoding', 'فك ترميز QR'),
  'deviceCheck.qrBody': en(
    'The demo code is rendered here and decoded with the same jsQR build the camera uses. This tests the decoder; the camera test below is separate.',
    'يُعرض رمز العرض هنا ويُفكّ بترميز jsQR نفسه الذي تستخدمه الكاميرا. هذا يختبر المفكّك؛ اختبار الكاميرا أدناه منفصل.'
  ),
  'deviceCheck.demoCode': en('Demo code', 'رمز العرض'),
  'deviceCheck.runSelfTest': en('Decode the demo code', 'فكّ ترميز رمز العرض'),
  'deviceCheck.selfTestPass': en('The demo payload round-tripped through jsQR unchanged.', 'عادت حمولة العرض من jsQR دون تغيير.'),
  'deviceCheck.selfTestFail': en('jsQR did not return the demo payload.', 'لم يُرجع jsQR حمولة العرض.'),
  'deviceCheck.selfTestNote': en('Rendered and decoded in this page — not a camera result.', 'عُرض وفُكّ في هذه الصفحة — ليس نتيجة كاميرا.'),
  'deviceCheck.cameraDecode': en('Camera decode', 'فك الترميز بالكاميرا'),
  'deviceCheck.cameraDecodeWaiting': en('Open the camera and point it at a printed or second-screen ATHAR code.', 'افتح الكاميرا ووجّهها إلى رمز أثر مطبوع أو على شاشة ثانية.'),
  'deviceCheck.cameraDecodePass': en('Decoded from real camera frames.', 'فُكّ من إطارات كاميرا حقيقية.'),
  'deviceCheck.cameraDecodeFail': en('Frames decoded, but the payload is not an ATHAR code.', 'فُكّت الإطارات، لكن الحمولة ليست رمز أثر.'),
  'deviceCheck.motion': en('Motion sensors', 'حساسات الحركة'),
  'deviceCheck.motionBody': en(
    'Starts a real DeviceMotion listener and waits for accelerometer data. On iOS the permission prompt appears only from this button, as the platform requires.',
    'يشغّل مستمع DeviceMotion حقيقيًا وينتظر بيانات التسارع. على iOS يظهر طلب الإذن من هذا الزر فقط، وفقًا للمنصة.'
  ),
  'deviceCheck.api': en('DeviceMotion API', 'واجهة DeviceMotion'),
  'deviceCheck.apiPresent': en('Exposed by this browser. This is not proof of a sensor — run the test.', 'متاحة في هذا المتصفح. هذا ليس دليلًا على وجود حساس — شغّل الاختبار.'),
  'deviceCheck.apiMissing': en('Not exposed by this browser.', 'غير متاحة في هذا المتصفح.'),
  'deviceCheck.secureContext': en('Secure context', 'سياق آمن'),
  'deviceCheck.secureYes': en('Yes — sensors and camera are allowed.', 'نعم — الحساسات والكاميرا مسموحة.'),
  'deviceCheck.secureNo': en('No — a phone needs HTTPS for sensors and camera.', 'لا — يحتاج الهاتف إلى HTTPS للحساسات والكاميرا.'),
  'deviceCheck.iosPermission': en('iOS permission', 'إذن iOS'),
  'deviceCheck.iosNotApplicable': en('No requestPermission API in this browser (not iOS, or already allowed).', 'لا توجد واجهة requestPermission في هذا المتصفح (ليس iOS أو مسموح مسبقًا).'),
  'deviceCheck.iosWaiting': en('Waiting for the iOS permission prompt.', 'بانتظار طلب الإذن من iOS.'),
  'deviceCheck.iosGranted': en('Motion and orientation permission granted.', 'مُنح إذن الحركة والاتجاه.'),
  'deviceCheck.iosDenied': en('Motion permission was denied.', 'رُفض إذن الحركة.'),
  'deviceCheck.runSensors': en('Run sensor test', 'شغّل اختبار الحساسات'),
  'deviceCheck.stopSensors': en('Stop sensors', 'أوقف الحساسات'),
  'deviceCheck.events': en('Accelerometer events', 'أحداث التسارع'),
  'deviceCheck.orientationEvents': en('Orientation events', 'أحداث الاتجاه'),
  'deviceCheck.steps': en('Steps detected', 'خطوات مكتشفة'),
  'deviceCheck.heading': en('Heading', 'الاتجاه'),
  'deviceCheck.noHeading': en('No heading events yet', 'لا أحداث اتجاه بعد'),
  'deviceCheck.headingAbsolute': en('compass (absolute)', 'بوصلة (مطلق)'),
  'deviceCheck.headingRelative': en('relative to start', 'نسبي إلى البداية'),
  'deviceCheck.walkHint': en('Walk a few steps and turn the phone; these numbers change only on real events.', 'امشِ خطوات وأدر الهاتف؛ تتغير هذه الأرقام فقط عند أحداث حقيقية.'),
  'deviceCheck.motionPass': en('Live accelerometer events are arriving.', 'تصل أحداث تسارع مباشرة.'),
  'deviceCheck.motionFail': en('No usable motion events from this device.', 'لا أحداث حركة صالحة من هذا الجهاز.'),
  'deviceCheck.motionNoHardware': en('Common on laptops and tablets without an accelerometer. Run this check on a phone over HTTPS.', 'شائع على الحواسيب والأجهزة اللوحية دون مقياس تسارع. شغّل هذا الفحص على هاتف عبر HTTPS.'),
  'deviceCheck.never': en('Nothing on this page reports a sensor as working without events from it.', 'لا شيء في هذه الصفحة يعتبر حساسًا يعمل دون أحداث منه.'),
  'deviceCheck.back': en('Back to settings', 'العودة إلى الإعدادات'),
  'deviceCheck.status.untested': en('Not tested', 'لم يُختبر'),
  'deviceCheck.status.waiting': en('Waiting', 'بانتظار'),
  'deviceCheck.status.pass': en('Pass', 'ناجح'),
  'deviceCheck.status.fail': en('Fail', 'فشل'),
  'deviceCheck.status.info': en('Info', 'معلومة'),

  'qr.title': en('Scan an ATHAR QR', 'امسح رمز أثر'),
  'qr.sub': en('Camera decoding happens on the device. Frames never leave the phone.', 'يُفكّ ترميز الكاميرا على الجهاز. لا تغادر الصور الهاتف.'),
  'qr.camera': en('Open camera', 'افتح الكاميرا'),
  'qr.stop': en('Close camera', 'أغلق الكاميرا'),
  'qr.demoCodes': en('Demo codes (type or scan from a second screen)', 'رموز العرض (اكتبها أو امسحها من شاشة ثانية)'),
  'qr.entrance': en('Entrance', 'المدخل'),
  'qr.scan': en('Scan code', 'امسح الرمز'),
  'qr.decoded': en('Decoded', 'تم فك الترميز'),
  'qr.invalid': en('This is not an ATHAR code.', 'هذا ليس رمز أثر.'),
  'qr.cameraDenied': en('Camera permission was denied.', 'رُفض إذن الكاميرا.'),
  'qr.cameraUnavailable': en('Camera unavailable. Use a demo code instead.', 'الكاميرا غير متاحة. استخدم رمز عرض بدلًا منها.'),
  'qr.cameraInsecure': en('The camera needs HTTPS or localhost.', 'تحتاج الكاميرا إلى HTTPS أو localhost.'),
  'qr.scanning': en('Scanning…', 'جارٍ المسح…'),
  'qr.showForScanning': en('Show this on a second screen', 'اعرض هذا على شاشة ثانية'),
  'qr.applied': en('Position confirmed', 'تم تأكيد الموقع'),
  'qr.openArtifact': en('Open artifact', 'افتح القطعة'),
  'qr.back': en('Back to map', 'العودة للخريطة'),
  'qr.reset': en('Use entrance position', 'استخدم موقع المدخل'),

  'admin.closeHall': en('Close hall', 'إغلاق القاعة'),
  'admin.reopenHall': en('Reopen hall', 'إعادة فتح القاعة'),
  'debug.title': en('Evaluation panel', 'لوحة التقييم'),
  'debug.sub': en('Every value below is computed from the running demo. Nothing is hard-coded.', 'كل قيمة أدناه محسوبة من العرض الجاري. لا شيء مكتوب يدويًا.'),
  'debug.groundTruth': en('Ground truth', 'الموقع الحقيقي'),
  'debug.estimate': en('Estimate', 'التقدير'),
  'debug.error': en('Error', 'الخطأ'),
  'debug.noTruth': en('No ground truth: a real sensor source is active. Error metrics are unavailable by design.', 'لا يوجد موقع حقيقي: مصدر حساسات حقيقي نشط. مقاييس الخطأ غير متاحة بالتصميم.'),
  'debug.liveMetrics': en('Live metrics (this session)', 'مقاييس مباشرة (هذه الجلسة)'),
  'debug.liveBadge': en('LIVE', 'مباشر'),
  'debug.staleBadge': en('PAUSED - values are stale', 'متوقف - القيم قديمة'),
  'debug.staleBody': en(
    'Tracking is paused or stopped. The numbers below are frozen at the last update and are not live.',
    'التتبع متوقف أو موقوف مؤقتًا. الأرقام أدناه مجمّدة عند آخر تحديث وليست مباشرة.'
  ),
  'debug.samples': en('Samples', 'العينات'),
  'debug.mean': en('Mean error', 'متوسط الخطأ'),
  'debug.median': en('Median error', 'وسيط الخطأ'),
  'debug.p95': en('95th percentile', 'المئين 95'),
  'debug.hallAcc': en('Hall detection', 'كشف القاعة'),
  'debug.nearestAcc': en('Nearest artifact', 'أقرب قطعة'),
  'debug.updateRate': en('Update rate', 'معدل التحديث'),
  'debug.readings': en('Beacon readings used', 'قراءات المنارات المستخدمة'),
  'debug.qrResets': en('QR resets', 'إعادة ضبط QR'),
  'debug.qrSchedule': en('QR events', 'أحداث QR'),
  'debug.battery': en('Battery proxy', 'مؤشر استهلاك البطارية'),
  'debug.activations': en('Sensor activations / min', 'تنشيطات الحساسات / دقيقة'),
  'debug.cpuOps': en('Estimator updates / min', 'تحديثات المقدّر / دقيقة'),
  'debug.scanInterval': en('Scan interval', 'فاصل المسح'),
  'debug.source': en('Source', 'المصدر'),
  'debug.col.hall': en('Hall', 'القاعة'),
  'debug.col.radius': en('Radius', 'نصف القطر'),
  'debug.col.conf': en('Confidence', 'الثقة'),
  'debug.col.source': en('Source', 'المصدر'),
  'debug.scenario': en('Scenario runner', 'مشغّل السيناريوهات'),
  'debug.scenarioBody': en(
    '3 fixed paths × 3 crowd levels × 3 configurations = 27 deterministic simulated walks with known ground truth. Uses the same engine and simulator as the app.',
    '٣ مسارات ثابتة × ٣ مستويات زحام × ٣ تهيئات = ٢٧ جولة محاكاة حتمية بموقع حقيقي معروف. تستخدم نفس المحرك والمحاكي في التطبيق.'
  ),
  'debug.run': en('Run 27 scenarios', 'تشغيل ٢٧ سيناريو'),
  'debug.running': en('Running…', 'جارٍ التشغيل…'),
  'debug.results': en('Results', 'النتائج'),
  'debug.runs': en('runs', 'جولة'),
  'debug.seed': en('seed', 'بذرة'),
  'debug.config': en('Configuration', 'التهيئة'),
  'debug.crowd': en('Crowd', 'الزحام'),
  'debug.path': en('Path', 'المسار'),
  'debug.exportJson': en('Export JSON', 'تصدير JSON'),
  'debug.exportCsv': en('Export CSV', 'تصدير CSV'),
  'debug.compare': en('Compare configurations', 'مقارنة التهيئات'),
  'debug.chart': en('Mean error by configuration and crowd level', 'متوسط الخطأ حسب التهيئة والزحام'),
  'debug.routing': en('Route benchmark', 'قياس المسارات'),
  'debug.routingBody': en('40 recomputations per route pair, measured with performance.now().', '٤٠ إعادة حساب لكل زوج مسارات، مقيسة بـperformance.now().'),
  'debug.routingRun': en('Benchmark 120 routes', 'قس ١٢٠ مسارًا'),
  'debug.routingP50': en('Median recompute', 'وسيط إعادة الحساب'),
  'debug.routingP95': en('95th percentile', 'المئين 95'),
  'debug.routingMax': en('Max', 'الأقصى'),
  'debug.routes': en('Route samples', 'عينات المسارات'),
  'debug.details': en('Per-run table', 'جدول كل جولة'),
  'debug.notes': en(
    'All numbers come from simulated measurements on a virtual walker. They are not claims about real-world accuracy.',
    'كل الأرقام من قياسات محاكاة على زائر افتراضي. وهي ليست ادعاءات عن دقة الواقع.'
  ),
  'debug.downloaded': en('Downloaded', 'تم التنزيل'),
  'debug.close': en('Close panel', 'إغلاق اللوحة'),
  'debug.noData': en('Run the scenarios to see measured numbers.', 'شغّل السيناريوهات لعرض الأرقام المقاسة.'),

  'admin.title': en('Operations demo', 'عرض التشغيل'),
  'admin.sub': en('P2 · simulated, anonymous visitor density and live rerouting. No cameras, no identities.', 'أولوية ٢ · كثافة زوار محاكاة ومجهولة، وإعادة توجيه مباشرة. لا كاميرات ولا هويات.'),
  'admin.density': en('Hall density (simulated)', 'كثافة القاعات (محاكاة)'),
  'admin.densityNote': en('Counts are synthesized from an anonymous seed and are not measurements.', 'الأعداد مُولّدة من بذرة مجهولة وليست قياسات.'),
  'admin.visitors': en('visitors', 'زائر'),
  'admin.closed': en('Closed', 'مغلقة'),
  'admin.open': en('Open', 'مفتوحة'),
  'admin.toggle': en('Toggle hall', 'تبديل القاعة'),
  'admin.editArtifact': en('Move an artifact', 'تحريك قطعة'),
  'admin.x': en('X (m)', 'س (م)'),
  'admin.y': en('Y (m)', 'ص (م)'),
  'admin.apply': en('Apply coordinates', 'تطبيق الإحداثيات'),
  'admin.reset': en('Reset overrides', 'إعادة الضبط'),
  'admin.artifacts': en('Artifacts', 'القطع'),
  'admin.routeImpact': en('Active route impact', 'تأثير المسار النشط'),
  'admin.noRoute': en('No active route. Close a hall then start navigation to see it reroute live.', 'لا مسار نشط. أغلق قاعة ثم ابدأ الملاحة لرؤية إعادة التوجيه مباشرة.'),
  'admin.saved': en('Saved locally for this demo. Not museum data.', 'حُفظ محليًا لهذا العرض. ليست بيانات المتحف.'),
  'admin.back': en('Back to map', 'العودة للخريطة'),

  'route.reason.no-start': en('No route can start from here.', 'لا يمكن بدء مسار من هنا.'),
  'route.reason.no-target': en('No route to that artifact.', 'لا يوجد مسار إلى هذه القطعة.'),
  'route.reason.target-closed': en('The target hall is closed.', 'قاعة الهدف مغلقة.'),
  'route.reason.stairs-only': en('This route needs stairs.', 'يتطلب هذا المسار استخدام السلالم.'),
  'route.reason.closed': en('A hall on the route is closed.', 'قاعة على المسار مغلقة.'),
  'route.reason.no-route': en('No path found on the floor plan.', 'لا مسار على المخطط.')
};

/* Smart-visit strings live in their own module and are merged here so
 * `navT` stays a single lookup for every screen. */
Object.assign(NAV_STRINGS, SMART_STRINGS);

export type NavKey = keyof typeof NAV_STRINGS;

export function navT(lang: UiLang, key: string): string {
  const entry = NAV_STRINGS[key];
  if (!entry) return key;
  return entry[lang] ?? entry.en;
}

export function formatMeters(value: number | null | undefined, lang: UiLang, digits = 1): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${value.toFixed(digits)} ${lang === 'ar' ? 'م' : 'm'}`;
}

export function formatPct(value: number | null | undefined, lang: UiLang): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${value.toFixed(1)}${lang === 'ar' ? '٪' : '%'}`;
}

export function formatHz(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${value.toFixed(2)} Hz`;
}

export const ARABIC_UI: Entry = {};
