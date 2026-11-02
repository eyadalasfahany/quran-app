import Combine
import Foundation

final class WatchSnapshotStore: ObservableObject {
  @Published private(set) var snapshot: TaybahSnapshot?

  init() {
    reloadFromContext()
  }

  func reloadFromContext() {
    snapshot = SnapshotIO.load()
  }
}
