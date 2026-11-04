import SwiftUI

/// One prayer line on the today page. The next prayer gets the `highlightActive` capsule and bold ink.
struct PrayerRow: View {
  let name: String
  let time: Date
  let locale: String?
  let isNext: Bool

  var body: some View {
    HStack {
      Text(name)
      Spacer(minLength: 4)
      Text(time, style: .time)
        .foregroundStyle(isNext ? TaybahTokens.Dark.playerInk : TaybahTokens.Dark.playerMuted)
    }
    .font(.watchPlex(15, isNext ? .bold : .regular))
    .foregroundStyle(TaybahTokens.Dark.playerInk)
    .monospacedDigit()
    .padding(.horizontal, 10)
    .frame(minHeight: 28)
    .background {
      if isNext {
        RoundedRectangle(cornerRadius: 10, style: .continuous)
          .fill(TaybahTokens.Dark.highlightActive)
      }
    }
  }
}
