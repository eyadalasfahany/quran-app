import Combine
import Foundation

final class WatchSnapshotStore: ObservableObject {
  static let shared = WatchSnapshotStore()

  @Published private(set) var snapshot: TaybahSnapshot?

  init() {
    reloadFromContext()
  }

  func reloadFromContext() {
    snapshot = SnapshotIO.load()
  }
}
