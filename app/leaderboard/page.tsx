"use client";

import axios from "axios";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Trophy,
  Calendar,
  Sparkles,
  ExternalLink,
  Search,
  Swords,
  Crown,
} from "lucide-react";

interface ProfileItem {
  id: number;
  username: string;
  avatarUrl: string | null;
  elo: number;
}

interface LeaderboardEntry {
  id: number;
  rank: number;
  week?: number;
  weekCount?: number;
  elo: number;
  profileId?: number;
  profile?: ProfileItem | null;
  username?: string;
  avatarUrl?: string | null;
}

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState<"alltime" | "weekly">("alltime");
  const [allTime, setAllTime] = useState<LeaderboardEntry[]>([]);
  const [weekly, setWeekly] = useState<LeaderboardEntry[]>([]);
  const [loadingAllTime, setLoadingAllTime] = useState(true);
  const [loadingWeekly, setLoadingWeekly] = useState(true);
  const [errorAllTime, setErrorAllTime] = useState<string | null>(null);
  const [errorWeekly, setErrorWeekly] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function fetchAllTime() {
      setLoadingAllTime(true);
      setErrorAllTime(null);
      try {
        const res = await axios.get("/api/leaderboard/alltime");
        if (res.status === 200 && Array.isArray(res.data)) {
          setAllTime(res.data);
        } else {
          setAllTime([]);
        }
      } catch (err: unknown) {
        console.error("Failed to load all time leaderboard", err);
        setErrorAllTime("Unable to load all-time rankings.");
      } finally {
        setLoadingAllTime(false);
      }
    }
    fetchAllTime();
  }, []);

  useEffect(() => {
    async function fetchWeekly() {
      setLoadingWeekly(true);
      setErrorWeekly(null);
      try {
        const res = await axios.get("/api/leaderboard/weekly");
        if (res.status === 200 && Array.isArray(res.data)) {
          setWeekly(res.data);
        } else {
          setWeekly([]);
        }
      } catch (err: unknown) {
        console.error("Failed to load weekly leaderboard", err);
        setErrorWeekly("Unable to load weekly rankings.");
      } finally {
        setLoadingWeekly(false);
      }
    }
    fetchWeekly();
  }, []);

  const getEntryUsername = (entry: LeaderboardEntry): string => {
    return entry.profile?.username || entry.username || `dev-${entry.id}`;
  };

  const currentList = activeTab === "alltime" ? allTime : weekly;
  const currentLoading = activeTab === "alltime" ? loadingAllTime : loadingWeekly;
  const currentError = activeTab === "alltime" ? errorAllTime : errorWeekly;

  const filteredList = currentList.filter((entry) => {
    const uname = getEntryUsername(entry).toLowerCase();
    return uname.includes(searchQuery.toLowerCase());
  });

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-xl font-black text-xs bg-amber-400 text-amber-950 shadow-md shadow-amber-400/30">
          <Crown size={14} />
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-xl font-black text-xs bg-slate-300 dark:bg-slate-400 text-slate-900 shadow-sm">
          2
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-xl font-black text-xs bg-amber-700 text-amber-100 shadow-sm">
          3
        </span>
      );
    }
    return (
      <span className="text-slate-400 dark:text-slate-500 font-bold text-xs pl-2">
        #{rank}
      </span>
    );
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* Header Banner */}
      <div className="w-full flex flex-col items-center text-center mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline mb-3"
        >
          <Swords size={14} />
          <span>← Back to Arena Battles</span>
        </Link>

        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Developer Leaderboards
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 max-w-md">
          Explore historical rankings, weekly championship snapshots, and the all-time elite developers.
        </p>

        {/* Tab Controls */}
        <div className="mt-6 flex p-1.5 rounded-2xl bg-slate-200/80 dark:bg-white/10 backdrop-blur-xl border border-slate-300/80 dark:border-white/10">
          <button
            onClick={() => setActiveTab("alltime")}
            className={`
              flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer
              ${
                activeTab === "alltime"
                  ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-md"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }
            `}
          >
            <Trophy size={14} />
            <span>All-Time Rankings</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-white/10">
              {allTime.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("weekly")}
            className={`
              flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer
              ${
                activeTab === "weekly"
                  ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-md"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }
            `}
          >
            <Calendar size={14} />
            <span>This Week&apos;s Snapshot</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-white/10">
              {weekly.length}
            </span>
          </button>
        </div>
      </div>

      {/* Main Leaderboard Table Container */}
      <div className="w-full bg-white/85 dark:bg-slate-900/50 backdrop-blur-2xl border border-slate-200/90 dark:border-white/10 rounded-3xl p-5 sm:p-6 shadow-xl dark:shadow-2xl">
        {/* Table Search & Meta */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 mb-3 border-b border-slate-200/80 dark:border-white/10">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>
                {activeTab === "alltime" ? "All-Time Standings" : "Weekly Champions Snapshot"}
              </span>
              <Sparkles size={16} className="text-emerald-500" />
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {activeTab === "alltime"
                ? "Deduplicated ranking based on accumulated top weeks and peak ELO rating."
                : "Weekly leaderboard snapshot captured automatically every week."}
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search size={15} className="absolute left-3.5 top-3 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search developer..."
              className="
                w-full pl-9 pr-4 py-2 rounded-xl text-xs
                bg-slate-100/90 dark:bg-white/5 text-slate-900 dark:text-white
                placeholder-slate-400 border border-slate-200 dark:border-white/10
                focus:border-emerald-500 focus:outline-none transition
              "
            />
          </div>
        </div>

        {/* Table Headers */}
        <div className="grid grid-cols-12 py-2.5 px-3 text-slate-500 dark:text-slate-400 font-semibold text-xs border-b border-slate-200/60 dark:border-white/5">
          <span className="col-span-2 sm:col-span-1">Rank</span>
          <span className="col-span-5 sm:col-span-6">Developer</span>
          <span className="col-span-3 sm:col-span-3 text-center">
            {activeTab === "alltime" ? "ELO Rating" : "Score"}
          </span>
          <span className="col-span-2 sm:col-span-2 text-right pr-2">
            {activeTab === "alltime" ? "Top Weeks" : "GitHub"}
          </span>
        </div>

        {/* Table Content */}
        {currentLoading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
            <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-medium">Loading leaderboard records...</span>
          </div>
        ) : currentError ? (
          <div className="py-12 text-center text-sm text-rose-500">
            {currentError}
          </div>
        ) : filteredList.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">
            {searchQuery ? "No developers match your search." : "No records available."}
          </div>
        ) : (
          <div className="divide-y divide-slate-200/50 dark:divide-white/5">
            {filteredList.map((entry, index) => {
              const username = getEntryUsername(entry);
              const rank = entry.rank || index + 1;
              const elo = entry.profile?.elo ?? entry.elo;
              const avatar =
                entry.profile?.avatarUrl ||
                entry.avatarUrl ||
                `https://github.com/${username}.png`;

              return (
                <div
                  key={`${entry.id}-${username}-${index}`}
                  className="grid grid-cols-12 py-3 px-3 items-center rounded-xl hover:bg-slate-100/60 dark:hover:bg-white/[0.03] transition-colors"
                >
                  {/* Rank */}
                  <div className="col-span-2 sm:col-span-1 flex items-center">
                    {getRankBadge(rank)}
                  </div>

                  {/* Profile info */}
                  <div className="col-span-5 sm:col-span-6 flex items-center gap-3 truncate">
                    <div className="w-8 h-8 rounded-xl overflow-hidden shrink-0 border border-slate-200 dark:border-white/10 shadow-sm">
                      <Image
                        src={avatar}
                        alt={username}
                        width={32}
                        height={32}
                        unoptimized
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex flex-col truncate">
                      <span className="font-bold text-slate-900 dark:text-white text-sm truncate">
                        {username}
                      </span>
                      {activeTab === "alltime" && (
                        <span className="text-[10px] text-slate-400 truncate">
                          Profile ID #{entry.profileId || entry.id}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Score */}
                  <div className="col-span-3 sm:col-span-3 text-center">
                    <span className="font-extrabold text-sm text-emerald-600 dark:text-emerald-400">
                      {elo}
                    </span>
                  </div>

                  {/* Fourth column: Weeks Top or Link */}
                  <div className="col-span-2 sm:col-span-2 flex items-center justify-end gap-2 pr-1">
                    {activeTab === "alltime" ? (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                        {entry.weekCount ? `${entry.weekCount} wks` : "1 wk"}
                      </span>
                    ) : (
                      <a
                        href={`https://github.com/${username}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                      >
                        <span className="hidden sm:inline">Profile</span>
                        <ExternalLink size={13} />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
