import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { username } = await req.json();
    if (!username) {
      return NextResponse.json({ error: "Username Required" }, { status: 400 });
    }

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

    let profile = await prisma.profile.findUnique({
      where: { username },
    });

    const isExisting = Boolean(profile);

    if (!profile) {
      const userRes = await fetch(`https://api.github.com/users/${username}`, {
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        },
      });

      if (!userRes.ok) {
        return NextResponse.json(
          { error: "Github user lookup failed" },
          { status: userRes.status }
        );
      }

      const user = await userRes.json();

      if (user.message === "Not Found") {
        return NextResponse.json(
          { error: "Github user not found" },
          { status: 404 }
        );
      }


      const reposRes = await fetch(user.repos_url, {
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        },
      });

      const repos = await reposRes.json();
      const stars = Array.isArray(repos)
        ? repos.reduce(
            (sum: number, repo: { stargazers_count?: number }) => sum + (repo.stargazers_count || 0),
            0
          )
        : 0;

      const gqlQuery = `
        query ($login: String!) {
          user(login: $login) {
            contributionsCollection {
              contributionCalendar { totalContributions }
              pullRequestContributions(first: 100) { totalCount }
              issueContributions(first: 100) { totalCount }
              commitContributionsByRepository {
                contributions(first: 100) { totalCount }
              }
            }
          }
        }
      `;

      const graphRes = await fetch("https://api.github.com/graphql", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: gqlQuery,
          variables: { login: username },
        }),
      });

      const graphJson = await graphRes.json();
      if (!graphJson.data || graphJson.errors) {
        return NextResponse.json(
          { error: "GraphQL error", details: graphJson.errors },
          { status: 500 }
        );
      }

      const contrib = graphJson.data.user.contributionsCollection;
      const commits = (contrib.commitContributionsByRepository || []).reduce(
        (sum: number, repo: { contributions?: { totalCount?: number } }) =>
          sum + (repo?.contributions?.totalCount || 0),
        0
      );

      profile = await prisma.profile.create({
        data: {
          username: user.login,
          avatarUrl: user.avatar_url,
          followers: user.followers,
          stars,
          repos: user.public_repos,
          totalContributions: contrib.contributionCalendar.totalContributions,
          prs: contrib.pullRequestContributions.totalCount,
          issues: contrib.issueContributions.totalCount,
          commits,
        },
      });
    }

    if (!profile) {
      return NextResponse.json(
        { error: "Unexpected error: profile is null" },
        { status: 500 }
      );
    }

    await prisma.uploadedProfile.upsert({
      where: {
        userId_profileId: {
          userId: anonId,
          profileId: profile.id,
        },
      },
      create: {
        userId: anonId,
        profileId: profile.id,
      },
      update: {},
    });

    const response = NextResponse.json(
      {
        message: isExisting ? "Profile already exists" : "New profile added",
        profile,
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
    console.log(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
