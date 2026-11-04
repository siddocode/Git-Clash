import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import type { Profile } from "@prisma/client";


function pairKey(a: number, b: number) {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const anonId = cookieStore.get("anon_id")?.value;

    if (!anonId) {
      return NextResponse.json(
        { error: "User not initialized" },
        { status: 400 }
      );
    }

    const winnerId = Number(req.nextUrl.searchParams.get("winner"));
    const loserId = Number(req.nextUrl.searchParams.get("loser"));

    if (!winnerId || !loserId) {
      return NextResponse.json(
        { error: "Winner/loser missing" },
        { status: 400 }
      );
    }

    let allProfiles: Profile[] = await redis.get("profiles:list") as Profile[];

    if (!allProfiles) {
      const fromDB = await prisma.profile.findMany();
      await redis.set("profiles:list", JSON.stringify(fromDB));
      allProfiles = fromDB;
    } else {
      if (typeof allProfiles === "string") {
        allProfiles = JSON.parse(allProfiles);
      }
    }

    const seenMembers: string[] = (await redis.smembers(`seen_pairs:${anonId}`)) || [];
    const seenSet = new Set(seenMembers);

    let candidates: Profile[] = allProfiles.filter(
      (p) => p.id !== winnerId && p.id !== loserId && !seenSet.has(pairKey(winnerId, p.id))
    );

    if (candidates.length === 0) {
      // Fallback: any candidate other than current pair
      candidates = allProfiles.filter(
        (p) => p.id !== winnerId && p.id !== loserId
      );
    }

    if (candidates.length === 0) {
      return NextResponse.json(
        { error: "No more profiles available" },
        { status: 400 }
      );
    }

    const countParam = Number(req.nextUrl.searchParams.get("count"));
    const count = Number.isFinite(countParam) && countParam > 1 ? Math.min(countParam, 10) : 1;

    // Shuffle candidates to return varied challengers
    const shuffled = [...candidates].sort(() => 0.5 - Math.random());
    const results = shuffled.slice(0, count);

    return NextResponse.json({
      result: results[0],
      results: results,
    });
  } catch (err) {
    console.error("ONE ERROR", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
