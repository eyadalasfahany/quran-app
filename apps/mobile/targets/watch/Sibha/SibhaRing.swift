import SwiftUI

/// The misbaha ring: track in `playerLine`, arc in the given colour, starting at 12 o'clock. The arc runs clockwise in
/// Arabic (RTL) and counter-clockwise in English (LTR), so it follows the layout direction. No animation under Reduce Motion.
struct SibhaRing: View {
  let progress: Double
  let color: Color
  let lineWidth: CGFloat
  let size: CGFloat

  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @Environment(\.layoutDirection) private var layoutDirection

  var body: some View {
    ZStack {
      Circle()
        .stroke(TaybahTokens.Dark.playerLine, lineWidth: lineWidth)
      RingArc(fraction: progress)
        .stroke(color, style: StrokeStyle(lineWidth: lineWidth, lineCap: .round))
        .flipsForRightToLeftLayoutDirection(false)
        .scaleEffect(x: layoutDirection == .leftToRight ? -1 : 1, y: 1)
    }
    .frame(width: size, height: size)
    .animation(reduceMotion ? nil : .easeOut(duration: 0.4), value: progress)
    .accessibilityHidden(true)
  }
}
