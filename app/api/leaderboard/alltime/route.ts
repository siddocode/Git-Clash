import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const anonId = cookieStore.get("anon_id")?.value;

    let newAnonId: string | null = null;
    if (!anonId) {
      newAnonId = crypto.randomUUID();
    }

    // Check Redis cache first for instant response
    const cached: unknown = await redis.get("leaderboard:alltime");
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
        const res = NextResponse.json(parsed, {
          status: 200,
          headers: {
            "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
          },
        });
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

    const records = await prisma.allTimeHistory.findMany({
      take: 150,
      orderBy: [
        { weekCount: "desc" },
        { rank: "asc" },
        { elo: "desc" },
      ],
      include: { profile: true },
    });

    const seenProfileIds = new Set<number>();
    const deduplicated = [];

    for (const r of records) {
      if (!seenProfileIds.has(r.profileId)) {
        seenProfileIds.add(r.profileId);
        deduplicated.push({
          id: r.id,
          rank: deduplicated.length + 1,
          week: r.week,
          weekCount: r.weekCount,
          elo: r.profile?.elo ?? r.elo,
          profileId: r.profileId,
          profile: r.profile,
        });
        if (deduplicated.length >= 50) break;
      }
    }

    let finalLeaderboard = deduplicated;

    if (finalLeaderboard.length === 0) {
      const liveProfiles = await prisma.profile.findMany({
        orderBy: { elo: "desc" },
        take: 50,
      });

      finalLeaderboard = liveProfiles.map((p, index) => ({
        id: p.id,
        rank: index + 1,
        week: 1,
        weekCount: 1,
        elo: p.elo,
        profileId: p.id,
        profile: p,
      }));
    }

    // Cache in Redis for 1 hour
    await redis.set("leaderboard:alltime", JSON.stringify(finalLeaderboard), { ex: 3600 });

    const res = NextResponse.json(finalLeaderboard, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
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
      { error: "AllTimeLeaderBoard Server Error" },
      { status: 500 }
    );
  }
}