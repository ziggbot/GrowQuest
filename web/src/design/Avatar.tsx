import type { CSSProperties } from "react";
import type { ChildProfile } from "../lib/types";

// Single source of truth for showing a child's face/avatar. If a photo
// has been uploaded it gets rendered as a circular image; otherwise we
// fall back to the chosen emoji avatar.
//
// TODO(perf): avatar_photo is stored as a base64 data-URL on
// child_profiles, so every list view that fetches the row carries the
// full ~80 KB image — visible in HomeScreen tabs, InboxScreen,
// SettingsScreen, etc. The proper fix is moving photos to Supabase
// Storage and selecting only the URL on list queries. Doing that
// blanket-replace today would regress in places that show the photo
// (tabs, queues), so we leave the trade-off documented until storage
// migration lands.

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
