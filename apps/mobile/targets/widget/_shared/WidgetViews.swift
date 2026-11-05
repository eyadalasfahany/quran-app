import SwiftUI
import WidgetKit

// MARK: - Next prayer

struct NextPrayerWidgetView: View {
  let entry: PrayerTimelineEntry
  @Environment(\.widgetFamily) private var family
  @Environment(\.colorScheme) private var colorScheme

  var body: some View {
    let palette = WidgetHelpers.widgetPalette(colorMode: entry.snapshot?.colorMode, environment: colorScheme)
    Group {
      if let snapshot = entry.snapshot {
        content(snapshot: snapshot, palette: palette)
          .snapshotLocale(snapshot.locale)
      } else {
        placeholder(palette: palette)
      }
    }
    .widgetURL(WidgetDeepLink.url(path: "/salah", hostBundleId: WidgetHelpers.hostBundleId()))
    .widgetCardBackground(palette)
  }

  @ViewBuilder
  private func content(snapshot: TaybahSnapshot, palette: TaybahPalette) -> some View {
    let nowMs = entry.date.timeIntervalSince1970 * 1000
    let state = WidgetHelpers.prayerState(prayer: snapshot.prayer, nowMs: nowMs)
    switch family {
    case .systemMedium:
      medium(snapshot: snapshot, palette: palette, state: state, nowMs: nowMs)
    default:
      small(snapshot: snapshot, palette: palette, state: state, nowMs: nowMs)
    }
  }

  private func small(snapshot: TaybahSnapshot, palette: TaybahPalette, state: WidgetHelpers.PrayerState, nowMs: Double) -> some View {
    Group {
      switch state {
      case .noLocation:
        VStack(alignment: .leading, spacing: 2) {
          Text(snapshot.labels.nextPrayer)
            .font(.system(size: 12, weight: .medium))
            .foregroundStyle(palette.onBrandSurfaceMuted)
          Text(snapshot.labels.noLocation)
            .font(.system(size: 17, weight: .semibold))
            .foregroundStyle(palette.onBrandSurface)
            .padding(.top, 6)
          Spacer(minLength: 0)
          HStack(spacing: 4) {
            Text(snapshot.labels.openApp)
              .font(.system(size: 13, weight: .semibold))
              .foregroundStyle(palette.onBrandSurface)
            Image(systemName: "chevron.forward")
              .font(.system(size: 12, weight: .semibold))
              .foregroundStyle(palette.onBrandSurface)
              .flipsForRightToLeftLayoutDirection(true)
          }
        }
      case .stale:
        VStack(alignment: .leading, spacing: 2) {
          Text(snapshot.labels.nextPrayer)
            .font(.system(size: 12, weight: .medium))
            .foregroundStyle(palette.onBrandSurfaceMuted)
          Text(snapshot.labels.stale)
            .font(.system(size: 15, weight: .medium))
            .foregroundStyle(palette.onBrandSurfaceMuted)
          Spacer(minLength: 0)
        }
      case .next(let key, let at):
        ViewThatFits(in: .horizontal) {
          smallNext(snapshot: snapshot, palette: palette, key: key, at: at, nowMs: nowMs, showDots: true)
          smallNext(snapshot: snapshot, palette: palette, key: key, at: at, nowMs: nowMs, showDots: false)
        }
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    .padding(WidgetHelpers.cardPadding)
    .dynamicTypeSize(...DynamicTypeSize.xxxLarge)
  }

  private func smallNext(snapshot: TaybahSnapshot, palette: TaybahPalette, key: String, at: Double, nowMs: Double, showDots: Bool) -> some View {
    VStack(alignment: .leading, spacing: 0) {
      Text(snapshot.labels.nextPrayer)
        .font(.system(size: 12, weight: .medium))
        .foregroundStyle(palette.onBrandSurfaceMuted)
        .lineLimit(1)
      Text(WidgetHelpers.prayerName(key: key, labels: snapshot.labels))
        .font(.amiriBold(30))
        .foregroundStyle(palette.onBrandSurface)
        .minimumScaleFactor(0.8)
        .lineLimit(1)
      Spacer(minLength: 2)
      HStack(spacing: 8) {
        Text(Date(timeIntervalSince1970: at / 1000), style: .time)
          .font(.system(size: 13, weight: .semibold))
          .foregroundStyle(palette.onBrandSurface)
          .lineLimit(1)
          .fixedSize()
          .onBrandSoftChip(palette)
        if showDots {
          Spacer(minLength: 0)
          prayerDotsRow(snapshot: snapshot, palette: palette, nextKey: key, nowMs: nowMs)
        }
      }
      Spacer(minLength: 6)
      prayerRemainingRow(snapshot: snapshot, palette: palette, at: at)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
  }

  private func prayerDotsRow(snapshot: TaybahSnapshot, palette: TaybahPalette, nextKey: String, nowMs: Double) -> some View {
    let today = WidgetHelpers.todaysPrayerEntries(snapshot.prayer.entries, now: entry.date)
    let byKey = Dictionary(uniqueKeysWithValues: today.map { ($0.key, $0.at) })
    return HStack(spacing: 5) {
      ForEach(WidgetHelpers.prayerDotKeys, id: \.self) { key in
        let state = WidgetHelpers.prayerDotState(key: key, nextKey: nextKey, entryAt: byKey[key], nowMs: nowMs)
        Circle()
          .fill(state == "next" ? palette.onBrandSurface : state == "past" ? palette.onBrandSurface.opacity(0.35) : Color.clear)
          .overlay {
            if state == "future" {
              Circle().stroke(palette.onBrandSurfaceMuted, lineWidth: 1)
            }
          }
          .frame(width: 8, height: 8)
      }
    }
    .fixedSize()
  }

  private func prayerRemainingRow(snapshot: TaybahSnapshot, palette: TaybahPalette, at: Double) -> some View {
    HStack(alignment: .firstTextBaseline, spacing: 6) {
      if let remaining = snapshot.labels.remaining {
        Text(remaining)
          .font(.system(size: 12, weight: .medium))
          .foregroundStyle(palette.onBrandSurfaceMuted)
          .lineLimit(1)
          .fixedSize()
      }
      Text(Date(timeIntervalSince1970: at / 1000), style: .timer)
        .font(.system(size: 18, weight: .bold))
        .foregroundStyle(palette.onBrandSurface)
        .monospacedDigit()
        .lineLimit(1)
        .minimumScaleFactor(0.6)
        .multilineTextAlignment(.trailing)
        .frame(maxWidth: .infinity, alignment: .trailing)
        .widgetAccentable()
    }
    .onBrandSoftCard(palette, horizontal: 12, vertical: 8)
  }

  private func medium(snapshot: TaybahSnapshot, palette: TaybahPalette, state: WidgetHelpers.PrayerState, nowMs: Double) -> some View {
    Group {
      switch state {
      case .noLocation, .stale:
        let message = state == .noLocation ? snapshot.labels.noLocation : snapshot.labels.stale
        VStack(alignment: .leading, spacing: 8) {
          Text(snapshot.labels.nextPrayer)
            .font(.system(size: 12, weight: .medium))
            .foregroundStyle(palette.onBrandSurfaceMuted)
          Text(message)
            .font(.system(size: 15, weight: .medium))
            .foregroundStyle(palette.onBrandSurface)
        }
      case .next(let key, let at):
        VStack(alignment: .leading, spacing: 0) {
          HStack(alignment: .top, spacing: 8) {
            VStack(alignment: .leading, spacing: 0) {
              let placeSuffix = snapshot.prayer.place.map { " · \($0)" } ?? ""
              Text("\(snapshot.labels.nextPrayer)\(placeSuffix)")
                .font(.system(size: 12, weight: .medium))
                .foregroundStyle(palette.onBrandSurfaceMuted)
                .lineLimit(1)
              Text(WidgetHelpers.prayerName(key: key, labels: snapshot.labels))
                .font(.amiriBold(30))
                .foregroundStyle(palette.onBrandSurface)
                .minimumScaleFactor(0.8)
                .lineLimit(1)
              Text(Date(timeIntervalSince1970: at / 1000), style: .time)
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(palette.onBrandSurface)
                .lineLimit(1)
                .fixedSize()
                .onBrandSoftChip(palette)
            }
            Spacer(minLength: 0)
            VStack(alignment: .trailing, spacing: 2) {
              if let remaining = snapshot.labels.remaining {
                Text(remaining)
                  .font(.system(size: 12, weight: .medium))
                  .foregroundStyle(palette.onBrandSurfaceMuted)
                  .lineLimit(1)
              }
              Text(Date(timeIntervalSince1970: at / 1000), style: .timer)
                .font(.system(size: 24, weight: .bold))
                .foregroundStyle(palette.onBrandSurface)
                .monospacedDigit()
                .lineLimit(1)
                .multilineTextAlignment(.trailing)
                .frame(width: 110, alignment: .trailing)
                .widgetAccentable()
            }
          }
          Spacer(minLength: 6)
          prayerTiles(snapshot: snapshot, palette: palette, nextKey: key, nextAt: at)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    .padding(WidgetHelpers.cardPadding)
    .dynamicTypeSize(...DynamicTypeSize.xxxLarge)
  }

  private func prayerTiles(snapshot: TaybahSnapshot, palette: TaybahPalette, nextKey: String, nextAt: Double) -> some View {
    let entries = WidgetHelpers.todaysPrayerEntries(snapshot.prayer.entries, now: entry.date)
    return HStack(spacing: 2) {
      ForEach(entries, id: \.key) { entry in
        let isNext = entry.key == nextKey && entry.at == nextAt
        VStack(spacing: 0) {
          Text(WidgetHelpers.prayerName(key: entry.key, labels: snapshot.labels))
            .font(.system(size: 12, weight: isNext ? .bold : .medium))
            .foregroundStyle(isNext ? palette.onBrandSurface : palette.onBrandSurfaceMuted)
            .lineLimit(1)
            .minimumScaleFactor(0.8)
          Text(Date(timeIntervalSince1970: entry.at / 1000), style: .time)
            .font(.system(size: 13))
            .foregroundStyle(isNext ? palette.onBrandSurface : palette.onBrandSurfaceMuted)
            .lineLimit(1)
            .minimumScaleFactor(0.8)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 5)
        .padding(.horizontal, 2)
        .background(
          isNext
            ? WidgetHelpers.onBrandWash(palette)
            : WidgetHelpers.onBrandWash(palette, opacity: WidgetHelpers.onBrandWashLight)
        )
        .overlay {
          if isNext {
            RoundedRectangle(cornerRadius: 12, style: .continuous)
              .stroke(palette.gold, lineWidth: 1.5)
          }
        }
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
      }
    }
  }

  private func placeholder(palette: TaybahPalette) -> some View {
    Text("…")
      .foregroundStyle(palette.onBrandSurfaceMuted)
      .frame(maxWidth: .infinity, maxHeight: .infinity)
      .padding(WidgetHelpers.cardPadding)
  }
}

// MARK: - Progress

struct ProgressWidgetView: View {
  let entry: PrayerTimelineEntry
  @Environment(\.widgetFamily) private var family
  @Environment(\.colorScheme) private var colorScheme

  var body: some View {
    let palette = WidgetHelpers.widgetPalette(colorMode: entry.snapshot?.colorMode, environment: colorScheme)
    Group {
      if let snapshot = entry.snapshot {
        content(snapshot: snapshot, palette: palette)
          .snapshotLocale(snapshot.locale)
      } else {
        Text("…").foregroundStyle(palette.onBrandSurfaceMuted)
      }
    }
    .widgetURL(WidgetDeepLink.url(path: "/daily-goals", hostBundleId: WidgetHelpers.hostBundleId()))
    .widgetCardBackground(palette)
  }

  @ViewBuilder
  private func content(snapshot: TaybahSnapshot, palette: TaybahPalette) -> some View {
    let rows = snapshot.progress.rows
    let empty = rows.isEmpty
    switch family {
    case .systemLarge:
      large(snapshot: snapshot, palette: palette, rows: rows, empty: empty)
    case .systemMedium:
      medium(snapshot: snapshot, palette: palette, rows: rows, empty: empty)
    default:
      small(snapshot: snapshot, palette: palette, rows: rows, empty: empty)
    }
  }

  private func ring(
    snapshot: TaybahSnapshot,
    palette: TaybahPalette,
    size: CGFloat,
    stroke: CGFloat,
    fontSize: CGFloat,
    percent: Int
  ) -> some View {
    ProgressRingView(
      percent: Double(percent) / 100,
      size: size,
      stroke: stroke,
      track: palette.onBrandSurface.opacity(0.2),
      fill: palette.gold,
      center: {
        Text(WidgetHelpers.formatPercent(percent, locale: snapshot.locale))
          .font(.system(size: fontSize, weight: .bold))
          .foregroundStyle(palette.onBrandSurface)
          .minimumScaleFactor(0.7)
      }
    )
  }

  private func small(snapshot: TaybahSnapshot, palette: TaybahPalette, rows: [TaybahSnapshot.ProgressRow], empty: Bool) -> some View {
    VStack(spacing: 8) {
      if empty {
        Text(snapshot.labels.progressTitle)
          .font(.system(size: 12, weight: .medium))
          .foregroundStyle(palette.onBrandSurfaceMuted)
          .frame(maxWidth: .infinity, alignment: .leading)
        Spacer(minLength: 0)
        ProgressRingView(
          percent: 0,
          size: 64,
          stroke: 7,
          track: palette.onBrandSurface.opacity(0.2),
          fill: palette.gold,
          center: {
            Image(systemName: "plus")
              .font(.system(size: 22, weight: .medium))
              .foregroundStyle(palette.onBrandSurface)
          }
        )
        Spacer(minLength: 0)
        Text(snapshot.labels.progressEmpty)
          .font(.system(size: 13, weight: .semibold))
          .foregroundStyle(palette.onBrandSurface)
          .multilineTextAlignment(.center)
      } else {
        ring(snapshot: snapshot, palette: palette, size: 92, stroke: 9, fontSize: 22, percent: snapshot.progress.percent)
        Spacer(minLength: 0)
        let summary = WidgetHelpers.progressGoalsSummary(rows: rows, locale: snapshot.locale, ofLabel: snapshot.labels.of)
        Text("\(snapshot.labels.progressTitle) · \(summary)")
          .font(.system(size: 13, weight: .semibold))
          .foregroundStyle(palette.onBrandSurface)
          .multilineTextAlignment(.center)
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .padding(WidgetHelpers.cardPadding)
    .dynamicTypeSize(...DynamicTypeSize.xxxLarge)
  }

  private func medium(snapshot: TaybahSnapshot, palette: TaybahPalette, rows: [TaybahSnapshot.ProgressRow], empty: Bool) -> some View {
    let summary = empty
      ? snapshot.labels.progressEmpty
      : WidgetHelpers.progressGoalsSummary(rows: rows, locale: snapshot.locale, ofLabel: snapshot.labels.of)
    return VStack(alignment: .leading, spacing: 0) {
      HStack(spacing: 14) {
        ring(snapshot: snapshot, palette: palette, size: 92, stroke: 9, fontSize: 22, percent: empty ? 0 : snapshot.progress.percent)
        VStack(alignment: .leading, spacing: 6) {
          Text(snapshot.labels.progressTitle)
            .font(.system(size: 12, weight: .medium))
            .foregroundStyle(palette.onBrandSurfaceMuted)
          if empty {
            Text(snapshot.labels.progressEmpty)
              .font(.system(size: 13))
              .foregroundStyle(palette.onBrandSurfaceMuted)
          } else {
            ForEach(rows.prefix(4), id: \.key) { row in
              progressRow(row: row, palette: palette, fontSize: 13)
            }
          }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
      }
      Spacer(minLength: 0)
      VStack(alignment: .leading, spacing: 4) {
        Text(snapshot.labels.progressTitle)
          .font(.system(size: 12, weight: .medium))
          .foregroundStyle(palette.onBrandSurfaceMuted)
        Text(summary)
          .font(.system(size: 20, weight: .bold))
          .foregroundStyle(palette.onBrandSurface)
          .lineLimit(2)
      }
      .onBrandSoftCard(palette)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    .padding(WidgetHelpers.cardPadding)
    .dynamicTypeSize(...DynamicTypeSize.xxxLarge)
  }

  private func large(snapshot: TaybahSnapshot, palette: TaybahPalette, rows: [TaybahSnapshot.ProgressRow], empty: Bool) -> some View {
    VStack(alignment: .leading, spacing: 14) {
      HStack(spacing: 16) {
        ring(snapshot: snapshot, palette: palette, size: 108, stroke: 10, fontSize: 26, percent: empty ? 0 : snapshot.progress.percent)
        VStack(alignment: .leading, spacing: 4) {
          Text(snapshot.labels.progressTitle)
            .font(.system(size: 12, weight: .medium))
            .foregroundStyle(palette.onBrandSurfaceMuted)
          if !empty {
            Text(WidgetHelpers.progressGoalsSummary(rows: rows, locale: snapshot.locale, ofLabel: snapshot.labels.of))
              .font(.amiriBold(26))
              .foregroundStyle(palette.onBrandSurface)
              .minimumScaleFactor(0.8)
              .lineLimit(2)
          } else {
            Text(snapshot.labels.progressEmpty)
              .font(.system(size: 15, weight: .medium))
              .foregroundStyle(palette.onBrandSurfaceMuted)
          }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
      }
      if !empty {
        Divider().overlay(palette.onBrandSurface.opacity(0.2))
        VStack(spacing: 2) {
          ForEach(rows, id: \.key) { row in
            progressRow(row: row, palette: palette, fontSize: 15)
          }
        }
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    .padding(16)
    .dynamicTypeSize(...DynamicTypeSize.xxxLarge)
  }

  private func progressRow(row: TaybahSnapshot.ProgressRow, palette: TaybahPalette, fontSize: CGFloat) -> some View {
    HStack(spacing: 8) {
      GoalCheckmark(done: row.done, palette: palette)
      Text(row.label)
        .font(.system(size: fontSize, weight: .medium))
        .foregroundStyle(palette.onBrandSurface)
        .lineLimit(1)
      Spacer(minLength: 4)
      Text(row.value)
        .font(.system(size: fontSize, weight: .medium))
        .foregroundStyle(palette.onBrandSurfaceMuted)
        .lineLimit(1)
    }
    .frame(minHeight: fontSize + 8)
  }
}

// MARK: - Continue reading

struct ContinueReadingWidgetView: View {
  let entry: PrayerTimelineEntry
  @Environment(\.widgetFamily) private var family
  @Environment(\.colorScheme) private var colorScheme

  var body: some View {
    let palette = WidgetHelpers.widgetPalette(colorMode: entry.snapshot?.colorMode, environment: colorScheme)
    Group {
      if let snapshot = entry.snapshot {
        content(snapshot: snapshot, palette: palette)
          .snapshotLocale(snapshot.locale)
      } else {
        Text("…").foregroundStyle(palette.onBrandSurface)
      }
    }
    .widgetCardBackground(palette, raised: false)
  }

  @ViewBuilder
  private func content(snapshot: TaybahSnapshot, palette: TaybahPalette) -> some View {
    if let reading = snapshot.reading {
      let place = "\(snapshot.labels.ayahLabel) \(WidgetHelpers.formatNumber(reading.ayah, locale: snapshot.locale)) · \(snapshot.labels.pageLabel) \(WidgetHelpers.formatNumber(reading.page, locale: snapshot.locale))"
      let deepLink = WidgetDeepLink.url(path: "/read/\(reading.verseKey)", hostBundleId: WidgetHelpers.hostBundleId())
      Group {
        if family == .systemMedium {
          medium(snapshot: snapshot, palette: palette, reading: reading, place: place)
        } else {
          small(snapshot: snapshot, palette: palette, reading: reading, place: place)
        }
      }
      .widgetURL(deepLink)
    } else {
      VStack(alignment: .leading, spacing: 6) {
        Text(snapshot.labels.continueReading)
          .font(.system(size: 12, weight: .medium))
          .foregroundStyle(palette.onBrandSurfaceMuted)
        Text(snapshot.labels.openApp)
          .font(.system(size: 14))
          .foregroundStyle(palette.onBrandSurface)
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
      .padding(WidgetHelpers.cardPadding)
      .widgetURL(WidgetDeepLink.url(path: "/read/1:1", hostBundleId: WidgetHelpers.hostBundleId()))
    }
  }

  private func small(snapshot: TaybahSnapshot, palette: TaybahPalette, reading: TaybahSnapshot.Reading, place: String) -> some View {
    VStack(alignment: .leading, spacing: 4) {
      Text(snapshot.labels.continueReading)
        .font(.system(size: 12, weight: .medium))
        .foregroundStyle(palette.onBrandSurfaceMuted)
      Text(reading.surah)
        .font(.amiriBold(30))
        .foregroundStyle(palette.onBrandSurface)
        .lineLimit(1)
        .minimumScaleFactor(0.75)
      Text(place)
        .font(.system(size: 13))
        .foregroundStyle(palette.onBrandSurfaceMuted)
      Spacer(minLength: 0)
      wirdBar(snapshot: snapshot, palette: palette)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    .padding(WidgetHelpers.cardPadding)
    .dynamicTypeSize(...DynamicTypeSize.xxxLarge)
  }

  private func medium(snapshot: TaybahSnapshot, palette: TaybahPalette, reading: TaybahSnapshot.Reading, place: String) -> some View {
    HStack(spacing: 14) {
      VStack(alignment: .leading, spacing: 4) {
        Text(snapshot.labels.continueReading)
          .font(.system(size: 12, weight: .medium))
          .foregroundStyle(palette.onBrandSurfaceMuted)
        Text(reading.surah)
          .font(.amiriBold(34))
          .foregroundStyle(palette.onBrandSurface)
          .lineLimit(1)
          .minimumScaleFactor(0.7)
        Text(place)
          .font(.system(size: 13))
          .foregroundStyle(palette.onBrandSurfaceMuted)
        Spacer(minLength: 0)
        Text(snapshot.labels.resume)
          .font(.system(size: 13, weight: .semibold))
          .foregroundStyle(palette.brandSurface)
          .padding(.horizontal, 14)
          .frame(minHeight: 32)
          .background(palette.onBrandSurface)
          .clipShape(Capsule())
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)

      if snapshot.wird != nil {
        Rectangle()
          .fill(palette.onBrandSurface.opacity(0.2))
          .frame(width: 1)
        wirdColumn(snapshot: snapshot, palette: palette)
          .frame(width: 108)
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .padding(WidgetHelpers.cardPadding)
    .dynamicTypeSize(...DynamicTypeSize.xxxLarge)
  }

  @ViewBuilder
  private func wirdBar(snapshot: TaybahSnapshot, palette: TaybahPalette) -> some View {
    let fraction: Double = {
      guard let wird = snapshot.wird, wird.target > 0 else { return 0.07 }
      return min(1, Double(wird.done) / Double(wird.target))
    }()
    GeometryReader { geo in
      ZStack(alignment: .leading) {
        Capsule().fill(palette.onBrandSurface.opacity(0.2))
        Capsule().fill(palette.goldOnBrandSurface).frame(width: max(4, geo.size.width * fraction))
      }
    }
    .frame(height: 4)
  }

  @ViewBuilder
  private func wirdColumn(snapshot: TaybahSnapshot, palette: TaybahPalette) -> some View {
    if let wird = snapshot.wird {
      let fraction = wird.target > 0 ? min(1, Double(wird.done) / Double(wird.target)) : 0
      VStack(alignment: .leading, spacing: 4) {
        Text(snapshot.labels.wirdTitle)
          .font(.system(size: 12))
          .foregroundStyle(palette.onBrandSurfaceMuted)
        Text("\(WidgetHelpers.formatNumber(wird.done, locale: snapshot.locale)) \(snapshot.labels.of) \(WidgetHelpers.formatNumber(wird.target, locale: snapshot.locale))")
          .font(.system(size: 17, weight: .bold))
          .foregroundStyle(palette.onBrandSurface)
        Text(snapshot.labels.wirdUnit)
          .font(.system(size: 12))
          .foregroundStyle(palette.onBrandSurfaceMuted)
        GeometryReader { geo in
          ZStack(alignment: .leading) {
            Capsule().fill(palette.onBrandSurface.opacity(0.2))
            Capsule().fill(palette.goldOnBrandSurface).frame(width: geo.size.width * fraction)
          }
        }
        .frame(height: 4)
      }
      .frame(maxHeight: .infinity, alignment: .center)
    }
  }
}

// MARK: - Misbaha

struct MisbahaWidgetView: View {
  let entry: PrayerTimelineEntry
  @Environment(\.colorScheme) private var colorScheme

  var body: some View {
    let palette = WidgetHelpers.widgetPalette(colorMode: entry.snapshot?.colorMode, environment: colorScheme)
    Group {
      if let snapshot = entry.snapshot {
        content(snapshot: snapshot, palette: palette)
          .snapshotLocale(snapshot.locale)
      } else {
        Text("…").foregroundStyle(palette.onBrandSurfaceMuted)
      }
    }
    .widgetURL(WidgetDeepLink.url(path: "/sibha", hostBundleId: WidgetHelpers.hostBundleId()))
    .widgetCardBackground(palette)
  }

  private func content(snapshot: TaybahSnapshot, palette: TaybahPalette) -> some View {
    let target = snapshot.misbaha.target
    let hasTarget = target != nil && (target ?? 0) > 0
    let targetText = hasTarget
      ? "\(snapshot.labels.of) \(WidgetHelpers.formatNumber(target ?? 0, locale: snapshot.locale))"
      : snapshot.labels.misbahaNoTarget
    let percent = WidgetHelpers.misbahaRingPercent(count: snapshot.misbaha.count, target: target)

    return ZStack(alignment: .bottomTrailing) {
      VStack(alignment: .leading, spacing: 0) {
        Text(snapshot.labels.misbaha)
          .font(.system(size: 12, weight: .medium))
          .foregroundStyle(palette.onBrandSurfaceMuted)
        Spacer(minLength: 0)
        ProgressRingView(
          percent: percent,
          size: 96,
          stroke: 6,
          track: palette.onBrandSurface.opacity(0.2),
          fill: palette.gold,
          center: {
            VStack(spacing: 0) {
              Text(WidgetHelpers.formatNumber(snapshot.misbaha.count, locale: snapshot.locale))
                .font(.amiriBold(40))
                .foregroundStyle(palette.onBrandSurface)
              Text(targetText)
                .font(.system(size: 11))
                .foregroundStyle(palette.onBrandSurfaceMuted)
            }
          }
        )
        .frame(maxWidth: .infinity)
        Spacer(minLength: 0)
        VStack(alignment: .leading, spacing: 8) {
          VStack(alignment: .leading, spacing: 4) {
            Text(snapshot.labels.misbaha)
              .font(.system(size: 12, weight: .medium))
              .foregroundStyle(palette.onBrandSurfaceMuted)
            Text(targetText)
              .font(.system(size: 18, weight: .bold))
              .foregroundStyle(palette.onBrandSurface)
          }
          .onBrandSoftCard(palette)
        }
      }
      .padding(WidgetHelpers.cardPadding)

      if #available(iOS 17.0, *) {
        Button(intent: MisbahaIncrementIntent()) {
          Image(systemName: "plus")
            .font(.system(size: 20, weight: .semibold))
            .foregroundStyle(palette.brandSurface)
            .frame(width: 36, height: 36)
            .background(palette.onBrandSurface)
            .clipShape(Circle())
        }
        .buttonStyle(.plain)
        .padding(10)
      }
    }
    .dynamicTypeSize(...DynamicTypeSize.xxxLarge)
  }
}

// MARK: - Azkar

struct AzkarWidgetView: View {
  let entry: PrayerTimelineEntry
  @Environment(\.colorScheme) private var colorScheme

  var body: some View {
    let palette = WidgetHelpers.widgetPalette(colorMode: entry.snapshot?.colorMode, environment: colorScheme)
    Group {
      if let snapshot = entry.snapshot {
        content(snapshot: snapshot, palette: palette)
          .snapshotLocale(snapshot.locale)
      } else {
        Text("…").foregroundStyle(palette.onBrandSurfaceMuted)
      }
    }
    .widgetURL(WidgetDeepLink.url(path: "/azkar", hostBundleId: WidgetHelpers.hostBundleId()))
    .widgetCardBackground(palette)
  }

  @ViewBuilder
  private func content(snapshot: TaybahSnapshot, palette: TaybahPalette) -> some View {
    if snapshot.azkar == nil {
      VStack(alignment: .leading, spacing: 6) {
        Text(snapshot.labels.azkarTitle)
          .font(.system(size: 12, weight: .medium))
          .foregroundStyle(palette.onBrandSurfaceMuted)
        Text(snapshot.labels.azkarEmpty)
          .font(.system(size: 14))
          .foregroundStyle(palette.onBrandSurface)
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
      .padding(WidgetHelpers.cardPadding)
    } else {
      let sessions = snapshot.azkar?.sessions ?? []
      let completeCount = sessions.filter(\.complete).count
      VStack(alignment: .leading, spacing: 0) {
        VStack(alignment: .leading, spacing: 6) {
          Text(snapshot.labels.azkarTitle)
            .font(.system(size: 12, weight: .medium))
            .foregroundStyle(palette.onBrandSurfaceMuted)
          Text("\(WidgetHelpers.formatNumber(completeCount, locale: snapshot.locale)) \(snapshot.labels.of) \(WidgetHelpers.formatNumber(sessions.count, locale: snapshot.locale))")
            .font(.system(size: 13, weight: .semibold))
            .foregroundStyle(palette.onBrandSurface)
            .onBrandSoftChip(palette)
        }
        Spacer(minLength: 0)
        HStack(spacing: 4) {
          ForEach(sessions.prefix(5), id: \.id) { session in
            azkarSessionTile(session: session, snapshot: snapshot, palette: palette)
          }
        }
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
      .padding(WidgetHelpers.cardPadding)
      .dynamicTypeSize(...DynamicTypeSize.xxxLarge)
    }
  }

  private func azkarSessionTile(session: TaybahSnapshot.AzkarSession, snapshot: TaybahSnapshot, palette: TaybahPalette) -> some View {
    let percent = session.total > 0 ? Double(session.done) / Double(session.total) : (session.complete ? 1 : 0)
    return VStack(spacing: 4) {
      ProgressRingView(
        percent: session.complete ? 1 : percent,
        size: 44,
        stroke: 5,
        track: palette.onBrandSurface.opacity(0.2),
        fill: palette.gold,
        center: {
          if session.complete {
            Image(systemName: "checkmark")
              .font(.system(size: 14, weight: .bold))
              .foregroundStyle(palette.gold)
          }
        }
      )
      Text(session.title)
        .font(.system(size: 11, weight: .medium))
        .foregroundStyle(session.complete ? palette.onBrandSurfaceMuted : palette.onBrandSurface)
        .lineLimit(1)
        .minimumScaleFactor(0.7)
    }
    .frame(maxWidth: .infinity)
    .padding(.vertical, 4)
    .background(
      WidgetHelpers.onBrandWash(
        palette,
        opacity: session.complete ? WidgetHelpers.onBrandWashLight : 0.2
      )
    )
    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
  }
}

// MARK: - Lock screen

struct LockScreenInlineView: View {
  let entry: PrayerTimelineEntry

  var body: some View {
    if let snapshot = entry.snapshot, case .next(let key, let at) = WidgetHelpers.prayerState(
      prayer: snapshot.prayer,
      nowMs: entry.date.timeIntervalSince1970 * 1000
    ) {
      Text("\(WidgetHelpers.prayerName(key: key, labels: snapshot.labels)) \(Date(timeIntervalSince1970: at / 1000), style: .time)")
        .snapshotLocale(snapshot.locale)
        .widgetAccentable()
    } else {
      Text("…")
    }
  }
}

struct LockScreenRectangularView: View {
  let entry: PrayerTimelineEntry

  var body: some View {
    if let snapshot = entry.snapshot, case .next(let key, let at) = WidgetHelpers.prayerState(
      prayer: snapshot.prayer,
      nowMs: entry.date.timeIntervalSince1970 * 1000
    ) {
      VStack(alignment: .leading, spacing: 2) {
        Text(snapshot.labels.nextPrayer)
          .font(.system(size: 11))
          .foregroundStyle(.secondary)
        HStack(spacing: 4) {
          Text(WidgetHelpers.prayerName(key: key, labels: snapshot.labels))
          Text("·")
          Text(Date(timeIntervalSince1970: at / 1000), style: .time)
        }
        .font(.system(size: 15, weight: .bold))
        Text(Date(timeIntervalSince1970: at / 1000), style: .timer)
          .font(.system(size: 15, weight: .semibold))
          .monospacedDigit()
          .widgetAccentable()
      }
      .frame(maxWidth: .infinity, alignment: .leading)
      .snapshotLocale(snapshot.locale)
    } else if let snapshot = entry.snapshot {
      Text(snapshot.labels.noLocation)
        .snapshotLocale(snapshot.locale)
    } else {
      Text("…")
    }
  }
}

struct LockScreenProgressCircularView: View {
  let entry: PrayerTimelineEntry

  var body: some View {
    if let snapshot = entry.snapshot {
      ProgressRingView(
        percent: Double(snapshot.progress.percent) / 100,
        size: 60,
        stroke: 6,
        track: Color.primary.opacity(0.22),
        fill: Color.primary,
        center: {
          Text(WidgetHelpers.formatPercent(snapshot.progress.percent, locale: snapshot.locale))
            .font(.system(size: 15, weight: .bold))
        }
      )
      .snapshotLocale(snapshot.locale)
      .widgetAccentable()
    } else {
      Text("…")
    }
  }
}

struct LockScreenPrayerCircularView: View {
  let entry: PrayerTimelineEntry

  var body: some View {
    if let snapshot = entry.snapshot, case .next(let key, let at) = WidgetHelpers.prayerState(
      prayer: snapshot.prayer,
      nowMs: entry.date.timeIntervalSince1970 * 1000
    ) {
      VStack(spacing: 0) {
        Text(WidgetHelpers.prayerName(key: key, labels: snapshot.labels))
          .font(.amiriBold(20))
          .lineLimit(1)
          .minimumScaleFactor(0.7)
        Text(Date(timeIntervalSince1970: at / 1000), style: .time)
          .font(.system(size: 12, weight: .semibold))
      }
      .snapshotLocale(snapshot.locale)
      .widgetAccentable()
    } else {
      Text("…")
    }
  }
}
