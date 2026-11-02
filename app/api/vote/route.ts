import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import type { Profile } from "@prisma/client";

function pairKey(a: number, b: number) {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

export async function POST(req: NextRequest) {
  try {
    const { winnerId, loserId } = await req.json();

    const cookieStore = await cookies();
    let anonId = cookieStore.get("anon_id")?.value;
    let responseCookies: NextResponse | null = null;

    if (!anonId) {
      anonId = crypto.randomUUID();

      responseCookies = NextResponse.json({});
      responseCookies.cookies.set("anon_id", anonId, {
        path: "/",
        maxAge: 365 * 24 * 60 * 60,
        httpOnly: true,
      });
    }

    // 1. Fetch winner and loser in a single database roundtrip
    const [profiles, cachedProfiles] = await Promise.all([
      prisma.profile.findMany({
        where: { id: { in: [winnerId, loserId] } },
      }),
      redis.get("profiles:list"),
    ]);

    const winner = profiles.find((p) => p.id === winnerId);
    const loser = profiles.find((p) => p.id === loserId);

    if (!winner || !loser) {
      return NextResponse.json({ error: "Invalid profiles" }, { status: 400 });
    }

    // 2. Compute Elo delta
    const K = 32;
    const expectedWinner =
      1 / (1 + Math.pow(10, (loser.elo - winner.elo) / 400));

    const delta = Math.max(1, Math.round(K * (1 - expectedWinner)));
    const newWinnerElo = winner.elo + delta;
    const newLoserElo = Math.max(0, loser.elo - delta);

    // 3. Update profiles in-memory from cached list to avoid a heavy table scan
    let allProfiles: Profile[] = [];
    if (cachedProfiles && typeof cachedProfiles === "string") {
      try {
        allProfiles = JSON.parse(cachedProfiles);
      } catch {
        allProfiles = [];
      }
    } else if (Array.isArray(cachedProfiles)) {
      allProfiles = cachedProfiles as Profile[];
    }

    if (allProfiles.length === 0) {
      allProfiles = await prisma.profile.findMany({ orderBy: { elo: "desc" } });
    } else {
      for (const p of allProfiles) {
        if (p.id === winnerId) p.elo = newWinnerElo;
        if (p.id === loserId) p.elo = newLoserElo;
      }
      allProfiles.sort((a, b) => b.elo - a.elo);
    }

    const top10 = allProfiles.slice(0, 10);
    const key = pairKey(winnerId, loserId);

    // 4. Execute database transaction and pipelined Redis write in parallel
    const pipeline = redis.pipeline();
    pipeline.sadd(`seen_pairs:${anonId}`, key);
    pipeline.set("leaderboard:live", JSON.stringify(top10));
    pipeline.set("profiles:list", JSON.stringify(allProfiles));
    pipeline.smembers(`seen_pairs:${anonId}`);

    const [, redisResults] = await Promise.all([
      prisma.$transaction([
        prisma.anonymousUser.upsert({
          where: { id: anonId },
          update: {},
          create: { id: anonId },
        }),
        prisma.profile.update({
          where: { id: winnerId },
          data: { elo: newWinnerElo },
        }),
        prisma.profile.update({
          where: { id: loserId },
          data: { elo: newLoserElo },
        }),
        prisma.vote.create({
          data: { userId: anonId, winnerId, loserId },
        }),
        prisma.votePair.create({
          data: {
            userId: anonId,
            profileA: winnerId,
            profileB: loserId,
          },
        }),
        prisma.seenProfile.createMany({
          data: [
            { userId: anonId, profileId: winnerId },
            { userId: anonId, profileId: loserId },
          ],
          skipDuplicates: true,
        }),
      ]),
      pipeline.exec(),
    ]);

    // 5. Select next challenger for reigning winner
    const seenMembers = (redisResults?.[3] as string[]) || [];
    const seenSet = new Set(seenMembers);
    seenSet.add(key);

    let candidates = allProfiles.filter(
      (p) => p.id !== winnerId && p.id !== loserId && !seenSet.has(pairKey(winnerId, p.id))
    );

    if (candidates.length === 0) {
      candidates = allProfiles.filter((p) => p.id !== winnerId && p.id !== loserId);
    }

    const nextChallenger =
      candidates.length > 0
        ? candidates[Math.floor(Math.random() * candidates.length)]
        : null;

    const response = NextResponse.json(
      {
        success: true,
        updatedWinnerElo: newWinnerElo,
        updatedLoserElo: newLoserElo,
        delta,
        leaderboard: top10,
        nextProfile: nextChallenger,
      },
      { status: 200 }
    );

    if (responseCookies) {
      response.cookies.set("anon_id", anonId, {
        path: "/",
        maxAge: 365 * 24 * 60 * 60,
        httpOnly: true,
      });
    }

    return response;
  } catch (err) {
    console.error("VOTE API ERROR", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
