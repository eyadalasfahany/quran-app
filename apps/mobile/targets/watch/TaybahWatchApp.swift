import SwiftUI

@main
struct TaybahWatchApp: App {
  @ObservedObject private var store = WatchSnapshotStore.shared
  /// One misbaha counter shared by both Sibha pages, so Reset or a new target on the total page shows on the counter page.
  @State private var counter: SibhaCounter
  @State private var page: Int

  init() {
    WatchSession.shared.activate()
    let initial = SibhaCounter.load(defaultTarget: WatchSnapshotStore.shared.snapshot?.misbaha.target ?? 33)
    initial.save()
    _counter = State(initialValue: initial)
    #if DEBUG
    // Screenshot aid: `simctl launch <watch> <bundle> -watchPage 2` opens on that page.
    _page = State(initialValue: UserDefaults.standard.integer(forKey: "watchPage"))
    #else
    _page = State(initialValue: 0)
    #endif
  }

  var body: some Scene {
    WindowGroup {
      TabView(selection: $page) {
        if let snapshot = store.snapshot {
          NextPrayerPage(snapshot: snapshot).tag(0)
          TodayPrayersPage(snapshot: snapshot).tag(1)
          ProgressPage(snapshot: snapshot).tag(2)
          if let azkar = snapshot.azkar, !azkar.sessions.isEmpty {
            AzkarPage(azkar: azkar, locale: snapshot.locale).tag(3)
          }
        } else {
          NoDataPage().tag(0)
        }
        SibhaCounterPage(counter: $counter, snapshot: store.snapshot).tag(10)
        SibhaTotalPage(counter: $counter, snapshot: store.snapshot).tag(11)
      }
      .tabViewStyle(.page)
      .containerBackground(TaybahTokens.Dark.playerBg, for: .tabView)
      .preferredColorScheme(.dark)
      .watchLocale(store.snapshot?.locale)
      .onChange(of: counter) { _, value in
        value.save()
      }
    }
  }
}
