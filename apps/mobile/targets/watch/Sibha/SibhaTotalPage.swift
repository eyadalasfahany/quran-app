import SwiftUI

/// Today's misbaha total with the target and reset actions (`WatchSibha` frame, panel 2).
/// The total is the phone's figure as of the snapshot plus the watch taps made after it.
struct SibhaTotalPage: View {
  @Binding var counter: SibhaCounter
  let snapshot: TaybahSnapshot?

  @State private var showingPicker = false
  @State private var confirmingReset = false

  private static let dayFormatter: DateFormatter = {
    let formatter = DateFormatter()
    formatter.calendar = Calendar.current
    formatter.locale = Locale(identifier: "en_US_POSIX")
    formatter.dateFormat = "yyyy-MM-dd"
    return formatter
  }()

  var body: some View {
    let locale = snapshot?.locale
    let today = SibhaTotalPage.dayFormatter.string(from: Date())
    let writtenAt = snapshot?.writtenAt ?? 0
    let writtenToday = snapshot.map { SibhaTotalPage.dayFormatter.string(from: Date(timeIntervalSince1970: $0.writtenAt / 1000)) == today } ?? false
    let phoneTotal = writtenToday ? (snapshot?.misbaha.todayTotal ?? 0) : 0
    let pendingTaps = MisbahaOutbox.shared.taps(on: today, after: writtenAt)
    let total = phoneTotal + pendingTaps

    return VStack(spacing: 6) {
      Text(WatchStrings.text("watch_today_total", locale: locale))
        .font(.watchPlex(12))
        .foregroundStyle(TaybahTokens.Dark.playerMuted)
      Text(WatchStrings.number(total, locale: locale))
        .font(.watchPlex(36, .bold))
        .monospacedDigit()
        .foregroundStyle(TaybahTokens.Dark.playerInk)
      if pendingTaps > 0 {
        Text(WatchStrings.text("watch_awaiting_sync", locale: locale))
          .font(.watchPlex(11))
          .foregroundStyle(TaybahTokens.Dark.playerMuted)
          .padding(.bottom, 4)
      }
      Button {
        showingPicker = true
      } label: {
        capsuleLabel(WatchStrings.text("watch_target", locale: locale), color: TaybahTokens.Dark.playerInk)
      }
      .buttonStyle(.plain)
      Button {
        confirmingReset = true
      } label: {
        capsuleLabel(WatchStrings.text("watch_reset", locale: locale), color: TaybahTokens.Dark.danger)
      }
      .buttonStyle(.plain)
    }
    .padding(.horizontal, 12)
    .padding(.top, 30)
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
    .sheet(isPresented: $showingPicker) {
      SibhaTargetPicker(counter: $counter, locale: locale)
        .watchLocale(locale)
    }
    .confirmationDialog(
      WatchStrings.text("watch_reset_confirm", locale: locale),
      isPresented: $confirmingReset,
      titleVisibility: .visible
    ) {
      Button(WatchStrings.text("watch_reset", locale: locale), role: .destructive) {
        counter.reset()
      }
      Button(WatchStrings.text("watch_cancel", locale: locale), role: .cancel) {}
    }
    .accessibilityElement(children: .contain)
  }

  private func capsuleLabel(_ title: String, color: Color) -> some View {
    Text(title)
      .font(.watchPlex(15, .semibold))
      .foregroundStyle(color)
      .frame(maxWidth: .infinity, minHeight: 36)
      .background(Capsule().fill(TaybahTokens.Dark.surfaceRaised))
      .contentShape(Capsule())
  }
}
