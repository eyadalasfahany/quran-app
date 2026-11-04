import Foundation

/// Watch strings and digits (ADR 0035 §1.5). Arabic is the default whatever the device language, so a missing locale means Arabic.
enum WatchStrings {
  /// A `watch_*` string from the lproj bundle for `locale`, falling back to Arabic.
  static func text(_ key: String, locale: String?) -> String {
    NSLocalizedString(key, bundle: bundle(for: locale), comment: "")
  }

  static func bundle(for locale: String?) -> Bundle {
    for language in [locale ?? "ar", "ar"] {
      if let path = Bundle.main.path(forResource: language, ofType: "lproj"), let bundle = Bundle(path: path) {
        return bundle
      }
    }
    return Bundle.main
  }

  /// The locale for digits and formats: Arabic (٠–٩) unless the snapshot says English.
  static func formattingLocale(_ locale: String?) -> Locale {
    // Arabic-Indic digits (٠–٩) for Arabic; numbers=arab is not the default for "ar" on current OSes.
    Locale(identifier: locale == "en" ? "en" : "ar@numbers=arab")
  }

  static func number(_ value: Int, locale: String?) -> String {
    let formatter = NumberFormatter()
    formatter.locale = formattingLocale(locale)
    formatter.numberStyle = .decimal
    return formatter.string(from: NSNumber(value: value)) ?? String(value)
  }

  /// `value` is 0 to 100.
  static func percent(_ value: Int, locale: String?) -> String {
    let formatter = NumberFormatter()
    formatter.locale = formattingLocale(locale)
    formatter.numberStyle = .percent
    formatter.maximumFractionDigits = 0
    return formatter.string(from: NSNumber(value: Double(value) / 100)) ?? "\(value)%"
  }

  /// h:mm:ss with locale digits, for the accessibility label.
  static func countdown(seconds: Int, locale: String?) -> String {
    let total = max(0, seconds)
    let hours = total / 3600
    let minutes = (total % 3600) / 60
    let secs = total % 60
    return [number(hours, locale: locale), twoDigits(minutes, locale: locale), twoDigits(secs, locale: locale)]
      .joined(separator: ":")
  }

  static func clockTime(_ date: Date, locale: String?) -> String {
    date.formatted(Date.FormatStyle(date: .omitted, time: .shortened).locale(formattingLocale(locale)))
  }

  static func relative(_ date: Date, to now: Date, locale: String?) -> String {
    let formatter = RelativeDateTimeFormatter()
    formatter.locale = formattingLocale(locale)
    formatter.unitsStyle = .full
    return formatter.localizedString(for: date, relativeTo: now)
  }

  private static func twoDigits(_ value: Int, locale: String?) -> String {
    let digits = number(value, locale: locale)
    return value < 10 ? number(0, locale: locale) + digits : digits
  }
}
