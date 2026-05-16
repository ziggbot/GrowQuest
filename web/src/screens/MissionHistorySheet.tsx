import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { ChildProfile, SubmissionStatus } from "../lib/types";
import { CK } from "../design/tokens";
import { KortKid, PillKid } from "../design/components";

interface HistoryEntry {
  id: string;
  status: SubmissionStatus;
  date: string;
  title: string;
  reward_mynt: number;
}

interface SubmissionRow {
  id: string;
  status: SubmissionStatus;
  submitted_at: string;
  reviewed_at: string | null;
  missions: { title: string; reward_mynt: number } | null;
}

export function MissionHistorySheet({
  child,
  familyId,
  onClose
}: {
  child: ChildProfile;
  familyId: string;
  onClose: () => void;
}) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setErr(null);
      try {
        const { data, error } = await supabase
          .from("mission_submissions")
          .select("id, status, submitted_at, reviewed_at, missions(title, reward_mynt)")
          .eq("family_id", familyId)
          .eq("child_id", child.id)
          .in("status", ["approved", "rejected"])
          .order("submitted_at", { ascending: false })
          .limit(100);
        if (error) throw error;
        const rows = (data ?? []) as unknown as SubmissionRow[];
        setEntries(
          rows
            .filter((r) => r.missions)
            .map((r) => ({
              id: r.id,
              status: r.status,
              date: r.reviewed_at ?? r.submitted_at,
              title: r.missions!.title,
              reward_mynt: r.missions!.reward_mynt
            }))
        );
      } catch (e) {
        setErr((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [child.id, familyId]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(36,58,82,0.45)",
        zIndex: 60,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center"
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          maxHeight: "92vh",
          background: `linear-gradient(180deg, ${CK.bgGradTop} 0%, ${CK.bgGradMid} 55%, ${CK.bgGradBot} 100%)`,
          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,
          padding: 16,
          paddingBottom: "max(env(safe-area-inset-bottom), 16px)",
          overflowY: "auto",
          boxSizing: "border-box",
          boxShadow: "0 -10px 40px rgba(36,58,82,0.25)"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ margin: 0, flex: 1, color: CK.text, fontWeight: 800 }}>
            {child.avatar_emoji} Historik
          </h3>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: CK.muted,
              fontSize: 22,
              cursor: "pointer"
            }}
          >
            ✕
          </button>
        </div>

        {loading && <p style={{ color: CK.muted, textAlign: "center" }}>Laddar…</p>}
        {!loading && entries.length === 0 && !err && (
          <KortKid>
            <p style={{ color: CK.textSoft, fontSize: 14, margin: 0, textAlign: "center" }}>
              Inga avklarade uppdrag ännu.
            </p>
          </KortKid>
        )}
        {err && <p style={{ color: CK.red, fontSize: 13 }}>{err}</p>}

        <div style={{ display: "grid", gap: 10 }}>
          {entries.map((entry) => (
            <div
              key={entry.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: 14,
                background: CK.surface,
                border: `1px solid ${CK.border}`,
                borderRadius: 16,
                boxShadow: CK.shadowSoft
              }}
            >
              <div style={{ fontSize: 22 }}>{entry.status === "approved" ? "✅" : "❌"}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 14,
                    color: CK.text,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap"
                  }}
                >
                  {entry.title}
                </div>
                <div style={{ fontSize: 11, color: CK.muted, marginTop: 2 }}>
                  {new Date(entry.date).toLocaleDateString("sv-SE", {
                    day: "numeric",
                    month: "short"
                  })}
                </div>
              </div>
              {entry.status === "approved" ? (
                <PillKid text={`+${entry.reward_mynt} 🪙`} tint={CK.gold} />
              ) : (
                <PillKid text="Nekad" tint={CK.red} />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
