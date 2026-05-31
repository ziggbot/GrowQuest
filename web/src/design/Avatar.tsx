import type { CSSProperties } from "react";
import type { ChildProfile } from "../lib/types";

// Single source of truth for showing a child's face/avatar. If a photo
// has been uploaded it gets rendered as a circular image; otherwise we
// fall back to the chosen emoji avatar.

export function Avatar({
  child,
  size,
  style
}: {
  child: Pick<ChildProfile, "avatar_emoji" | "avatar_photo" | "nickname">;
  size: number;
  style?: CSSProperties;
}) {
  if (child.avatar_photo) {
    return (
      <img
        src={child.avatar_photo}
        alt={child.nickname}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          objectFit: "cover",
          display: "inline-block",
          ...style
        }}
      />
    );
  }
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        fontSize: Math.round(size * 0.78),
        lineHeight: 1,
        ...style
      }}
    >
      {child.avatar_emoji}
    </span>
  );
}
