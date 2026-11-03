import SwiftUI

struct WatchHomeView: View {
  @ObservedObject var store: WatchSnapshotStore

  var body: some View {
    ScrollView {
      if let snapshot = store.snapshot {
        VStack(alignment: .leading, spacing: 8) {
          Text(snapshot.labels.nextPrayer).font(.caption2)
          if let next = snapshot.prayer.entries.first(where: { $0.at > Date().timeIntervalSince1970 * 1000 }) {
            Text(prayerName(key: next.key, labels: snapshot.labels)).font(.headline)
            Text(Date(timeIntervalSince1970: next.at / 1000), style: .time)
            Text(Date(timeIntervalSince1970: next.at / 1000), style: .timer).font(.caption2)
          } else if snapshot.prayer.entries.isEmpty {
            Text(snapshot.labels.noLocation)
          } else {
            Text(snapshot.labels.stale)
          }
          Text("\(snapshot.progress.percent)%").font(.title3.bold())
        }
        .environment(\.layoutDirection, snapshot.locale == "ar" ? .rightToLeft : .leftToRight)
      } else {
        Text("watch_open_iphone").multilineTextAlignment(.center)
      }
    }
  }
}

private func prayerName(key: String, labels: TaybahSnapshot.Labels) -> String {
  switch key {
  case "fajr": return labels.prayerFajr
  case "dhuhr": return labels.prayerDhuhr
  case "asr": return labels.prayerAsr
  case "maghrib": return labels.prayerMaghrib
  case "isha": return labels.prayerIsha
  default: return key
  }
}
