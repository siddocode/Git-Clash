"use client";

import axios from "axios";
import { useState } from "react";
import Modal from "./Modal";
import Image from "next/image";
import { Github, Plus, Sparkles, CheckCircle2 } from "lucide-react";

interface UploadedProfile {
  id: number;
  username: string;
  avatarUrl: string | null;
  followers: number;
  stars: number;
  repos: number;
  totalContributions: number;
  elo: number;
  rank?: number;
}

export default function UsernameInput() {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [profile, setProfile] = useState<UploadedProfile | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleInput = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    setLoading(true);
    setError(null);
    setStatusMessage(null);

    try {
      const res = await axios.post("/api/github/upload", {
        username: username.trim(),
      });
      setProfile(res.data.profile);
      setStatusMessage(res.data.message || "Profile added!");
      setModalOpen(true);
      setUsername("");
    } catch (err: unknown) {
      console.error("Failed to add profile", err);
      const errMessage =
        axios.isAxiosError(err) && err.response?.data?.error
          ? err.response.data.error
          : "Failed to add GitHub profile";
      setError(errMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full flex justify-center mt-6">
      <Modal open={modalOpen} onClose={() => setModalOpen(false)}>
        {profile ? (
          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-slate-200 dark:border-white/20 shadow-lg mb-3">
              <Image
                src={profile.avatarUrl || `https://github.com/${profile.username}.png`}
                width={80}
                height={80}
                className="w-full h-full object-cover"
                alt={profile.username}
                unoptimized
              />
            </div>

            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-semibold mb-1">
              <CheckCircle2 size={14} />
              <span>{statusMessage}</span>
            </div>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {profile.username}
            </h3>

            <div className="mt-3 grid grid-cols-2 gap-2 w-full text-xs text-left">
              <div className="p-2 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-white/5">
                <span className="text-[10px] text-slate-400 block">Initial ELO</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{profile.elo}</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-white/5">
                <span className="text-[10px] text-slate-400 block">Contributions</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{profile.totalContributions}</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-white/5">
                <span className="text-[10px] text-slate-400 block">Followers</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{profile.followers}</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-white/5">
                <span className="text-[10px] text-slate-400 block">Repositories</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{profile.repos}</span>
              </div>
            </div>

            <button
              onClick={() => setModalOpen(false)}
              className="mt-5 w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs transition shadow-md"
            >
              Continue to Battles
            </button>
          </div>
        ) : (
          <p className="text-center text-xs text-slate-400">Loading profile...</p>
        )}
      </Modal>

      <form
        onSubmit={handleInput}
        className="
          bg-white/85 dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200/90 dark:border-white/10
          shadow-xl rounded-2xl p-4 sm:p-6 w-full max-w-md
          flex flex-col gap-3.5 hover:border-emerald-500/30 transition-all duration-200
        "
      >
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Plus size={16} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Enter GitHub Profile to Participate
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Add yourself or any developer into the head-to-head arena
            </p>
          </div>
        </div>

        {error && (
          <div className="text-rose-500 text-xs font-medium px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
            {error}
          </div>
        )}

        <div className="relative flex items-center">
          <Github size={16} className="absolute left-3.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="e.g. torvalds or your-username"
            disabled={loading}
            className="
              w-full pl-10 pr-4 py-2.5 rounded-xl text-sm
              bg-slate-100/90 dark:bg-white/5 text-slate-900 dark:text-white
              placeholder-slate-400 border border-slate-200 dark:border-white/10
              focus:border-emerald-500 focus:outline-none transition
            "
          />
        </div>

        <button
          type="submit"
          disabled={loading || !username.trim()}
          className={`
            w-full py-2.5 rounded-xl text-xs font-bold
            flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer shadow-sm
            ${
              loading || !username.trim()
                ? "bg-slate-200 dark:bg-white/10 text-slate-400 cursor-not-allowed"
                : "bg-emerald-500 hover:bg-emerald-600 text-white hover:shadow-emerald-500/20 active:scale-[0.99]"
            }
          `}
        >
          {loading ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Fetching GitHub Stats...</span>
            </>
          ) : (
            <>
              <Sparkles size={14} />
              <span>Add to Clash Arena</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
