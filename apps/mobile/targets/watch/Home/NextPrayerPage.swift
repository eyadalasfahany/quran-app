import SwiftUI

/// The next prayer: name, time and countdown (ADR 0035 §3, `WatchHome` frame).
struct NextPrayerPage: View {
  let snapshot: TaybahSnapshot

  var body: some View {
    TimelineView(.periodic(from: .now, by: 60)) { context in
      let schedule = PrayerSchedule(snapshot: snapshot, now: context.date)
      if let next = schedule.next, !schedule.isStale {
        content(next: next, now: context.date)
      } else {
        StalePage(snapshot: snapshot, now: context.date)
      }
    }
  }

  private func content(next: TaybahSnapshot.PrayerEntry, now: Date) -> some View {
    let locale = snapshot.locale
    let at = PrayerSchedule.date(next)
    let name = PrayerSchedule.prayerName(key: next.key, labels: snapshot.labels)
    let remaining = WatchStrings.text("watch_remaining", locale: locale)
    let separator = locale == "en" ? ", " : "، "
    let label = [
      name,
      WatchStrings.clockTime(at, locale: locale),
      "\(remaining) \(WatchStrings.countdown(seconds: Int(max(0, at.timeIntervalSince(now))), locale: locale))",
    ].joined(separator: separator)

    return VStack(spacing: 0) {
      Text(snapshot.labels.nextPrayer)
        .font(.watchPlex(12))
        .foregroundStyle(TaybahTokens.Dark.playerMuted)
      Text(name)
        .font(.watchAmiri(44))
        .foregroundStyle(TaybahTokens.Dark.playerInk)
      Text(at, style: .time)
        .font(.watchPlex(17, .semibold))
        .foregroundStyle(TaybahTokens.Dark.playerInk)
      Text(at, style: .timer)
        .font(.watchPlex(26, .bold))
        .monospacedDigit()
        .foregroundStyle(TaybahTokens.Dark.brand)
        .padding(.top, 6)
      Text(remaining)
        .font(.watchPlex(11))
        .foregroundStyle(TaybahTokens.Dark.playerMuted)
    }
    .multilineTextAlignment(.center)
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .accessibilityElement(children: .combine)
    .accessibilityLabel(label)
  }
}
