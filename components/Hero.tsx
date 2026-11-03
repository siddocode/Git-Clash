import { Flame, Sparkles } from "lucide-react";

export default function Hero() {
  return (
    <section className="pt-4 sm:pt-8 pb-6 sm:pb-8 px-2 sm:px-4 flex justify-center text-center w-full">
      <div className="max-w-2xl mx-auto flex flex-col items-center">
        <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold bg-emerald-500/10 dark:bg-emerald-400/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 mb-3 sm:mb-4 animate-pulse">
          <Sparkles size={13} className="shrink-0" />
          <span>Live ELO Developer Battles</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black tracking-tight mb-2 sm:mb-3">
          <span className="bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-600 dark:from-emerald-400 dark:via-teal-300 dark:to-cyan-400 bg-clip-text text-transparent">
            Git Clash Arena
          </span>
        </h1>

        <p className="text-sm sm:text-lg text-slate-600 dark:text-slate-300 max-w-xl font-normal leading-relaxed px-2">
          The ultimate developer face-off. Compare GitHub profiles, vote for the best builder, and see the live ELO leaderboard evolve in real time.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 mt-3 sm:mt-4 text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 px-2">
          <span className="flex items-center gap-1">
            <Flame size={13} className="text-orange-500 shrink-0" />
            Zero-Sum Rating
          </span>
          <span className="hidden sm:inline">•</span>
          <span>Instant Challenger Loading</span>
          <span className="hidden sm:inline">•</span>
          <span>Real-Time SSE Stream</span>
        </div>
      </div>
    </section>
  );
}
