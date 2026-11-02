import ExpoModulesCore
import WidgetKit

/// App Group snapshot writer (ADR 0035 §4, prompt 16). JSON lives at UserDefaults key `taybah.snapshot`.
public class AppGroupStoreModule: Module {
  public func definition() -> ModuleDefinition {
    Name("AppGroupStore")

    AsyncFunction("write") { (suiteName: String, json: String) in
      guard let defaults = UserDefaults(suiteName: suiteName) else {
        throw GenericException("App Group unavailable: \(suiteName)")
      }
      defaults.set(json, forKey: "taybah.snapshot")
    }

    AsyncFunction("reloadWidgets") {
      WidgetCenter.shared.reloadAllTimelines()
    }

    Function("isAvailable") { (suiteName: String) -> Bool in
      UserDefaults(suiteName: suiteName) != nil
    }
  }
}
