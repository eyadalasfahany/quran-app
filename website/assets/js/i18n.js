(function () {
  var STRINGS = {
    ar: {
      logo: 'طيبة',
      'nav-home': 'الرئيسية',
      'nav-support': 'الدعم',
      'nav-privacy': 'الخصوصية',
      'nav-terms': 'الشروط',
      'nav-delete': 'حذف البيانات',
      'hero-eyebrow': 'مجاني · بلا إعلانات · بلا تتبع',
      'hero-title': 'قرآنك معك — قراءة، استماع، وعبادة يومية',
      'hero-lead':
        'طيبة تطبيق قرآن عربي أولاً لـ iOS و Android: مصحف وتفسير وبحث، تشغيل صوتي مع تمييز الآية، مواقيت الصلاة واتجاه القبلة، الأذكار، خطة الختمة، ومجموعات الحديث — وكل ذلك يعمل دون اتصال بعد تنزيل المحتوى.',
      'store-soon': 'قريباً على App Store و Google Play',
      'hero-support': 'تواصل معنا',
      'pill-offline': 'يعمل دون اتصال',
      'pill-rtl': 'عربي وإنجليزي',
      'pill-devices': 'هاتف، iPad، وتابلت',
      'hero-card':
        '«طيبة» — اسم المدينة المنورة. التطبيق مجاني بالكامل: لا اشتراكات ولا تبرعات ولا بيع لبياناتك.',
      'features-title': 'ماذا يقدّم طيبة؟',
      'f1-title': 'قارئ القرآن',
      'f1-body':
        'مصحف Uthmani و IndoPak و Tajweed، أوضاع قراءة متعددة، تفسير، بحث سريع، إشارات مرجعية وتمييز وملاحظات — مع الحفاظ على نص القرآن كما ورد.',
      'f2-title': 'استماع',
      'f2-body':
        'تشغيل السور والآيات مع تمييز الكلمة، تنزيل للاستماع دون اتصال، وتكرار نطاق — من مصادر Quran Foundation.',
      'f3-title': 'الصلاة والقبلة',
      'f3-body':
        'مواقيت الصلاة حسب موقعك (يُحسب على جهازك)، بوصلة القبلة، وتذكيرات محلية اختيارية.',
      'f4-title': 'الأذكار',
      'f4-body':
        'أذكار حسب المناسبة مع عدّادات وتذكيرات — محتوى من مصادر مرخّصة مع الإسناد داخل التطبيق.',
      'f5-title': 'الحديث',
      'f5-body': 'مجموعات حديثية للقراءة والبحث والحفظ — دون تلخيص آلي أو محتوى مُولَّد.',
      'f6-title': 'خطّتي وختمة',
      'f6-body':
        'متابعة القراءة، خطة ختمة، وإعدادات قراءة واستماع — بياناتك الشخصية تبقى على جهازك في الإصدار الأول.',
      'about-title': 'عن المشروع',
      'about-p1':
        'طيبة (com.taybahapp.taybah) تطبيق واحد من مطوّر واحد: Expo للجوال و Laravel API. المحتوى الديني من مصادر خارجية موثوقة ويُنسب إليها في الإعدادات.',
      'about-p2':
        'لا نستخدم الذكاء الاصطناعي لإنشاء أو تلخيص القرآن أو التفسير أو الحديث. لا نبيع بياناتك ولا نعرض إعلانات.',
      'footer-copy': '© Taybah. جميع الحقوق محفوظة.',
      'footer-bundle': 'Bundle ID: com.taybahapp.taybah',
    },
    en: {
      logo: 'Taybah',
      'nav-home': 'Home',
      'nav-support': 'Support',
      'nav-privacy': 'Privacy',
      'nav-terms': 'Terms',
      'nav-delete': 'Delete data',
      'hero-eyebrow': 'Free · No ads · No tracking',
      'hero-title': 'Your Quran, with you — read, listen, and daily worship',
      'hero-lead':
        'Taybah is an Arabic-first Quran app for iOS and Android: mushaf, tafsir, and search; audio with ayah highlighting; prayer times and qibla; adhkar; khatma planning; and hadith collections — offline after you download content.',
      'store-soon': 'Coming soon to the App Store and Google Play',
      'hero-support': 'Contact support',
      'pill-offline': 'Offline-first',
      'pill-rtl': 'Arabic & English',
      'pill-devices': 'Phone, iPad & tablet',
      'hero-card':
        'Taybah («the good city») is Medina. The app is completely free: no subscriptions, donations, or selling your data.',
      'features-title': 'What Taybah offers',
      'f1-title': 'Quran reader',
      'f1-body':
        'Uthmani, IndoPak, and Tajweed layouts, multiple reading modes, tafsir, fast search, bookmarks, highlights, and notes — Quran text is never altered.',
      'f2-title': 'Audio',
      'f2-body':
        'Surah and ayah playback with word highlighting, offline downloads, and range repeat — from Quran Foundation sources.',
      'f3-title': 'Salah & qibla',
      'f3-body':
        'Prayer times from your location (computed on your device), qibla compass, and optional local reminders.',
      'f4-title': 'Adhkar',
      'f4-body':
        'Dhikr by occasion with counters and reminders — licensed sources with attribution in Settings.',
      'f5-title': 'Hadith',
      'f5-body': 'Hadith collections to read, search, and save — no AI summaries or generated religious text.',
      'f6-title': 'My Quran & khatma',
      'f6-body':
        'Reading progress, khatma plans, and reading/audio preferences — in v1, personal data stays on your device.',
      'about-title': 'About',
      'about-p1':
        'Taybah (com.taybahapp.taybah) is built by one developer: an Expo mobile app and a self-hosted Laravel API. Religious content comes from trusted third-party sources, credited in Settings.',
      'about-p2':
        'We do not use AI to create or summarize Quran, tafsir, or hadith. We do not sell your data or show ads.',
      'footer-copy': '© Taybah. All rights reserved.',
      'footer-bundle': 'Bundle ID: com.taybahapp.taybah',
    },
  };

  function langFromQuery() {
    var params = new URLSearchParams(window.location.search);
    var q = params.get('lang');
    if (q === 'en' || q === 'ar') return q;
    return null;
  }

  function applyLang(lang) {
    var table = STRINGS[lang] || STRINGS.ar;
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      if (table[key]) el.textContent = table[key];
    });
    document.querySelectorAll('[data-lang-btn]').forEach(function (btn) {
      var isActive = btn.getAttribute('data-lang-btn') === lang;
      btn.setAttribute('aria-current', isActive ? 'true' : 'false');
    });
    try {
      localStorage.setItem('taybah-site-lang', lang);
    } catch (e) {}
  }

  var lang = langFromQuery();
  if (!lang) {
    try {
      lang = localStorage.getItem('taybah-site-lang');
    } catch (e) {}
  }
  if (lang !== 'en' && lang !== 'ar') {
    lang = document.documentElement.getAttribute('data-default-lang') || 'ar';
  }
  applyLang(lang);
})();
