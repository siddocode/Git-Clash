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

export default function Card() {
  const [pair, setPair] = useState<ProfileCardData[]>([]);
  const [queue, setQueue] = useState<ProfileCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [votingIndex, setVotingIndex] = useState<number | null>(null);
  const [winnerAnimationIndex, setWinnerAnimationIndex] = useState<number | null>(null);
  const [animatingOutIndex, setAnimatingOutIndex] = useState<number | null>(null);
  const [animatingInIndex, setAnimatingInIndex] = useState<number | null>(null);
  const [scoreGain, setScoreGain] = useState<{ index: number; delta: number } | null>(null);
  const [skipping, setSkipping] = useState(false);

  const queueRef = useRef<ProfileCardData[]>([]);
  queueRef.current = queue;

  const replenishQueue = async (currentWinnerId: number, currentLoserId: number) => {
    try {
      const res = await axios.get(`/api/one?winner=${currentWinnerId}&loser=${currentLoserId}`);
      if (res.status === 200 && res.data.result) {
        setQueue((prev) => {
          if (prev.some((p) => p.id === res.data.result.id)) return prev;
          return [...prev, res.data.result];
        });
      }
    } catch {
      // Non-critical background replenish
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

    setScoreGain({ index: winnerIndex, delta: estimatedDelta });
    setWinnerAnimationIndex(winnerIndex);
    setAnimatingOutIndex(loserIndex);

    // 2. Select pre-fetched challenger from memory queue for INSTANT swap
    let nextChallenger: ProfileCardData | null = null;
    const currentQueue = [...queueRef.current];

    // Find a challenger in the queue not equal to winner or loser
    const candidateIdx = currentQueue.findIndex((p) => p.id !== winner.id && p.id !== loser.id);
    if (candidateIdx !== -1) {
      nextChallenger = currentQueue.splice(candidateIdx, 1)[0];
      setQueue(currentQueue);
    }

    // 3. Immediately swap card without blocking on network!
    if (nextChallenger) {
      setTimeout(() => {
        setPair((prev) => {
          if (prev.length < 2) return prev;
          const next = [...prev];
          next[winnerIndex] = {
            ...next[winnerIndex],
            elo: winner.elo + estimatedDelta,
          };
          next[loserIndex] = nextChallenger!;
          return next;
        });

        setAnimatingOutIndex(null);
        setAnimatingInIndex(loserIndex);
        setTimeout(() => setAnimatingInIndex(null), 250);
        setVotingIndex(null);
      }, 120);
    }

    // 4. Synchronize with backend API in background
    try {
      const res = await axios.post("/api/vote", {
        winnerId: winner.id,
        loserId: loser.id,
      });

      if (res.status === 200) {
        const actualDelta = res.data.delta || (res.data.updatedWinnerElo - winner.elo);
        setScoreGain({ index: winnerIndex, delta: actualDelta });

        // Update winner's exact server-validated rating
        setPair((prev) => {
          if (prev.length < 2) return prev;
          const next = [...prev];
          next[winnerIndex] = {
            ...next[winnerIndex],
            elo: res.data.updatedWinnerElo,
          };

          // If we had no queued challenger, swap in the server's challenger now
          if (!nextChallenger && res.data.nextProfile) {
            next[loserIndex] = res.data.nextProfile;
            setAnimatingOutIndex(null);
            setAnimatingInIndex(loserIndex);
            setTimeout(() => setAnimatingInIndex(null), 250);
            setVotingIndex(null);
          }

          return next;
        });

        // Add server's fresh profile to the queue for upcoming rounds
        if (res.data.nextProfile) {
          setQueue((prev) => {
            if (prev.some((p) => p.id === res.data.nextProfile.id)) return prev;
            return [...prev, res.data.nextProfile];
          });
        }

        // Keep queue healthy (replenish if running low)
        if (currentQueue.length < 3) {
          replenishQueue(winner.id, loser.id);
        }
      }
    } catch (err: unknown) {
      console.error("Vote sync failed", err);
      // If no challenger was loaded and vote failed, reload pair
      if (!nextChallenger) {
        await showPair();
      }
    } finally {
      setVotingIndex(null);
      setTimeout(() => {
        setWinnerAnimationIndex(null);
        setScoreGain(null);
      }, 1200);
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
    const isAnimatingOut = animatingOutIndex === index;
    const isAnimatingIn = animatingInIndex === index;
    const tier = getEloTier(user.elo);
    const scoreDiff = scoreGain && scoreGain.index === index ? scoreGain.delta : null;

    const avatarSrc =
      user.avatarUrl && user.avatarUrl.trim() !== ""
        ? user.avatarUrl
        : `https://github.com/${user.username}.png`;

    return (
      <div
        key={user.id}
        className={`
          relative w-full max-w-[340px] flex flex-col items-center
          bg-white/90 dark:bg-slate-900/60 backdrop-blur-xl
          border rounded-3xl p-6 transition-all duration-200
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
        {scoreDiff && (
          <div className="absolute -top-3 right-6 z-20 float-score-badge bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-extrabold text-xs px-3 py-1 rounded-full shadow-lg flex items-center gap-1">
            <Sparkles size={12} />
            <span>+{scoreDiff} ELO</span>
          </div>
        )}

        {/* Tier Tag */}
        <div className="w-full flex justify-between items-center mb-4">
          <span
            className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${tier.color}`}
          >
            {tier.name}
          </span>
          <a
            href={`https://github.com/${user.username}`}
            target="_blank"
            rel="noreferrer"
            className="text-slate-400 hover:text-emerald-500 transition-colors"
            title="View GitHub profile"
          >
            <ExternalLink size={15} />
          </a>
        </div>

        {/* Profile Avatar */}
        <div className="relative group">
          <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden border-2 border-slate-200 dark:border-white/15 shadow-inner">
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
            <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-1 rounded-full shadow-lg">
              <Trophy size={16} />
            </div>
          )}
        </div>

        {/* User Details */}
        <div className="flex flex-col items-center mt-3.5 text-center w-full">
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white truncate max-w-[240px]">
            {user.username}
          </h2>

          {/* ELO Display */}
          <div className="mt-1 flex items-center gap-1.5 font-extrabold text-2xl text-emerald-600 dark:text-emerald-400">
            <Trophy size={20} className="text-amber-500" />
            <span>{user.elo}</span>
            <span className="text-xs font-semibold uppercase text-slate-400 dark:text-slate-500">
              ELO
            </span>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-2 w-full mt-4 text-xs">
            <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-100/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/5">
              <GitCommit size={14} className="text-emerald-500 shrink-0" />
              <div className="flex flex-col text-left truncate">
                <span className="text-slate-400 text-[10px]">Contributions</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {user.totalContributions?.toLocaleString() ?? 0}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-100/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/5">
              <Star size={14} className="text-amber-400 shrink-0" />
              <div className="flex flex-col text-left truncate">
                <span className="text-slate-400 text-[10px]">Stars</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {user.stars?.toLocaleString() ?? 0}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-100/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/5">
              <Users size={14} className="text-cyan-500 shrink-0" />
              <div className="flex flex-col text-left truncate">
                <span className="text-slate-400 text-[10px]">Followers</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {user.followers?.toLocaleString() ?? 0}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-100/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/5">
              <FolderGit2 size={14} className="text-indigo-400 shrink-0" />
              <div className="flex flex-col text-left truncate">
                <span className="text-slate-400 text-[10px]">Repos</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {user.repos?.toLocaleString() ?? 0}
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
            mt-5 w-full py-2.5 px-4 rounded-xl font-bold text-sm
            flex items-center justify-center gap-2 transition-all duration-150 cursor-pointer shadow-md
            bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-white hover:shadow-emerald-500/30
          "
        >
          <Flame size={16} />
          <span>Vote for {user.username}</span>
        </button>
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center">
      {/* Cards Battle Arena */}
      <div className="w-full flex flex-col md:flex-row items-center justify-center gap-5 sm:gap-8">
        {renderCard(pair[0], 0)}

        {/* VS Divider Badge */}
        <div className="flex flex-col items-center gap-1 my-1 md:my-0">
          <div className="w-11 h-11 rounded-full flex items-center justify-center font-black text-xs tracking-wider bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20 border-2 border-white dark:border-slate-800">
            VS
          </div>
        </div>

        {renderCard(pair[1], 1)}
      </div>

      {/* Skip Matchup Button */}
      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={() => {
            setSkipping(true);
            showPair();
          }}
          disabled={skipping || votingIndex !== null}
          className="
            flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold
            text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/5 border border-slate-200/80 dark:border-white/10
            hover:bg-slate-200 dark:hover:bg-white/10 transition cursor-pointer shadow-sm
          "
        >
          <RotateCw size={13} className={skipping ? "animate-spin" : ""} />
          <span>Skip Matchup</span>
        </button>
      </div>
    </div>
  );
}