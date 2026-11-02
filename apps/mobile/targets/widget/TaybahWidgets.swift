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

private func hostBundleId() -> String {
  guard let bundleId = Bundle.main.bundleIdentifier else { return "com.taybahapp.taybah" }
  return bundleId.split(separator: ".").dropLast().joined(separator: ".")
}

private func layoutDirection(_ locale: String) -> LayoutDirection {
  locale == "ar" ? .rightToLeft : .leftToRight
}

struct NextPrayerSmallView: View {
  let entry: PrayerTimelineEntry
  @Environment(\.colorScheme) private var colorScheme

  var body: some View {
    let palette = TaybahTokens.palette(for: colorScheme)
    let snapshot = entry.snapshot
    ZStack {
      palette.surface
      if let snapshot {
        VStack(alignment: .leading, spacing: 4) {
          Text(snapshot.labels.nextPrayer).font(.caption).foregroundStyle(palette.inkMuted)
          prayerBody(snapshot: snapshot, palette: palette)
        }
        .padding()
        .environment(\.layoutDirection, layoutDirection(snapshot.locale))
      } else {
        Text("…").foregroundStyle(palette.inkMuted).padding()
      }
    }
    .widgetURL(WidgetDeepLink.url(path: "/salah", hostBundleId: hostBundleId()))
  }

  @ViewBuilder
  private func prayerBody(snapshot: TaybahSnapshot, palette: (surface: Color, surfaceRaised: Color, ink: Color, inkMuted: Color, line: Color, fillSecondary: Color, brand: Color, onBrand: Color, brandSurface: Color, onBrandSurface: Color, onBrandSurfaceMuted: Color, goldOnBrandSurface: Color, gold: Color, highlightActive: Color)) -> some View {
    if snapshot.prayer.entries.isEmpty {
      Text(snapshot.labels.noLocation).foregroundStyle(palette.ink)
    } else if let next = snapshot.prayer.entries.first(where: { $0.at > entry.date.timeIntervalSince1970 * 1000 }) {
      Text(prayerName(key: next.key, labels: snapshot.labels)).font(.headline).foregroundStyle(palette.ink)
      Text(Date(timeIntervalSince1970: next.at / 1000), style: .time).foregroundStyle(palette.inkMuted)
      Text(entry.date, style: .timer).font(.caption).foregroundStyle(palette.highlightActive)
    } else {
      Text(snapshot.labels.stale).foregroundStyle(palette.inkMuted)
    }
  }
}

struct ProgressMediumView: View {
  let entry: PrayerTimelineEntry
  @Environment(\.colorScheme) private var colorScheme

  var body: some View {
    let palette = TaybahTokens.palette(for: colorScheme)
    let snapshot = entry.snapshot
    ZStack {
      palette.surfaceRaised
      if let snapshot {
        HStack {
          ZStack {
            Circle().stroke(palette.line, lineWidth: 6)
            Circle()
              .trim(from: 0, to: CGFloat(snapshot.progress.percent) / 100)
              .stroke(palette.brand, style: StrokeStyle(lineWidth: 6, lineCap: .round))
              .rotationEffect(.degrees(-90))
            Text("\(snapshot.progress.percent)%").font(.caption.bold()).foregroundStyle(palette.ink)
          }
          .frame(width: 56, height: 56)
          VStack(alignment: .leading, spacing: 2) {
            Text(snapshot.labels.progressTitle).font(.caption.bold()).foregroundStyle(palette.ink)
            if snapshot.progress.rows.isEmpty {
              Text(snapshot.labels.progressEmpty).font(.caption2).foregroundStyle(palette.inkMuted)
            } else {
              ForEach(snapshot.progress.rows.prefix(4), id: \.key) { row in
                Text(row.label).font(.caption2).foregroundStyle(row.done ? palette.inkMuted : palette.ink)
              }
            }
          }
        }
        .padding()
        .environment(\.layoutDirection, layoutDirection(snapshot.locale))
      }
    }
    .widgetURL(WidgetDeepLink.url(path: "/daily-goals", hostBundleId: hostBundleId()))
  }
}

struct ContinueReadingView: View {
  let entry: PrayerTimelineEntry
  @Environment(\.colorScheme) private var colorScheme

  var body: some View {
    let palette = TaybahTokens.palette(for: colorScheme)
    let snapshot = entry.snapshot
    ZStack {
      palette.brandSurface
      if let snapshot, let reading = snapshot.reading {
        VStack(alignment: .leading, spacing: 4) {
          Text(snapshot.labels.continueReading).font(.caption).foregroundStyle(palette.onBrandSurfaceMuted)
          Text(reading.surah).font(.headline).foregroundStyle(palette.onBrandSurface)
          Text("\(snapshot.labels.ayahLabel) \(reading.ayah) · \(snapshot.labels.pageLabel) \(reading.page)")
            .font(.caption)
            .foregroundStyle(palette.onBrandSurfaceMuted)
          if let wird = snapshot.wird {
            Text("\(snapshot.labels.wirdTitle) \(wird.done)/\(wird.target)").font(.caption2).foregroundStyle(palette.goldOnBrandSurface)
          }
        }
        .padding()
        .environment(\.layoutDirection, layoutDirection(snapshot.locale))
        .widgetURL(WidgetDeepLink.url(path: "/read/\(reading.verseKey)", hostBundleId: hostBundleId()))
      } else {
        Text(snapshot?.labels.openApp ?? "…").foregroundStyle(palette.onBrandSurface).padding()
      }
    }
  }
}

struct MisbahaWidgetView: View {
  let entry: PrayerTimelineEntry
  @Environment(\.colorScheme) private var colorScheme

  var body: some View {
    let palette = TaybahTokens.palette(for: colorScheme)
    let snapshot = entry.snapshot
    ZStack {
      palette.surfaceRaised
      if let snapshot {
        VStack(spacing: 8) {
          Text(snapshot.labels.misbaha).font(.caption).foregroundStyle(palette.inkMuted)
          Text("\(snapshot.misbaha.count)").font(.largeTitle.bold()).foregroundStyle(palette.ink)
          if #available(iOS 17.0, *) {
            Button(intent: MisbahaIncrementIntent()) {
              Text(snapshot.labels.countAction).font(.caption.bold())
            }
            .buttonStyle(.borderedProminent)
            .tint(palette.brand)
          }
        }
        .padding()
        .environment(\.layoutDirection, layoutDirection(snapshot.locale))
      }
    }
    .widgetURL(WidgetDeepLink.url(path: "/sibha", hostBundleId: hostBundleId()))
  }
}

struct LockScreenPrayerView: View {
  let entry: PrayerTimelineEntry

  var body: some View {
    if let snapshot = entry.snapshot {
      HStack {
        Text(snapshot.labels.nextPrayer)
        Spacer()
        if let next = snapshot.prayer.entries.first(where: { $0.at > entry.date.timeIntervalSince1970 * 1000 }) {
          Text(Date(timeIntervalSince1970: next.at / 1000), style: .time)
        }
      }
      .environment(\.layoutDirection, layoutDirection(snapshot.locale))
    }
  }
}

struct LockScreenProgressView: View {
  let entry: PrayerTimelineEntry

  var body: some View {
    if let snapshot = entry.snapshot {
      Text("\(snapshot.progress.percent)%")
        .font(.headline)
        .environment(\.layoutDirection, layoutDirection(snapshot.locale))
    }
  }
}

private func prayerName(key: String, labels: TaybahSnapshot.Labels) -> String {
  switch key {
  case "fajr": return labels.prayerFajr
  case "dhuhr": return labels.prayerDhuhr
  case "asr": return labels.prayerAsr
  case "maghrib": return labels.prayerMaghrib
  case "isha": return labels.prayerIsha
  default: return key
  }
}

struct NextPrayerSmall: Widget {
  let kind = "NextPrayerSmall"
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: TaybahProvider()) { entry in
      NextPrayerSmallView(entry: entry)
    }
    .configurationDisplayName(LocalizedStringKey("widget_next_prayer_name"))
    .description(LocalizedStringKey("widget_next_prayer_desc"))
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}

struct ProgressMedium: Widget {
  let kind = "ProgressMedium"
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: TaybahProvider()) { entry in
      ProgressMediumView(entry: entry)
    }
    .configurationDisplayName(LocalizedStringKey("widget_progress_name"))
    .description(LocalizedStringKey("widget_progress_desc"))
    .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
  }
}

struct ContinueReading: Widget {
  let kind = "ContinueReading"
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: TaybahProvider()) { entry in
      ContinueReadingView(entry: entry)
    }
    .configurationDisplayName(LocalizedStringKey("widget_reading_name"))
    .description(LocalizedStringKey("widget_reading_desc"))
    .supportedFamilies([.systemSmall, .systemMedium])
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
  }
}

struct LockScreenAccessoryView: View {
  @Environment(\.widgetFamily) private var family
  let entry: PrayerTimelineEntry

  var body: some View {
    if family == .accessoryCircular {
      LockScreenProgressView(entry: entry)
    } else {
      LockScreenPrayerView(entry: entry)
    }
  }
}

struct LockScreenWidgets: Widget {
  let kind = "LockScreen"
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: TaybahProvider()) { entry in
      LockScreenAccessoryView(entry: entry)
    }
    .configurationDisplayName(LocalizedStringKey("widget_lock_name"))
    .description(LocalizedStringKey("widget_lock_desc"))
    .supportedFamilies([.accessoryCircular, .accessoryRectangular, .accessoryInline])
  }
}

@main
struct TaybahWidgetBundle: WidgetBundle {
  var body: some Widget {
    NextPrayerSmall()
    ProgressMedium()
    ContinueReading()
    MisbahaWidget()
    LockScreenWidgets()
  }
}
