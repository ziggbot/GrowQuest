import SwiftUI
import Supabase

@Observable
@MainActor
final class HomeViewModel {
    var profileConfig: ProfileConfig?
    var children: [ChildProfile] = []
    var missions: [Mission] = []
    var pendingCount: Int = 0
    var isLoading: Bool = false
    var errorMessage: String?
    var parentMissionsVM: ParentMissionsViewModel

    let familyId: UUID

    init(familyId: UUID) {
        self.familyId = familyId
        self.parentMissionsVM = ParentMissionsViewModel(familyId: familyId)
    }

    var needsProfile: Bool { profileConfig == nil }
    var needsChild: Bool { profileConfig != nil && children.isEmpty }

    func reload() async {
        isLoading = true
        defer { isLoading = false }
        errorMessage = nil

        // Profile config may not exist yet (pre-onboarding) — treat as nil rather than error.
        let pc: ProfileConfig? = try? await supabase
            .from("profile_configs")
            .select()
            .eq("family_id", value: familyId)
            .limit(1)
            .single()
            .execute()
            .value

        do {
            let kids: [ChildProfile] = try await supabase
                .from("child_profiles")
                .select()
                .eq("family_id", value: familyId)
                .order("created_at", ascending: true)
                .execute()
                .value
            let m: [Mission] = try await supabase
                .from("missions")
                .select()
                .eq("family_id", value: familyId)
                .eq("active", value: true)
                .execute()
                .value
            let pending: [MissionSubmission] = try await supabase
                .from("mission_submissions")
                .select()
                .eq("family_id", value: familyId)
                .eq("status", value: "pending")
                .execute()
                .value

            self.profileConfig = pc
            self.children = kids
            self.missions = m
            self.pendingCount = pending.count
            await parentMissionsVM.reload(children: kids, missions: m)
        } catch {
            errorMessage = (error as NSError).localizedDescription
        }
    }
}

struct HomeView: View {
    @Environment(Session.self) private var session
    @State private var viewModel: HomeViewModel
    @State private var showAddChild = false
    @State private var showCreateMission = false
    @State private var perspective: Perspective = .parent

    enum Perspective: Hashable {
        case parent
        case child(UUID)
    }

    init(familyId: UUID) {
        _viewModel = State(wrappedValue: HomeViewModel(familyId: familyId))
    }

    var body: some View {
        Group {
            if viewModel.needsProfile {
                ProfilePickerView(viewModel: makeProfilePicker())
            } else {
                signedInBody
            }
        }
        .background(Palette.bg.ignoresSafeArea())
        .task { await viewModel.reload() }
        .refreshable { await viewModel.reload() }
        .sheet(isPresented: $showAddChild) {
            AddChildSheet(viewModel: makeAddChild())
        }
        .sheet(isPresented: $showCreateMission) {
            CreateMissionSheet(viewModel: makeCreateMission())
        }
    }

    private var signedInBody: some View {
        VStack(spacing: 0) {
            topBar

            perspectivePicker

            ScrollView {
                VStack(spacing: 14) {
                    switch perspective {
                    case .parent:
                        parentDashboard
                    case .child(let childId):
                        if let child = viewModel.children.first(where: { $0.id == childId }) {
                            ChildDashboardSection(
                                child: child,
                                familyId: viewModel.familyId,
                                profileConfig: viewModel.profileConfig
                            )
                            .id(child.id)
                        }
                    }
                }
                .padding(.horizontal, 16)
                .padding(.top, 12)
            }
        }
        .toolbar(.hidden, for: .navigationBar)
    }

    private var topBar: some View {
        HStack {
            VStack(alignment: .leading, spacing: 0) {
                Text("GrowQuest")
                    .font(.system(size: 20, weight: .heavy, design: .rounded))
                    .foregroundStyle(Palette.gold)
                if let pid = viewModel.profileConfig?.profileId {
                    Text(ProfileCatalog.entry(for: pid).namn)
                        .font(.caption2)
                        .foregroundStyle(Palette.muted)
                }
            }
            Spacer()
            Button {
                Task { await session.signOut() }
            } label: {
                Image(systemName: "rectangle.portrait.and.arrow.right")
                    .foregroundStyle(Palette.muted)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(Palette.surface)
    }

    private var perspectivePicker: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                tab(label: "Förälder", icon: "👤", isOn: perspective == .parent) {
                    perspective = .parent
                }
                ForEach(viewModel.children) { child in
                    tab(label: child.nickname, icon: child.avatarEmoji,
                        isOn: perspective == .child(child.id)) {
                        perspective = .child(child.id)
                    }
                }
                Button {
                    showAddChild = true
                } label: {
                    Label("Lägg till barn", systemImage: "plus")
                        .font(.caption.bold())
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .foregroundStyle(Palette.muted)
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
        }
    }

    private func tab(label: String, icon: String, isOn: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 6) {
                Text(icon)
                Text(label).font(.caption.bold())
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(isOn ? Palette.gold.opacity(0.2) : Palette.surfaceHov)
            .overlay(
                Capsule().stroke(isOn ? Palette.gold : Palette.border, lineWidth: isOn ? 2 : 1)
            )
            .foregroundStyle(isOn ? Palette.gold : Palette.text)
            .clipShape(Capsule())
        }
        .buttonStyle(.plain)
    }

    @ViewBuilder
    private var parentDashboard: some View {
        if viewModel.needsChild {
            Kort {
                VStack(spacing: 10) {
                    Text("Lägg till ditt första barn").font(.headline).foregroundStyle(Palette.text)
                    Text("Du behöver minst ett barn för att skapa uppdrag.")
                        .font(.footnote)
                        .foregroundStyle(Palette.muted)
                        .multilineTextAlignment(.center)
                    Knapp(title: "Lägg till barn", style: .primary) {
                        showAddChild = true
                    }
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 8)
            }
        } else {
            Kort {
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Text("Att granska").font(.headline).foregroundStyle(Palette.text)
                        Spacer()
                        if viewModel.pendingCount > 0 {
                            Pill("\(viewModel.pendingCount)", tint: Palette.purple)
                        }
                    }
                    NavigationLink {
                        ApprovalQueueView(viewModel: ApprovalQueueViewModel(familyId: viewModel.familyId))
                            .navigationTitle("Att granska")
                    } label: {
                        HStack {
                            Text(viewModel.pendingCount > 0
                                 ? "Du har \(viewModel.pendingCount) inskickade uppdrag"
                                 : "Inga uppdrag väntar")
                                .font(.callout)
                                .foregroundStyle(Palette.text)
                            Spacer()
                            Image(systemName: "chevron.right").foregroundStyle(Palette.muted)
                        }
                    }
                }
            }

            NavigationLink {
                LeaderboardView(viewModel: LeaderboardViewModel(familyId: viewModel.familyId))
                    .navigationTitle("Topplista")
            } label: {
                Kort {
                    HStack(spacing: 10) {
                        Text("🏆").font(.system(size: 26))
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Superäventyrare")
                                .font(.headline)
                                .foregroundStyle(Palette.gold)
                            Text("Vem samlar mest mynt idag?")
                                .font(.caption)
                                .foregroundStyle(Palette.muted)
                        }
                        Spacer()
                        Image(systemName: "chevron.right").foregroundStyle(Palette.muted)
                    }
                }
            }

            TodaysMissionsSection(
                children: viewModel.children,
                missions: viewModel.missions,
                parentMissionsVM: viewModel.parentMissionsVM,
                onNewMission: { showCreateMission = true }
            )

            Kort {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Plånbok").font(.headline).foregroundStyle(Palette.text)
                    ForEach(viewModel.children) { child in
                        NavigationLink {
                            WalletView(viewModel: WalletViewModel(
                                child: child,
                                profileConfig: viewModel.profileConfig
                            ))
                            .navigationTitle("Plånbok")
                        } label: {
                            HStack {
                                Text(child.avatarEmoji)
                                Text(child.nickname).font(.callout).foregroundStyle(Palette.text)
                                Spacer()
                                Image(systemName: "chevron.right").foregroundStyle(Palette.muted)
                            }
                            .padding(.vertical, 4)
                        }
                    }
                }
            }
        }
    }

    private func makeProfilePicker() -> ProfilePickerViewModel {
        let vm = ProfilePickerViewModel(familyId: viewModel.familyId)
        vm.onSaved = { saved in
            viewModel.profileConfig = saved
        }
        return vm
    }

    private func makeAddChild() -> AddChildViewModel {
        let vm = AddChildViewModel(familyId: viewModel.familyId)
        vm.onSaved = { child in
            viewModel.children.append(child)
            showAddChild = false
        }
        return vm
    }

    private func makeCreateMission() -> CreateMissionViewModel {
        let vm = CreateMissionViewModel(
            familyId: viewModel.familyId,
            multiplier: viewModel.profileConfig?.uppdragMultiplier ?? 1.0,
            children: viewModel.children
        )
        vm.onCreated = { mission in
            viewModel.missions.insert(mission, at: 0)
            showCreateMission = false
        }
        return vm
    }
}

private struct TodaysMissionsSection: View {
    let children: [ChildProfile]
    let missions: [Mission]
    let parentMissionsVM: ParentMissionsViewModel
    let onNewMission: () -> Void

    var body: some View {
        Kort {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Text("Dagens aktiva uppdrag").font(.headline).foregroundStyle(Palette.text)
                    Spacer()
                    Button(action: onNewMission) {
                        Label("Nytt", systemImage: "plus.circle.fill")
                            .font(.callout.bold())
                            .foregroundStyle(Palette.gold)
                    }
                }

                if children.isEmpty || missions.isEmpty {
                    Text("Inga uppdrag än. Skapa det första!")
                        .font(.footnote)
                        .foregroundStyle(Palette.muted)
                } else {
                    ForEach(children) { child in
                        let rows = parentMissionsVM.rows(for: child)
                        if !rows.isEmpty {
                            childSection(child: child, rows: rows)
                        }
                    }
                    let unassignedRows = parentMissionsVM.broadcastRows()
                    if !unassignedRows.isEmpty && children.count > 1 {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Alla barn").font(.subheadline.bold()).foregroundStyle(Palette.muted)
                            ForEach(unassignedRows) { row in
                                missionLine(row: row)
                            }
                        }
                    }
                }
            }
        }
    }

    private func childSection(child: ChildProfile, rows: [ParentMissionRow]) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 6) {
                Text(child.avatarEmoji)
                Text(child.nickname).font(.subheadline.bold()).foregroundStyle(Palette.text)
            }
            ForEach(rows) { row in
                missionLine(row: row)
            }
        }
    }

    private func missionLine(row: ParentMissionRow) -> some View {
        HStack(spacing: 8) {
            Text(row.mission.title)
                .font(.callout)
                .foregroundStyle(Palette.text)
                .lineLimit(1)
            Spacer()
            Pill("\(row.mission.rewardMynt) 🪙", tint: Palette.gold)
            statusPill(for: row.status)
        }
        .padding(.leading, 8)
    }

    @ViewBuilder
    private func statusPill(for status: SubmissionStatus?) -> some View {
        switch status {
        case .none:
            Pill("Ej startad", tint: Palette.muted)
        case .pending:
            Pill("Inskickad", icon: "⏳", tint: Palette.purple)
        case .approved:
            Pill("Godkänd", icon: "✅", tint: Palette.green)
        case .rejected:
            Pill("Nekad", tint: Palette.red)
        }
    }
}

private struct ChildDashboardSection: View {
    let child: ChildProfile
    let familyId: UUID
    let profileConfig: ProfileConfig?

    var body: some View {
        VStack(spacing: 12) {
            NavigationLink {
                WalletView(viewModel: WalletViewModel(
                    child: child,
                    profileConfig: profileConfig
                ))
                .navigationTitle("Plånbok")
            } label: {
                Kort {
                    HStack {
                        Text(child.avatarEmoji).font(.system(size: 32))
                        VStack(alignment: .leading) {
                            Text("Min plånbok").font(.caption).foregroundStyle(Palette.muted)
                            Text(child.nickname).font(.headline).foregroundStyle(Palette.text)
                        }
                        Spacer()
                        Image(systemName: "chevron.right").foregroundStyle(Palette.muted)
                    }
                }
            }
            ChildMissionListView(
                viewModel: ChildMissionsViewModel(familyId: familyId, child: child)
            )
            .frame(minHeight: 400)
        }
    }
}
