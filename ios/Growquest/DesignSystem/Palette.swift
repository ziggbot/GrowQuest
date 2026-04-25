import SwiftUI

/// Color tokens ported from `design/mockup.jsx` (`const C = { ... }`).
/// Keep names in sync with the React mockup so the design source-of-truth stays portable.
enum Palette {
    static let bg          = Color(hex: 0x0D1117)
    static let surface     = Color.white.opacity(0.07)
    static let surfaceHov  = Color.white.opacity(0.11)
    static let border      = Color.white.opacity(0.12)

    static let gold        = Color(hex: 0xF5C842)
    static let goldFade    = Color(hex: 0xF5C842, alpha: 0.15)

    static let green       = Color(hex: 0x3DDC84)
    static let greenFade   = Color(hex: 0x3DDC84, alpha: 0.15)

    static let red         = Color(hex: 0xFF6B6B)
    static let redFade     = Color(hex: 0xFF6B6B, alpha: 0.15)

    static let purple      = Color(hex: 0xA78BFA)
    static let purpleFade  = Color(hex: 0xA78BFA, alpha: 0.15)

    static let blue        = Color(hex: 0x60A5FA)
    static let blueFade    = Color(hex: 0x60A5FA, alpha: 0.15)

    static let text        = Color(hex: 0xF0F0F0)
    static let muted       = Color(hex: 0xF0F0F0, alpha: 0.45)
}

extension Color {
    init(hex: UInt32, alpha: Double = 1.0) {
        let r = Double((hex >> 16) & 0xFF) / 255.0
        let g = Double((hex >> 8) & 0xFF) / 255.0
        let b = Double(hex & 0xFF) / 255.0
        self.init(.sRGB, red: r, green: g, blue: b, opacity: alpha)
    }
}
