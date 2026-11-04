import Foundation
import WatchConnectivity
import WidgetKit

/// Receives the phone's snapshot as application context and flushes queued misbaha taps (ADR 0035 §3).
final class WatchSession: NSObject, WCSessionDelegate {
  static let shared = WatchSession()

  private override init() {
    super.init()
  }

  /// Activates the session once at launch. No-op where WatchConnectivity is unsupported.
  func activate() {
    guard WCSession.isSupported() else { return }
    WCSession.default.delegate = self
    WCSession.default.activate()
  }

  func session(
    _ session: WCSession,
    activationDidCompleteWith activationState: WCSessionActivationState,
    error: Error?
  ) {
    DispatchQueue.main.async {
      self.apply(WCSession.default.receivedApplicationContext)
      MisbahaOutbox.shared.flush()
    }
  }

  func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
    DispatchQueue.main.async {
      self.apply(applicationContext)
    }
  }

  private func apply(_ context: [String: Any]) {
    guard let json = context["snapshot"] as? String, SnapshotIO.save(json: json) else { return }
    WatchSnapshotStore.shared.reloadFromContext()
    WidgetCenter.shared.reloadAllTimelines()
  }
}
