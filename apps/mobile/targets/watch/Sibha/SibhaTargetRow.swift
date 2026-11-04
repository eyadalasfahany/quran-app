import SwiftUI

/// One row of the target picker: the title, a checkmark in `brand` when selected, and the `highlightActive` background.
struct SibhaTargetRow: View {
  let title: String
  let selected: Bool
  let action: () -> Void

  var body: some View {
    Button(action: action) {
      HStack(spacing: 4) {
        Text(title)
          .font(.watchPlex(17, .semibold))
          .foregroundStyle(TaybahTokens.Dark.playerInk)
        Spacer(minLength: 4)
        if selected {
          Image(systemName: "checkmark")
            .font(.system(size: 13, weight: .semibold))
            .foregroundStyle(TaybahTokens.Dark.brand)
        }
      }
      .padding(.horizontal, 12)
      .frame(maxWidth: .infinity, minHeight: 34)
      .background(
        RoundedRectangle(cornerRadius: 12)
          .fill(selected ? TaybahTokens.Dark.highlightActive : Color.clear)
      )
      .contentShape(RoundedRectangle(cornerRadius: 12))
    }
    .buttonStyle(.plain)
    .accessibilityLabel(title)
    .accessibilityAddTraits(selected ? .isSelected : [])
  }
}
