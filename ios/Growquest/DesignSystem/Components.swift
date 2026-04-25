import SwiftUI

/// Card container ("Kort" in the mockup). Translucent surface with soft border.
struct Kort<Content: View>: View {
    let content: () -> Content

    init(@ViewBuilder content: @escaping () -> Content) {
        self.content = content
    }

    var body: some View {
        content()
            .padding(16)
            .background(Palette.surface)
            .overlay(
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .stroke(Palette.border, lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
    }
}

/// Primary CTA button ("Knapp"). Two styles in MVP: primary (gold) and secondary (outline).
struct Knapp: View {
    enum Style { case primary, secondary }

    let title: String
    let style: Style
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.system(size: 16, weight: .semibold, design: .rounded))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .foregroundStyle(style == .primary ? Color.black : Palette.text)
                .background(style == .primary ? Palette.gold : Color.clear)
                .overlay(
                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .stroke(style == .primary ? Color.clear : Palette.border, lineWidth: 1)
                )
                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        }
        .buttonStyle(.plain)
    }
}

/// Pill chip (used for tags, statuses, mynt counters).
struct Pill: View {
    let text: String
    let icon: String?
    let tint: Color

    init(_ text: String, icon: String? = nil, tint: Color = Palette.gold) {
        self.text = text
        self.icon = icon
        self.tint = tint
    }

    var body: some View {
        HStack(spacing: 6) {
            if let icon { Text(icon) }
            Text(text)
                .font(.system(size: 13, weight: .semibold, design: .rounded))
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .background(tint.opacity(0.15))
        .overlay(
            Capsule().stroke(tint.opacity(0.35), lineWidth: 1)
        )
        .foregroundStyle(tint)
        .clipShape(Capsule())
    }
}
