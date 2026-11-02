import WidgetKit

struct PrayerTimelineEntry: TimelineEntry {
  let date: Date
  let snapshot: TaybahSnapshot?
}

enum PrayerTimelineBuilder {
  /// One entry per remaining prayer instant today, plus midnight (ADR 0035 §4).
  static func entries(from snapshot: TaybahSnapshot?, now: Date = Date()) -> [PrayerTimelineEntry] {
    guard let snapshot else {
      return [PrayerTimelineEntry(date: now, snapshot: nil)]
    }
    let nowMs = now.timeIntervalSince1970 * 1000
    var dates: [Date] = snapshot.prayer.entries
      .filter { $0.at > nowMs }
      .map { Date(timeIntervalSince1970: $0.at / 1000) }
    if dates.isEmpty {
      dates = [now]
    }
    let calendar = Calendar.current
    if let tomorrow = calendar.date(byAdding: .day, value: 1, to: calendar.startOfDay(for: now)) {
      dates.append(tomorrow)
    }
    return dates.map { PrayerTimelineEntry(date: $0, snapshot: snapshot) }
  }

  static func policy() -> TimelineReloadPolicy {
    .atEnd
  }
}
