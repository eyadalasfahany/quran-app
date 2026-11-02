# Device matrix and notification / widget / watch content review

Date: 2026-11-02 · Branch: `main` · Host: Windows 11 · Reviewer: Cursor agent (test/review only; no app source edits)

## Environment

| Item | Result |
| --- | --- |
| Dev APK | Present: `apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk` (~112 MB, **2026-11-01 14:15** local). Treat as **possibly stale** vs current `main`; not rebuilt per instructions. |
| Metro | `http://127.0.0.1:8081/status` → `packager-status:running` (not started by this review). |
| Emulator **5554** | Not used (reserved for another agent). |
| Installed system image | Single image: `android-37.0/google_apis_playstore_ps16k/x86_64`. AVDs `Taybah_Small`, `Taybah_Pixel8Pro`, `Taybah_Tablet`, `Taybah_Fold`, `Pixel_8` already exist. |
| Wear OS system image | **Not installed** (no `wear` under `Sdk/system-images`). `sdkmanager --list` (cmdline-tools on PATH) returned no `wear` lines in this session; use Android Studio SDK Manager per `docs/plans/cursor/15-wear-os.md`: **Wear OS 5 (API 34) x86_64** (typical download on the order of **~500 MB–1 GB** depending on channel; confirm size in SDK Manager before download). Command when cmdline-tools works: `sdkmanager "system-images;android-34;google_apis;x86_64"` **only after** verifying the exact Wear package id in `sdkmanager --list \| findstr wear`. |

Screenshot root: `C:\Users\Asus\AppData\Local\Temp\claude\d--projects-quran-app\b8fd25a9-6478-4f07-929c-6ef04bc56caf\scratchpad\devices\`

---

## 1. Android device matrix

**Method:** `Taybah_Small` on **emulator-5556** only (5556 shut down at end of prior pass). APK install + `adb reverse tcp:8081 tcp:8081` + dev-client URL. Navigation mixed dev-client relaunch and `taybah-dev://…` deep links (early attempts used invalid `/(main)/…` groups). **Large phone, tablet, and fold were not exercised in this review window.**

**Pass criteria used:** screenshot ≥ ~100 KB and visual check shows intended screen (no Dev Launcher error, no ANR dialog, no empty splash-only frame). Layout class inferred from window size where visible (compact + bottom tabs on small phone portrait/landscape).

### Summary table

| Device (AVD) | Window class (expected) | Screen / locale / orientation | Result | Screenshot path |
| --- | --- | --- | --- | --- |
| **Taybah_Small** (~360×640 class) | compact | Home · en · portrait | **Pass** | `…\small-en-home.png` |
| Taybah_Small | compact | Home · ar · portrait | **Pass** (retry) | `…\small-phone-home-retry.png` |
| Taybah_Small | compact | Mushaf/reader · ar · portrait | **Partial / fail** | `…\small-phone-mushaf-portrait-ar.png` (~13 KB — blank/error) |
| Taybah_Small | compact | Listen · ar · portrait | **Partial / fail** | `…\small-phone-listen-portrait-ar.png` (~13 KB) |
| Taybah_Small | compact | Azkar · ar · portrait | **Partial / fail** | `…\small-phone-azkar-portrait-ar.png` (~13 KB) |
| Taybah_Small | compact | Sibha · ar · portrait | **Pass** | `…\small-phone-sibha-portrait-ar.png` |
| Taybah_Small | compact | Salah · ar · portrait | **Pass** | `…\small-phone-salah-portrait-ar.png` |
| Taybah_Small | compact | Qibla · ar · landscape | **Pass** (short-window side layout) | `…\small-phone-qibla-landscape-ar.png` |
| Taybah_Small | compact | Sibha · ar · landscape | **Pass** | `…\small-phone-sibha-landscape-ar.png` |
| Taybah_Small | compact | Menu · ar · portrait | **Pass** | `…\small-phone-menu-portrait-ar.png` |
| Taybah_Small | compact | Search · ar · portrait | **Unverified** | `…\small-phone-search-portrait-ar.png` (size not re-checked) |
| Taybah_Small | compact | Settings · ar · portrait | **Unverified** | `…\small-phone-settings-portrait-ar.png` |
| Taybah_Small | compact | Reminders · ar · portrait | **Unverified** | `…\small-phone-reminders-portrait-ar.png` |
| Taybah_Small | compact | Home · en · landscape | **Pass** | `…\small-en-land-home.png` |
| Taybah_Small | compact | Salah · en · portrait | **Pass** | `…\small-en-salah.png` |
| Taybah_Small | compact | Reader · en · portrait | **Pass** | `…\small-en-reader.png` |
| Taybah_Small | compact | Player · en · portrait | **Pass** | `…\small-en-player.png` |
| Taybah_Small | compact | Reminders · en · portrait | **Pass** | `…\small-en-reminders.png` |
| Taybah_Small | compact | Menu / Qibla / Sibha / Azkar · en | **Mostly pass** | `…\small-en-menu.png`, `small-en-qibla.png`, `small-en-sibha.png`, `small-en-azkar.png` |
| **Taybah_Pixel8Pro** / **Pixel_8** | compact (portrait) | All major screens · ar/en · P+L | **Not run** | — |
| **Taybah_Tablet** | medium / expanded | Sidebar, expanded home, reader · ar/en · P+L | **Not run** | — |
| **Taybah_Fold** | compact folded / medium–expanded unfolded | `adb emu fold` / `unfold` · rail vs sidebar | **Not run** | — |
| **Widgets on AVD** | — | Install each widget · ar/en · light/dark | **Not run** | — |

**Runtime notes (small phone):** Intermittent `DevLauncherErrorActivity` and one **ANR** during cold start / bad deep links. Correct route shape for automation: `taybah-dev://salah`, `taybah-dev://read/2:255`, etc. (`src/features/widgets/snapshot/deep-links.ts`), not Expo Router group paths.

---

## 2. Findings (by severity)

| Sev | Location | Problem | Suggested fix | Cursor prompt |
| --- | --- | --- | --- | --- |
| **Critical** | `src/features/notifications/reminder-deeplink.ts:9` vs `src/features/azkar/reminders/reminder-service.ts:34` | **My Dua** reminders set `data.route` to `/duas/mine/edit?id=…`, which is **not** in `REMINDER_ROUTE_PREFIXES`. Tap does nothing (same allowlist gap as widgets, which correctly omit `/duas/`). | Add `/duas/` prefix (or exact `/duas/mine/edit`) to `REMINDER_ROUTE_PREFIXES` and tests; or route my-dua reminders to an allowed path. | **12** (reminders follow-ups) or **new** |
| **High** | `app.config.ts:228` | **iOS location** usage string is **Arabic only** in `expo-location` `locationWhenInUsePermission`. English-locale devices can show Arabic in the system dialog (App Review / UX). | Add English via `locales.en.ios` InfoPlist keys or `en.lproj/InfoPlist.strings` for `NSLocationWhenInUseUsageDescription` (mirror Arabic meaning). | **08** (i18n) |
| **High** | Device testing (this review) | **Matrix incomplete:** tablet, fold, large phone, widget picker, and systematic ar landscape not finished; stale APK may not match JS on Metro. | Re-run matrix on 5556+ with fresh debug APK if needed; follow checklist in §1; compare to HTML frames + `frame-shot.py`. | **10** / **new** (QA pass) |
| **Medium** | `apps/mobile/targets/watch/WatchHome.swift:24` | Watch empty state is hardcoded `"…"`, not ADR 0035 copy (`widgets.openApp` / «افتح طيبة على الآيفون» from frames). | Use snapshot label or localized string from widget label bundle. | **16** |
| **Medium** | `src/features/reminders/data/test-reminder.ts:24` vs comment `:15` | Test notification uses channel **`goals`**, while comment says “same channel … as the real reminders”. Daily wird uses **`reminders`**. Test does not validate the wird channel. | Use `NOTIFICATION_CHANNELS.reminders` for test, or fix comment and document intentional goals-channel test. | **12** |
| **Medium** | Prayer notifications copy | Prayer notifs say **«حان وقت صلاة …»** / “Time for … prayer” at **computed adhan** (`notifications.ts:85–90`). Azkar uses neutral «تذكيرك الذي اخترته» + UI disclaimer «وقت التذكير من اختيارك». Inconsistent **religious-time vs reminder-time** wording policy. | Product decision: keep adhan wording for prayer bells (ADR 0030) or soften to “notification at prayer time” vs user offset; document in ADR if changed. | **12** / product |
| **Low** | `notifications.reminder.body` (ar) | Generic body **«حان وقت قراءة وردك من القرآن الكريم»** — names Quran, does not quote ayah; OK for rule 6. With plan, body uses **«وِردك اليوم: …»** + pluralized pages (`reminder-service.ts:29–40`). | None required; ensure lock-screen length OK with large page counts. | — |
| **Low** | Azkar notif title `{{name}}` | Category title can be long (e.g. **«أذكار بعد الصلاة»**); may truncate on lock screen. | Optional shorter notification title key. | **13** |
| **Info** | `src/features/salah/data/notifications.ts` | **No pre-alert** before prayer; only five prayers at instant. | By design unless product adds offset (ADR 0030). | **12** |
| **Info** | Hijri | **No Hijri occasion notifications** in codebase. | N/A until feature exists. | **11** |
| **Info** | Wear OS | No Wear image / no `:wear` module (prompt 15). | Install emulator image when building Wear. | **15** |

---

## 3. Notification content tables

**Sound:** All use OS default notification sound unless channel/user overrides. **Importance:** Android channels created with `AndroidImportance.HIGH` (`channels.ts:43`). **Subtitle:** Not set in code (title + body only).

### 3.1 Prayer times (×5, at computed time)

| Field | Arabic (sample) | English (sample) | Channel (Android) | Deep link | Issues |
| --- | --- | --- | --- | --- | --- |
| Title | حان وقت صلاة **الفجر** | Time for **Fajr** prayer | **إشعارات الصلاة** / Prayer times (`prayer`) | `/salah` | Wording asserts prayer time (see finding). |
| Body | اضغط لفتح مواقيت الصلاة | Tap to open prayer times | | | OK length; no quoted Quran. |

Keys: `notifications.prayer.title`, `notifications.prayer.body`; name from `home.salah.*`.

### 3.2 Daily wird / reading reminder (user clock)

| Field | Arabic | English | Channel | Deep link | Issues |
| --- | --- | --- | --- | --- | --- |
| Title | وردك اليومي | Your daily wird | **تذكير بالورد اليومي** / Daily reading reminder (`reminders`) | `/read/<verseKey>` from anchor | OK |
| Body (no plan) | حان وقت قراءة وردك من القرآن الكريم | Time to read your daily wird of the Quran | | | OK (no ayah text) |
| Body (plan, e.g. 4 pages) | وِردك اليوم: **٤ صفحات** | Today's wird: **4 pages** | | | Plural rules in `khatma.pagesPerDay_*`; Arabic-Indic via `formatNumber`. |

### 3.3 Azkar reminders (clock or prayer-relative)

| Field | Arabic (sample) | English (sample) | Channel | Deep link | Issues |
| --- | --- | --- | --- | --- | --- |
| Title (category) | **أذكار الصباح** | Morning azkar | **تذكير الأذكار** / Azkar reminders (`azkar`) | `/azkar/…` via `azkarHref` | Long titles may truncate |
| Title (entry) | تذكير الأذكار | Azkar reminder | | `/azkar/…` entry | OK |
| Title (my dua) | **{user title}** or دعاء بدون عنوان | Same | | **`/duas/mine/edit?id=…`** | **Broken tap** (not allowlisted) |
| Body | تذكيرك الذي اخترته | Your chosen reminder | | | Neutral; matches UI disclaimer |

Keys: `azkar.reminders.notification*`, `duas.reminders.notification*`.

### 3.4 Friday Surat al-Kahf

| Field | Arabic | English | Channel | Deep link | Issues |
| --- | --- | --- | --- | --- | --- |
| Title | سورة الكهف يوم الجمعة | Surat al-Kahf on Friday | **أهداف يومية وتذكيرات الجمعة** / Daily goals and Friday reminders (`goals`) | `/read/18:1` | Names surah; no ayah quote — OK |

### 3.5 Misbaha daily target

| Field | Arabic | English | Channel | Deep link | Issues |
| --- | --- | --- | --- | --- | --- |
| Title | هدف المسبحة اليومي | Daily misbaha goal | `goals` | `/sibha` | OK |

### 3.6 Test reminder (hub)

| Field | Arabic | English | Channel | Deep link | Issues |
| --- | --- | --- | --- | --- | --- |
| Title | طيبة | Taybah | **`goals`** (not `reminders`) | `/reminders` | Channel mismatch vs comment |

### 3.7 Not implemented

| Type | Status |
| --- | --- |
| Prayer pre-alert | Not in code |
| Hijri occasions | Not in code |

---

## 4. Widget content tables

Strings from `widgets.*` → snapshot `labels` (`labels.ts`). Gallery names: Arabic in `app.config.ts` `ANDROID_WIDGETS`; English via `plugins/with-widget-gallery-strings.js` + iOS `targets/widget/*/Localizable.strings`.

### 4.1 Android / shared snapshot widgets

| Widget | Fields shown (AR / EN) | Empty / stale / no location | Deep link | Issues |
| --- | --- | --- | --- | --- |
| **NextPrayer** (2×2) | **الصلاة القادمة** / Next prayer; prayer name; **time**; optional place | **حدّد موقعك…** / Set your location… · **افتح طيبة لعرض المواقيت** / Open Taybah to see prayer times | `/salah` | No countdown on Android (ADR). |
| **NextPrayerWide** | Above + five times | Same | `/salah` | Not screenshot on device. |
| **Progress** | **تقدّم اليوم** / Today's progress; ring %; goal rows | **حدّد أهدافك اليومية** / Choose your daily goals | `/daily-goals` | Lock screen (iOS): **percent only** per ADR. |
| **ContinueReading** | **تابع القراءة**; surah name; ayah/page labels; wird line if plan | No reading position → empty state from snapshot builder | `/read/<verseKey>` | **No ayah text** — only metadata. |
| **Misbaha** | Count, target, **المسبحة** / Misbaha, **عدّ** / Count | **بلا حد** / No target | `/sibha` | |
| **Azkar** | Session names + done state | **تظهر الأذكار بعد تحميلها** / Azkar appear once downloaded | `/azkar` | Category names only; no dhikr text. |

Stale rule: after `prayer.validUntil`, show **stale** string; never invent times (ADR 0035 §1.8).

**Widget install on AVD:** not performed; visual verification pending.

### 4.2 iOS widgets / lock screen (planned — ADR 0035, prompt 16)

Same snapshot; lock-screen variants: **next prayer + progress % only** (no reading place / misbaha count on lock). Gallery strings in `targets/widget/en.lproj/Localizable.strings` (e.g. lock widget description).

---

## 5. Watch content (planned)

**Wear OS:** No build yet (`docs/plans/cursor/15-wear-os.md`). Strings should reuse `widgets.*` in `values` / `values-en`.

**Apple Watch (`targets/watch/`):**

| Surface | Content (from ADR + code) | AR / EN source | Issues |
| --- | --- | --- | --- |
| **WatchHome** | Next prayer name, time, timer; progress %; prayer list; azkar rings when content available | Snapshot `labels` + prayer keys | Empty: **`"…"`** not i18n (Swift) |
| **WatchSibha** | Tap to count, target ring, haptics, reset | Frames `WatchSibha`; strings via snapshot in full build | Not runtime-tested (no Mac) |
| **Complications** | Inline / rectangular / circular / corner: prayer + progress per frames `WatchComplications` | Snapshot | Not runtime-tested |

ADR empty copy: «افتح طيبة على الآيفون» (frame `WatchHome`); align with `widgets.openApp` / watch-specific key if needed.

---

## 6. iOS static checklist (`app.config.ts`)

| Item | Verifiable on Windows (static) | Needs Mac / iPhone |
| --- | --- | --- |
| `bundleIdentifier` / schemes dev vs prod | Yes | Install/signing |
| `deploymentTarget` 16.4 | Yes | Xcode compile |
| `supportsTablet: true` | Yes | iPad layout QA |
| iPad orientations + `UIRequiresFullScreen: false` | Yes (Split View / Stage Manager allowed) | iPad multitasking smoke test |
| `UIBackgroundModes: ['audio']` | Yes | Lock-screen audio controls, interruption |
| App Group `group.${variant.id}` in entitlements | Yes (`group.com.taybahapp.taybah` prod) | Widget/watch read/write snapshot |
| `CFBundleDevelopmentRegion: 'ar'`, `CFBundleLocalizations` ar+en | Yes | System chrome language on cold start |
| `locales` ar/en display names | Yes | Home screen icon label |
| `orientation: 'default'` | Yes | Rotation on phone/iPad |
| **Location permission copy** | **Arabic only in expo-location plugin** — flag | English dialog on en device |
| **Notification permission copy** | `expo-notifications` plugin without custom iOS strings in config — defaults from Expo | Wording on first prompt; localization |
| **No motion / health permissions** | None declared | — |
| `@bacons/apple-targets` (widgets + watch) | Plugin present | Native targets build, WidgetKit, WatchConnectivity |
| **NativeTabs vs short-window rail** (ADR 0036) | Logic in `app/(main)/_layout.tsx` — not re-audited here | **Rotation tall↔short on iPhone** preserves route/stack (ADR says not verified) |
| Expo Updates / fingerprint | Yes | OTA on TestFlight |
| ITSAppUsesNonExemptEncryption false | Yes | Export compliance |

---

## 7. Wear OS (section B)

| Check | Result |
| --- | --- |
| System image installed | **No** |
| Download | Use SDK Manager: **Wear OS 5 (API 34) x86_64** (see `15-wear-os.md`); confirm exact package and size before download |
| App built | **No** Wear module |
| Planned content | Tile: next prayer + misbaha «+»; app pages: prayer + misbaha; strings from `widgets.*`; no Quran/dhikr text |

---

## 8. Developer decisions needed

1. **My Dua notification deep links:** allowlist `/duas/…` or change route?
2. **Prayer notification wording:** keep «حان وقت صلاة» at adhan instant vs align with «reminder time» language used for Azkar?
3. **iOS permission strings:** approve English `NSLocationWhenInUseUsageDescription` (and optional custom notification usage description)?
4. **Device QA:** schedule full matrix (tablet, fold folded/unfolded, large phone, widgets ar/en light/dark) on fresh APK?
5. **Watch empty state:** approve copy source (snapshot label vs dedicated watch strings)?
6. **Wear OS emulator download:** approve API 34 Wear image install for prompt 15?
7. **Stale debug APK:** rebuild native dev client after widget/native changes since 2026-11-01?

---

## 9. References

- ADR 0035 — widgets and watch rules, lock-screen privacy, snapshot schema
- ADR 0036 — short-window height, tab rail, NativeTabs vs headless tabs
- Spec §4 layout, §13 notifications
- Frames: `WatchHome`, `WatchSibha`, `WatchComplications`, `MainLandscapeRail`, widget frames in `quran-app-screens.html`
