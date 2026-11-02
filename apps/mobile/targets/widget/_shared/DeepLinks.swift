import Foundation

enum WidgetDeepLink {
  static func scheme(forHostBundleId host: String) -> String {
    host.hasSuffix(".dev") ? "taybah-dev" : "taybah"
  }

  static func url(path: String, hostBundleId: String) -> URL? {
    let trimmed = path.hasPrefix("/") ? String(path.dropFirst()) : path
    return URL(string: "\(scheme(forHostBundleId: hostBundleId))://\(trimmed)")
  }
}
