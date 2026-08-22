import { auth } from "@/auth";
import type { User } from "./types";

export async function getCurrentUser(): Promise<User | null> {
  const session = await auth();
  if (!session?.user?.id && !session?.user?.email) return null;

  return {
    id: session.user.id || session.user.email || "unknown",
    name: session.user.name || session.user.email?.split("@")[0] || "User",
    email: session.user.email ?? undefined,
  };
}