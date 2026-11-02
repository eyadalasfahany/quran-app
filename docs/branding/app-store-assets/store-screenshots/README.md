# Taybah store screenshots

80 finished screenshots: 5 store sizes × 2 languages × the same 8-slide journey. Every app screen is a real capture of the running app (iPhone 17 and iPad Pro 13" simulators, location al-Madinah), and Quran text appears only inside those captures.

```bash
docs/branding/app-store-assets/store-screenshots/generate.sh             # everything
docs/branding/app-store-assets/store-screenshots/generate.sh --only ipad  # one set
```

Needs Google Chrome and ImageMagick. Captions live in `sources/manifest.json`; the layout (header, device frame, star pattern, green slides 01 and 08) in `sources/compose.py`; the captures in `sources/raw/` as `{iphone|ipad}-{ar|en}-<slide>.png`.

## Where each set goes

| Folder | Size | Upload to |
| --- | --- | --- |
| `app-store/iphone-6.3/{ar,en}` | 1206 × 2622 | App Store Connect → iPhone 6.3" (Arabic page / English page) |
| `app-store/ipad-13/{ar,en}` | 2064 × 2752 | App Store Connect → iPad 13" |
| `google-play/phone/{ar,en}` | 1080 × 1920 | Play Console → Main store listing → Phone screenshots (default ar, en-US translation) |
| `google-play/tablet-7/{ar,en}` | 1080 × 1920 | Play Console → 7-inch tablet screenshots |
| `google-play/tablet-10/{ar,en}` | 1440 × 2560 | Play Console → 10-inch tablet screenshots |

## The journey (upload in this order)

| # | Screen | Arabic headline | English headline |
| --- | --- | --- | --- |
| 01 | Reader (hero, green) | مصحفك، بخشوع وهدوء | Your Mushaf, in calm |
| 02 | Recitation, recited word highlighted | اقرأ مع القارئ كلمةً كلمة | Recite along, word by word |
| 03 | Tafsir | تدبّر بتسعة تفاسير | Reflect with 9 tafsirs |
| 04 | Prayer times | مواقيت صلاتك أينما كنت | Prayer times, wherever you are |
| 05 | Qibla | القبلة بدقة | Find the Qibla |
| 06 | Azkar | أذكارك من حصن المسلم | Your daily Azkar |
| 07 | Khatma | ختمتك ووِردك اليومي | Complete your Khatma |
| 08 | Home (closing, green) | مجاني، بلا إعلانات ولا حساب | Free. No ads. No account. |

## Known limits

- Google Play sets are composed from the iOS captures (no Android emulator was available); re-capture on Android for a native status bar and tab bar.
- The Qibla captures show "Compass accuracy: Low" because a simulator has no compass.
