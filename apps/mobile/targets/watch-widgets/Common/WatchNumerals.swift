import Foundation

/// Locale for watch complications. Arabic uses Arabic-Indic digits, matching `WatchStrings.formattingLocale`
/// in the watch target (the targets don't share files).
enum WatchNumerals {
  static func locale(for identifier: String?) -> Locale {
    Locale(identifier: identifier == "en" ? "en" : "ar@numbers=arab")
  }
}
