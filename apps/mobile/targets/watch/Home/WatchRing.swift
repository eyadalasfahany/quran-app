import SwiftUI

/// A progress ring: track in `playerLine`, arc in `brand`, starting at 12 o'clock and running clockwise.
/// `size` is the outer diameter including the stroke: the stroke is drawn inside the frame, not over its edge.
struct WatchRing: View {
  let progress: Double
  let lineWidth: CGFloat
  let size: CGFloat

  @Environment(\.accessibilityReduceMotion) private var reduceMotion

  var body: some View {
    ZStack {
      Circle()
        .stroke(TaybahTokens.Dark.playerLine, lineWidth: lineWidth)
      RingArc(fraction: progress)
        .stroke(TaybahTokens.Dark.brand, style: StrokeStyle(lineWidth: lineWidth, lineCap: .round))
        .flipsForRightToLeftLayoutDirection(false)
    }
    .padding(lineWidth / 2)
    .frame(width: size, height: size)
    .animation(reduceMotion ? nil : .easeOut(duration: 0.4), value: progress)
    .accessibilityHidden(true)
  }
}
