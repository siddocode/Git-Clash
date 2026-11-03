"use client";

import axios from "axios";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Modal from "@/components/Modal";
import {
  Trophy,
  ExternalLink,
  Eye,
  ChevronLeft,
  ChevronRight,
  Swords,
  Search,
  Sparkles,
} from "lucide-react";

interface Leader {
  id: number;
  username: string;
  avatarUrl?: string | null;
  elo: number;
  totalContributions: number;
  followers?: number;
  stars?: number;
  repos?: number;
}

export default function AllRanksPage() {
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const limit = 20;

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Leader | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await axios.get(
          `/api/leaderboard/liveall?page=${page}&limit=${limit}`
        );

        setLeaders(res.data.users || []);
        setTotalPages(res.data.totalPages || 1);
        setTotalCount(res.data.total || 0);
      } catch (err: unknown) {
        console.error("Failed to load full leaderboard", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [page]);

  const filteredLeaders = leaders.filter((u) =>
    u.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full flex flex-col items-center">
      {/* Header */}
      <div className="w-full flex flex-col items-center text-center mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline mb-3"
        >
          <Swords size={14} />
          <span>← Back to Arena Battles</span>
        </Link>

        <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          All-Developer Arena Standings
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-md px-2">
          Complete live Elo ladder across all {totalCount} registered developers.
        </p>
      </div>

      {/* Table Container */}
      <div className="w-full bg-white/85 dark:bg-slate-900/50 backdrop-blur-2xl border border-slate-200/90 dark:border-white/10 rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 shadow-xl dark:shadow-2xl">
        {/* Search & Meta Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 pb-4 mb-3 border-b border-slate-200/80 dark:border-white/10">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 self-start sm:self-center">
            <Trophy size={16} className="text-amber-500 shrink-0" />
            <span>
              Showing {(page - 1) * limit + 1} -{" "}
              {Math.min(page * limit, totalCount)} of {totalCount} developers
            </span>
          </div>

          <div className="relative w-full sm:w-64">
            <Search size={15} className="absolute left-3.5 top-3 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter page developers..."
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
        <div className="grid grid-cols-12 py-2 px-2 sm:px-3 text-slate-500 dark:text-slate-400 font-semibold text-xs border-b border-slate-200/60 dark:border-white/5">
          <span className="col-span-2 sm:col-span-1">Rank</span>
          <span className="col-span-6 sm:col-span-6">Developer</span>
          <span className="col-span-2 sm:col-span-3 text-center">Score</span>
          <span className="col-span-2 sm:col-span-2 text-right pr-1 sm:pr-2">Profile</span>
        </div>

        {/* Rows */}
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
            <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-medium">Loading ladder page...</span>
          </div>
        ) : filteredLeaders.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">
            No developers found.
          </div>
        ) : (
          <div className="divide-y divide-slate-200/50 dark:divide-white/5">
            {filteredLeaders.map((user, index) => {
              const globalRank = (page - 1) * limit + (index + 1);

              return (
                <div
                  key={user.id}
                  className="grid grid-cols-12 py-2.5 sm:py-3 px-2 sm:px-3 items-center rounded-xl hover:bg-slate-100/60 dark:hover:bg-white/[0.03] transition-colors"
                >
                  <div className="col-span-2 sm:col-span-1 font-bold text-xs text-slate-400">
                    #{globalRank}
                  </div>

                  <div className="col-span-6 sm:col-span-6 flex items-center gap-2 sm:gap-3 min-w-0 pr-1">
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

                  <div className="col-span-2 sm:col-span-3 text-center">
                    <span className="font-extrabold text-xs sm:text-sm text-emerald-600 dark:text-emerald-400">
                      {user.elo}
                    </span>
                  </div>

                  <div className="col-span-2 sm:col-span-2 flex items-center justify-end gap-1 sm:gap-2 pr-1">
                    <button
                      onClick={() => {
                        setSelectedUser(user);
                        setModalOpen(true);
                      }}
                      className="p-1 sm:p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-200/60 dark:hover:bg-white/10 transition cursor-pointer"
                      title="Inspect Profile"
                    >
                      <Eye size={14} className="sm:w-[15px] sm:h-[15px]" />
                    </button>
                    <a
                      href={`https://github.com/${user.username}`}
                      target="_blank"
                      rel="noreferrer"
                      className="hidden sm:inline-flex p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-200/60 dark:hover:bg-white/10 transition"
                      title="GitHub Profile"
                    >
                      <ExternalLink size={15} />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Controls */}
        <div className="mt-6 pt-4 border-t border-slate-200/80 dark:border-white/10 flex items-center justify-between gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className={`
              flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-semibold
              bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 transition
              ${
                page <= 1
                  ? "opacity-40 cursor-not-allowed text-slate-400"
                  : "text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/10 cursor-pointer shadow-sm"
              }
            `}
          >
            <ChevronLeft size={14} />
            <span className="hidden xs:inline">Previous</span>
          </button>

          <span className="text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 text-center">
            Page <span className="font-bold text-slate-800 dark:text-white">{page}</span> of{" "}
            <span className="font-bold text-slate-800 dark:text-white">{totalPages}</span>
          </span>

          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className={`
              flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-semibold
              bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 transition
              ${
                page >= totalPages
                  ? "opacity-40 cursor-not-allowed text-slate-400"
                  : "text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/10 cursor-pointer shadow-sm"
              }
            `}
          >
            <span className="hidden xs:inline">Next</span>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Modal */}
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

            <div className="mt-4 grid grid-cols-2 gap-2 w-full text-xs text-left">
              <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-white/5">
                <span className="text-[10px] text-slate-400 block">Contributions</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {selectedUser.totalContributions}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-white/5">
                <span className="text-[10px] text-slate-400 block">Status</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">Active Competitor</span>
              </div>
            </div>

            <a
              href={`https://github.com/${selectedUser.username}`}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              <span>View GitHub Profile</span>
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
