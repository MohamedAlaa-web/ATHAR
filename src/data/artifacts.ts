export type Lang = 'en' | 'ar' | 'fr';

export interface ArtifactImage {
  src: string;
  altEn: string;
  altAr: string;
}

export interface StoryChapter {
  id: string;
  titleEn: string;
  titleAr: string;
  titleFr: string;
  narrationEn: string;
  narrationAr: string;
  narrationFr: string;
  /** seconds within the simulated timeline */
  durationSec: number;
  image: ArtifactImage;
  reconstructionNoteEn?: string;
  reconstructionNoteAr?: string;
}

export interface HistoricalFact {
  labelEn: string;
  labelAr: string;
  valueEn: string;
  valueAr: string;
}

export interface Artifact {
  id: string;
  qrCode: string;
  demoCode: string;
  nameEn: string;
  nameAr: string;
  nameFr: string;
  taglineEn: string;
  taglineAr: string;
  taglineFr: string;
  periodEn: string;
  periodAr: string;
  confidence: 'verified-general' | 'illustrative-demo';
  descriptionEn: string;
  descriptionAr: string;
  descriptionFr: string;
  significanceEn: string;
  significanceAr: string;
  significanceFr: string;
  /** Honesty note about what the lead photograph shows (e.g. a named mummy used illustratively). */
  photoNoteEn?: string;
  photoNoteAr?: string;
  photoNoteFr?: string;
  image: ArtifactImage;
  chapters: StoryChapter[];
  facts: HistoricalFact[];
  contextEn: string;
  contextAr: string;
  contextFr: string;
  knownVsUncertainEn: { known: string[]; uncertain: string[] };
  knownVsUncertainAr: { known: string[]; uncertain: string[] };
  relatedIds: string[];
  sourcesEn: string[];
  sourcesAr: string[];
}

const img = (src: string, altEn: string, altAr: string): ArtifactImage => ({
  src,
  altEn,
  altAr
});

/** Photographer / license credits keyed by local file name. Shown under the
 *  lead photo and in the Explore page credits section. */
export const PHOTO_CREDITS: Record<string, string> = {
  'photo-hero-museum.jpg': 'Wikimedia Commons · CC BY-SA 4.0 · photo: Egyptiankeng',
  'photo-art-mummy.jpg': 'Wikimedia Commons · Public domain (1912 photograph by G. Elliot Smith)',
  'photo-art-coffin.jpg': 'Wikimedia Commons · CC0 · photo: Gary Todd',
  'photo-art-statue.jpg': 'Wikimedia Commons · CC BY-SA 4.0 · photo: MusikAnimal',
  'photo-scene-nile.jpg': 'Wikimedia Commons · CC BY 4.0 · photo: Vyacheslav Argenberg',
  'photo-scene-temple.jpg': 'Wikimedia Commons · CC BY 3.0 · photo: Tim Adams',
  'photo-scene-rite.jpg': 'Wellcome Collection via Wikimedia Commons · CC BY 4.0',
  'photo-scene-embalm.jpg': 'Wikimedia Commons · CC BY-SA 4.0 · photo: Merytat3n',
  'photo-scene-journey.jpg': 'Wikimedia Commons · CC BY 4.0 · photo: Vyacheslav Argenberg',
  'photo-scene-coffin-outer.jpg': 'Wikimedia Commons · CC BY-SA 4.0 · photo: SpeakingArch',
  'photo-scene-coffin-sky.jpg': 'Metropolitan Museum of Art via Wikimedia Commons · CC0 (facsimile by Charles Wilkinson)',
  'photo-scene-coffin-text.jpg': 'Wikimedia Commons · CC BY 4.0 · photo: Vyacheslav Argenberg',
  'photo-scene-quarry.jpg': 'Wikimedia Commons · CC BY-SA 3.0 · photo: Kriplozoik',
  'photo-scene-sculptor.jpg': 'Museo Egizio, Turin, via Wikimedia Commons · CC0',
  'photo-scene-offering.jpg': 'Metropolitan Museum of Art via Wikimedia Commons · CC0'
};

export const photoCredit = (src: string): string => PHOTO_CREDITS[src] ?? '';

/**
 * Demo records. Deliberately generic — no invented inventory numbers,
 * provenance, or gallery locations. All positions labelled illustrative.
 */
export const ARTIFACTS: Artifact[] = [
  {
    id: 'royal-mummy',
    qrCode: 'ATHAR-MUMMY-001',
    demoCode: 'MUMMY-001',
    nameEn: 'Royal Mummy of the New Kingdom (Demo Record)',
    nameAr: 'مومياء ملكية من الدولة الحديثة (سجل تجريبي)',
    nameFr: 'Momie royale du Nouvel Empire (dossier démo)',
    taglineEn: 'A life, a death, and a 3,000-year journey',
    taglineAr: 'حياة وموت ورحلة تمتد لثلاثة آلاف عام',
    taglineFr: 'Une vie, une mort et un voyage de 3 000 ans',
    periodEn: 'New Kingdom, c. 1550–1069 BCE (general period)',
    periodAr: 'الدولة الحديثة، حوالي ١٥٥٠–١٠٦٩ قبل الميلاد (فترة عامة)',
    confidence: 'verified-general',
    descriptionEn:
      'This demo record represents a royal mummy of Egypt’s New Kingdom — the era of great temples, powerful pharaohs, and elaborate preparation for the afterlife. The experience below is a generalized educational reconstruction, not the biography of one identified individual.',
    descriptionAr:
      'يمثل هذا السجل التجريبي مومياء ملكية من عصر الدولة الحديثة — عصر المعابد العظيمة والفراعنة الأقوياء والاستعداد المتقن للحياة الآخرة. التجربة المعروضة إعادة بناء تعليمية عامة، وليست سيرة لشخص محدد بعينه.',
    descriptionFr:
      'Ce dossier démo présente une momie royale du Nouvel Empire — l’ère des grands temples, des pharaons puissants et de la préparation minutieuse de l’au-delà. L’expérience est une reconstitution éducative générale, non la biographie d’une personne identifiée.',
    significanceEn:
      'Mummification shows what ancient Egyptians believed about identity, memory, and survival after death. Preserving the body was an act of care — so the person could be recognized and continue the journey.',
    significanceAr:
      'يكشف التحنيط عمّا آمن به المصريون القدماء حول الهوية والذاكرة والبقاء بعد الموت. كان حفظ الجسد فعل عناية — ليتم التعرف على الشخص ويواصل رحلته.',
    significanceFr:
      'La momification révèle ce que les anciens Égyptiens croyaient sur l’identité, la mémoire et la survie après la mort. Préserver le corps était un acte de soin — pour que la personne soit reconnue et poursuive son voyage.',
    image: img(
      'photo-art-mummy.jpg',
      'Photograph of the mummy of Ramesses II',
      'صورة فوتوغرافية لمومياء رمسيس الثاني'
    ),
    photoNoteEn:
      'Lead photograph shows the mummy of Ramesses II (19th Dynasty) as an illustrative example — the story itself is a generalized reconstruction, not his biography.',
    photoNoteAr:
      'الصورة الرئيسية تُظهر مومياء رمسيس الثاني (الأسرة التاسعة عشرة) كمثال توضيحي — أما القصة فإعادة بناء عامة وليست سيرته.',
    photoNoteFr:
      'La photo principale montre la momie de Ramsès II (XIXe dynastie) à titre d’exemple — l’histoire reste une reconstitution générale, non sa biographie.',
    chapters: [
      {
        id: 'ch-life',
        titleEn: '1 · Life in Ancient Egypt',
        titleAr: '١ · الحياة في مصر القديمة',
        titleFr: '1 · La vie dans l’Égypte ancienne',
        narrationEn:
          'Along the Nile, life followed the river. Farmers watched the sky for the flood, scribes recorded grain and taxes, builders raised stone toward heaven, and priests kept the calendar of festivals. Rich and poor alike lived by seasons of flood and harvest — and all believed that order, maat, held the world together against chaos.',
        narrationAr:
          'على ضفاف النيل، كانت الحياة تتبع النهر. راقب الفلاحون السماء ترقبًا للفيضان، وسجّل الكتبة الغلال والضرائب، ورفع البناة الحجر نحو السماء، وحفظ الكهنة تقويم الأعياد. عاش الأغنياء والفقراء على إيقاع الفيضان والحصاد — وآمن الجميع أن النظام، «ماعت»، يحفظ تماسك العالم في وجه الفوضى.',
        narrationFr:
          'Le long du Nil, la vie suivait le fleuve. Les paysans guettaient la crue, les scribes notaient grains et impôts, les bâtisseurs dressaient la pierre vers le ciel et les prêtres gardaient le calendrier des fêtes. Riches et pauvres vivaient au rythme de la crue et des moissons — et tous croyaient que l’ordre, la maât, tenait le monde face au chaos.',
        durationSec: 27,
        image: img(
          'photo-scene-nile.jpg',
          'Sunset over the Nile at Luxor with felucca boats',
          'غروب الشمس على النيل في الأقصر مع المراكب الشراعية'
        ),
        reconstructionNoteEn: 'Cinematic reconstruction — generalized daily life, not a specific person.',
        reconstructionNoteAr: 'إعادة بناء سينمائية — حياة يومية عامة، وليست لشخص محدد.'
      },
      {
        id: 'ch-royal',
        titleEn: '2 · Royal Life and Historical Context',
        titleAr: '٢ · الحياة الملكية والسياق التاريخي',
        titleFr: '2 · Vie royale et contexte historique',
        narrationEn:
          'In the New Kingdom, Egypt became an empire, and the pharaoh stood at its center — ruler, general, and high priest in one. Campaigns pushed borders far to the south and east, while at home, temples rose in stone and festivals filled the streets. Every statue and every relief repeated one message: the king upholds maat, and the kingdom endures.',
        narrationAr:
          'في الدولة الحديثة، أصبحت مصر إمبراطورية، ووقف الفرعون في مركزها — حاكمًا وقائدًا وكبير كهنة في شخص واحد. وسّعت الحملات الحدود جنوبًا وشرقًا، بينما ارتفعت المعابد الحجرية في الداخل وامتلأت الشوارع بالأعياد. كل تمثال وكل نقش كان يردد رسالة واحدة: الملك يحفظ «ماعت»، والمملكة تبقى.',
        narrationFr:
          'Au Nouvel Empire, l’Égypte devint un empire, et le pharaon se tenait en son centre — souverain, général et grand prêtre à la fois. Les campagnes repoussèrent les frontières au sud et à l’est, tandis que les temples de pierre s’élevaient et que les fêtes remplissaient les rues. Chaque statue, chaque relief répétait un message : le roi maintient la maât, et le royaume endure.',
        durationSec: 29,
        image: img(
          'photo-scene-temple.jpg',
          'Columns of the Great Hypostyle Hall at Karnak',
          'أعمدة قاعة الأعمدة الكبرى في الكرنك'
        ),
        reconstructionNoteEn: 'Cinematic reconstruction — generalized royal role.',
        reconstructionNoteAr: 'إعادة بناء سينمائية — دور ملكي عام.'
      },
      {
        id: 'ch-death',
        titleEn: '3 · The End of Life and Funerary Traditions',
        titleAr: '٣ · نهاية الحياة وتقاليد الجنازة',
        titleFr: '3 · Fin de vie et traditions funéraires',
        narrationEn:
          'Death was not an end but a crossing. When a life ended, the household entered mourning, priests were summoned, and the long ritual began. Offerings of bread, beer, and flowers were laid out, prayers were spoken for the journey west, and every gesture said the same thing: you are not gone, you are traveling.',
        narrationAr:
          'لم يكن الموت نهاية بل عبورًا. حين تنتهي حياة، يدخل البيت في حداد، ويُستدعى الكهنة، وتبدأ الطقوس الطويلة. توضع قرابين الخبز والجعة والزهور، وتُتلى الصلوات لرحلة الغرب، وكل إيماءة تقول الشيء نفسه: أنت لم ترحل، أنت مسافر.',
        narrationFr:
          'La mort n’était pas une fin mais une traversée. Quand une vie s’achevait, la maison entrait en deuil, on appelait les prêtres et le long rituel commençait. On disposait offrandes de pain, de bière et de fleurs, on récitait des prières pour le voyage vers l’ouest, et chaque geste disait la même chose : tu n’es pas parti, tu voyages.',
        durationSec: 25,
        image: img(
          'photo-scene-rite.jpg',
          'Vignette of the weighing of the heart from the Book of the Dead',
          'منظر وزن القلب من كتاب الموتى'
        ),
        reconstructionNoteEn: 'Cinematic reconstruction — generalized funerary practice.',
        reconstructionNoteAr: 'إعادة بناء سينمائية — ممارسة جنائزية عامة.'
      },
      {
        id: 'ch-mummification',
        titleEn: '4 · Mummification and Preparation',
        titleAr: '٤ · التحنيط والتجهيز للدفن',
        titleFr: '4 · Momification et préparation',
        narrationEn:
          'For about seventy days, embalmers worked in sheltered workshops. They cleansed the body, dried it with natron salts, anointed it with precious oils, and wrapped it layer by layer in linen. Between the folds they placed amulets of protection, and over it all, priests recited spells — so the body would endure and the person would be recognized.',
        narrationAr:
          'على مدى نحو سبعين يومًا، عمل المحنطون في ورش مغطاة. طهّروا الجسد وجففوه بأملاح النطرون ودهنوه بالزيوت الثمينة ولفّوه طبقة فوق طبقة بالكتان. وبين الطيات وضعوا تمائم الحماية، وفوق كل ذلك تلا الكهنة التعاويذ — ليبقى الجسد ويُعرف صاحبه.',
        narrationFr:
          'Pendant environ soixante-dix jours, les embaumeurs travaillaient dans des ateliers abrités. Ils purifiaient le corps, le séchaient aux sels de natron, l’oignaient d’huiles précieuses et l’enveloppaient couche après couche de lin. Entre les plis, ils glissaient des amulettes de protection, et par-dessus tout, les prêtres récitaient des formules — pour que le corps endure et que la personne soit reconnue.',
        durationSec: 28,
        image: img(
          'photo-scene-embalm.jpg',
          'Alabaster canopic jars from KV55',
          'أوانٍ كانوبية من المرمر من المقبرة رقم ٥٥'
        )
      },
      {
        id: 'ch-journey',
        titleEn: '5 · The Funerary Journey and Legacy',
        titleAr: '٥ · رحلة الجنازة والإرث',
        titleFr: '5 · Voyage funéraire et héritage',
        narrationEn:
          'When the body was ready, the procession crossed the Nile to the western tombs, where the sun itself was believed to travel each night. Mourners followed the coffin, priests burned incense, and the tomb was sealed with food, furniture, and words of guidance. Thousands of years later, when we speak these names, the journey continues.',
        narrationAr:
          'حين جهز الجسد، عبر الموكب النيل نحو مقابر الغرب، حيث كان يُعتقد أن الشمس نفسها ترتحل كل ليلة. سار المشيعون خلف التابوت، وأحرق الكهنة البخور، وخُتمت المقبرة بالطعام والأثاث وكلمات الإرشاد. وبعد آلاف السنين، حين ننطق هذه الأسماء، تستمر الرحلة.',
        narrationFr:
          'Quand le corps fut prêt, le cortège traversa le Nil vers les tombes de l’ouest, où l’on croyait que le soleil lui-même voyageait chaque nuit. Les pleureuses suivaient le cercueil, les prêtres brûlaient l’encens, et la tombe fut scellée avec nourriture, mobilier et paroles de guidance. Des millénaires plus tard, quand nous prononçons ces noms, le voyage continue.',
        durationSec: 27,
        image: img(
          'photo-scene-journey.jpg',
          'The Theban hills above the Valley of the Kings',
          'تلال طيبة فوق وادي الملوك'
        ),
        reconstructionNoteEn: 'Cinematic reconstruction — symbolic journey.',
        reconstructionNoteAr: 'إعادة بناء سينمائية — رحلة رمزية.'
      }
    ],
    facts: [
      {
        labelEn: 'Time span',
        labelAr: 'الإطار الزمني',
        valueEn: 'Mummification was practiced for over 3,000 years; royal practice peaked in the New Kingdom.',
        valueAr: 'مُورس التحنيط لأكثر من ٣٠٠٠ عام، وبلغ ذروته الملكية في الدولة الحديثة.'
      },
      {
        labelEn: 'Why 70 days?',
        labelAr: 'لماذا ٧٠ يومًا؟',
        valueEn: 'Classical sources and modern study associate the full embalming ritual with roughly seventy days.',
        valueAr: 'تربط المصادر الكلاسيكية والدراسات الحديثة طقوس التحنيط الكاملة بنحو سبعين يومًا.'
      },
      {
        labelEn: 'Natron salts',
        labelAr: 'أملاح النطرون',
        valueEn: 'A naturally occurring salt mixture used to desiccate the body before wrapping.',
        valueAr: 'خليط ملحي طبيعي استُخدم لتجفيف الجسد قبل اللف بالكتان.'
      },
      {
        labelEn: 'Afterlife belief',
        labelAr: 'الإيمان بالآخرة',
        valueEn: 'Preservation of the body supported the continued existence of the ka and ba — aspects of the self.',
        valueAr: 'دعم حفظ الجسد استمرار وجود «الكا» و«البا» — من مكونات الذات.'
      }
    ],
    contextEn:
      'The New Kingdom (c. 1550–1069 BCE) is the period of Egypt’s empire: Hatshepsut, Akhenaten, Tutankhamun, Ramesses II. Tombs in the Valley of the Kings and rich funerary equipment reflect enormous investment in the afterlife.',
    contextAr:
      'الدولة الحديثة (حوالي ١٥٥٠–١٠٦٩ قبل الميلاد) هي عصر الإمبراطورية المصرية: حتشبسوت وإخناتون وتوت عنخ آمون ورمسيس الثاني. تعكس مقابر وادي الملوك والأثاث الجنائزي الفاخر استثمارًا هائلًا في الحياة الآخرة.',
    contextFr:
      'Le Nouvel Empire (vers 1550–1069 av. J.-C.) est l’époque de l’empire égyptien : Hatchepsout, Akhenaton, Toutankhamon, Ramsès II. Les tombes de la Vallée des Rois et le riche mobilier funéraire reflètent un immense investissement dans l’au-delà.',
    knownVsUncertainEn: {
      known: [
        'Mummification steps are well documented from bodies, materials, and texts.',
        'Funerary texts describe the desired afterlife journey in detail.',
        'Royal burials concentrated enormous craft and ritual labor.'
      ],
      uncertain: [
        'Individual identities require scientific identification — not assumed here.',
        'Personal childhood, dialogue, and cause of death are not reconstructed as fact.',
        'Many workshop details varied by period and region.'
      ]
    },
    knownVsUncertainAr: {
      known: [
        'خطوات التحنيط موثقة جيدًا من الأجساد والمواد والنصوص.',
        'تصف النصوص الجنائزية رحلة العالم الآخر المرجوة بالتفصيل.',
        'ركزت الدفنات الملكية جهدًا حرفيًا وطقسيًا هائلًا.'
      ],
      uncertain: [
        'تحديد الهويات الفردية يتطلب دراسة علمية — ولا نفترضها هنا.',
        'الطفولة الشخصية والحوارات وسبب الوفاة لا تُعرض كحقائق.',
        'تفاصيل كثيرة اختلفت حسب الفترة والمنطقة.'
      ]
    },
    relatedIds: ['painted-coffin', 'royal-statue'],
    sourcesEn: [
      'Demo record — general background; consult museum labels and Egyptology publications for object-specific study.',
      'No invented inventory numbers or display locations are claimed.'
    ],
    sourcesAr: [
      'سجل تجريبي — خلفية عامة؛ راجع لافتات المتحف ومنشورات علم المصريات للدراسة التفصيلية.',
      'لا ندّعي أرقام جرد أو مواقع عرض مخترعة.'
    ]
  },
  {
    id: 'painted-coffin',
    qrCode: 'ATHAR-COFFIN-002',
    demoCode: 'COFFIN-002',
    nameEn: 'Painted Wooden Coffin (Demo Record)',
    nameAr: 'تابوت خشبي ملوّن (سجل تجريبي)',
    nameFr: 'Cercueil en bois peint (dossier démo)',
    taglineEn: 'A universe painted for one person’s sky',
    taglineAr: 'سماء مرسومة لشخص واحد',
    taglineFr: 'Un univers peint pour le ciel d’une personne',
    periodEn: 'Third Intermediate Period style, c. 1069–664 BCE (illustrative)',
    periodAr: 'على طراز الفترة الانتقالية الثالثة، حوالي ١٠٦٩–٦٦٤ قبل الميلاد (توضيحي)',
    confidence: 'illustrative-demo',
    descriptionEn:
      'Coffins of this era are covered inside and out with protective scenes — sky goddesses, watchful eyes, and columns of prayer. This demo record explains how a coffin worked as a machine for resurrection.',
    descriptionAr:
      'تُغطى توابيت هذا العصر من الداخل والخارج بمشاهد الحماية — إلهات السماء والعيون الساهرة وأعمدة الدعاء. يشرح هذا السجل التجريبي كيف عمل التابوت كوسيلة للبعث.',
    descriptionFr:
      'Les cercueils de cette époque sont couverts, dedans comme dehors, de scènes de protection — déesses du ciel, yeux attentifs et colonnes de prières. Ce dossier démo explique comment un cercueil fonctionnait comme une machine à ressusciter.',
    significanceEn:
      'Every image is a spell. The coffin wrapped its owner in gods, stars, and words — so protection never left them.',
    significanceAr:
      'كل صورة تعويذة. كان التابوت يلف صاحبه بالآلهة والنجوم والكلمات — فلا تفارقه الحماية أبدًا.',
    significanceFr:
      'Chaque image est une formule. Le cercueil enveloppait son propriétaire de dieux, d’étoiles et de mots — pour que la protection ne le quitte jamais.',
    image: img('photo-art-coffin.jpg', 'Photograph of a painted ancient Egyptian wooden coffin', 'صورة لتابوت خشبي مصري قديم ملوّن'),
    photoNoteEn:
      'Lead photograph shows a painted coffin lid from Lahun (Third Intermediate Period style, Pitt Rivers Museum) as an illustrative example — not the demo record’s own object.',
    photoNoteAr:
      'الصورة الرئيسية تُظهر غطاء تابوت ملوّنًا من لاهون (على طراز الفترة الانتقالية الثالثة، متحف بيت ريفرز) كمثال توضيحي — وليست قطعة السجل التجريبي ذاتها.',
    photoNoteFr:
      'La photo principale montre un couvercle de cercueil peint de Lahun (style Troisième Période intermédiaire, Pitt Rivers Museum) à titre d’exemple — et non l’objet du dossier démo lui-même.',
    chapters: [
      {
        id: 'cf-outer',
        titleEn: '1 · The Outer Shell',
        titleAr: '١ · الغلاف الخارجي',
        titleFr: '1 · L’enveloppe extérieure',
        narrationEn: 'Varnished wood, wide collar, watchful eyes — the coffin announces who lies within and faces the rising sun. Even before it is opened, the coffin is already speaking: look first at the outside, then imagine the sky within.',
        narrationAr: 'خشب ملمّع وقلادة عريضة وعيون ساهرة — يعلن التابوت من يرقد بداخله ويواجه شروق الشمس. حتى قبل أن يُفتح، يكون التابوت قد بدأ الكلام: انظر إلى الخارج أولًا، ثم تخيّل السماء في الداخل.',
        narrationFr: 'Bois verni, large collier, yeux attentifs — le cercueil annonce qui repose à l’intérieur et fait face au soleil levant. Avant même d’être ouvert, le cercueil parle déjà : regardez l’extérieur d’abord, puis imaginez le ciel à l’intérieur.',
        durationSec: 19,
        image: img('photo-scene-coffin-outer.jpg', 'Painted coffin lid, Third Intermediate Period', 'غطاء تابوت ملوّن، الفترة الانتقالية الثالثة')
      },
      {
        id: 'cf-sky',
        titleEn: '2 · The Sky Inside',
        titleAr: '٢ · السماء في الداخل',
        titleFr: '2 · Le ciel à l’intérieur',
        narrationEn: 'Open the lid in your mind and look up: the sky goddess Nut stretches across the interior, her body arched over the deceased and covered in stars. Every night the sun travels through her; every morning it is reborn from her. To sleep beneath this painted sky was to sleep inside eternity.',
        narrationAr: 'افتح الغطاء في خيالك وانظر إلى أعلى: تمتد إلهة السماء نوت عبر الباطن، مقوّسة جسدها فوق المتوفى ومغطاة بالنجوم. كل ليلة تعبر الشمس جسدها؛ وكل صباح تُبعث منها. أن تنام تحت هذه السماء المرسومة يعني أن تنام داخل الأبدية.',
        narrationFr: 'Ouvrez le couvercle en esprit et levez les yeux : la déesse du ciel Nout s’étend à l’intérieur, son corps arqué au-dessus du défunt, couvert d’étoiles. Chaque nuit le soleil la traverse ; chaque matin il renaît d’elle. Dormir sous ce ciel peint, c’était dormir dans l’éternité.',
        durationSec: 23,
        image: img('photo-scene-coffin-sky.jpg', 'Astronomical star ceiling from the tomb of Senenmut', 'سقف فلكي مرصع بالنجوم من مقبرة سننموت'),
        reconstructionNoteEn: 'Cinematic reconstruction — generalized iconography.',
        reconstructionNoteAr: 'إعادة بناء سينمائية — رموز عامة.'
      },
      {
        id: 'cf-words',
        titleEn: '3 · Words That Protect',
        titleAr: '٣ · كلمات تحمي',
        titleFr: '3 · Des mots qui protègent',
        narrationEn: 'Down the center run columns of prayer — requests for bread, beer, linen, and every good thing, repeated forever. These are not decorations. Spoken by priests at the burial and written to be spoken eternally, the words themselves feed the dead, forever.',
        narrationAr: 'في الوسط تمتد أعمدة الدعاء — طلبات الخبز والجعة والكتان وكل شيء طيب، تتكرر أبدًا. هذه ليست زخارف. نطقها الكهنة عند الدفن وكُتبت لتُتلى أبدًا، فالكلمات نفسها تُطعم المتوفى إلى الأبد.',
        narrationFr: 'Au centre courent des colonnes de prières — demandes de pain, de bière, de lin et de toute bonne chose, répétées à jamais. Ce ne sont pas des décorations. Prononcés par les prêtres aux funérailles et écrits pour être dits éternellement, les mots eux-mêmes nourrissent le mort, à jamais.',
        durationSec: 21,
        image: img('photo-scene-coffin-text.jpg', 'Hieroglyphic inscriptions at Medinet Habu', 'نقوش هيروغليفية في مدينة هابو')
      }
    ],
    facts: [
      { labelEn: 'Material', labelAr: 'الخامة', valueEn: 'Wood, gesso, pigment and varnish on elite examples.', valueAr: 'الخشب والجص والأصباغ والورنيش في النماذج الفاخرة.' },
      { labelEn: 'Wedjat eyes', labelAr: 'عيون وجات', valueEn: 'A pair of protective eyes let the deceased face east toward rebirth.', valueAr: 'زوج من العيون الحامية يتيح للمتوفى مواجهة الشرق نحو البعث.' },
      { labelEn: 'Coffin as cosmos', labelAr: 'التابوت ككون', valueEn: 'Lid as sky, trough as earth — the body rests at creation’s center.', valueAr: 'الغطاء سماء والقاع أرض — يرقد الجسد في مركز الخليقة.' }
    ],
    contextEn: 'After the New Kingdom, investment shifted from vast tombs to richly painted coffin sets — whole cosmologies in wood.',
    contextAr:       'بعد الدولة الحديثة، انتقل الاستثمار من المقابر الشاسعة إلى أطقم توابيت غنية الزخرفة — أكوان كاملة من الخشب.',
    contextFr:
      'Après le Nouvel Empire, l’investissement est passé des vastes tombes aux ensembles de cercueils richement peints — des cosmologies entières en bois.',
    knownVsUncertainEn: { known: ['Iconography programs are well studied.', 'Materials and joinery can be examined scientifically.'], uncertain: ['Owner identity is not asserted for this demo record.', 'Workshop attribution varies.'] },
    knownVsUncertainAr: { known: ['البرامج الزخرفية مدروسة جيدًا.', 'يمكن فحص المواد والنجارة علميًا.'], uncertain: ['لا نحدد هوية مالك لهذا السجل التجريبي.', 'نسبة الورشة تختلف.'] },
    relatedIds: ['royal-mummy', 'royal-statue'],
    sourcesEn: ['Demo record — illustrative; verify against published coffin studies.'],
    sourcesAr: ['سجل تجريبي — توضيحي؛ تحقق من دراسات التوابيت المنشورة.']
  },
  {
    id: 'royal-statue',
    qrCode: 'ATHAR-STATUE-003',
    demoCode: 'STATUE-003',
    nameEn: 'Royal Statue in Dark Stone (Demo Record)',
    nameAr: 'تمثال ملكي من حجر داكن (سجل تجريبي)',
    nameFr: 'Statue royale en pierre sombre (dossier démo)',
    taglineEn: 'Stillness that was meant to last forever',
    taglineAr: 'سكون صُمم ليبقى أبدًا',
    taglineFr: 'Une immobilité faite pour durer toujours',
    periodEn: 'New Kingdom style, c. 1550–1069 BCE (illustrative)',
    periodAr: 'على طراز الدولة الحديثة، حوالي ١٥٥٠–١٠٦٩ قبل الميلاد (توضيحي)',
    confidence: 'illustrative-demo',
    descriptionEn:
      'Hard-stone royal statues embodied permanence: frontal pose, calm gaze, and insignia of rule. This demo record shows how a statue acted as an eternal body for offerings and memory.',
    descriptionAr:
      'جسّدت التماثيل الملكية من الحجر الصلب الخلود: وقفة أمامية ونظرة هادئة وشارات الحكم. يوضح هذا السجل التجريبي كيف عمل التمثال جسدًا أبديًا للقرابين والذكرى.',
    descriptionFr:
      'Les statues royales en pierre dure incarnaient la permanence : pose frontale, regard calme et insignes du pouvoir. Ce dossier démo montre comment une statue servait de corps éternel pour les offrandes et la mémoire.',
    significanceEn: 'A statue gave the spirit a second address — a face offerings could always find.',
    significanceAr:       'منح التمثال للروح عنوانًا ثانيًا — وجهًا تجده القرابين دائمًا.',
    significanceFr:
      'Une statue donnait à l’esprit une seconde adresse — un visage que les offrandes pouvaient toujours trouver.',
    image: img('photo-art-statue.jpg', 'Photograph of a colossal statue of Ramesses II at Karnak', 'صورة لتمثال ضخم لرمسيس الثاني في الكرنك'),
    photoNoteEn:
      'Lead photograph shows the colossal statue of Ramesses II at Karnak Temple, Luxor — an illustrative example of New Kingdom royal statuary, not a statue housed at the Grand Egyptian Museum.',
    photoNoteAr:
      'الصورة الرئيسية تُظهر التمثال الضخم لرمسيس الثاني في معبد الكرنك بالأقصر — كمثال توضيحي على التماثيل الملكية للدولة الحديثة، وليس تمثالًا معروضًا في المتحف المصري الكبير.',
    photoNoteFr:
      'La photo principale montre le colosse de Ramsès II au temple de Karnak, Louxor — un exemple illustratif de la statuaire royale du Nouvel Empire, et non une statue du Grand Musée Égyptien.',
    chapters: [
      {
        id: 'st-stone',
        titleEn: '1 · Stone That Refuses Time',
        titleAr: '١ · حجر يتحدى الزمن',
        titleFr: '1 · Une pierre qui refuse le temps',
        narrationEn: 'Touch this stone in your mind: granodiorite, nearly as hard as the tools that shape it. Quarrymen split it from the living rock at Aswan, crews dragged it for hundreds of kilometers, and sculptors spent months on a single face. Choosing such stone was already a statement — this image must outlast time itself.',
        narrationAr: 'المس هذا الحجر في خيالك: جرانوديوريت يكاد يضاهي صلابة الأدوات التي تشكّله. شقه عمال المحاجر من الصخر الحي في أسوان، وجرّته الفرق مئات الكيلومترات، وقضى النحاتون شهورًا على وجه واحد. اختيار حجر كهذا كان بيانًا بحد ذاته — هذه الصورة يجب أن تبقى بعد الزمن نفسه.',
        narrationFr: 'Touchez cette pierre en esprit : la granodiorite, presque aussi dure que les outils qui la taillent. Les carriers l’ont fendue du roc vif à Assouan, les équipes l’ont traînée sur des centaines de kilomètres, et les sculpteurs ont passé des mois sur un seul visage. Choisir une telle pierre était déjà une déclaration — cette image doit survivre au temps lui-même.',
        durationSec: 25,
        image: img('photo-scene-quarry.jpg', 'Unfinished obelisk in the Aswan granite quarry', 'مسلة غير مكتملة في محجر الجرانيت بأسوان')
      },
      {
        id: 'st-pose',
        titleEn: '2 · The Language of Pose',
        titleAr: '٢ · لغة الوقفة',
        titleFr: '2 · Le langage de la pose',
        narrationEn: 'Read the pose like a language: left foot striding forward, fists clenched at the sides, gaze fixed on the horizon. Nothing moves, yet everything suggests controlled power. Crowns, beard, and headdress name the rank. For three thousand years, this stillness meant the same thing — a king, doing his eternal duty.',
        narrationAr: 'اقرأ الوقفة كلغة: القدم اليسرى تخطو للأمام، والقبضتان مشدودتان على الجانبين، والنظرة مثبتة على الأفق. لا شيء يتحرك، لكن كل شيء يوحي بقوة مسيطر عليها. التيجان واللحية وغطاء الرأس تسمّي الرتبة. لثلاثة آلاف عام، كان هذا السكون يعني الشيء نفسه — ملك يؤدي واجبه الأبدي.',
        narrationFr: 'Lisez la pose comme un langage : pied gauche en avant, poings serrés le long du corps, regard fixé sur l’horizon. Rien ne bouge, et pourtant tout suggère une puissance maîtrisée. Couronnes, barbe et coiffe nomment le rang. Pendant trois mille ans, cette immobilité a signifié la même chose — un roi accomplissant son devoir éternel.',
        durationSec: 28,
        image: img('photo-scene-sculptor.jpg', 'Limestone statue of the craftsman Pendua and his wife', 'تمثال حجري للصانع بندوا وزوجته'),
        reconstructionNoteEn: 'Cinematic reconstruction — generalized workshop scene.',
        reconstructionNoteAr: 'إعادة بناء سينمائية — مشهد ورشة عام.'
      },
      {
        id: 'st-memory',
        titleEn: '3 · An Eternal Address',
        titleAr: '٣ · عنوان أبدي',
        titleFr: '3 · Une adresse éternelle',
        narrationEn: 'A statue was never decoration alone. Set in a temple court or before a tomb, it gave offerings a place to land and memory a face to find. Festivals passed before it, priests poured water at its feet, and the royal name carved on its base carried its owner into a future the sculptor could only imagine.',
        narrationAr: 'لم يكن التمثال زينة قط. موضوعًا في فناء معبد أو أمام مقبرة، منح القرابين موضعًا تصل إليه والذكرى وجهًا تجده. مرت الأعياد أمامه، وسكب الكهنة الماء عند قدميه، وحمل الاسم الملكي المنقوش على قاعدته صاحبه نحو مستقبل لم يستطع النحات تخيّله.',
        narrationFr: 'Une statue n’était jamais un simple décor. Dressée dans une cour de temple ou devant une tombe, elle donnait aux offrandes un lieu où se poser et à la mémoire un visage à retrouver. Les fêtes défilaient devant elle, les prêtres versaient l’eau à ses pieds, et le nom royal gravé sur son socle portait son maître vers un avenir que le sculpteur pouvait à peine imaginer.',
        durationSec: 24,
        image: img('photo-scene-offering.jpg', 'Relief of offering bearers from the tomb of Nespekashuty', 'نقش حاملي القرابين من مقبرة نس بخاشوتي')
      }
    ],
    facts: [
      { labelEn: 'Pose code', labelAr: 'شفرة الوقفة', valueEn: 'Striding male pose conveys action held in perfect stillness.', valueAr: 'وقفة الخطو للرجل تعبّر عن حركة محبوسة في سكون كامل.' },
      { labelEn: 'Insignia', labelAr: 'الشارات', valueEn: 'Crowns, false beard, and nemes headdress mark kingship.', valueAr: 'التيجان واللحية المستعارة وغطاء النمس تدل على الملكية.' },
      { labelEn: 'Function', labelAr: 'الوظيفة', valueEn: 'Statues anchored offerings, festivals, and memory.', valueAr: 'كانت التماثيل مرتكزًا للقرابين والأعياد والذكرى.' }
    ],
    contextEn: 'Royal statuary lined temple courts and processional ways — the king, multiplied in stone, greeted gods and people alike.',
    contextAr:       'اصطفت التماثيل الملكية في أفنية المعابد وطرق المواكب — الملك مضاعفًا في الحجر يستقبل الآلهة والناس معًا.',
    contextFr:
      'Les statues royales bordaient les cours des temples et les voies processionnelles — le roi, multiplié dans la pierre, accueillait dieux et hommes.',
    knownVsUncertainEn: { known: ['Stylistic dating criteria are established.', 'Quarry and carving methods are studied.'], uncertain: ['Individual identification is not asserted here.', 'Original placement is illustrative.'] },
    knownVsUncertainAr: { known: ['معايير التأريخ الأسلوبي راسخة.', 'أساليب المحاجر والنحت مدروسة.'], uncertain: ['لا نحدد هوية فردية هنا.', 'موضع العرض الأصلي توضيحي.'] },
    relatedIds: ['royal-mummy', 'painted-coffin'],
    sourcesEn: ['Demo record — illustrative; verify against published statuary studies.'],
    sourcesAr: ['سجل تجريبي — توضيحي؛ تحقق من دراسات التماثيل المنشورة.']
  }
];

export const getArtifact = (id: string): Artifact | undefined =>
  ARTIFACTS.find((a) => a.id === id);

export const getArtifactByCode = (code: string): Artifact | undefined => {
  const c = code.trim().toUpperCase();
  return ARTIFACTS.find(
    (a) => a.qrCode.toUpperCase() === c || a.demoCode.toUpperCase() === c || a.id.toUpperCase() === c
  );
};

export const totalStoryDuration = (a: Artifact): number =>
  a.chapters.reduce((sum, c) => sum + c.durationSec, 0);
