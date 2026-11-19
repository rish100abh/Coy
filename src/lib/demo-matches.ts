import type { Prisma, User } from "@prisma/client";
import { acceptsGender, getPreferredGenders } from "@/lib/preferences";

type AccountPreferences = Pick<User, "id" | "gender" | "interestedIn">;

export async function seedDemoIncomingLikes(
  transaction: Prisma.TransactionClient,
  account: AccountPreferences,
) {
  const preferences = account.interestedIn.split("|").filter(Boolean);
  const preferredGenders = getPreferredGenders(preferences);
  const demoProfiles = await transaction.user.findMany({
    where: {
      id: { startsWith: "user_" },
      email: null,
      ...(preferredGenders ? { gender: { in: preferredGenders } } : {}),
    },
    select: { id: true, interestedIn: true },
    orderBy: { id: "asc" },
  });
  const reciprocatingProfiles = demoProfiles
    .filter((profile) => acceptsGender(profile.interestedIn.split("|").filter(Boolean), account.gender))
    .slice(0, 3);

  if (reciprocatingProfiles.length === 0) return 0;

  const profileIds = reciprocatingProfiles.map((profile) => profile.id);
  const existingIncomingLikes = await transaction.swipe.findMany({
    where: { swiperId: { in: profileIds }, targetUserId: account.id },
    select: { swiperId: true },
  });
  const existingLikerIds = new Set(existingIncomingLikes.map((swipe) => swipe.swiperId));
  const newlyLikedProfileIds = profileIds.filter((profileId) => !existingLikerIds.has(profileId));

  const result = await transaction.swipe.createMany({
    data: profileIds.map((profileId) => ({
      swiperId: profileId,
      targetUserId: account.id,
      action: "LIKE" as const,
    })),
    skipDuplicates: true,
  });

  if (newlyLikedProfileIds.length === 0) return result.count;

  const outgoingLikes = await transaction.swipe.findMany({
    where: {
      swiperId: account.id,
      targetUserId: { in: newlyLikedProfileIds },
      action: "LIKE",
    },
    select: { targetUserId: true },
  });
  for (const outgoingLike of outgoingLikes) {
    const [userOneId, userTwoId] = [account.id, outgoingLike.targetUserId].sort();
    await transaction.match.upsert({
      where: { userOneId_userTwoId: { userOneId, userTwoId } },
      update: {},
      create: { userOneId, userTwoId },
    });
  }

  return result.count;
}
