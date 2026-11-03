export default function Footer() {
  return (
    <footer className="w-full mt-12 sm:mt-16 border-t border-slate-200/80 dark:border-white/10 py-6 text-center text-xs text-slate-500 dark:text-slate-400">
      <div className="flex flex-col sm:flex-row items-center justify-center gap-2 px-2">
        <span>Made with ♥ by{" "}
          <a
            href="https://portfolio-sid07.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-slate-800 dark:text-white hover:text-emerald-500 transition-colors underline decoration-slate-300 dark:decoration-white/20"
          >
            Siddharth
          </a>
        </span>
        <span className="hidden sm:inline">•</span>
        <span>Git Clash — Real-Time ELO Arena</span>
      </div>
    </footer>
  );
}
