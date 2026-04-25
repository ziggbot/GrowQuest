import SwiftUI

@Observable
@MainActor
final class AddChildViewModel {
    var nickname: String = ""
    var avatar: String = AVATARER[0]
    var ageBand: AgeBand? = .sevenToNine
    var isSaving: Bool = false
    var errorMessage: String?

    let familyId: UUID
    var onSaved: (ChildProfile) -> Void = { _ in }

    init(familyId: UUID) {
        self.familyId = familyId
    }

    var canSubmit: Bool {
        !isSaving && (1...30).contains(nickname.trimmingCharacters(in: .whitespaces).count)
    }

    func save() async {
        guard canSubmit else { return }
        errorMessage = nil
        isSaving = true
        defer { isSaving = false }

        struct InsertRow: Encodable {
            let familyId: UUID
            let nickname: String
            let avatarEmoji: String
            let ageBand: String?

            enum CodingKeys: String, CodingKey {
                case familyId = "family_id"
                case nickname
                case avatarEmoji = "avatar_emoji"
                case ageBand = "age_band"
            }
        }

        let row = InsertRow(
            familyId: familyId,
            nickname: nickname.trimmingCharacters(in: .whitespaces),
            avatarEmoji: avatar,
            ageBand: ageBand?.rawValue
        )

        do {
            let inserted: ChildProfile = try await supabase
                .from("child_profiles")
                .insert(row)
                .select()
                .single()
                .execute()
                .value
            onSaved(inserted)
        } catch {
            errorMessage = (error as NSError).localizedDescription
        }
    }
}

struct AddChildSheet: View {
    @Environment(\.dismiss) private var dismiss
    @State var viewModel: AddChildViewModel

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    Kort {
                        VStack(spacing: 12) {
                            Text("Vad heter ditt barn?")
                                .font(.headline)
                                .foregroundStyle(Palette.text)
                                .frame(maxWidth: .infinity, alignment: .leading)
                            TextField("Smeknamn", text: $viewModel.nickname)
                                .padding(12)
                                .background(Palette.surfaceHov)
                                .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                        }
                    }

                    Kort {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Välj avatar").font(.headline).foregroundStyle(Palette.text)
                            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 8), count: 4),
                                      spacing: 8) {
                                ForEach(AVATARER, id: \.self) { emoji in
                                    Button {
                                        viewModel.avatar = emoji
                                    } label: {
                                        Text(emoji)
                                            .font(.system(size: 34))
                                            .frame(maxWidth: .infinity, minHeight: 56)
                                            .background(viewModel.avatar == emoji
                                                        ? Palette.gold.opacity(0.2)
                                                        : Palette.surfaceHov)
                                            .overlay(
                                                RoundedRectangle(cornerRadius: 12, style: .continuous)
                                                    .stroke(viewModel.avatar == emoji ? Palette.gold : Palette.border,
                                                            lineWidth: viewModel.avatar == emoji ? 2 : 1)
                                            )
                                            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                        }
                    }

                    Kort {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Ålder").font(.headline).foregroundStyle(Palette.text)
                            Picker("Åldersband", selection: $viewModel.ageBand) {
                                ForEach(AgeBand.allCases) { band in
                                    Text(band.rawValue).tag(Optional(band))
                                }
                            }
                            .pickerStyle(.segmented)
                        }
                    }

                    if let err = viewModel.errorMessage {
                        Text(err).foregroundStyle(Palette.red).font(.footnote)
                    }

                    Knapp(title: viewModel.isSaving ? "Sparar…" : "Lägg till barn",
                          style: .primary) {
                        Task { await viewModel.save() }
                    }
                    .disabled(!viewModel.canSubmit)
                    .opacity(viewModel.canSubmit ? 1 : 0.5)
                }
                .padding(20)
            }
            .background(Palette.bg.ignoresSafeArea())
            .navigationTitle("Nytt barn")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Avbryt") { dismiss() }.tint(Palette.muted)
                }
            }
        }
    }
}
