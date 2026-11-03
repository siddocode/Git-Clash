"use client";

import axios from "axios";
import { useEffect, useRef, useState } from "react";
import Modal from "./Modal";
import Image from "next/image";
import Link from "next/link";
import { Trophy, ExternalLink, Eye, Radio, Sparkles } from "lucide-react";

interface Leader {
  id: number;
  username: string;
  avatarUrl?: string | null;
  elo: number;
  totalContributions?: number;
  followers?: number;
  stars?: number;
  repos?: number;
}

export default function RankPage() {
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [previousLeaders, setPreviousLeaders] = useState<Leader[]>([]);
  const leadersRef = useRef<Leader[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Leader | null>(null);

  useEffect(() => {
    leadersRef.current = leaders;
  }, [leaders]);

  useEffect(() => {
    async function loadInitial() {
      try {
        const res = await axios.get("/api/leaderboard/live");
        if (res.status === 200 && Array.isArray(res.data.liveLeaderBoard)) {
          setLeaders(res.data.liveLeaderBoard);
        }
      } catch (error: unknown) {
        console.error("Failed to load initial leaderboard", error);
      }
    }

    loadInitial();

    const stream = new EventSource("/api/leaderboard/sseLive");

    stream.onmessage = (event) => {
      try {
        const updated: Leader[] = JSON.parse(event.data || "[]");
        if (Array.isArray(updated) && updated.length > 0) {
          setPreviousLeaders(leadersRef.current || []);
          setLeaders(updated);
        }
      } catch (e) {
        console.error("Invalid SSE payload", e);
      }
    };

    stream.onerror = () => {};

    return () => {
      stream.close();
    };
  }, []);

  const getRankBadge = (index: number) => {
    if (index === 0) {
      return (
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full font-black text-xs bg-amber-400 text-amber-950 shadow-sm shadow-amber-400/40">
          1
        </span>
      );
    }
    if (index === 1) {
      return (
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full font-black text-xs bg-slate-300 dark:bg-slate-400 text-slate-900 shadow-sm">
          2
        </span>
      );
    }
    if (index === 2) {
      return (
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full font-black text-xs bg-amber-700/80 text-amber-100 shadow-sm">
          3
        </span>
      );
    }
    return (
      <span className="text-slate-400 dark:text-slate-500 font-bold text-xs pl-1.5">
        #{index + 1}
      </span>
    );
  };

  return (
    <div className="bg-white/85 dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200/90 dark:border-white/10 rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 shadow-xl dark:shadow-2xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-4 mb-2 border-b border-slate-200/80 dark:border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
            <Trophy size={18} className="sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span>Live Arena Top 10</span>
              <span className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <Radio size={9} className="animate-pulse text-emerald-500 shrink-0" />
                Live Stream
              </span>
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
              Updated via Server-Sent Events after every battle
            </p>
          </div>
        </div>

        <Link
          href="/liverank"
          className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline shrink-0 self-start sm:self-center"
        >
          Full Rankings →
        </Link>
      </div>

      {/* Table Headers */}
      <div className="grid grid-cols-12 py-2 px-2 sm:px-3 text-slate-500 dark:text-slate-400 font-semibold text-xs border-b border-slate-200/60 dark:border-white/5">
        <span className="col-span-2 sm:col-span-1">Rank</span>
        <span className="col-span-6 sm:col-span-5">Developer</span>
        <span className="col-span-2 sm:col-span-3 text-center">Score</span>
        <span className="col-span-2 sm:col-span-3 text-right pr-1">Action</span>
      </div>

      {/* Rows */}
      {leaders.length === 0 ? (
        <div className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
          Connecting to live ranking stream...
        </div>
      ) : (
        leaders.map((user, index) => {
          const old = previousLeaders.find((p) => p.id === user.id);
          const eloChanged = !!old && old.elo !== user.elo;
          const delta = old ? user.elo - old.elo : 0;

          return (
            <div
              key={user.id}
              className={`
                grid grid-cols-12 py-2.5 sm:py-3 px-2 sm:px-3 border-b border-slate-200/50 dark:border-white/5 last:border-none items-center
                transition-all duration-500 rounded-xl hover:bg-slate-100/60 dark:hover:bg-white/[0.03]
                ${eloChanged ? "flash-change" : ""}
              `}
            >
              {/* Rank */}
              <div className="col-span-2 sm:col-span-1 flex items-center">
                {getRankBadge(index)}
              </div>

              {/* Developer */}
              <div className="col-span-6 sm:col-span-5 flex items-center gap-2 sm:gap-2.5 min-w-0 pr-1">
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg overflow-hidden shrink-0 border border-slate-200 dark:border-white/10">
                  <Image
                    src={`https://github.com/${user.username}.png`}
                    alt={user.username}
                    width={28}
                    height={28}
                    unoptimized
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="font-semibold text-slate-900 dark:text-white text-xs sm:text-sm truncate">
                  {user.username}
                </span>
              </div>

              {/* Score */}
              <div className="col-span-2 sm:col-span-3 text-center flex items-center justify-center gap-1">
                <span className="font-extrabold text-xs sm:text-sm text-emerald-600 dark:text-emerald-400">
                  {user.elo}
                </span>
                {eloChanged && delta !== 0 && (
                  <span
                    className={`text-[9px] sm:text-[10px] font-bold ${
                      delta > 0 ? "text-emerald-500" : "text-rose-500"
                    }`}
                  >
                    {delta > 0 ? `+${delta}` : delta}
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="col-span-2 sm:col-span-3 flex items-center justify-end gap-1 sm:gap-2 pr-1">
                <a
                  href={`https://github.com/${user.username}`}
                  target="_blank"
                  rel="noreferrer"
                  className="hidden sm:inline-flex items-center gap-1 text-xs text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition"
                  title="GitHub Profile"
                >
                  <ExternalLink size={13} />
                </a>

                <button
                  onClick={() => {
                    setSelectedUser(user);
                    setModalOpen(true);
                  }}
                  className="p-1 sm:p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-200/60 dark:hover:bg-white/10 transition cursor-pointer"
                  title="View Details"
                >
                  <Eye size={14} className="sm:w-[15px] sm:h-[15px]" />
                </button>
              </div>
            </div>
          );
        })
      )}

      {/* Footer link to all ranks */}
      <div className="mt-5 flex justify-center">
        <Link
          href="/liverank"
          className="
            px-4 py-2 rounded-xl text-xs font-semibold
            bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10
            text-slate-700 dark:text-white/80 hover:text-emerald-600 dark:hover:text-white
            hover:border-emerald-500/30 transition shadow-sm
          "
        >
          View All Ranks & Global Standings →
        </Link>
      </div>

      {/* User Details Modal */}
      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedUser(null);
        }}
      >
        {selectedUser && (
          <div className="flex flex-col items-center text-center">
            <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-slate-200 dark:border-white/20 shadow-xl mb-4">
              <Image
                src={`https://github.com/${selectedUser.username}.png`}
                width={96}
                height={96}
                unoptimized
                alt={selectedUser.username}
                className="w-full h-full object-cover"
              />
            </div>

            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>{selectedUser.username}</span>
              <Sparkles size={16} className="text-amber-400" />
            </h3>

            <div className="mt-2 inline-flex items-center gap-1 text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
              <Trophy size={16} className="text-amber-500" />
              <span>{selectedUser.elo} ELO Rating</span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Live Rank: #{leaders.findIndex((u) => u.id === selectedUser.id) + 1}
            </p>

            <a
              href={`https://github.com/${selectedUser.username}`}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              <span>View on GitHub</span>
              <ExternalLink size={13} />
            </a>

            <button
              onClick={() => setModalOpen(false)}
              className="mt-6 w-full py-2.5 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-800 dark:text-white font-semibold text-xs border border-slate-200 dark:border-white/10 transition cursor-pointer"
            >
              Close
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
