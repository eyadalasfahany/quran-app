import SwiftUI

/// Clockwise arc starting at 12 o'clock.
///
/// Drawn from an explicit path rather than `Circle().trim` + `rotationEffect(-90)`:
/// under a right-to-left layout direction SwiftUI mirrors the rotation, which moved
/// the start to 6 o'clock. This path renders the same in LTR and RTL.
struct RingArc: Shape {
  var fraction: Double

  var animatableData: Double {
    get { fraction }
    set { fraction = newValue }
  }

  func path(in rect: CGRect) -> Path {
    var path = Path()
    let clamped = min(1, max(0, fraction))
    let radius = min(rect.width, rect.height) / 2
    let center = CGPoint(x: rect.midX, y: rect.midY)
    guard clamped > 0 else { return path }
    if clamped >= 1 {
      path.addEllipse(in: CGRect(x: center.x - radius, y: center.y - radius, width: radius * 2, height: radius * 2))
      return path
    }
    path.addArc(
      center: center,
      radius: radius,
      startAngle: .degrees(-90),
      endAngle: .degrees(-90 + 360 * clamped),
      clockwise: false
    )
    return path
  }
}
