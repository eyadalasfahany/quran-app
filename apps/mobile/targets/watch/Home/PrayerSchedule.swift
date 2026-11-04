import Foundation

/// The prayer instants the watch shows at `now` (ADR 0035 §3). Pure: no SwiftUI. Times are ms since the epoch.
struct PrayerSchedule {
  /// The five prayers in day order. Sunrise is never in the snapshot.
  static let prayerKeys: Set<String> = ["fajr", "dhuhr", "asr", "maghrib", "isha"]

  let snapshot: TaybahSnapshot
  let now: Date

  init(snapshot: TaybahSnapshot, now: Date) {
    self.snapshot = snapshot
    self.now = now
  }

  private var nowMs: Double {
    now.timeIntervalSince1970 * 1000
  }

  private var timeline: [TaybahSnapshot.PrayerEntry] {
    snapshot.prayer.entries.sorted { $0.at < $1.at }
  }

  /// The first prayer after `now`.
  var next: TaybahSnapshot.PrayerEntry? {
    timeline.first { $0.at > nowMs }
  }

  /// Past the last instant the snapshot holds, or no prayer is left today: the times would be guesses, so they are hidden.
  var isStale: Bool {
    if let validUntil = snapshot.prayer.validUntil, nowMs >= validUntil {
      return true
    }
    return next == nil
  }

  /// The five prayers of the day of `next` (or of `now` when none is left), in time order.
  var today: [TaybahSnapshot.PrayerEntry] {
    let calendar = Calendar.current
    let reference = next.map { Date(timeIntervalSince1970: $0.at / 1000) } ?? now
    return timeline.filter { entry in
      PrayerSchedule.prayerKeys.contains(entry.key)
        && calendar.isDate(Date(timeIntervalSince1970: entry.at / 1000), inSameDayAs: reference)
    }
  }

  static func prayerName(key: String, labels: TaybahSnapshot.Labels) -> String {
    switch key {
    case "fajr": return labels.prayerFajr
    case "dhuhr": return labels.prayerDhuhr
    case "asr": return labels.prayerAsr
    case "maghrib": return labels.prayerMaghrib
    case "isha": return labels.prayerIsha
    default: return key
    }
  }

  static func date(_ entry: TaybahSnapshot.PrayerEntry) -> Date {
    Date(timeIntervalSince1970: entry.at / 1000)
  }
}
