"use client";

import Image from "next/image";
import { useEffect, useState, useRef } from "react";
import axios from "axios";
import {
  Trophy,
  GitCommit,
  Users,
  FolderGit2,
  Star,
  ExternalLink,
  Flame,
  RotateCw,
  Sparkles,
} from "lucide-react";

export interface ProfileCardData {
  id: number;
  username: string;
  avatarUrl: string | null;
  followers: number;
  stars: number;
  repos: number;
  totalContributions: number;
  elo: number;
  prs?: number | null;
  issues?: number | null;
  commits?: number | null;
}

function getEloTier(elo: number): { name: string; color: string } {
  if (elo >= 150) return { name: "Grandmaster", color: "text-purple-500 dark:text-purple-400 bg-purple-500/10 border-purple-500/20" };
  if (elo >= 125) return { name: "Master", color: "text-rose-500 dark:text-rose-400 bg-rose-500/10 border-rose-500/20" };
  if (elo >= 115) return { name: "Diamond", color: "text-cyan-500 dark:text-cyan-400 bg-cyan-500/10 border-cyan-500/20" };
  if (elo >= 105) return { name: "Gold", color: "text-amber-500 dark:text-amber-400 bg-amber-500/10 border-amber-500/20" };
  if (elo >= 95) return { name: "Silver", color: "text-slate-500 dark:text-slate-300 bg-slate-500/10 border-slate-500/20" };
  return { name: "Contender", color: "text-emerald-500 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20" };
}

function formatStatNumber(val: number | null | undefined): string {
  if (val === null || val === undefined) return "0";
  if (val >= 1_000_000) return (val / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (val >= 10_000) return (val / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
  return val.toLocaleString();
}

export default function Card() {
  const [pair, setPair] = useState<ProfileCardData[]>([]);
  const [queue, setQueue] = useState<ProfileCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [votingIndex, setVotingIndex] = useState<number | null>(null);
  const [winnerAnimationIndex, setWinnerAnimationIndex] = useState<number | null>(null);
  const [animatingOutIndex, setAnimatingOutIndex] = useState<number | null>(null);
  const [animatingInIndex, setAnimatingInIndex] = useState<number | null>(null);
  const [badge, setBadge] = useState<{ id: number; delta: number; key: number } | null>(null);
  const [bumpId, setBumpId] = useState<number | null>(null);
  const [skipping, setSkipping] = useState(false);

  const badgeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const bumpTimerRef = useRef<NodeJS.Timeout | null>(null);
  const badgeCounterRef = useRef(0);

  const queueRef = useRef<ProfileCardData[]>([]);
  queueRef.current = queue;
  const isReplenishingRef = useRef(false);

  const replenishQueue = async (currentWinnerId: number, currentLoserId: number) => {
    if (isReplenishingRef.current) return;
    isReplenishingRef.current = true;
    try {
      const res = await axios.get(
        `/api/one?winner=${currentWinnerId}&loser=${currentLoserId}&count=6`
      );
      if (res.status === 200) {
        const incoming: ProfileCardData[] = Array.isArray(res.data.results)
          ? res.data.results
          : res.data.result
          ? [res.data.result]
          : [];

        if (incoming.length > 0) {
          setQueue((prev) => {
            const existingIds = new Set([
              ...prev.map((p) => p.id),
              currentWinnerId,
              currentLoserId,
            ]);
            const fresh = incoming.filter((p) => !existingIds.has(p.id));
            return [...prev, ...fresh];
          });
        }
      }
    } catch {
      // Non-critical background replenish
    } finally {
      isReplenishingRef.current = false;
    }
  };

  const showPair = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await axios.get("/api/pair");
      if (res.status === 200 && Array.isArray(res.data.result) && res.data.result.length >= 2) {
        setPair(res.data.result);
        if (Array.isArray(res.data.queue)) {
          setQueue(res.data.queue);
        }
      } else {
        setError("Not enough profiles found.");
      }
    } catch (err: unknown) {
      const errMessage = axios.isAxiosError(err) && err.response?.data?.error
        ? err.response.data.error
        : "Failed to load profiles";
      setError(errMessage);
    } finally {
      setLoading(false);
      setSkipping(false);
    }
  };

  useEffect(() => {
    showPair();
  }, []);

  const handleVote = async (winnerIndex: number) => {
    if (pair.length < 2 || votingIndex !== null) return;
    setError("");
    setVotingIndex(winnerIndex);

    const loserIndex = winnerIndex === 0 ? 1 : 0;
    const winner = pair[winnerIndex];
    const loser = pair[loserIndex];

    // 1. Calculate instant optimistic ELO gain
    const K = 32;
    const expectedWinner = 1 / (1 + Math.pow(10, (loser.elo - winner.elo) / 400));
    const estimatedDelta = Math.max(1, Math.round(K * (1 - expectedWinner)));

    // 2. Trigger snappy floating badge with unique key so it ALWAYS triggers on fast clicks
    if (badgeTimerRef.current) clearTimeout(badgeTimerRef.current);
    badgeCounterRef.current += 1;
    setBadge({ id: winner.id, delta: estimatedDelta, key: badgeCounterRef.current });
    badgeTimerRef.current = setTimeout(() => {
      setBadge(null);
    }, 900);

    // 3. Trigger immediate number bump animation
    if (bumpTimerRef.current) clearTimeout(bumpTimerRef.current);
    setBumpId(winner.id);
    bumpTimerRef.current = setTimeout(() => {
      setBumpId(null);
    }, 400);

    setWinnerAnimationIndex(winnerIndex);

    // 4. Instantly bump the winner's Elo on screen in 0 milliseconds
    setPair((prev) => {
      return prev.map((p) =>
        p.id === winner.id ? { ...p, elo: p.elo + estimatedDelta } : p
      );
    });

    // 5. Select pre-fetched challenger from memory queue for INSTANT swap
    let nextChallenger: ProfileCardData | null = null;
    const currentQueue = [...queueRef.current];

    const candidateIdx = currentQueue.findIndex((p) => p.id !== winner.id && p.id !== loser.id);
    if (candidateIdx !== -1) {
      nextChallenger = currentQueue.splice(candidateIdx, 1)[0];
      setQueue(currentQueue);
    }

    if (nextChallenger) {
      // Only animate out when we have a new challenger ready immediately
      setAnimatingOutIndex(loserIndex);
      setTimeout(() => {
        setPair((prev) => {
          return prev.map((p) => (p.id === loser.id ? nextChallenger! : p));
        });

        setAnimatingOutIndex(null);
        setAnimatingInIndex(loserIndex);
        setTimeout(() => setAnimatingInIndex(null), 200);
        setVotingIndex(null);
      }, 100);
    }

    // Proactively replenish queue in background whenever running low
    if (currentQueue.length < 5) {
      replenishQueue(winner.id, loser.id);
    }

    // 6. Synchronize with backend API in background
    try {
      const res = await axios.post("/api/vote", {
        winnerId: winner.id,
        loserId: loser.id,
      });

      if (res.status === 200) {
        // Reconcile winner's rating: NEVER allow Elo to decrease after winning
        setPair((prev) => {
          return prev.map((p) => {
            if (p.id === winner.id) {
              return { ...p, elo: Math.max(p.elo, res.data.updatedWinnerElo) };
            }
            return p;
          });
        });

        // If no queued challenger was loaded at click time, swap in the server's challenger
        if (!nextChallenger && res.data.nextProfile) {
          setAnimatingOutIndex(loserIndex);
          setTimeout(() => {
            setPair((prev) => {
              return prev.map((p) => (p.id === loser.id ? res.data.nextProfile : p));
            });
            setAnimatingOutIndex(null);
            setAnimatingInIndex(loserIndex);
            setTimeout(() => setAnimatingInIndex(null), 200);
            setVotingIndex(null);
          }, 80);
        }

        // Add server's fresh profile to the queue ONLY if it wasn't already mounted
        if (res.data.nextProfile && nextChallenger) {
          setQueue((prev) => {
            if (prev.some((p) => p.id === res.data.nextProfile.id)) return prev;
            return [...prev, res.data.nextProfile];
          });
        }

        // Keep queue healthy
        if (queueRef.current.length < 5) {
          replenishQueue(winner.id, loser.id);
        }
      }
    } catch (err: unknown) {
      console.error("Vote sync failed", err);
      if (!nextChallenger) {
        await showPair();
      }
    } finally {
      setVotingIndex(null);
      setAnimatingOutIndex(null);
      setTimeout(() => {
        setWinnerAnimationIndex(null);
      }, 800);
    }
  };

  const handleSkip = async () => {
    if (skipping || votingIndex !== null || pair.length < 2) return;
    setSkipping(true);

    const currentQueue = [...queueRef.current];

    if (currentQueue.length >= 2) {
      // Instantly swap both cards from pre-fetched queue
      const [nextA, nextB, ...restQueue] = currentQueue;
      setQueue(restQueue);

      setAnimatingOutIndex(-1);

      setTimeout(() => {
        setPair([nextA, nextB]);
        setAnimatingOutIndex(null);
        setAnimatingInIndex(-1);

        setTimeout(() => {
          setAnimatingInIndex(null);
          setSkipping(false);
        }, 220);
      }, 120);

      // Refill queue in background from /api/pair
      try {
        const res = await axios.get("/api/pair");
        if (res.status === 200 && Array.isArray(res.data.queue)) {
          setQueue((prev) => {
            const existingIds = new Set(prev.map((p) => p.id));
            existingIds.add(nextA.id);
            existingIds.add(nextB.id);
            const fresh = res.data.queue.filter((p: ProfileCardData) => !existingIds.has(p.id));
            return [...prev, ...fresh];
          });
        }
      } catch {
        // Background refill ignored
      }
      return;
    }

    if (currentQueue.length === 1) {
      // Swap card 1 immediately with available queued challenger
      const nextCard = currentQueue[0];
      setQueue([]);

      setAnimatingOutIndex(1);
      setTimeout(() => {
        setPair((prev) => [prev[0], nextCard]);
        setAnimatingOutIndex(null);
        setAnimatingInIndex(1);

        setTimeout(() => {
          setAnimatingInIndex(null);
          setSkipping(false);
        }, 220);
      }, 120);

      // Background refill pair
      try {
        const res = await axios.get("/api/pair");
        if (res.status === 200 && Array.isArray(res.data.queue)) {
          setQueue(res.data.queue);
        }
      } catch {
        // Ignored
      }
      return;
    }

    // Queue is empty: fast fetch without unmounting card layout
    try {
      setAnimatingOutIndex(-1);
      const res = await axios.get("/api/pair");
      if (res.status === 200 && Array.isArray(res.data.result) && res.data.result.length >= 2) {
        setPair(res.data.result);
        if (Array.isArray(res.data.queue)) {
          setQueue(res.data.queue);
        }
      }
    } catch (err: unknown) {
      console.error("Skip failed", err);
    } finally {
      setAnimatingOutIndex(null);
      setAnimatingInIndex(-1);
      setTimeout(() => {
        setAnimatingInIndex(null);
        setSkipping(false);
      }, 220);
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Loading arena matchup...</p>
      </div>
    );
  }

  if (error && (!pair || pair.length < 2)) {
    return (
      <div className="py-12 flex flex-col items-center justify-center gap-4 text-center">
        <p className="text-red-500 dark:text-red-400 font-medium">{error}</p>
        <button
          onClick={showPair}
          className="px-5 py-2 rounded-xl text-sm font-semibold bg-emerald-500 text-white hover:bg-emerald-600 transition shadow-md"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!pair || pair.length < 2) {
    return (
      <div className="py-12 text-center text-slate-500 dark:text-slate-400">
        <p>Not enough profiles found in the arena.</p>
        <button
          onClick={showPair}
          className="mt-4 px-5 py-2 rounded-xl text-sm font-semibold bg-emerald-500 text-white hover:bg-emerald-600 transition"
        >
          Refresh
        </button>
      </div>
    );
  }

  const renderCard = (user: ProfileCardData, index: number) => {
    const isWinnerCelebration = winnerAnimationIndex === index;
    const isAnimatingOut = animatingOutIndex === index || animatingOutIndex === -1;
    const isAnimatingIn = animatingInIndex === index || animatingInIndex === -1;
    const tier = getEloTier(user.elo);

    const avatarSrc =
      user.avatarUrl && user.avatarUrl.trim() !== ""
        ? user.avatarUrl
        : `https://github.com/${user.username}.png`;

    return (
      <div
        key={user.id}
        className={`
          relative flex-1 min-w-0 max-w-[340px] flex flex-col items-center justify-between
          bg-white/90 dark:bg-slate-900/60 backdrop-blur-xl
          border rounded-2xl sm:rounded-3xl p-2.5 sm:p-5 md:p-6 transition-all duration-200
          ${
            isWinnerCelebration
              ? "winner-pulse border-emerald-500/80 shadow-2xl shadow-emerald-500/20 scale-[1.02]"
              : "border-slate-200/90 dark:border-white/10 hover:border-emerald-500/40 shadow-xl dark:shadow-2xl"
          }
          ${
            isAnimatingOut
              ? "opacity-0 scale-95 translate-y-3"
              : isAnimatingIn
              ? "opacity-100 scale-100 animate-in fade-in zoom-in-95 duration-200"
              : "opacity-100 scale-100"
          }
        `}
      >
        {/* Floating Score Badge on Win */}
        {badge && badge.id === user.id && (
          <div
            key={badge.key}
            className="absolute -top-3 sm:-top-3.5 right-1 sm:right-6 z-30 float-score-badge bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-white font-black text-[10px] sm:text-xs px-2 sm:px-3.5 py-0.5 sm:py-1 rounded-full shadow-lg shadow-emerald-500/30 flex items-center gap-1 sm:gap-1.5 pointer-events-none"
          >
            <Sparkles size={11} className="text-amber-200 sm:w-[13px] sm:h-[13px]" />
            <span>+{badge.delta} ELO</span>
          </div>
        )}

        {/* Top bar: Tier Tag & GitHub Link */}
        <div className="w-full flex justify-between items-center mb-2 sm:mb-4 gap-1">
          <span
            className={`text-[9px] sm:text-[11px] font-semibold px-1.5 sm:px-2.5 py-0.5 rounded-full border leading-tight truncate ${tier.color}`}
          >
            {tier.name}
          </span>
          <a
            href={`https://github.com/${user.username}`}
            target="_blank"
            rel="noreferrer"
            className="text-slate-400 hover:text-emerald-500 transition-colors p-0.5 shrink-0"
            title="View GitHub profile"
          >
            <ExternalLink size={14} className="sm:w-[15px] sm:h-[15px]" />
          </a>
        </div>

        {/* Profile Avatar */}
        <div className="relative group shrink-0">
          <div className="w-16 h-16 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-xl sm:rounded-2xl overflow-hidden border sm:border-2 border-slate-200 dark:border-white/15 shadow-inner">
            <Image
              src={avatarSrc}
              alt={user.username}
              width={140}
              height={140}
              unoptimized
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
          {isWinnerCelebration && (
            <div className="absolute -bottom-1 -right-1 sm:-bottom-2 sm:-right-2 bg-emerald-500 text-white p-0.5 sm:p-1 rounded-full shadow-lg">
              <Trophy size={13} className="sm:w-4 sm:h-4" />
            </div>
          )}
        </div>

        {/* User Details & Stats */}
        <div className="flex flex-col items-center mt-2 sm:mt-3.5 text-center w-full min-w-0 flex-1">
          <h2 className="text-xs sm:text-base md:text-xl font-bold tracking-tight text-slate-900 dark:text-white truncate max-w-full">
            {user.username}
          </h2>

          {/* ELO Display */}
          <div className="mt-0.5 sm:mt-1 flex items-center gap-1 sm:gap-1.5 font-extrabold text-sm sm:text-xl md:text-2xl text-emerald-600 dark:text-emerald-400">
            <Trophy size={14} className="sm:w-5 sm:h-5 text-amber-500 shrink-0" />
            <span className={bumpId === user.id ? "elo-bump" : ""}>{user.elo}</span>
            <span className="text-[9px] sm:text-xs font-semibold uppercase text-slate-400 dark:text-slate-500">
              ELO
            </span>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-1 sm:gap-2 w-full mt-2 sm:mt-4 text-xs">
            <div className="flex items-center gap-1 sm:gap-2 p-1 sm:p-2 rounded-lg sm:rounded-xl bg-slate-100/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 min-w-0">
              <GitCommit size={12} className="sm:w-3.5 sm:h-3.5 text-emerald-500 shrink-0" />
              <div className="flex flex-col text-left min-w-0 truncate">
                <span className="text-slate-400 text-[8px] sm:text-[10px] leading-tight truncate">
                  <span className="hidden sm:inline">Contributions</span>
                  <span className="sm:hidden">Contrib</span>
                </span>
                <span className="font-bold text-[10px] sm:text-xs text-slate-800 dark:text-slate-200 leading-tight truncate">
                  {formatStatNumber(user.totalContributions)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-2 p-1 sm:p-2 rounded-lg sm:rounded-xl bg-slate-100/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 min-w-0">
              <Star size={12} className="sm:w-3.5 sm:h-3.5 text-amber-400 shrink-0" />
              <div className="flex flex-col text-left min-w-0 truncate">
                <span className="text-slate-400 text-[8px] sm:text-[10px] leading-tight truncate">Stars</span>
                <span className="font-bold text-[10px] sm:text-xs text-slate-800 dark:text-slate-200 leading-tight truncate">
                  {formatStatNumber(user.stars)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-2 p-1 sm:p-2 rounded-lg sm:rounded-xl bg-slate-100/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 min-w-0">
              <Users size={12} className="sm:w-3.5 sm:h-3.5 text-cyan-500 shrink-0" />
              <div className="flex flex-col text-left min-w-0 truncate">
                <span className="text-slate-400 text-[8px] sm:text-[10px] leading-tight truncate">
                  <span className="hidden sm:inline">Followers</span>
                  <span className="sm:hidden">Follow</span>
                </span>
                <span className="font-bold text-[10px] sm:text-xs text-slate-800 dark:text-slate-200 leading-tight truncate">
                  {formatStatNumber(user.followers)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-2 p-1 sm:p-2 rounded-lg sm:rounded-xl bg-slate-100/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 min-w-0">
              <FolderGit2 size={12} className="sm:w-3.5 sm:h-3.5 text-indigo-400 shrink-0" />
              <div className="flex flex-col text-left min-w-0 truncate">
                <span className="text-slate-400 text-[8px] sm:text-[10px] leading-tight truncate">Repos</span>
                <span className="font-bold text-[10px] sm:text-xs text-slate-800 dark:text-slate-200 leading-tight truncate">
                  {formatStatNumber(user.repos)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Vote Button */}
        <button
          onClick={() => handleVote(index)}
          disabled={votingIndex !== null}
          className="
            mt-3 sm:mt-5 w-full py-2 sm:py-2.5 px-2 sm:px-4 rounded-xl font-bold text-xs sm:text-sm
            flex items-center justify-center gap-1.5 transition-all duration-150 cursor-pointer shadow-md
            bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-white hover:shadow-emerald-500/30
          "
        >
          <Flame size={14} className="sm:w-4 sm:h-4 shrink-0" />
          <span className="truncate">
            Vote <span className="hidden sm:inline">for {user.username}</span>
          </span>
        </button>
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center w-full">
      {/* Cards Battle Arena */}
      <div className="w-full relative flex flex-row items-stretch justify-center gap-2 sm:gap-6 md:gap-8">
        {renderCard(pair[0], 0)}

        {/* VS Divider Badge */}
        <div className="shrink-0 flex items-center justify-center self-center z-20 -mx-3.5 sm:-mx-5 pointer-events-none">
          <div className="w-7 h-7 sm:w-11 sm:h-11 rounded-full flex items-center justify-center font-black text-[9px] sm:text-xs tracking-wider bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-xl shadow-emerald-500/30 border-2 border-white dark:border-slate-800 ring-2 ring-emerald-500/20">
            VS
          </div>
        </div>

        {renderCard(pair[1], 1)}
      </div>

      {/* Skip Matchup Button */}
      <div className="mt-4 sm:mt-6 flex items-center gap-3">
        <button
          onClick={handleSkip}
          disabled={skipping || votingIndex !== null}
          className="
            flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-semibold
            text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/5 border border-slate-200/80 dark:border-white/10
            hover:bg-slate-200 dark:hover:bg-white/10 transition cursor-pointer shadow-sm
          "
        >
          <RotateCw size={13} className={skipping ? "animate-spin" : ""} />
          <span>{skipping ? "Skipping..." : "Skip Matchup"}</span>
        </button>
      </div>
    </div>
  );
}