import SwiftUI
import Supabase

@Observable
@MainActor
final class ProfilePickerViewModel {
    var selected: ProfileId?
    var isSaving: Bool = false
    var errorMessage: String?

    let familyId: UUID
    var onSaved: (ProfileConfig) -> Void = { _ in }

    init(familyId: UUID) {
        self.familyId = familyId
    }

    func save() async {
        guard let selected else { return }
        let entry = ProfileCatalog.entry(for: selected)
        let row = ProfileConfig(
            familyId: familyId,
            profileId: selected,
            uppdragMultiplier: entry.uppdragMultiplier,
            screenTimeMultiplier: entry.screenTimeMultiplier,
            dailyLimitMinutes: entry.dailyLimitMinutes
        )

        errorMessage = nil
        isSaving = true
        defer { isSaving = false }

        do {
            try await supabase
                .from("profile_configs")
                .upsert(row, onConflict: "family_id")
                .execute()
            onSaved(row)
        } catch {
            errorMessage = (error as NSError).localizedDescription
        }
    }
}

struct ProfilePickerView: View {
    @State var viewModel: ProfilePickerViewModel

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                Text("Välj din profil")
                    .font(.system(size: 28, weight: .heavy, design: .rounded))
                    .foregroundStyle(Palette.text)
                    .padding(.top, 12)

                Text("Du kan ändra detta när som helst i inställningarna.")
                    .font(.footnote)
                    .foregroundStyle(Palette.muted)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 24)

                ForEach(ProfileCatalog.all) { entry in
                    ProfileCard(entry: entry, isSelected: viewModel.selected == entry.id) {
                        viewModel.selected = entry.id
                    }
                }

                if let err = viewModel.errorMessage {
                    Text(err).foregroundStyle(Palette.red).font(.footnote)
                }

                Knapp(title: viewModel.isSaving ? "Sparar…" : "Bekräfta", style: .primary) {
                    Task { await viewModel.save() }
                }
                .disabled(viewModel.selected == nil || viewModel.isSaving)
                .opacity(viewModel.selected == nil ? 0.5 : 1)
                .padding(.top, 8)
            }
            .padding(20)
        }
        .background(Palette.bg.ignoresSafeArea())
    }
}

private struct ProfileCard: View {
    let entry: ProfileCatalogEntry
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 10) {
                HStack(spacing: 10) {
                    Text(entry.icon).font(.system(size: 30))
                    VStack(alignment: .leading, spacing: 2) {
                        Text(entry.namn)
                            .font(.system(size: 18, weight: .heavy, design: .rounded))
                            .foregroundStyle(Color(hex: entry.färg))
                        Text(entry.tagline)
                            .font(.caption)
                            .foregroundStyle(Palette.muted)
                    }
                    Spacer()
                    if isSelected {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.title2)
                            .foregroundStyle(Color(hex: entry.färg))
                    }
                }
                Text(entry.beskrivning)
                    .font(.footnote)
                    .foregroundStyle(Palette.text)
                Divider().overlay(Palette.border)
                exampleRow("Uppdrag", entry.exempelUppdrag)
                exampleRow("Skärmtid", entry.exempelSkärmtid)
                exampleRow("Dagsgräns", entry.exempelDagsgräns)
            }
            .padding(16)
            .background(Color(hex: entry.färg, alpha: 0.10))
            .overlay(
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .stroke(isSelected ? Color(hex: entry.färg) : Palette.border,
                            lineWidth: isSelected ? 2 : 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
        }
        .buttonStyle(.plain)
    }

    private func exampleRow(_ label: String, _ value: String) -> some View {
        HStack {
            Text(label).font(.caption2).foregroundStyle(Palette.muted)
            Spacer()
            Text(value).font(.caption).foregroundStyle(Palette.text)
        }
    }
}
