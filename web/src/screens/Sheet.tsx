import type { ReactNode } from "react";
import { C } from "../design/tokens";
import { BackButton } from "../design/BackButton";

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
          background: `
            linear-gradient(180deg, rgba(207,233,247,0.30) 0%, rgba(255,244,220,0.35) 60%, rgba(255,244,220,0.55) 100%),
            url('/images/jungle-bg.png') center/cover no-repeat
          `,
          borderTop: `1px solid ${C.border}`,
          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,
          padding: 16,
          paddingBottom: "max(env(safe-area-inset-bottom), 16px)",
          overflowY: "auto",
          boxSizing: "border-box",
          boxShadow: "0 -10px 40px rgba(36,58,82,0.25)",
          color: C.text
        }}
      >
        <div style={{ display: "flex", alignItems: "center", marginBottom: 12, gap: 10 }}>
          <BackButton onClick={onClose} />
          <h3
            style={{
              margin: 0,
              flex: 1,
              color: C.text,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap"
            }}
          >
            {title}
          </h3>
        </div>
        {children}
      </div>
    </div>
  );
}
