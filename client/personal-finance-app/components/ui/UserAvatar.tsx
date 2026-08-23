"use client";

import { useSession } from "next-auth/react";
import { ProfileAvatar } from "./ProfileAvatar";

interface UserAvatarProps {
  size?: "sm" | "lg";
}

export function UserAvatar({ size = "sm" }: UserAvatarProps) {
  const { data: session } = useSession();
  const user = session?.user;
  const name = user?.name ?? "User";

  return <ProfileAvatar name={name} image={user?.image} size={size} />;
}
