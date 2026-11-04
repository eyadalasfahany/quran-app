import AppIntents
import WidgetKit

@available(iOS 17.0, *)
struct MisbahaIncrementIntent: AppIntent {
  static var title: LocalizedStringResource = "Count"

  func perform() async throws -> some IntentResult {
    guard var snapshot = SnapshotIO.load() else { return .result() }
    let patched = misbahaAfterWidgetTap(snapshot.misbaha)
    snapshot = TaybahSnapshot(
      schemaVersion: snapshot.schemaVersion,
      writtenAt: Date().timeIntervalSince1970 * 1000,
      colorMode: snapshot.colorMode,
      locale: snapshot.locale,
      labels: snapshot.labels,
      prayer: snapshot.prayer,
      progress: snapshot.progress,
      reading: snapshot.reading,
      wird: snapshot.wird,
      misbaha: patched,
      azkar: snapshot.azkar
    )
    SnapshotIO.save(snapshot)
    WidgetCenter.shared.reloadAllTimelines()
    return .result()
  }
}
