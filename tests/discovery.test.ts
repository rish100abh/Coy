import { beforeAll, beforeEach, describe, expect, it } from "vitest";
const { prisma } = await import("../src/lib/prisma");
const { seedDemoIncomingLikes } = await import("../src/lib/demo-matches");
const {
  applySwipe,
  getFeed,
  getMutualMatches,
  getUserConversation,
  removeUserMatch,
  resetUserFeed,
  sendUserMessage,
} = await import("../src/lib/discovery");
const VIEWER_ID = "viewer";

async function createUser(id: string, name = id, gender = "UNDISCLOSED") {
  await prisma.user.create({
    data: {
      id,
      name,
      age: 24,
      photo: `https://example.com/${id}.jpg`,
      bio: "Test profile",
      city: "Delhi",
      interests: "Coffee|Travel",
      gender,
    },
  });
}

beforeAll(async () => {
  await prisma.match.deleteMany();
  await prisma.swipe.deleteMany();
  await prisma.user.deleteMany();
  await createUser(VIEWER_ID, "Riya");
});

beforeEach(async () => {
  await prisma.match.deleteMany();
  await prisma.swipe.deleteMany();
  await prisma.user.deleteMany({ where: { id: { not: VIEWER_ID } } });
  await prisma.user.update({
    where: { id: VIEWER_ID },
    data: { gender: "UNDISCLOSED", interestedIn: "EVERYONE" },
  });
});

describe("discovery backend", () => {
  it("returns available profiles and never the logged-in user", async () => {
    await createUser("target-a");
    await createUser("target-b");
    const feed = await getFeed(VIEWER_ID);
    expect(feed.map((profile) => profile.id)).toEqual(["target-a", "target-b"]);
  });

  it("excludes profiles the demo user already swiped", async () => {
    await createUser("target-a");
    await createUser("target-b");
    await prisma.swipe.create({
      data: { swiperId: VIEWER_ID, targetUserId: "target-a", action: "LIKE" },
    });
    expect((await getFeed(VIEWER_ID)).map((profile) => profile.id)).not.toContain("target-a");
  });

  it("keeps swipes and matches isolated between accounts", async () => {
    await createUser("second-viewer", "Second viewer");
    await createUser("target-a");
    await createUser("target-b");
    await prisma.swipe.createMany({
      data: [
        { swiperId: VIEWER_ID, targetUserId: "target-a", action: "LIKE" },
        { swiperId: "second-viewer", targetUserId: "target-b", action: "PASS" },
        { swiperId: "target-a", targetUserId: VIEWER_ID, action: "LIKE" },
      ],
    });

    await applySwipe(VIEWER_ID, "target-a", "LIKE");
    expect((await getFeed(VIEWER_ID)).map((profile) => profile.id)).not.toContain("target-a");
    expect((await getFeed("second-viewer")).map((profile) => profile.id)).toContain("target-a");
    expect((await getFeed("second-viewer")).map((profile) => profile.id)).not.toContain("target-b");
    expect(await getMutualMatches(VIEWER_ID)).toHaveLength(1);
    expect(await getMutualMatches("second-viewer")).toHaveLength(0);
  });

  it("resets the account's swipes without deleting incoming likes", async () => {
    await createUser("passed");
    await createUser("incoming");
    await prisma.swipe.createMany({
      data: [
        { swiperId: VIEWER_ID, targetUserId: "passed", action: "PASS" },
        { swiperId: "incoming", targetUserId: VIEWER_ID, action: "LIKE" },
      ],
    });
    await resetUserFeed(VIEWER_ID);
    expect(await prisma.swipe.findMany()).toMatchObject([
      { swiperId: "incoming", targetUserId: VIEWER_ID, action: "LIKE" },
    ]);
    expect((await getFeed(VIEWER_ID)).map((profile) => profile.id).sort()).toEqual(["incoming", "passed"]);
  });

  it("filters feed profiles by discovery gender preference", async () => {
    await createUser("woman", "Woman", "WOMAN");
    await createUser("man", "Man", "MAN");
    await createUser("nonbinary", "Non-binary", "NON_BINARY");
    await createUser("another-identity", "Another identity", "ANOTHER_IDENTITY");
    await createUser("undisclosed", "Undisclosed", "UNDISCLOSED");
    await prisma.user.update({ where: { id: VIEWER_ID }, data: { interestedIn: "WOMEN|NON_BINARY_AND_OTHER" } });
    const feed = await getFeed(VIEWER_ID);
    expect(feed.map((profile) => profile.id).sort()).toEqual(["another-identity", "nonbinary", "woman"]);
    await prisma.user.update({ where: { id: VIEWER_ID }, data: { interestedIn: "PREFER_NOT_TO_SAY" } });
    expect((await getFeed(VIEWER_ID)).map((profile) => profile.id)).toEqual(["undisclosed"]);
  });

  it("creates compatible demo incoming likes that become matches on a like", async () => {
    await createUser("user_01", "Demo woman", "WOMAN");
    await createUser("user_02", "Demo man", "MAN");
    await prisma.user.update({
      where: { id: VIEWER_ID },
      data: { gender: "MAN", interestedIn: "WOMEN" },
    });

    await prisma.$transaction((transaction) =>
      seedDemoIncomingLikes(transaction, {
        id: VIEWER_ID,
        gender: "MAN",
        interestedIn: "WOMEN",
      }),
    );

    expect(await prisma.swipe.findMany({
      where: { targetUserId: VIEWER_ID },
      select: { swiperId: true, action: true },
    })).toEqual([{ swiperId: "user_01", action: "LIKE" }]);

    const result = await applySwipe(VIEWER_ID, "user_01", "LIKE");
    expect(result.kind).toBe("SUCCESS");
    if (result.kind === "SUCCESS") expect(result.matched).toBe(true);
    expect((await getMutualMatches(VIEWER_ID)).map((match) => match.name)).toEqual(["Demo woman"]);
  });

  it("backfills a match for an existing like without recreating a removed match", async () => {
    await createUser("user_01", "Demo woman", "WOMAN");
    await prisma.user.update({
      where: { id: VIEWER_ID },
      data: { gender: "MAN", interestedIn: "WOMEN" },
    });
    await prisma.swipe.create({
      data: { swiperId: VIEWER_ID, targetUserId: "user_01", action: "LIKE" },
    });

    await prisma.$transaction((transaction) =>
      seedDemoIncomingLikes(transaction, {
        id: VIEWER_ID,
        gender: "MAN",
        interestedIn: "WOMEN",
      }),
    );
    const [match] = await getMutualMatches(VIEWER_ID);
    expect(match?.name).toBe("Demo woman");

    await removeUserMatch(VIEWER_ID, match.id);
    await prisma.$transaction((transaction) =>
      seedDemoIncomingLikes(transaction, {
        id: VIEWER_ID,
        gender: "MAN",
        interestedIn: "WOMEN",
      }),
    );
    expect(await getMutualMatches(VIEWER_ID)).toHaveLength(0);
  });

  it("saves a LIKE", async () => {
    await createUser("target-a");
    expect((await applySwipe(VIEWER_ID, "target-a", "LIKE")).kind).toBe("SUCCESS");
    expect(await prisma.swipe.findUnique({
      where: { swiperId_targetUserId: { swiperId: VIEWER_ID, targetUserId: "target-a" } },
    })).toMatchObject({ action: "LIKE" });
  });

  it("saves a PASS", async () => {
    await createUser("target-a");
    await applySwipe(VIEWER_ID, "target-a", "PASS");
    expect(await prisma.swipe.findUnique({
      where: { swiperId_targetUserId: { swiperId: VIEWER_ID, targetUserId: "target-a" } },
    })).toMatchObject({ action: "PASS" });
  });

  it("rejects duplicate swipes", async () => {
    await createUser("target-a");
    await applySwipe(VIEWER_ID, "target-a", "LIKE");
    expect((await applySwipe(VIEWER_ID, "target-a", "PASS")).kind).toBe("DUPLICATE");
  });

  it("creates a match for mutual likes", async () => {
    await createUser("target-a");
    await prisma.swipe.create({
      data: { swiperId: "target-a", targetUserId: VIEWER_ID, action: "LIKE" },
    });
    const profile = (await getFeed(VIEWER_ID)).find((item) => item.id === "target-a");
    expect(profile).toBeDefined();
    expect(profile).not.toHaveProperty("incomingLike");
    expect(profile).not.toHaveProperty("swipesOn");
    const result = await applySwipe(VIEWER_ID, "target-a", "LIKE");
    expect(result.kind).toBe("SUCCESS");
    if (result.kind === "SUCCESS") expect(result.matched).toBe(true);
    expect(await prisma.match.count()).toBe(1);
  });

  it("does not create a match for a one-sided like", async () => {
    await createUser("target-a");
    await prisma.swipe.create({
      data: { swiperId: "target-a", targetUserId: VIEWER_ID, action: "LIKE" },
    });
    await prisma.swipe.deleteMany({ where: { swiperId: "target-a" } });
    await applySwipe(VIEWER_ID, "target-a", "PASS");
    expect(await prisma.match.count()).toBe(0);
  });

  it("only exposes confirmed mutual matches", async () => {
    await createUser("mutual");
    await createUser("incoming-only");
    await prisma.swipe.create({
      data: { swiperId: "mutual", targetUserId: VIEWER_ID, action: "LIKE" },
    });
    await prisma.swipe.create({
      data: { swiperId: "incoming-only", targetUserId: VIEWER_ID, action: "LIKE" },
    });
    await applySwipe(VIEWER_ID, "mutual", "LIKE");
    const matches = await getMutualMatches(VIEWER_ID);
    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({ name: "mutual" });
  });

  it("persists messages for a match and deletes them when that match is removed", async () => {
    await createUser("chat-partner", "Chat partner");
    await prisma.swipe.create({
      data: { swiperId: "chat-partner", targetUserId: VIEWER_ID, action: "LIKE" },
    });
    await applySwipe(VIEWER_ID, "chat-partner", "LIKE");
    const [match] = await getMutualMatches(VIEWER_ID);

    const sent = await sendUserMessage(VIEWER_ID, match.id, "Hello!");
    expect(sent).toMatchObject({ senderId: VIEWER_ID, text: "Hello!" });
    expect(await getUserConversation(VIEWER_ID, match.id)).toMatchObject([
      { id: sent?.id, text: "Hello!", senderId: VIEWER_ID },
    ]);

    expect(await removeUserMatch(VIEWER_ID, match.id)).toBe(true);
    expect(await getUserConversation(VIEWER_ID, match.id)).toBeNull();
    expect(await prisma.message.count()).toBe(0);
  });

  it("does not allow conversation access or removal for a match without the demo user", async () => {
    await createUser("other-one");
    await createUser("other-two");
    const match = await prisma.match.create({
      data: { userOneId: "other-one", userTwoId: "other-two" },
    });

    expect(await getUserConversation(VIEWER_ID, match.id)).toBeNull();
    expect(await sendUserMessage(VIEWER_ID, match.id, "Not allowed")).toBeNull();
    expect(await removeUserMatch(VIEWER_ID, match.id)).toBe(false);
    expect(await prisma.match.findUnique({ where: { id: match.id } })).not.toBeNull();
  });

  it("allows incoming likers in the feed without exposing incoming-like data", async () => {
    await createUser("incoming-only");
    await prisma.swipe.create({
      data: { swiperId: "incoming-only", targetUserId: VIEWER_ID, action: "LIKE" },
    });
    const profile = (await getFeed(VIEWER_ID)).find((item) => item.id === "incoming-only");
    expect(profile).toBeDefined();
    expect(profile).not.toHaveProperty("incomingLike");
    expect(profile).not.toHaveProperty("swipesOn");
    expect(Object.keys(profile ?? {}).sort()).toEqual([
      "age",
      "bio",
      "city",
      "gender",
      "id",
      "interests",
      "name",
      "occupation",
      "photo",
    ]);
  });
});
