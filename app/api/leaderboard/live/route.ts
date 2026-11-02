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

    let leaderboard: unknown = await redis.get("leaderboard:live");

    if (leaderboard) {
      if (typeof leaderboard === "string") {
        try {
          leaderboard = JSON.parse(leaderboard);
        } catch {
          leaderboard = null;
        }
      }
    }

    if (!leaderboard) {
      const liveLeaderBoard = await prisma.profile.findMany({
        orderBy: { elo: "desc" },
        take: 10,
      });

      await redis.set("leaderboard:live", JSON.stringify(liveLeaderBoard));
      leaderboard = liveLeaderBoard;
    }

    const response = NextResponse.json(
      { liveLeaderBoard: leaderboard },
      { status: 200 }
    );

    if (newAnonId) {
      response.cookies.set("anon_id", newAnonId, {
        path: "/",
        maxAge: 365 * 24 * 60 * 60,
        httpOnly: true,
      });
    }

    return response;
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "liveLeaderboard Error" },
      { status: 500 }
    );
  }
}
