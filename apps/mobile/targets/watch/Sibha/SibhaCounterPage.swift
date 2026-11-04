import SwiftUI
import WatchKit

/// The misbaha counter page (`WatchSibha` frame, panel 1). The whole page is the tap target; Double Tap counts too.
struct SibhaCounterPage: View {
  @Binding var counter: SibhaCounter
  let snapshot: TaybahSnapshot?

  var body: some View {
    let locale = snapshot?.locale
    let target = counter.target
    let shownCount = counter.reached ? (target ?? counter.count) : counter.count
    let countText = WatchStrings.number(shownCount, locale: locale)
    let roundText = WatchStrings.number(counter.round, locale: locale)
    let progress = ringProgress(target: target)
    let ringColor = counter.reached ? TaybahTokens.Dark.playerAccent : TaybahTokens.Dark.brand
    let caption = captionText(target: target, roundText: roundText, locale: locale)
    let captionColor = counter.reached ? TaybahTokens.Dark.playerAccent : TaybahTokens.Dark.playerMuted
    let separator = locale == "en" ? ", " : "، "
    let ofText = target.map { String(format: WatchStrings.text("watch_of", locale: locale), WatchStrings.number($0, locale: locale)) }
    let spoken = [[countText, ofText].compactMap { $0 }.joined(separator: " "), caption].joined(separator: separator)

    return Button(action: tap) {
      VStack(spacing: 0) {
        ZStack {
          SibhaRing(progress: progress, color: ringColor, lineWidth: 10, size: 132)
          VStack(spacing: 0) {
            Text(countText)
              .font(.watchPlex(52, .bold))
              .monospacedDigit()
              .foregroundStyle(TaybahTokens.Dark.playerInk)
            if let ofText {
              Text(ofText)
                .font(.watchPlex(12))
                .foregroundStyle(TaybahTokens.Dark.playerMuted)
            }
          }
        }
        .padding(.top, 24)
        Spacer(minLength: 4)
        Text(caption)
          .font(.watchPlex(12, .semibold))
          .foregroundStyle(captionColor)
          .multilineTextAlignment(.center)
          .padding(.bottom, 12)
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity)
      .contentShape(Rectangle())
    }
    .buttonStyle(.plain)
    .modifier(PrimaryActionShortcut())
    .accessibilityLabel(spoken)
    .accessibilityHint(WatchStrings.text("watch_count_hint", locale: locale))
    .accessibilityAddTraits(.isButton)
  }

  private func tap() {
    let result = counter.tap()
    WKInterfaceDevice.current().play(.click)
    if result == .reachedTarget {
      WKInterfaceDevice.current().play(.success)
    }
    MisbahaOutbox.shared.record(taps: 1)
  }

  private func ringProgress(target: Int?) -> Double {
    if counter.reached {
      return 1
    }
    guard let target, target > 0 else {
      return 0
    }
    return min(1, Double(counter.count) / Double(target))
  }

  private func captionText(target: Int?, roundText: String, locale: String?) -> String {
    if counter.reached {
      return String(format: WatchStrings.text("watch_target_reached", locale: locale), roundText)
    }
    if target == nil {
      return snapshot?.labels.misbahaNoTarget ?? WatchStrings.text("watch_no_target", locale: locale)
    }
    return String(format: WatchStrings.text("watch_round", locale: locale), roundText)
  }
}

/// Double Tap triggers the page's primary action on watchOS 11 and later; on older systems the modifier does nothing.
private struct PrimaryActionShortcut: ViewModifier {
  @ViewBuilder
  func body(content: Content) -> some View {
    if #available(watchOS 11, *) {
      content.handGestureShortcut(.primaryAction)
    } else {
      content
    }
  }
}
