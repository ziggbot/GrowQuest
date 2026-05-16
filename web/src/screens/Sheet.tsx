import type { ReactNode } from "react";
import { C } from "../design/tokens";

export function Sheet({
  title,
  onClose,
  children
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
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
        background: "rgba(0,0,0,0.55)",
        zIndex: 50,
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
          background: C.bg,
          borderTop: `1px solid ${C.border}`,
          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,
          padding: 16,
          paddingBottom: "max(env(safe-area-inset-bottom), 16px)",
          overflowY: "auto",
          boxSizing: "border-box",
          boxShadow: "0 -10px 40px rgba(0,0,0,0.4)"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ margin: 0, flex: 1, color: C.text }}>{title}</h3>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: C.muted, fontSize: 22, cursor: "pointer" }}
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
