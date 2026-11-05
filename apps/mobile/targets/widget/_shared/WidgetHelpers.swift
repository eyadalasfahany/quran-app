import SwiftUI
import WidgetKit

typealias TaybahPalette = (
  surface: Color,
  surfaceRaised: Color,
  ink: Color,
  inkMuted: Color,
  line: Color,
  fillSecondary: Color,
  brand: Color,
  onBrand: Color,
  brandSurface: Color,
  onBrandSurface: Color,
  onBrandSurfaceMuted: Color,
  goldOnBrandSurface: Color,
  gold: Color,
  highlightActive: Color
)

enum WidgetHelpers {
  static let cornerRadius: CGFloat = 22
  static let cardPadding: CGFloat = 14

  static func hostBundleId() -> String {
    guard let bundleId = Bundle.main.bundleIdentifier else { return "com.taybahapp.taybah" }
    return bundleId.split(separator: ".").dropLast().joined(separator: ".")
  }

  static func layoutDirection(_ locale: String) -> LayoutDirection {
    locale == "ar" ? .rightToLeft : .leftToRight
  }

  static func formatNumber(_ value: Int, locale: String) -> String {
    let formatter = NumberFormatter()
    formatter.locale = Locale(identifier: locale)
    formatter.numberStyle = .decimal
    return formatter.string(from: NSNumber(value: value)) ?? "\(value)"
  }

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

  enum PrayerState: Equatable {
    case noLocation
    case stale
    case next(key: String, at: Double)
  }

  static func prayerState(prayer: TaybahSnapshot.Prayer, nowMs: Double) -> PrayerState {
    if prayer.entries.isEmpty { return .noLocation }
    guard let next = prayer.entries.first(where: { $0.at > nowMs }) else { return .stale }
    return .next(key: next.key, at: next.at)
  }

  static let prayerDotKeys = ["fajr", "dhuhr", "asr", "maghrib", "isha"]

  static func prayerDotState(key: String, nextKey: String, entryAt: Double?, nowMs: Double) -> String {
    if key == nextKey { return "next" }
    if let entryAt, entryAt < nowMs { return "past" }
    return "future"
  }

  static func todaysPrayerEntries(_ entries: [TaybahSnapshot.PrayerEntry], now: Date) -> [TaybahSnapshot.PrayerEntry] {
    let today = Calendar.current.startOfDay(for: now)
    guard let tomorrow = Calendar.current.date(byAdding: .day, value: 1, to: today) else { return entries }
    return entries.filter { entry in
      let date = Date(timeIntervalSince1970: entry.at / 1000)
      return date >= today && date < tomorrow
    }
  }

  static func progressGoalsSummary(rows: [TaybahSnapshot.ProgressRow], locale: String, ofLabel: String) -> String {
    let total = rows.count
    let done = rows.filter(\.done).count
    return "\(formatNumber(done, locale: locale)) \(ofLabel) \(formatNumber(total, locale: locale))"
  }

  static func misbahaRingPercent(count: Int, target: Int?) -> Double {
    guard let target, target > 0 else { return 0 }
    return min(1, max(0, Double(count) / Double(target)))
  }

  /// Taybah card palette from snapshot `colorMode`, else the system widget environment (ADR 0054).
  static func widgetPalette(colorMode: String?, environment: ColorScheme) -> TaybahPalette {
    if colorMode == "dark" {
      return TaybahTokens.palette(for: .dark)
    }
    if colorMode == "light" {
      return TaybahTokens.palette(for: .light)
    }
    return TaybahTokens.palette(for: environment)
  }

  /// Frosted wash for chips and foot bands on brandSurface (ADR 0035; clear card vs green face).
  static func onBrandWash(_ palette: TaybahPalette, opacity: Double = 0.2) -> Color {
    palette.onBrandSurface.opacity(opacity)
  }

  static let onBrandWashLight: Double = 0.1
  static let softBandCornerRadius: CGFloat = 16
}

struct SnapshotLocaleModifier: ViewModifier {
  let locale: String

  func body(content: Content) -> some View {
    content
      .environment(\.layoutDirection, WidgetHelpers.layoutDirection(locale))
      .environment(\.locale, Locale(identifier: locale))
  }
}

extension View {
  func snapshotLocale(_ locale: String) -> some View {
    modifier(SnapshotLocaleModifier(locale: locale))
  }

  @ViewBuilder
  func widgetCardBackground(_ palette: TaybahPalette, raised: Bool = false) -> some View {
    if #available(iOS 17.0, *) {
      containerBackground(for: .widget) {
        RoundedRectangle(cornerRadius: WidgetHelpers.cornerRadius, style: .continuous)
          .fill(raised ? palette.surface : palette.brandSurface)
          .overlay {
            if raised {
              RoundedRectangle(cornerRadius: WidgetHelpers.cornerRadius, style: .continuous)
                .strokeBorder(palette.line, lineWidth: 1)
            }
          }
      }
    } else {
      background(raised ? palette.surface : palette.brandSurface)
    }
  }

  @ViewBuilder
  func lockScreenBackground() -> some View {
    if #available(iOS 17.0, *) {
      containerBackground(for: .widget) {
        AccessoryWidgetBackground()
      }
    } else {
      self
    }
  }

  /// Frosted inner card on brandSurface (foot bands, chips). Matches Android `onBrandSoftBand`.
  func onBrandSoftCard(_ palette: TaybahPalette, opacity: Double = 0.2, horizontal: CGFloat = 14, vertical: CGFloat = 12) -> some View {
    padding(.horizontal, horizontal)
      .padding(.vertical, vertical)
      .frame(maxWidth: .infinity, alignment: .leading)
      .background(WidgetHelpers.onBrandWash(palette, opacity: opacity))
      .overlay {
        RoundedRectangle(cornerRadius: WidgetHelpers.softBandCornerRadius, style: .continuous)
          .strokeBorder(palette.onBrandSurface.opacity(0.12), lineWidth: 1)
      }
      .clipShape(RoundedRectangle(cornerRadius: WidgetHelpers.softBandCornerRadius, style: .continuous))
  }

  /// Compact frosted chip (time, place).
  func onBrandSoftChip(_ palette: TaybahPalette) -> some View {
    padding(.horizontal, 10)
      .padding(.vertical, 4)
      .background(WidgetHelpers.onBrandWash(palette))
      .overlay {
        Capsule().strokeBorder(palette.onBrandSurface.opacity(0.12), lineWidth: 1)
      }
      .clipShape(Capsule())
  }
}

struct ProgressRingView: View {
  let percent: Double
  let size: CGFloat
  let stroke: CGFloat
  let track: Color
  let fill: Color
  let center: AnyView

  init(
    percent: Double,
    size: CGFloat,
    stroke: CGFloat,
    track: Color,
    fill: Color,
    @ViewBuilder center: () -> some View
  ) {
    self.percent = min(1, max(0, percent))
    self.size = size
    self.stroke = stroke
    self.track = track
    self.fill = fill
    self.center = AnyView(center())
  }

  var body: some View {
    ZStack {
      Circle()
        .stroke(track, lineWidth: stroke)
      Circle()
        .trim(from: 0, to: CGFloat(percent))
        .stroke(fill, style: StrokeStyle(lineWidth: stroke, lineCap: .round))
        .rotationEffect(.degrees(-90))
      center
    }
    .frame(width: size, height: size)
  }
}

struct GoalCheckmark: View {
  let done: Bool
  let palette: TaybahPalette

  var body: some View {
    ZStack {
      Circle()
        .fill(done ? palette.gold : WidgetHelpers.onBrandWash(palette, opacity: WidgetHelpers.onBrandWashLight))
        .overlay {
          if !done {
            Circle().strokeBorder(palette.onBrandSurface.opacity(0.2), lineWidth: 1)
          }
        }
      if done {
        Image(systemName: "checkmark")
          .font(.system(size: 10, weight: .bold))
          .foregroundStyle(palette.brandSurface)
      }
    }
    .frame(width: 18, height: 18)
  }
}

extension Font {
  static func amiriBold(_ size: CGFloat) -> Font {
    .custom("Amiri-Bold", size: size)
  }
}
