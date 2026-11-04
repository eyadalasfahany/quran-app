import Foundation

/// The watch's own misbaha (ADR 0035 §3). Count, round and target live in `UserDefaults.standard` and never reach the phone
/// except as tap totals through `MisbahaOutbox`.
///
/// The arithmetic mirrors `apps/mobile/src/features/sibha/data/model.ts`: a tap that reaches the target stores count 0
/// and adds one round (TS `rounds`); the watch's `round` is TS `rounds + 1`. `reached` only holds the frame's reached
/// state until the next tap and is not saved. A target of `nil` (stored as 0) means no target.
struct SibhaCounter: Equatable {
  enum TapResult: Equatable {
    case counted
    case reachedTarget
  }

  static let countKey = "taybah.watch.sibha.count"
  static let roundKey = "taybah.watch.sibha.round"
  static let targetKey = "taybah.watch.sibha.target"

  /// The chips the picker offers (TS `SIBHA_TARGET_PRESETS`).
  static let presets = [33, 99, 100]
  /// The range the crown picks from. The phone allows up to 9999; the watch stops at 1000.
  static let customRange = 1...1000

  private(set) var count: Int
  private(set) var round: Int
  private(set) var target: Int?
  private(set) var reached: Bool

  init(count: Int = 0, round: Int = 1, target: Int?) {
    self.count = max(0, count)
    self.round = max(1, round)
    self.target = target
    self.reached = false
  }

  /// One tap (TS `countTap`). The test is `>=`, so a lowered target still completes on the next tap.
  mutating func tap() -> TapResult {
    reached = false
    let next = count + 1
    if let target, next >= target {
      count = 0
      round += 1
      reached = true
      return .reachedTarget
    }
    count = next
    return .counted
  }

  /// Sets the target (TS `withTarget`): the rounds start again at 1 and the count is kept.
  mutating func setTarget(_ value: Int?) {
    target = value
    round = 1
    reached = false
  }

  /// Reset: count 0 and round 1. The target stays (TS `resetCount`).
  mutating func reset() {
    count = 0
    round = 1
    reached = false
  }

  /// The saved counter, or a first-run counter with `defaultTarget` (0 means no target).
  static func load(defaults: UserDefaults = .standard, defaultTarget: Int) -> SibhaCounter {
    guard defaults.object(forKey: targetKey) != nil else {
      return SibhaCounter(target: defaultTarget > 0 ? defaultTarget : nil)
    }
    let savedTarget = defaults.integer(forKey: targetKey)
    return SibhaCounter(
      count: defaults.integer(forKey: countKey),
      round: defaults.integer(forKey: roundKey),
      target: savedTarget > 0 ? savedTarget : nil
    )
  }

  func save(defaults: UserDefaults = .standard) {
    defaults.set(count, forKey: SibhaCounter.countKey)
    defaults.set(round, forKey: SibhaCounter.roundKey)
    defaults.set(target ?? 0, forKey: SibhaCounter.targetKey)
  }
}
