"use client";

import { useState } from "react";
import Image from "next/image";
import logo2 from "@/public/git-clash/logo2.jpg";
import Link from "next/link";
import { Trophy, Github, Sun, Moon, Menu, X, Swords, Radio } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  return (
    <nav
      className="
        fixed top-0 left-0 right-0 z-50
        bg-white/80 dark:bg-black/70 backdrop-blur-xl
        border-b border-slate-200/80 dark:border-white/10
        shadow-sm dark:shadow-[0_4px_30px_rgba(0,0,0,0.8)]
        transition-colors duration-300
      "
    >
      <div className="max-w-5xl mx-auto flex justify-between items-center px-4 sm:px-6 py-3.5">
        <Link href="/" className="flex items-center gap-2.5 sm:gap-3 group shrink-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden border border-slate-300 dark:border-white/20 shadow-md group-hover:scale-105 transition-transform duration-200 shrink-0">
            <Image
              className="object-cover w-full h-full"
              src={logo2}
              alt="Git Clash Logo"
              priority
            />
          </div>
          <span className="font-extrabold text-lg sm:text-xl tracking-tight bg-gradient-to-r from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-cyan-400 bg-clip-text text-transparent">
            Git Clash
          </span>
        </Link>

        {/* Desktop Links */}
        <ul className="hidden sm:flex gap-3 text-slate-700 dark:text-white/80 text-sm font-medium items-center">
          <li>
            <Link
              href="/"
              className="
                px-3.5 py-2 rounded-xl flex items-center gap-2
                bg-slate-100/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 
                hover:bg-emerald-500/15 hover:border-emerald-500/30 hover:text-emerald-600 dark:hover:text-emerald-300
                transition-all duration-200
              "
            >
              <Swords size={16} className="text-emerald-500 dark:text-emerald-400" />
              <span>Arena</span>
            </Link>
          </li>

          <li>
            <Link
              href="/leaderboard"
              className="
                px-3.5 py-2 rounded-xl flex items-center gap-2
                bg-slate-100/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 
                hover:bg-emerald-500/15 hover:border-emerald-500/30 hover:text-emerald-600 dark:hover:text-emerald-300
                transition-all duration-200
              "
            >
              <Trophy size={16} className="text-amber-500 dark:text-amber-400" />
              <span>Leaderboard</span>
            </Link>
          </li>

          <li>
            <a
              href="https://github.com/sid2487/Git-Clash"
              target="_blank"
              rel="noreferrer"
              className="
                px-3.5 py-2 rounded-xl flex items-center gap-2
                bg-slate-100/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 
                hover:bg-emerald-500/15 hover:border-emerald-500/30 hover:text-emerald-600 dark:hover:text-emerald-300
                transition-all duration-200
              "
            >
              <Github size={16} className="text-slate-700 dark:text-white/80" />
              <span>GitHub</span>
            </a>
          </li>

          <li>
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="
                px-3.5 py-2 rounded-xl flex items-center gap-2
                bg-slate-100/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 
                hover:bg-emerald-500/15 hover:border-emerald-500/30 hover:text-emerald-600 dark:hover:text-emerald-300
                transition-all duration-200 cursor-pointer
              "
            >
              {theme === "dark" ? (
                <>
                  <Sun size={16} className="text-amber-400 animate-spin-slow" />
                  <span>Light</span>
                </>
              ) : (
                <>
                  <Moon size={16} className="text-indigo-600" />
                  <span>Dark</span>
                </>
              )}
            </button>
          </li>
        </ul>

        {/* Mobile Hamburger */}
        <button
          className="sm:hidden p-2 rounded-xl text-slate-700 dark:text-white/80 hover:bg-slate-100 dark:hover:bg-white/10 focus:outline-none transition"
          onClick={() => setOpen(!open)}
          aria-label="Toggle mobile menu"
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {open && (
        <div
          className="
            sm:hidden
            bg-white/95 dark:bg-slate-950/95 backdrop-blur-2xl border-t border-slate-200 dark:border-white/10
            shadow-xl flex flex-col gap-2.5 px-5 py-4 text-slate-800 dark:text-white/90 text-sm font-medium
            animate-in fade-in slide-in-from-top-2 duration-200
          "
        >
          <Link
            href="/"
            onClick={() => setOpen(false)}
            className="
              px-4 py-2.5 rounded-xl flex items-center gap-3
              bg-slate-100/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 
              hover:bg-emerald-500/20 hover:border-emerald-500/30
              transition-all duration-200
            "
          >
            <Swords size={18} className="text-emerald-500 dark:text-emerald-400" />
            Arena
          </Link>

          <Link
            href="/leaderboard"
            onClick={() => setOpen(false)}
            className="
              px-4 py-2.5 rounded-xl flex items-center gap-3
              bg-slate-100/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 
              hover:bg-emerald-500/20 hover:border-emerald-500/30
              transition-all duration-200
            "
          >
            <Trophy size={18} className="text-amber-500 dark:text-amber-400" />
            Leaderboard
          </Link>

          <Link
            href="/liverank"
            onClick={() => setOpen(false)}
            className="
              px-4 py-2.5 rounded-xl flex items-center gap-3
              bg-slate-100/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 
              hover:bg-emerald-500/20 hover:border-emerald-500/30
              transition-all duration-200
            "
          >
            <Radio size={18} className="text-emerald-500 dark:text-emerald-400" />
            Live Rankings
          </Link>

          <a
            href="https://github.com/sid2487/Git-Clash"
            target="_blank"
            rel="noreferrer"
            onClick={() => setOpen(false)}
            className="
              px-4 py-2.5 rounded-xl flex items-center gap-3
              bg-slate-100/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 
              hover:bg-emerald-500/20 hover:border-emerald-500/30
              transition-all duration-200
            "
          >
            <Github size={18} className="text-slate-700 dark:text-white/80" />
            GitHub
          </a>

          <button
            onClick={() => {
              toggleTheme();
              setOpen(false);
            }}
            className="
              px-4 py-2.5 rounded-xl flex items-center justify-between
              bg-slate-100/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 
              hover:bg-emerald-500/20 hover:border-emerald-500/30
              transition-all duration-200 cursor-pointer text-left
            "
          >
            <span className="flex items-center gap-3">
              {theme === "dark" ? (
                <>
                  <Sun size={18} className="text-amber-400" />
                  <span>Switch to Light Mode</span>
                </>
              ) : (
                <>
                  <Moon size={18} className="text-indigo-600" />
                  <span>Switch to Dark Mode</span>
                </>
              )}
            </span>
            <span className="text-xs uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-white/60">
              {theme}
            </span>
          </button>
        </div>
      )}
    </nav>
  );
}
