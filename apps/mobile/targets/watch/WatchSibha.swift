import SwiftUI
import WatchConnectivity
import WatchKit

struct WatchSibhaView: View {
  @ObservedObject var store: WatchSnapshotStore
  @State private var count = 0
  @State private var target: Int? = 33
  @State private var seq = UserDefaults.standard.integer(forKey: "taybah.watch.seq")

  var body: some View {
    VStack(spacing: 12) {
      Text("\(count)").font(.largeTitle.bold())
      if let target {
        Text("/ \(target)").font(.caption)
      }
      Button(action: tap) {
        Text(store.snapshot?.labels.countAction ?? "+")
      }
    }
    .onTapGesture(perform: tap)
    .onAppear {
      count = store.snapshot?.misbaha.count ?? 0
      target = store.snapshot?.misbaha.target
    }
    .onChange(of: store.snapshot?.misbaha.count) { _, newCount in
      if let newCount { count = newCount }
    }
    .onChange(of: store.snapshot?.misbaha.target) { _, newTarget in
      target = newTarget
    }
  }

  private func tap() {
    count += 1
    WKInterfaceDevice.current().play(.click)
    if let target, count >= target {
      WKInterfaceDevice.current().play(.success)
      count = 0
    }
    sendDelta(taps: 1)
  }

  private func sendDelta(taps: Int) {
    guard WCSession.isSupported(), WCSession.default.activationState == .activated else { return }
    seq += 1
    UserDefaults.standard.set(seq, forKey: "taybah.watch.seq")
    let payload: [String: Any] = [
      "source": "watch",
      "installId": WKInterfaceDevice.current().identifierForVendor?.uuidString ?? "watch",
      "seq": seq,
      "date": localDay(),
      "taps": taps,
    ]
    WCSession.default.transferUserInfo(payload)
  }

  private func localDay() -> String {
    let formatter = DateFormatter()
    formatter.calendar = Calendar.current
    formatter.dateFormat = "yyyy-MM-dd"
    return formatter.string(from: Date())
  }
}
