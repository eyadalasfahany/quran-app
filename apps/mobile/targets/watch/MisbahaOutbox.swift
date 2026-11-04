import Foundation
import WatchConnectivity

/// Queues misbaha taps on the watch and sends them to the phone with `transferUserInfo` (ADR 0035 §3).
/// Each payload carries a `seq` that is persisted before sending, so a relaunch never reuses one.
final class MisbahaOutbox {
  static let shared = MisbahaOutbox()

  private static let installIdKey = "taybah.watch.installId"
  private static let seqKey = "taybah.watch.seq"
  private static let pendingKey = "taybah.watch.pending"
  private static let tapLogKey = "taybah.watch.tapLog"

  private let defaults = UserDefaults.standard

  private let dayFormatter: DateFormatter = {
    let formatter = DateFormatter()
    formatter.calendar = Calendar.current
    formatter.locale = Locale(identifier: "en_US_POSIX")
    formatter.dateFormat = "yyyy-MM-dd"
    return formatter
  }()

  private init() {
    if defaults.string(forKey: MisbahaOutbox.installIdKey) == nil {
      defaults.set(UUID().uuidString, forKey: MisbahaOutbox.installIdKey)
    }
  }

  private var installId: String {
    defaults.string(forKey: MisbahaOutbox.installIdKey) ?? ""
  }

  private var seq: Int {
    get { defaults.integer(forKey: MisbahaOutbox.seqKey) }
    set { defaults.set(newValue, forKey: MisbahaOutbox.seqKey) }
  }

  private var pending: [[String: Any]] {
    get {
      guard let data = defaults.data(forKey: MisbahaOutbox.pendingKey),
            let array = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] else {
        return []
      }
      return array
    }
    set {
      if newValue.isEmpty {
        defaults.removeObject(forKey: MisbahaOutbox.pendingKey)
      } else if let data = try? JSONSerialization.data(withJSONObject: newValue) {
        defaults.set(data, forKey: MisbahaOutbox.pendingKey)
      }
    }
  }

  /// Today's watch taps as a local log of `{date, at, taps}` (`at` in epoch milliseconds). Entries for other days are dropped.
  private var tapLog: [[String: Any]] {
    get {
      guard let data = defaults.data(forKey: MisbahaOutbox.tapLogKey),
            let array = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] else {
        return []
      }
      return array
    }
    set {
      if newValue.isEmpty {
        defaults.removeObject(forKey: MisbahaOutbox.tapLogKey)
      } else if let data = try? JSONSerialization.data(withJSONObject: newValue) {
        defaults.set(data, forKey: MisbahaOutbox.tapLogKey)
      }
    }
  }

  /// Records taps made on the watch, persists them, then tries to send.
  func record(taps: Int, now: Date = Date()) {
    guard taps > 0 else { return }
    seq += 1
    let day = dayFormatter.string(from: now)
    let payload: [String: Any] = [
      "source": "watch",
      "installId": installId,
      "seq": seq,
      "date": day,
      "taps": taps,
    ]
    var queue = pending
    queue.append(payload)
    pending = queue
    var log = tapLog.filter { ($0["date"] as? String) == day }
    log.append(["date": day, "at": now.timeIntervalSince1970 * 1000, "taps": taps])
    tapLog = log
    flush()
  }

  /// Watch taps recorded on `day` (yyyy-MM-dd) after `ms` (epoch milliseconds). Read-only; drives the Sibha total page.
  func taps(on day: String, after ms: Double) -> Int {
    tapLog.reduce(0) { total, entry in
      guard (entry["date"] as? String) == day,
            let at = entry["at"] as? Double,
            at > ms else {
        return total
      }
      return total + (entry["taps"] as? Int ?? 0)
    }
  }

  /// Sends pending payloads in order once the session is active. Otherwise they stay stored.
  func flush() {
    guard WCSession.default.activationState == .activated else { return }
    let queue = pending
    guard !queue.isEmpty else { return }
    for payload in queue {
      WCSession.default.transferUserInfo(payload)
    }
    pending = []
  }
}
