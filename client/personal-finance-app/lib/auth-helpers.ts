import { auth } from "@/auth";

export async function getAuthenticatedUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    name: session.user.name ?? "User",
    email: session.user.email ?? undefined,
    image: session.user.image ?? undefined,
  };
}

export function unauthorizedResponse() {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}
