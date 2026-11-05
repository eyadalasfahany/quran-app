import CoreText
import SwiftUI
import WidgetKit

struct TaybahProvider: TimelineProvider {
  func placeholder(in context: Context) -> PrayerTimelineEntry {
    PrayerTimelineEntry(date: Date(), snapshot: nil)
  }

  func getSnapshot(in context: Context, completion: @escaping (PrayerTimelineEntry) -> Void) {
    completion(PrayerTimelineEntry(date: Date(), snapshot: SnapshotIO.load()))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<PrayerTimelineEntry>) -> Void) {
    let snapshot = SnapshotIO.load()
    let entries = PrayerTimelineBuilder.entries(from: snapshot)
    completion(Timeline(entries: entries, policy: PrayerTimelineBuilder.policy()))
  }
}

struct NextPrayerSmall: Widget {
  let kind = "NextPrayerSmall"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: TaybahProvider()) { entry in
      NextPrayerWidgetView(entry: entry)
    }
    .configurationDisplayName(LocalizedStringKey("widget_next_prayer_name"))
    .description(LocalizedStringKey("widget_next_prayer_desc"))
    .supportedFamilies([.systemSmall, .systemMedium])
    .contentMarginsDisabled()
  }
}

struct ProgressMedium: Widget {
  let kind = "ProgressMedium"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: TaybahProvider()) { entry in
      ProgressWidgetView(entry: entry)
    }
    .configurationDisplayName(LocalizedStringKey("widget_progress_name"))
    .description(LocalizedStringKey("widget_progress_desc"))
    .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    .contentMarginsDisabled()
  }
}

struct ContinueReading: Widget {
  let kind = "ContinueReading"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: TaybahProvider()) { entry in
      ContinueReadingWidgetView(entry: entry)
    }
    .configurationDisplayName(LocalizedStringKey("widget_reading_name"))
    .description(LocalizedStringKey("widget_reading_desc"))
    .supportedFamilies([.systemSmall, .systemMedium])
    .contentMarginsDisabled()
  }
}

struct MisbahaWidget: Widget {
  let kind = "Misbaha"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: TaybahProvider()) { entry in
      MisbahaWidgetView(entry: entry)
    }
    .configurationDisplayName(LocalizedStringKey("widget_misbaha_name"))
    .description(LocalizedStringKey("widget_misbaha_desc"))
    .supportedFamilies([.systemSmall])
    .contentMarginsDisabled()
  }
}

struct AzkarStatusWidget: Widget {
  let kind = "AzkarStatus"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: TaybahProvider()) { entry in
      AzkarWidgetView(entry: entry)
    }
    .configurationDisplayName(LocalizedStringKey("widget_azkar_name"))
    .description(LocalizedStringKey("widget_azkar_desc"))
    .supportedFamilies([.systemMedium])
    .contentMarginsDisabled()
  }
}

struct LockScreenPrayerAccessory: Widget {
  let kind = "LockScreenPrayer"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: TaybahProvider()) { entry in
      LockScreenPrayerAccessoryView(entry: entry)
    }
    .configurationDisplayName(LocalizedStringKey("widget_lock_prayer_name"))
    .description(LocalizedStringKey("widget_lock_prayer_desc"))
    .supportedFamilies([.accessoryInline, .accessoryRectangular])
  }
}

struct LockScreenPrayerAccessoryView: View {
  @Environment(\.widgetFamily) private var family
  let entry: PrayerTimelineEntry

  var body: some View {
    Group {
      switch family {
      case .accessoryInline:
        LockScreenInlineView(entry: entry)
      default:
        LockScreenRectangularView(entry: entry)
      }
    }
    .lockScreenBackground()
    .widgetURL(WidgetDeepLink.url(path: "/salah", hostBundleId: WidgetHelpers.hostBundleId()))
  }
}

struct LockScreenProgressCircular: Widget {
  let kind = "LockScreenProgress"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: TaybahProvider()) { entry in
      LockScreenProgressCircularView(entry: entry)
        .lockScreenBackground()
        .widgetURL(WidgetDeepLink.url(path: "/daily-goals", hostBundleId: WidgetHelpers.hostBundleId()))
    }
    .configurationDisplayName(LocalizedStringKey("widget_lock_progress_name"))
    .description(LocalizedStringKey("widget_lock_progress_desc"))
    .supportedFamilies([.accessoryCircular])
  }
}

struct LockScreenPrayerCircular: Widget {
  let kind = "LockScreenPrayerCircular"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: TaybahProvider()) { entry in
      LockScreenPrayerCircularView(entry: entry)
        .lockScreenBackground()
        .widgetURL(WidgetDeepLink.url(path: "/salah", hostBundleId: WidgetHelpers.hostBundleId()))
    }
    .configurationDisplayName(LocalizedStringKey("widget_lock_prayer_circle_name"))
    .description(LocalizedStringKey("widget_lock_prayer_circle_desc"))
    .supportedFamilies([.accessoryCircular])
  }
}

@main
struct TaybahWidgetBundle: WidgetBundle {
  init() {
    if let url = Bundle.main.url(forResource: "Amiri-Bold", withExtension: "ttf") {
      CTFontManagerRegisterFontsForURL(url as CFURL, .process, nil)
    }
  }

  var body: some Widget {
    NextPrayerSmall()
    ProgressMedium()
    ContinueReading()
    MisbahaWidget()
    AzkarStatusWidget()
    LockScreenPrayerAccessory()
    LockScreenProgressCircular()
    LockScreenPrayerCircular()
  }
}
