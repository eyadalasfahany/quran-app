import Foundation

/// Widget snapshot schema v1 — mirrors `src/features/widgets/snapshot/types.ts` (ADR 0035 §4).
struct TaybahSnapshot: Codable {
  let schemaVersion: Int
  let writtenAt: Double
  let locale: String
  let labels: Labels
  let prayer: Prayer
  let progress: Progress
  let reading: Reading?
  let wird: Wird?
  let misbaha: Misbaha
  let azkar: Azkar?

  struct Labels: Codable {
    let nextPrayer: String
    let noLocation: String
    let openApp: String
    let stale: String
    let progressTitle: String
    let progressEmpty: String
    let continueReading: String
    let resume: String
    let ayahLabel: String
    let pageLabel: String
    let wirdTitle: String
    let wirdUnit: String
    let of: String
    let misbaha: String
    let misbahaNoTarget: String
    let countAction: String
    let azkarTitle: String
    let azkarEmpty: String
    let complete: String
    let prayerFajr: String
    let prayerDhuhr: String
    let prayerAsr: String
    let prayerMaghrib: String
    let prayerIsha: String
  }

  struct PrayerEntry: Codable {
    let key: String
    let at: Double
  }

  struct Prayer: Codable {
    let place: String?
    let entries: [PrayerEntry]
    let validUntil: Double?
  }

  struct ProgressRow: Codable {
    let key: String
    let label: String
    let value: String
    let done: Bool
  }

  struct Progress: Codable {
    let percent: Int
    let rows: [ProgressRow]
  }

  struct Reading: Codable {
    let verseKey: String
    let surah: String
    let ayah: Int
    let page: Int
  }

  struct Wird: Codable {
    let done: Int
    let target: Int
  }

  struct Misbaha: Codable {
    let count: Int
    let target: Int?
    let todayTotal: Int
    let widgetTapsTotal: Int?
  }

  struct AzkarSession: Codable {
    let id: String
    let title: String
    let done: Int
    let total: Int
    let complete: Bool
  }

  struct Azkar: Codable {
    let sessions: [AzkarSession]
  }
}

enum SnapshotIO {
  static let userDefaultsKey = "taybah.snapshot"

  static func appGroupSuite() -> String? {
    guard let bundleId = Bundle.main.bundleIdentifier else { return nil }
    let host = bundleId.split(separator: ".").dropLast().joined(separator: ".")
    guard !host.isEmpty else { return nil }
    return "group.\(host)"
  }

  static func load() -> TaybahSnapshot? {
    guard let suite = appGroupSuite(), let defaults = UserDefaults(suiteName: suite) else { return nil }
    guard let json = defaults.string(forKey: SnapshotIO.userDefaultsKey) else { return nil }
    guard let data = json.data(using: .utf8) else { return nil }
    let decoder = JSONDecoder()
    guard let snapshot = try? decoder.decode(TaybahSnapshot.self, from: data), snapshot.schemaVersion == 1 else {
      return nil
    }
    return snapshot
  }

  static func save(_ snapshot: TaybahSnapshot) {
    guard let suite = appGroupSuite(), let defaults = UserDefaults(suiteName: suite) else { return }
    let encoder = JSONEncoder()
    guard let data = try? encoder.encode(snapshot), let json = String(data: data, encoding: .utf8) else { return }
    defaults.set(json, forKey: SnapshotIO.userDefaultsKey)
  }
}

/// One widget «+» tap — mirrors `src/features/widgets/ios/patch-misbaha-tap.ts`.
func misbahaAfterWidgetTap(_ misbaha: TaybahSnapshot.Misbaha) -> TaybahSnapshot.Misbaha {
  let count = misbaha.count + 1
  let widgetTapsTotal = (misbaha.widgetTapsTotal ?? 0) + 1
  let todayTotal = misbaha.todayTotal + 1
  if let target = misbaha.target, count >= target {
    return TaybahSnapshot.Misbaha(count: 0, target: target, todayTotal: todayTotal, widgetTapsTotal: widgetTapsTotal)
  }
  return TaybahSnapshot.Misbaha(count: count, target: misbaha.target, todayTotal: todayTotal, widgetTapsTotal: widgetTapsTotal)
}
