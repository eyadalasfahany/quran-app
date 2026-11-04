import SwiftUI

/// Sets the layout direction and the locale once at the root (ADR 0035 §1.5). The locale makes `Text(date, style:)` use Arabic digits.
struct WatchLocaleModifier: ViewModifier {
  let locale: String?

  func body(content: Content) -> some View {
    content
      .environment(\.layoutDirection, locale == "en" ? .leftToRight : .rightToLeft)
      .environment(\.locale, WatchStrings.formattingLocale(locale))
  }
}

extension View {
  func watchLocale(_ locale: String?) -> some View {
    modifier(WatchLocaleModifier(locale: locale))
  }
}
