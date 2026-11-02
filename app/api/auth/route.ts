import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const cookieStore = await cookies();
  let anonId = cookieStore.get("anon_id")?.value;
  let newAnonId: string | null = null;

  if (!anonId) {
    anonId = crypto.randomUUID();
    newAnonId = anonId;
    await prisma.anonymousUser.create({
      data: {
        id: anonId,
      },
    });
  }

  let user = await prisma.anonymousUser.findUnique({
    where: {
      id: anonId,
    },
  });

  if (!user) {
    user = await prisma.anonymousUser.create({
      data: {
        id: anonId,
      },
    });
  }

  const res = NextResponse.json({ user });
  if (newAnonId) {
    res.cookies.set("anon_id", newAnonId, {
      path: "/",
      maxAge: 365 * 24 * 60 * 60,
      httpOnly: true,
    });
  }

  return res;
}