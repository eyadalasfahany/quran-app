import SwiftUI

/// Watch type (ADR 0035 §3). The faces are bundled in `Fonts/` and listed in `Info.plist` (UIAppFonts).
/// Names are the PostScript names read from the font files. Each face is tied to a text style, so Dynamic Type still scales it.
extension Font {
  /// The prayer name face (Amiri Bold).
  static func watchAmiri(_ size: CGFloat) -> Font {
    .custom("Amiri-Bold", size: size, relativeTo: watchTextStyle(for: size))
  }

  /// Everything else (IBM Plex Sans Arabic). Medium maps to Regular: only Regular, SemiBold and Bold ship on the watch.
  static func watchPlex(_ size: CGFloat, _ weight: Font.Weight = .regular) -> Font {
    .custom(watchPlexFace(for: weight), size: size, relativeTo: watchTextStyle(for: size))
  }

  private static func watchPlexFace(for weight: Font.Weight) -> String {
    switch weight {
    case .semibold:
      return "IBMPlexSansArabic-SmBld"
    case .bold, .heavy, .black:
      return "IBMPlexSansArabic-Bold"
    default:
      return "IBMPlexSansArabic"
    }
  }

  private static func watchTextStyle(for size: CGFloat) -> Font.TextStyle {
    switch size {
    case 28...:
      return .largeTitle
    case 20..<28:
      return .title2
    case 16..<20:
      return .body
    case 13..<16:
      return .footnote
    default:
      return .caption2
    }
  }
}
