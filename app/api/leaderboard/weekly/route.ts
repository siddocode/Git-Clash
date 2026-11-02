import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { weekCount } from "@/lib/weekCount";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const anonId = cookieStore.get("anon_id")?.value;

    let newAnonId: string | null = null;
    if (!anonId) {
      newAnonId = crypto.randomUUID();
      await prisma.anonymousUser.upsert({
        where: { id: newAnonId },
        update: {},
        create: { id: newAnonId },
      });
    }

    const currentWeek = weekCount(new Date());
    const cacheKey = `leaderboard:weekly:${currentWeek}`;

    const cached: unknown = await redis.get(cacheKey);
    if (cached) {
      let parsed = null;
      if (typeof cached === "string") {
        try {
          parsed = JSON.parse(cached);
        } catch {
          parsed = null;
        }
      } else if (Array.isArray(cached)) {
        parsed = cached;
      }
      if (parsed) {
        const res = NextResponse.json(parsed, { status: 200 });
        if (newAnonId) {
          res.cookies.set("anon_id", newAnonId, {
            path: "/",
            maxAge: 365 * 24 * 60 * 60,
            httpOnly: true,
          });
        }
        return res;
      }
    }

    let weeklyHistory = await prisma.weeklyHistory.findMany({
      where: { week: currentWeek },
      orderBy: { rank: "asc" },
      include: { profile: true },
      take: 50,
    });

    if (weeklyHistory.length === 0) {
      const latestSnapshot = await prisma.weeklyHistory.findFirst({
        orderBy: { week: "desc" },
        select: { week: true },
      });

      if (latestSnapshot) {
        weeklyHistory = await prisma.weeklyHistory.findMany({
          where: { week: latestSnapshot.week },
          orderBy: { rank: "asc" },
          include: { profile: true },
          take: 50,
        });
      }
    }

    if (weeklyHistory.length === 0) {
      const liveProfiles = await prisma.profile.findMany({
        orderBy: { elo: "desc" },
        take: 50,
      });

      const fallbackWeekly = liveProfiles.map((p, index) => ({
        id: p.id,
        rank: index + 1,
        week: currentWeek,
        elo: p.elo,
        profileId: p.id,
        profile: p,
      }));

      await redis.set(cacheKey, JSON.stringify(fallbackWeekly), { ex: 300 });

      const res = NextResponse.json(fallbackWeekly, { status: 200 });
      if (newAnonId) {
        res.cookies.set("anon_id", newAnonId, {
          path: "/",
          maxAge: 365 * 24 * 60 * 60,
          httpOnly: true,
        });
      }
      return res;
    }

    await redis.set(cacheKey, JSON.stringify(weeklyHistory), { ex: 300 });

    const res = NextResponse.json(weeklyHistory, { status: 200 });
    if (newAnonId) {
      res.cookies.set("anon_id", newAnonId, {
        path: "/",
        maxAge: 365 * 24 * 60 * 60,
        httpOnly: true,
      });
    }
    return res;
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Weekly Response Server Failed" },
      { status: 500 }
    );
  }
}