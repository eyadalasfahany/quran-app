import SwiftUI

/// Today's Azkar sessions, read-only (ADR 0035 §3). Shown only when the snapshot holds sessions.
struct AzkarPage: View {
  let azkar: TaybahSnapshot.Azkar
  let locale: String?

  var body: some View {
    let shown = Array(azkar.sessions.prefix(3))
    let completed = azkar.sessions.filter(\.complete).count
    let title = WatchStrings.text("watch_azkar_today", locale: locale)
    let done = String(
      format: WatchStrings.text("watch_azkar_done", locale: locale),
      WatchStrings.number(completed, locale: locale),
      WatchStrings.number(azkar.sessions.count, locale: locale)
    )

    return VStack(spacing: 12) {
      Text(title)
        .font(.watchPlex(12))
        .foregroundStyle(TaybahTokens.Dark.playerMuted)
      HStack(alignment: .top, spacing: 8) {
        ForEach(shown, id: \.id) { session in
          AzkarSessionRing(session: session)
        }
      }
      Text(done)
        .font(.watchPlex(13, .semibold))
        .foregroundStyle(TaybahTokens.Dark.playerInk)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .accessibilityElement(children: .combine)
    .accessibilityLabel(
      ([title] + azkar.sessions.map(\.title) + [done]).joined(separator: ", ")
    )
  }
}
