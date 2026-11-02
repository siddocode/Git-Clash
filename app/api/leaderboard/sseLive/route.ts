import { redis } from "@/lib/redis";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const encoder = new TextEncoder();

  return new Response(
    new ReadableStream({
      start(controller) {
        let closed = false;

        const send = async () => {
          if (closed) return;

          let leaderboard: unknown = await redis.get("leaderboard:live");
          if (typeof leaderboard === "string") {
            try {
              leaderboard = JSON.parse(leaderboard);
            } catch {
              leaderboard = null;
            }
          }

          if (!leaderboard) {
            try {
              const liveLeaderBoard = await prisma.profile.findMany({
                orderBy: { elo: "desc" },
                take: 10,
              });
              await redis.set("leaderboard:live", JSON.stringify(liveLeaderBoard));
              leaderboard = liveLeaderBoard;
            } catch {
              leaderboard = [];
            }
          }

          try {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(leaderboard || [])}\n\n`)
            );
          } catch {
            cleanup();
          }
        };

        const interval = setInterval(send, 3000);

        const cleanup = () => {
          if (!closed) {
            closed = true;
            clearInterval(interval);
            try {
              controller.close();
            } catch {}
          }
        };

        send();

        return cleanup;
      },
    }),
    {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    }
  );
}
