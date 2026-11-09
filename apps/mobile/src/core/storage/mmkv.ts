import { createMMKV } from 'react-native-mmkv';

// Preferences read on the cold-start path, before the database opens.
// MMKV is a native module, so the app runs in a dev build rather than Expo Go.
export const storage = createMMKV({ id: 'quran-prefs' });

export const storageKeys = {
  onboardingCompleted: 'onboarding.completed',
  locale: 'locale',
  directionReloadPending: 'directionReloadPending',
  selectedResourceIds: 'content.selectedResourceIds',
  contentLastSyncAt: 'content.lastSyncAt',
  appearance: 'appearance',
  darkAfterMaghrib: 'darkAfterMaghrib',
  readerLastVerseKey: 'reader.lastVerseKey',
  readerLastPage: 'reader.lastPage',
  readerMode: 'reader.mode',
  readerMiniCollapsed: 'reader.miniCollapsed',
  readerSettings: 'reader.settings',
  searchRecentQueries: 'search.recentQueries',
  audioReciterId: 'audio.reciterId',
  audioLastPosition: 'audio.lastPosition',
  audioWifiOnlyDownloads: 'audio.wifiOnlyDownloads',
  dailyReminder: 'settings.dailyReminder',
  dailyReminderTime: 'settings.dailyReminderTime',
  dailyReminderNotificationId: 'settings.dailyReminderNotificationId',

  // JSON array of recent Hadith search queries, newest first, capped at 20 (phase 7, step 14). Personal, local only.
  hadith: {
    searchRecent: 'hadith.searchRecent',
  },

  updates: {
    /** Epoch ms of the last foreground update check (at most every 6 hours). */
    lastCheckAt: 'updates.lastCheckAt',
  },

  // Azkar preferences (phase 6, step 5). Personal, local only; not cleared by content updates.
  azkar: {
    fontScale: 'azkar.fontScale',
    // JSON map of entry key to the chosen alternative (variation key).
    variationChoice: 'azkar.variationChoice',
    // JSON array of recent Azkar search queries, newest first.
    searchRecent: 'azkar.searchRecent',
    // JSON array of recently opened Azkar scopes, newest first, capped at 10 (ADR 0034 §3).
    recentScopes: 'azkar.recentScopes',
    // JSON: the local day, time zone and coordinates key of the last Azkar reminder sync (ADR 0031 §7).
    remindersSync: 'azkar.remindersSync',
  },

  // Misbaha (ADR 0034 §4). Personal, local only; cleared with the other personal data.
  sibha: {
    // JSON: the count, the target and the label.
    state: 'sibha.state',
    // JSON: the local date and the taps counted on it.
    today: 'sibha.today',
  },

  // Discover Taybah (ADR 0053). Local only; cleared with the other personal data.
  discover: {
    // JSON array of the registry ids the person has completed.
    done: 'discover.done',
    // JSON array of the ids the person has seen as a set (written when the set is finished or the card hidden).
    acknowledged: 'discover.acknowledged',
    // Boolean: the card was hidden with «إخفاء».
    hidden: 'discover.hidden',
    // The registry id of the guided tour's current step, or absent when no tour runs.
    tourStep: 'discover.tourStep',
  },

  // JSON: the daily goals the user chose (ADR 0034 §5). Nothing is on by default.
  dailyGoals: 'dailyGoals',

  // Hijri calendar adjustment in days, −2 to +2 (ADR 0048). Personal, local only; cleared with the other personal data.
  hijriAdjustDays: 'hijri.adjustDays',

  // Names list layout: grid or list (ADR 0043 A6).
  namesViewMode: 'names.viewMode',

  // JSON: the widget snapshot (ADR 0035 §4), read by the home-screen widgets. Local data only; cleared with personal data.
  widgets: {
    snapshot: 'widgets.snapshot',
    /** Last `widgetTapsTotal` merged from the iOS widget App Group snapshot (ADR 0035 §3.5). */
    lastMergedWidgetTaps: 'widgets.lastMergedWidgetTaps',
    /** JSON: last applied watch misbaha seq per install id (`features/watch/misbaha-delta.ts`). */
    watchMerge: 'widgets.watchMerge',
    /** Default home vs lock destination for the add confirm flow (ADR 0054). */
    addDestination: 'widgets.addDestination',
    /** JSON map of Android provider name → true after a successful pin (soft hint only). */
    pinCompleted: 'widgets.pinCompleted',
  },

  // Reminders hub (ADR 0034, 2 Nov 2026). Local only; cleared with the other personal data.
  reminders: {
    // JSON: the Friday Surat al-Kahf reminder: enabled, mode (dhuhr or clock) and clock time.
    friday: 'reminders.friday',
    // JSON: the misbaha daily target reminder: enabled and clock time.
    misbaha: 'reminders.misbaha',
    // JSON: the local day, time zone and coordinates key of the last goal-reminder sync.
    goalsSync: 'reminders.goalsSync',
    // Boolean: the recommended set was offered (shown once, ADR 0034).
    recommendedShown: 'reminders.recommendedShown',
  },

  // Notifications shared by prayer and Azkar (ADR 0083).
  notifications: {
    // JSON: each source's last scheduled fire in ms (`prayer`, `azkar`), or null, for the renew reminder.
    renew: 'notifications.renew',
  },

  // Salah data layer
  salah: {
    locationSource: 'salah.locationSource',
    manualCityId: 'salah.manualCityId',
    manualLat: 'salah.manualLat',
    manualLng: 'salah.manualLng',
    // Per-prayer reminder toggles (persisted in step 3; scheduling lands in step 4).
    bellFajr: 'salah.bell.fajr',
    bellDhuhr: 'salah.bell.dhuhr',
    bellAsr: 'salah.bell.asr',
    bellMaghrib: 'salah.bell.maghrib',
    bellIsha: 'salah.bell.isha',
    // JSON: the local day, time zone and coordinates key of the last prayer notification sync (ADR 0030 §3).
    notificationsSync: 'salah.notificationsSync',
    // The sound of prayer notifications: a catalogue voice id, 'system' or 'silent' (ADR 0047). One setting for all prayers.
    prayerSound: 'salah.prayerSound',
    // Minutes before prayer time for the iqamah heads-up (ADR 0056). 0, 5, 10, 15, 20 or 30 only; absent means off (0).
    iqamahOffsetMinutes: 'salah.iqamahOffsetMinutes',
    /** The last automatic fix, as a `coordsKey` (2 decimals). Device only; cleared by «مسح البيانات» (ADR 0086). */
    lastAutoCoords: 'salah.lastAutoCoords',
  },
} as const;

/** Per-page QCF V2 font cache metadata (ADR 0011). */
export const qcfV2FontKeys = {
  etag: (page: number) => `qcf-v2.p${page}.etag`,
  lastModified: (page: number) => `qcf-v2.p${page}.lastModified`,
  revalidatedAt: (page: number) => `qcf-v2.p${page}.revalidatedAt`,
} as const;
