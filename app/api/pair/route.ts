import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import type { Profile } from "@prisma/client";

function pairKey(a: number, b: number) {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    let anonId = cookieStore.get("anon_id")?.value;

    let newAnonId: string | null = null;
    if (!anonId) {
      newAnonId = crypto.randomUUID();
      anonId = newAnonId;
    }

    const [cached, seenMembersRaw] = await Promise.all([
      redis.get("profiles:list"),
      anonId ? redis.smembers(`seen_pairs:${anonId}`) : Promise.resolve([]),
    ]);

    let allProfiles: Profile[] | null = null;
    if (cached) {
      if (typeof cached === "string") {
        try {
          allProfiles = JSON.parse(cached);
        } catch {
          allProfiles = null;
        }
      } else if (Array.isArray(cached)) {
        allProfiles = cached as Profile[];
      }
    }

    if (!allProfiles || allProfiles.length < 2) {
      const fromDB = await prisma.profile.findMany();
      await redis.set("profiles:list", JSON.stringify(fromDB));
      allProfiles = fromDB;
    }

    if (allProfiles.length < 2) {
      return NextResponse.json(
        { error: "Not enough profiles" },
        { status: 400 }
      );
    }

    let A = allProfiles[Math.floor(Math.random() * allProfiles.length)];
    let B = allProfiles[Math.floor(Math.random() * allProfiles.length)];

    while (A.id === B.id) {
      B = allProfiles[Math.floor(Math.random() * allProfiles.length)];
    }

    const seenMembers: string[] = (seenMembersRaw as string[]) || [];
    const seenSet = new Set(seenMembers);

    if (seenSet.has(pairKey(A.id, B.id))) {
      const shuffled = [...allProfiles];

      // Fisher–Yates shuffle
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }

      let found = null;

      for (let i = 0; i < shuffled.length; i++) {
        for (let j = i + 1; j < shuffled.length; j++) {
          const k = pairKey(shuffled[i].id, shuffled[j].id);
          if (!seenSet.has(k)) {
            found = [shuffled[i], shuffled[j]];
            break;
          }
        }
        if (found) break;
      }

      if (found) {
        A = found[0];
        B = found[1];
      }
      // If all combinations have been seen, fall back to the random A and B
    }

    // Build a pre-fetched pool of candidates so the frontend has challengers ready in memory
    const remaining = allProfiles.filter((p) => p.id !== A.id && p.id !== B.id);
    const pool = [];
    for (let i = 0; i < Math.min(10, remaining.length); i++) {
      const idx = Math.floor(Math.random() * remaining.length);
      pool.push(remaining.splice(idx, 1)[0]);
    }

    const response = NextResponse.json({ result: [A, B], queue: pool });
    if (newAnonId) {
      response.cookies.set("anon_id", newAnonId, {
        path: "/",
        maxAge: 365 * 24 * 60 * 60,
        httpOnly: true,
      });
    }
    return response;
  } catch (err) {
    console.error("PAIR ERROR", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
