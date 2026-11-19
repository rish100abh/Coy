import { Prisma, SwipeAction } from "@prisma/client";
import { prisma } from "./prisma";
import { getPreferredGenders } from "./preferences";

export function parseInterests(interests: string): string[] {
  return interests
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function getFeed(userId: string, limit = 20) {
  const viewer = await prisma.user.findUnique({
    where: { id: userId },
    select: { interestedIn: true },
  });
  if (!viewer) throw new Error("Authenticated user was not found");

  const swipes = await prisma.swipe.findMany({
    where: { swiperId: userId },
    select: { targetUserId: true },
  });
  const excludedIds = new Set(swipes.map((swipe) => swipe.targetUserId));
  excludedIds.add(userId);
  const interestedIn = viewer.interestedIn.split("|").filter(Boolean);
  const genderFilters = getPreferredGenders(interestedIn);

  const profiles = await prisma.user.findMany({
    where: {
      id: { notIn: [...excludedIds] },
      ...(genderFilters ? { gender: { in: genderFilters } } : {}),
    },
    select: {
      id: true,
      name: true,
      age: true,
      photo: true,
      bio: true,
      city: true,
      gender: true,
      interests: true,
      occupation: true,
    },
    take: limit,
    orderBy: { createdAt: "asc" },
  });

  return profiles.map(({ interests, ...profile }) => ({
    ...profile,
    interests: parseInterests(interests),
  }));
}

export async function applySwipe(swiperId: string, targetUserId: string, action: "LIKE" | "PASS") {
  const target = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!target) return { kind: "NOT_FOUND" as const };
  if (targetUserId === swiperId) return { kind: "INVALID_TARGET" as const };

  const existing = await prisma.swipe.findUnique({
    where: {
      swiperId_targetUserId: { swiperId, targetUserId },
    },
  });
  if (existing) return { kind: "DUPLICATE" as const };

  try {
    const result = await prisma.$transaction(async (tx) => {
      await tx.swipe.create({
        data: {
          swiperId,
          targetUserId,
          action: action === "LIKE" ? SwipeAction.LIKE : SwipeAction.PASS,
        },
      });

      if (action !== "LIKE") return { matched: false, match: null };

      const incomingLike = await tx.swipe.findUnique({
        where: {
          swiperId_targetUserId: { swiperId: targetUserId, targetUserId: swiperId },
        },
      });
      if (!incomingLike || incomingLike.action !== "LIKE") {
        return { matched: false, match: null };
      }

      const [userOneId, userTwoId] =
        swiperId < targetUserId
          ? [swiperId, targetUserId]
          : [targetUserId, swiperId];

      const match = await tx.match.upsert({
        where: { userOneId_userTwoId: { userOneId, userTwoId } },
        update: {},
        create: { userOneId, userTwoId },
      });

      return {
        matched: true,
        match: {
          id: match.id,
          user: {
            id: target.id,
            name: target.name,
            photo: target.photo,
          },
        },
      };
    });

    return { kind: "SUCCESS" as const, ...result };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { kind: "DUPLICATE" as const };
    }
    throw error;
  }
}

export async function resetUserFeed(userId: string) {
  await prisma.swipe.deleteMany({ where: { swiperId: userId } });
}

export async function getMutualMatches(userId: string) {
  const matches = await prisma.match.findMany({
    where: {
      OR: [{ userOneId: userId }, { userTwoId: userId }],
    },
    orderBy: { createdAt: "desc" },
  });

  const partnerIds = matches.map((match) =>
    match.userOneId === userId ? match.userTwoId : match.userOneId,
  );
  const partners = await prisma.user.findMany({
    where: { id: { in: partnerIds } },
  });
  const partnerById = new Map(partners.map((partner) => [partner.id, partner]));

  return matches.flatMap((match) => {
    const partnerId =
      match.userOneId === userId ? match.userTwoId : match.userOneId;
    const partner = partnerById.get(partnerId);
    if (!partner) return [];
    return [{
      id: match.id,
      name: partner.name,
      age: partner.age,
      photo: partner.photo,
      city: partner.city,
      matchedAt: match.createdAt.toISOString(),
    }];
  });
}

export async function removeUserMatch(userId: string, matchId: string) {
  const result = await prisma.match.deleteMany({
    where: {
      id: matchId,
      OR: [{ userOneId: userId }, { userTwoId: userId }],
    },
  });
  return result.count > 0;
}

async function findUserMatch(userId: string, matchId: string) {
  return prisma.match.findFirst({
    where: {
      id: matchId,
      OR: [{ userOneId: userId }, { userTwoId: userId }],
    },
  });
}

export async function getUserConversation(userId: string, matchId: string) {
  const match = await findUserMatch(userId, matchId);
  if (!match) return null;

  const messages = await prisma.message.findMany({
    where: { matchId },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: { id: true, senderId: true, text: true, createdAt: true },
  });
  return messages.reverse().map((message) => ({
    ...message,
    createdAt: message.createdAt.toISOString(),
  }));
}

export async function sendUserMessage(userId: string, matchId: string, text: string) {
  const match = await findUserMatch(userId, matchId);
  if (!match) return null;

  const message = await prisma.message.create({
    data: { matchId, senderId: userId, text },
    select: { id: true, senderId: true, text: true, createdAt: true },
  });
  return { ...message, createdAt: message.createdAt.toISOString() };
}
