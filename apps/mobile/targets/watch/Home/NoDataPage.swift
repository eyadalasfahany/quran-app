import SwiftUI

/// Shown before the first sync from the phone (no snapshot yet).
struct NoDataPage: View {
  var body: some View {
    VStack(spacing: 8) {
      Image(systemName: "iphone")
        .font(.system(size: 30))
        .foregroundStyle(TaybahTokens.Dark.brand)
      Text(WatchStrings.text("watch_no_data_title", locale: nil))
        .font(.watchPlex(15, .semibold))
        .foregroundStyle(TaybahTokens.Dark.playerInk)
      Text(WatchStrings.text("watch_no_data_body", locale: nil))
        .font(.watchPlex(13))
        .foregroundStyle(TaybahTokens.Dark.playerMuted)
    }
    .multilineTextAlignment(.center)
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .accessibilityElement(children: .combine)
  }
}
