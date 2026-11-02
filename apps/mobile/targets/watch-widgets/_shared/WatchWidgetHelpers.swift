import SwiftUI

enum WatchWidgetHelpers {
  static func formatPercent(_ percent: Int, locale: String) -> String {
    let formatter = NumberFormatter()
    formatter.locale = Locale(identifier: locale)
    formatter.numberStyle = .percent
    formatter.maximumFractionDigits = 0
    return formatter.string(from: NSNumber(value: Double(percent) / 100)) ?? "\(percent)%"
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

  enum PrayerState {
    case noLocation
    case stale
    case next(key: String, at: Double)
  }

  static func prayerState(prayer: TaybahSnapshot.Prayer, nowMs: Double) -> PrayerState {
    if prayer.entries.isEmpty { return .noLocation }
    guard let next = prayer.entries.first(where: { $0.at > nowMs }) else { return .stale }
    return .next(key: next.key, at: next.at)
  }
}

extension Font {
  static func watchAmiriBold(_ size: CGFloat) -> Font {
    .custom("Amiri-Bold", size: size)
  }
}

struct WatchProgressRing: View {
  let percent: Double
  let size: CGFloat
  let stroke: CGFloat
  let track: Color
  let fill: Color
  let label: String

  var body: some View {
    ZStack {
      Circle().stroke(track, lineWidth: stroke)
      Circle()
        .trim(from: 0, to: CGFloat(min(1, max(0, percent))))
        .stroke(fill, style: StrokeStyle(lineWidth: stroke, lineCap: .round))
        .rotationEffect(.degrees(-90))
      Text(label)
        .font(.system(size: 10, weight: .bold))
    }
    .frame(width: size, height: size)
  }
}
