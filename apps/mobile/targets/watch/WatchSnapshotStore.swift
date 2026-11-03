import Combine
import Foundation
import WatchConnectivity
import WidgetKit

/// Receives the snapshot from the iPhone (ADR 0035 §3, ADR 0058) and stores it in the watch's own App Group for the complications.
final class WatchSnapshotStore: NSObject, ObservableObject, WCSessionDelegate {
  @Published private(set) var snapshot: TaybahSnapshot?

  override init() {
    super.init()
    snapshot = SnapshotIO.load()
    guard WCSession.isSupported() else { return }
    WCSession.default.delegate = self
    WCSession.default.activate()
  }

  func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
    apply(session.receivedApplicationContext)
  }

  func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
    apply(applicationContext)
  }

  private func apply(_ context: [String: Any]) {
    guard let json = context["snapshot"] as? String, let decoded = SnapshotIO.decode(json) else { return }
    SnapshotIO.save(json: json)
    WidgetCenter.shared.reloadAllTimelines()
    DispatchQueue.main.async { [weak self] in
      self?.snapshot = decoded
    }
  }
}
