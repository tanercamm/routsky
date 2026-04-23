import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { Zap, Map } from "lucide-react";

const fadeUpVariants: any = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } },
};

const staggerContainer: any = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2,
    },
  },
};

export default function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/home", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-50 selection:bg-blue-500/30 overflow-hidden flex flex-col">
      {/* Subtle Grid Background */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(to right, #ffffff 1px, transparent 1px),
            linear-gradient(to bottom, #ffffff 1px, transparent 1px)
          `,
          backgroundSize: "4rem 4rem",
          maskImage: "radial-gradient(ellipse 60% 60% at 50% 50%, #000 10%, transparent 80%)",
          WebkitMaskImage: "radial-gradient(ellipse 60% 60% at 50% 50%, #000 10%, transparent 80%)",
        }}
      />
      
      {/* Ambient Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none" />

      {/* Navigation Bar */}
      <nav className="relative z-20 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.5)]">
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <span className="font-bold text-xl tracking-tight text-white">
            Rout<span className="text-blue-400">sky</span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/login")}
            className="text-sm font-medium text-slate-400 hover:text-white transition-colors"
          >
            Sign In
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="max-w-4xl mx-auto flex flex-col items-center"
        >
          {/* Badge */}
          <motion.div variants={fadeUpVariants} className="mb-8 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-blue-500/20 bg-blue-500/5 backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-xs font-semibold tracking-widest uppercase text-blue-400">
              System Online v2.0
            </span>
          </motion.div>

          {/* Hero Typography */}
          <motion.h1 
            variants={fadeUpVariants}
            className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-200 to-slate-500 mb-6 leading-[1.1]"
          >
            Orchestrate the World.
          </motion.h1>

          <motion.p 
            variants={fadeUpVariants}
            className="text-lg md:text-xl text-slate-400 max-w-2xl mb-12 leading-relaxed font-light"
          >
            Advanced AI-driven route intelligence and travel group synchronization. 
            Experience real-time visa analytics, deterministic routing, and global node orchestration in one unified interface.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div variants={fadeUpVariants} className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center">
            <button
              onClick={() => navigate("/home")}
              className="group relative flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-3.5 rounded-xl bg-white text-slate-950 font-semibold hover:bg-slate-200 transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.25)]"
            >
              <Zap size={18} className="text-blue-600 group-hover:scale-110 transition-transform" />
              <span>Launch Dashboard</span>
            </button>
            <button
              onClick={() => navigate("/visa-intel")}
              className="group flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-3.5 rounded-xl border border-slate-700/50 bg-slate-900/50 hover:bg-slate-800 hover:border-slate-600 text-slate-300 font-medium transition-all duration-300 backdrop-blur-sm"
            >
              <Map size={18} className="text-slate-400 group-hover:text-white transition-colors" />
              <span>Explore Visa Intel</span>
            </button>
          </motion.div>
        </motion.div>
      </main>

      {/* Footer / Meta Data */}
      <footer className="relative z-10 w-full border-t border-slate-800/50 bg-slate-950/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-600 uppercase tracking-widest font-semibold">
            &copy; {new Date().getFullYear()} Routsky Inc.
          </p>
          <div className="flex gap-8">
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-slate-500 uppercase tracking-widest">Active Nodes</span>
              <span className="text-sm font-mono text-blue-400">320+</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-slate-500 uppercase tracking-widest">Global Coverage</span>
              <span className="text-sm font-mono text-indigo-400">150 Countries</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
