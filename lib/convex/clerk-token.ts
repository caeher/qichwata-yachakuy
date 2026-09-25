import { auth } from "@clerk/nextjs/server";

export async function getClerkConvexToken(): Promise<string | null> {
  const session = await auth();
  return session.getToken({ template: "convex" });
}
