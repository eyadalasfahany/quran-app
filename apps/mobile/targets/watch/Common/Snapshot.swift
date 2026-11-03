// Shared with `targets/widget/_shared/Snapshot.swift` — keep in sync (ADR 0035 §4).
import Foundation

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

  struct PrayerEntry: Codable { let key: String; let at: Double }
  struct Prayer: Codable { let place: String?; let entries: [PrayerEntry]; let validUntil: Double? }
  struct ProgressRow: Codable { let key: String; let label: String; let value: String; let done: Bool }
  struct Progress: Codable { let percent: Int; let rows: [ProgressRow] }
  struct Reading: Codable { let verseKey: String; let surah: String; let ayah: Int; let page: Int }
  struct Wird: Codable { let done: Int; let target: Int }
  struct Misbaha: Codable { let count: Int; let target: Int?; let todayTotal: Int; let widgetTapsTotal: Int? }
  struct AzkarSession: Codable { let id: String; let title: String; let done: Int; let total: Int; let complete: Bool }
  struct Azkar: Codable { let sessions: [AzkarSession] }
}

enum SnapshotIO {
  static let userDefaultsKey = "taybah.snapshot"

  /// The watch app's id is `<host>.watchkitapp`; the group is `group.<host>`.
  static func appGroupSuite() -> String? {
    guard let bundleId = Bundle.main.bundleIdentifier else { return nil }
    guard let range = bundleId.range(of: ".watchkitapp") else { return "group.\(bundleId)" }
    return "group.\(bundleId[..<range.lowerBound])"
  }

  static func decode(_ json: String) -> TaybahSnapshot? {
    guard let data = json.data(using: .utf8) else { return nil }
    guard let snapshot = try? JSONDecoder().decode(TaybahSnapshot.self, from: data), snapshot.schemaVersion == 1 else {
      return nil
    }
    return snapshot
  }

  static func load() -> TaybahSnapshot? {
    guard let suite = appGroupSuite(), let defaults = UserDefaults(suiteName: suite) else { return nil }
    guard let json = defaults.string(forKey: userDefaultsKey) else { return nil }
    return decode(json)
  }

  static func save(json: String) {
    guard let suite = appGroupSuite(), let defaults = UserDefaults(suiteName: suite) else { return }
    defaults.set(json, forKey: userDefaultsKey)
  }
}
