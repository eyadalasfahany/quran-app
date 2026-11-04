import SwiftUI

/// Today's progress: the goal ring, the percent and up to two goal rows (ADR 0035 §3, `WatchHome` frame).
struct ProgressPage: View {
  let snapshot: TaybahSnapshot

  var body: some View {
    let locale = snapshot.locale
    let percent = min(100, max(0, snapshot.progress.percent))
    let rows = Array(snapshot.progress.rows.prefix(2))
    let title = WatchStrings.text("watch_today_progress", locale: locale)
    let percentText = WatchStrings.percent(percent, locale: locale)

    return VStack(spacing: 6) {
      ZStack {
        WatchRing(progress: Double(percent) / 100, lineWidth: 10, size: 88)
        Text(percentText)
          .font(.watchPlex(22, .bold))
          .foregroundStyle(TaybahTokens.Dark.playerInk)
          .monospacedDigit()
      }
      Text(title)
        .font(.watchPlex(12))
        .foregroundStyle(TaybahTokens.Dark.playerMuted)
      if rows.isEmpty {
        Text(snapshot.labels.progressEmpty)
          .font(.watchPlex(12))
          .foregroundStyle(TaybahTokens.Dark.playerMuted)
          .multilineTextAlignment(.center)
      } else {
        VStack(spacing: 1) {
          ForEach(rows, id: \.key) { row in
            HStack {
              Text(row.label)
                .foregroundStyle(TaybahTokens.Dark.playerInk)
              Spacer(minLength: 4)
              Text(row.value)
                .foregroundStyle(TaybahTokens.Dark.playerMuted)
            }
            .font(.watchPlex(13))
          }
        }
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .accessibilityElement(children: .combine)
    .accessibilityLabel(
      ([title, percentText] + rows.map { "\($0.label) \($0.value)" }).joined(separator: ", ")
    )
  }
}
