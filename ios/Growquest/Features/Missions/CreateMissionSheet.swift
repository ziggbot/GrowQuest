import SwiftUI
import Supabase

@Observable
@MainActor
final class CreateMissionViewModel {
    var title: String = ""
    var description: String = ""
    var rewardMynt: Int = 60
    var recurrence: Recurrence = .daily
    var pickedTemplate: MissionTemplate?
    var isSaving: Bool = false
    var errorMessage: String?

    let familyId: UUID
    let multiplier: Double
    var onCreated: (Mission) -> Void = { _ in }

    init(familyId: UUID, multiplier: Double) {
        self.familyId = familyId
        self.multiplier = multiplier
    }

    func applyTemplate(_ t: MissionTemplate) {
        pickedTemplate = t
        title = t.title
        description = t.description
        recurrence = t.recurrence
        rewardMynt = max(0, Int((Double(t.baseRewardMynt) * multiplier / 5).rounded()) * 5)
    }

    var canSubmit: Bool {
        !isSaving
        && (1...80).contains(title.trimmingCharacters(in: .whitespaces).count)
        && (0...10000).contains(rewardMynt)
    }

    func save() async {
        guard canSubmit else { return }
        errorMessage = nil
        isSaving = true
        defer { isSaving = false }

        struct InsertRow: Encodable {
            let familyId: UUID
            let title: String
            let description: String?
            let rewardMynt: Int
            let recurrence: String
            let active: Bool
            let createdBy: UUID

            enum CodingKeys: String, CodingKey {
                case familyId = "family_id"
                case title
                case description
                case rewardMynt = "reward_mynt"
                case recurrence
                case active
                case createdBy = "created_by"
            }
        }

        do {
            let session = try await supabase.auth.session
            let userId = session.user.id

            let trimmedDesc = description.trimmingCharacters(in: .whitespaces)
            let row = InsertRow(
                familyId: familyId,
                title: title.trimmingCharacters(in: .whitespaces),
                description: trimmedDesc.isEmpty ? nil : trimmedDesc,
                rewardMynt: rewardMynt,
                recurrence: recurrence.rawValue,
                active: true,
                createdBy: userId
            )

            let inserted: Mission = try await supabase
                .from("missions")
                .insert(row)
                .select()
                .single()
                .execute()
                .value
            onCreated(inserted)
        } catch {
            errorMessage = (error as NSError).localizedDescription
        }
    }
}

struct CreateMissionSheet: View {
    @Environment(\.dismiss) private var dismiss
    @State var viewModel: CreateMissionViewModel

    var body: some View {
        @Bindable var viewModel = viewModel
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    Kort {
                        VStack(alignment: .leading, spacing: 10) {
                            Text("Mall (valfritt)").font(.headline).foregroundStyle(Palette.text)
                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 8) {
                                    ForEach(MissionTemplates.all) { t in
                                        Button {
                                            viewModel.applyTemplate(t)
                                        } label: {
                                            VStack(spacing: 4) {
                                                Text(t.icon).font(.system(size: 28))
                                                Text(t.title).font(.caption2).foregroundStyle(Palette.text)
                                            }
                                            .frame(width: 90, height: 80)
                                            .background(viewModel.pickedTemplate?.id == t.id
                                                        ? Palette.gold.opacity(0.2)
                                                        : Palette.surfaceHov)
                                            .overlay(
                                                RoundedRectangle(cornerRadius: 12, style: .continuous)
                                                    .stroke(viewModel.pickedTemplate?.id == t.id
                                                            ? Palette.gold : Palette.border,
                                                            lineWidth: viewModel.pickedTemplate?.id == t.id ? 2 : 1)
                                            )
                                            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                                        }
                                        .buttonStyle(.plain)
                                    }
                                }
                            }
                        }
                    }

                    Kort {
                        VStack(spacing: 10) {
                            field("Titel") {
                                TextField("Titel", text: $viewModel.title)
                            }
                            field("Beskrivning") {
                                TextField("Beskrivning (valfritt)", text: $viewModel.description, axis: .vertical)
                                    .lineLimit(2...4)
                            }
                            field("Belöning (mynt)") {
                                Stepper(value: $viewModel.rewardMynt, in: 0...10000, step: 5) {
                                    Text("\(viewModel.rewardMynt) 🪙")
                                        .foregroundStyle(Palette.gold)
                                }
                            }
                            field("Återkomst") {
                                Picker("Återkomst", selection: $viewModel.recurrence) {
                                    ForEach(Recurrence.allCases) { r in
                                        Text(r.label).tag(r)
                                    }
                                }
                                .pickerStyle(.segmented)
                            }
                        }
                    }

                    if let err = viewModel.errorMessage {
                        Text(err).foregroundStyle(Palette.red).font(.footnote)
                    }

                    Knapp(title: viewModel.isSaving ? "Skapar…" : "Skapa uppdrag",
                          style: .primary) {
                        Task { await viewModel.save() }
                    }
                    .disabled(!viewModel.canSubmit)
                    .opacity(viewModel.canSubmit ? 1 : 0.5)
                }
                .padding(20)
            }
            .background(Palette.bg.ignoresSafeArea())
            .navigationTitle("Nytt uppdrag")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Avbryt") { dismiss() }.tint(Palette.muted)
                }
            }
        }
    }

    private func field<Content: View>(_ label: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label).font(.caption).foregroundStyle(Palette.muted)
            content()
                .padding(10)
                .background(Palette.surfaceHov)
                .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
        }
    }
}
