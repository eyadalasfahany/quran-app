import SwiftUI

/// The day's five prayers, with the next one highlighted (ADR 0035 §3, `WatchHome` frame).
struct TodayPrayersPage: View {
  let snapshot: TaybahSnapshot

  var body: some View {
    TimelineView(.periodic(from: .now, by: 60)) { context in
      let schedule = PrayerSchedule(snapshot: snapshot, now: context.date)
      if schedule.isStale {
        StalePage(snapshot: snapshot, now: context.date)
      } else if schedule.today.isEmpty {
        Text(snapshot.labels.noLocation)
          .font(.watchPlex(13))
          .foregroundStyle(TaybahTokens.Dark.playerMuted)
          .multilineTextAlignment(.center)
          .frame(maxWidth: .infinity, maxHeight: .infinity)
      } else {
        rows(schedule: schedule)
      }
    }
  }

  private func rows(schedule: PrayerSchedule) -> some View {
    let next = schedule.next
    let labels = schedule.today.map { entry in
      "\(PrayerSchedule.prayerName(key: entry.key, labels: snapshot.labels)), \(WatchStrings.clockTime(PrayerSchedule.date(entry), locale: snapshot.locale))"
    }
    return VStack(spacing: 1) {
      ForEach(schedule.today, id: \.at) { entry in
        PrayerRow(
          name: PrayerSchedule.prayerName(key: entry.key, labels: snapshot.labels),
          time: PrayerSchedule.date(entry),
          locale: snapshot.locale,
          isNext: entry.at == next?.at
        )
      }
    }
    .padding(.horizontal, 10)
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .accessibilityElement(children: .combine)
    .accessibilityLabel(labels.joined(separator: snapshot.locale == "en" ? "; " : "؛ "))
  }
}
