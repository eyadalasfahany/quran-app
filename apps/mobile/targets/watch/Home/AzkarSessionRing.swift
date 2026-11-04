import SwiftUI

/// One Azkar session: a 44 pt ring and its title. A complete session is a full ring with a check mark.
struct AzkarSessionRing: View {
  let session: TaybahSnapshot.AzkarSession

  var body: some View {
    VStack(spacing: 4) {
      ZStack {
        WatchRing(progress: progress, lineWidth: 6, size: AzkarSessionRing.ringSize)
        if session.complete {
          Image(systemName: "checkmark")
            .font(.system(size: 16, weight: .semibold))
            .foregroundStyle(TaybahTokens.Dark.brand)
        }
      }
      Text(session.title)
        .font(.watchPlex(11))
        .foregroundStyle(TaybahTokens.Dark.playerInk)
        .multilineTextAlignment(.center)
        .lineLimit(2)
        .minimumScaleFactor(0.75)
        .frame(height: AzkarSessionRing.titleHeight, alignment: .top)
    }
    .frame(width: AzkarSessionRing.columnWidth)
  }

  static let ringSize: CGFloat = 44
  /// Two lines of 11 pt text. Every title box is this tall, so all rings sit on one row.
  static let titleHeight: CGFloat = 30
  /// Titles need more width than the ring; three columns plus two 8 pt gaps fit a 41 mm (176 pt) screen.
  static let columnWidth: CGFloat = 52

  private var progress: Double {
    if session.complete { return 1 }
    guard session.total > 0 else { return 0 }
    return Double(session.done) / Double(session.total)
  }
}
