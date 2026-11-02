import SwiftUI

@main
struct TaybahWatchApp: App {
  @StateObject private var store = WatchSnapshotStore()

  var body: some Scene {
    WindowGroup {
      TabView {
        WatchHomeView(store: store)
        WatchSibhaView(store: store)
      }
    }
  }
}
