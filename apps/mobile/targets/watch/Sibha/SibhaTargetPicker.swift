import SwiftUI

/// The target sheet: the presets 33, 99 and 100, or «مخصص» with the crown (1…1000). Choosing a target keeps the
/// count and starts the rounds again at 1 (TS `withTarget`).
struct SibhaTargetPicker: View {
  @Binding var counter: SibhaCounter
  let locale: String?

  @Environment(\.dismiss) private var dismiss
  @State private var customMode = false
  @State private var customValue: Double

  init(counter: Binding<SibhaCounter>, locale: String?) {
    _counter = counter
    self.locale = locale
    _customValue = State(initialValue: Double(counter.wrappedValue.target ?? 33))
  }

  var body: some View {
    let isCustomTarget = counter.target.map { !SibhaCounter.presets.contains($0) } ?? false

    return VStack(alignment: .leading, spacing: 2) {
      Text(WatchStrings.text("watch_target", locale: locale))
        .font(.watchPlex(12))
        .foregroundStyle(TaybahTokens.Dark.playerMuted)
        .padding(.horizontal, 12)
      if customMode {
        customPanel
      } else {
        ForEach(SibhaCounter.presets, id: \.self) { preset in
          SibhaTargetRow(
            title: WatchStrings.number(preset, locale: locale),
            selected: counter.target == preset
          ) {
            counter.setTarget(preset)
            dismiss()
          }
        }
        SibhaTargetRow(
          title: WatchStrings.text("watch_custom", locale: locale),
          selected: isCustomTarget
        ) {
          customValue = Double(counter.target ?? 33)
          customMode = true
        }
      }
    }
    .padding(.horizontal, 10)
    .padding(.top, 30)
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
  }

  private var customPanel: some View {
    let chosen = Int(customValue.rounded())
    return VStack(spacing: 8) {
      Text(WatchStrings.number(chosen, locale: locale))
        .font(.watchPlex(36, .bold))
        .monospacedDigit()
        .foregroundStyle(TaybahTokens.Dark.playerInk)
        .frame(maxWidth: .infinity)
        .focusable()
        .digitalCrownRotation(
          $customValue,
          from: Double(SibhaCounter.customRange.lowerBound),
          through: Double(SibhaCounter.customRange.upperBound),
          by: 1,
          sensitivity: .medium,
          isContinuous: false,
          isHapticFeedbackEnabled: true
        )
      Button {
        counter.setTarget(chosen)
        dismiss()
      } label: {
        Text(WatchStrings.text("watch_confirm", locale: locale))
          .font(.watchPlex(15, .semibold))
          .foregroundStyle(TaybahTokens.Dark.onBrand)
          .frame(maxWidth: .infinity, minHeight: 36)
          .background(Capsule().fill(TaybahTokens.Dark.brand))
          .contentShape(Capsule())
      }
      .buttonStyle(.plain)
    }
    .padding(.top, 12)
  }
}
