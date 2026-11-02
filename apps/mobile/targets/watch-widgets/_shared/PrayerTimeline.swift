import WidgetKit

struct PrayerTimelineEntry: TimelineEntry {
  let date: Date
  let snapshot: TaybahSnapshot?
}

enum PrayerTimelineBuilder {
  static func entries(from snapshot: TaybahSnapshot?, now: Date = Date()) -> [PrayerTimelineEntry] {
    guard let snapshot else { return [PrayerTimelineEntry(date: now, snapshot: nil)] }
    let nowMs = now.timeIntervalSince1970 * 1000
    var dates: [Date] = snapshot.prayer.entries.filter { $0.at > nowMs }.map { Date(timeIntervalSince1970: $0.at / 1000) }
    if dates.isEmpty { dates = [now] }
    if let tomorrow = Calendar.current.date(byAdding: .day, value: 1, to: Calendar.current.startOfDay(for: now)) {
      dates.append(tomorrow)
    }
    return dates.map { PrayerTimelineEntry(date: $0, snapshot: snapshot) }
  }
}
