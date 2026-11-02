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

struct WatchInlineComplication: Widget {
  let kind = "WatchInline"
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: WatchComplicationProvider()) { entry in
      if let snapshot = entry.snapshot,
         let next = snapshot.prayer.entries.first(where: { $0.at > entry.date.timeIntervalSince1970 * 1000 }) {
        Text("\(next.key) \(Date(timeIntervalSince1970: next.at / 1000), style: .time)")
      } else {
        Text("…")
      }
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
