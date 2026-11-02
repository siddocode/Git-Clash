import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";

export async function GET(req: NextRequest) {
  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page")) || 1);
  const limit = Number(req.nextUrl.searchParams.get("limit")) || 20;
  const skip = (page - 1) * limit;

  const pageKey = `leaderboard:page:${page}`;
  const totalKey = "leaderboard:totalCount";

  const cached = await redis.get(pageKey);

  if (cached && typeof cached === "string") {
    try {
      return NextResponse.json(JSON.parse(cached));
    } catch {
      console.error("Invalid JSON in Redis", cached);
    }
  }

  let total = Number(await redis.get(totalKey));

  if (!total) {
    total = await prisma.profile.count();
    await redis.set(totalKey, total.toString(), { ex: 300 });
  }

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const users = await prisma.profile.findMany({
    orderBy: { elo: "desc" },
    skip,
    take: limit,
  });

  const responseData = {
    page,
    limit,
    total,
    totalPages,
    users,
  };

  await redis.set(pageKey, JSON.stringify(responseData), { ex: 60 });

  return NextResponse.json(responseData);
}

