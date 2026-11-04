import SwiftUI

/// Shown when the prayer times have run out. No prayer time appears here.
struct StalePage: View {
  let snapshot: TaybahSnapshot
  let now: Date

  var body: some View {
    let locale = snapshot.locale
    let body = snapshot.prayer.entries.isEmpty
      ? snapshot.labels.noLocation
      : String(
        format: WatchStrings.text("watch_stale_body", locale: locale),
        WatchStrings.relative(Date(timeIntervalSince1970: snapshot.writtenAt / 1000), to: now, locale: locale)
      )
    VStack(spacing: 6) {
      Text(snapshot.labels.nextPrayer)
        .font(.watchPlex(12))
        .foregroundStyle(TaybahTokens.Dark.playerMuted)
      Text(WatchStrings.text("watch_stale_title", locale: locale))
        .font(.watchPlex(17, .semibold))
        .foregroundStyle(TaybahTokens.Dark.playerInk)
      Text(body)
        .font(.watchPlex(13))
        .foregroundStyle(TaybahTokens.Dark.playerMuted)
    }
    .multilineTextAlignment(.center)
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .accessibilityElement(children: .combine)
  }
}
