import { auth, currentUser } from "@clerk/nextjs/server";

export async function sessionContext() {
  if (!process.env.CLERK_SECRET_KEY) {
    return null;
  }
  const { userId } = await auth();
  if (!userId) {
    return null;
  }
  const clerkUser = await currentUser();
  const email =
    clerkUser?.emailAddresses.find(
      (e) => e.id === clerkUser.primaryEmailAddressId,
    )?.emailAddress ??
    clerkUser?.emailAddresses[0]?.emailAddress ??
    null;
  return { userId, email };
}
