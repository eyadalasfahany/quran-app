import SwiftUI
import WidgetKit

struct WatchComplicationProvider: TimelineProvider {
  func placeholder(in context: Context) -> PrayerTimelineEntry {
    PrayerTimelineEntry(date: Date(), snapshot: nil)
  }

  func getSnapshot(in context: Context, completion: @escaping (PrayerTimelineEntry) -> Void) {
    completion(PrayerTimelineEntry(date: Date(), snapshot: SnapshotIO.load()))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<PrayerTimelineEntry>) -> Void) {
    let snapshot = SnapshotIO.load()
    let entries = PrayerTimelineBuilder.entries(from: snapshot)
    completion(Timeline(entries: entries, policy: .atEnd))
  }
}

private enum WatchColors {
  static let ink = Color(red: 0.953, green: 0.933, blue: 0.886)
  static let inkMuted = Color(red: 0.655, green: 0.702, blue: 0.678)
  static let brand = Color(red: 0.549, green: 0.773, blue: 0.686)
  static let gold = Color(red: 0.902, green: 0.780, blue: 0.494)
  static let track = Color(red: 0.141, green: 0.204, blue: 0.184)
}

struct WatchComplicationView: View {
  @Environment(\.widgetFamily) private var family
  let entry: PrayerTimelineEntry

  var body: some View {
    Group {
      if let snapshot = entry.snapshot {
        content(snapshot: snapshot)
          .environment(\.layoutDirection, snapshot.locale == "ar" ? .rightToLeft : .leftToRight)
          .environment(\.locale, WatchNumerals.locale(for: snapshot.locale))
      } else {
        Text("…")
      }
    }
    .widgetAccentable()
  }

  @ViewBuilder
  private func content(snapshot: TaybahSnapshot) -> some View {
    let nowMs = entry.date.timeIntervalSince1970 * 1000
    let state = WatchWidgetHelpers.prayerState(prayer: snapshot.prayer, nowMs: nowMs)
    switch family {
    case .accessoryInline:
      inline(snapshot: snapshot, state: state)
    case .accessoryRectangular:
      rectangular(snapshot: snapshot, state: state)
    case .accessoryCorner:
      corner(snapshot: snapshot)
    default:
      circularPrayer(snapshot: snapshot, state: state)
    }
  }

  @ViewBuilder
  private func inline(snapshot: TaybahSnapshot, state: WatchWidgetHelpers.PrayerState) -> some View {
    if case .next(let key, let at) = state {
      HStack(spacing: 4) {
        Text(WatchWidgetHelpers.prayerName(key: key, labels: snapshot.labels))
        Text(Date(timeIntervalSince1970: at / 1000), style: .time)
      }
      .font(.system(size: 13, weight: .semibold))
      .foregroundStyle(WatchColors.gold)
    } else {
      Text(snapshot.labels.nextPrayer)
        .foregroundStyle(WatchColors.inkMuted)
    }
  }

  @ViewBuilder
  private func rectangular(snapshot: TaybahSnapshot, state: WatchWidgetHelpers.PrayerState) -> some View {
    if case .next(let key, let at) = state {
      VStack(alignment: .leading, spacing: 2) {
        Text(snapshot.labels.nextPrayer)
          .font(.system(size: 11))
          .foregroundStyle(WatchColors.inkMuted)
        HStack(spacing: 4) {
          Text(WatchWidgetHelpers.prayerName(key: key, labels: snapshot.labels))
          Text("·")
          Text(Date(timeIntervalSince1970: at / 1000), style: .time)
        }
        .font(.system(size: 14, weight: .bold))
        Text(Date(timeIntervalSince1970: at / 1000), style: .timer)
          .font(.system(size: 13, weight: .semibold))
          .foregroundStyle(WatchColors.brand)
          .monospacedDigit()
      }
    } else {
      Text(snapshot.labels.noLocation)
        .font(.system(size: 12))
    }
  }

  @ViewBuilder
  private func circularPrayer(snapshot: TaybahSnapshot, state: WatchWidgetHelpers.PrayerState) -> some View {
    if case .next(let key, let at) = state {
      VStack(spacing: 0) {
        Text(WatchWidgetHelpers.prayerName(key: key, labels: snapshot.labels))
          .font(.watchAmiriBold(15))
          .lineLimit(1)
          .minimumScaleFactor(0.7)
        Text(Date(timeIntervalSince1970: at / 1000), style: .time)
          .font(.system(size: 10, weight: .semibold))
      }
    } else {
      Text("…")
    }
  }

  private func corner(snapshot: TaybahSnapshot) -> some View {
    WatchProgressRing(
      percent: Double(snapshot.progress.percent) / 100,
      size: 34,
      stroke: 4,
      track: WatchColors.track,
      fill: WatchColors.brand,
      label: WatchWidgetHelpers.formatPercent(snapshot.progress.percent, locale: snapshot.locale)
    )
  }
}

struct WatchInlineComplication: Widget {
  let kind = "WatchInline"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: WatchComplicationProvider()) { entry in
      WatchComplicationView(entry: entry)
    }
    .supportedFamilies([.accessoryInline, .accessoryRectangular, .accessoryCircular, .accessoryCorner])
  }
}

@main
struct TaybahWatchWidgetBundle: WidgetBundle {
  var body: some Widget {
    WatchInlineComplication()
  }
}
