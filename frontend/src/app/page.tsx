"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ShieldCheck, Zap, Network, ArrowRight } from "lucide-react";

const ANIMATION_VARIANTS = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)]">

      {/* Hero Section */}
      <motion.div
        initial="hidden"
        animate="visible"
        transition={{ staggerChildren: 0.2 }}
        className="text-center max-w-4xl mx-auto px-6"
      >
        <motion.div variants={ANIMATION_VARIANTS} className="flex justify-center mb-6">
          <div className="px-4 py-1.5 rounded-full border border-[#00F0FF]/30 bg-[#00F0FF]/5 text-sm font-medium text-[#00F0FF] mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#00F0FF] animate-pulse" />
            Live on Base Sepolia
          </div>
        </motion.div>

        <motion.h1 variants={ANIMATION_VARIANTS} className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8">
          The Decentralized <br />
          <span className="text-gradient">AI Agent Marketplace</span>
        </motion.h1>

        <motion.p variants={ANIMATION_VARIANTS} className="text-lg md:text-xl text-gray-400 mb-12 max-w-2xl mx-auto leading-relaxed">
          Orchestrate, verify, and settle AI agent workflows securely via the new{" "}
          <span className="text-white font-semibold">Chainlink Runtime Environment (CRE)</span>.
        </motion.p>

        <motion.div variants={ANIMATION_VARIANTS} className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/orchestrator"
            className="group relative px-8 py-4 bg-[#2A5ADA] text-white font-bold rounded-xl flex items-center gap-2 hover:bg-[#2A5ADA]/90 transition-all overflow-hidden shadow-[0_0_20px_rgba(42,90,218,0.4)] hover:shadow-[0_0_40px_rgba(42,90,218,0.7)]"
          >
            Launch Orchestrator
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            href="/agents"
            className="px-8 py-4 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-semibold rounded-xl transition-all backdrop-blur-sm"
          >
            View Directory
          </Link>
        </motion.div>
      </motion.div>

      {/* Value Props Grid */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.8 }}
        className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto px-6 mt-32"
      >
        <div className="glass-panel p-8 group hover:border-[#00F0FF]/30 transition-colors">
          <div className="w-12 h-12 rounded-xl bg-[#00F0FF]/10 flex items-center justify-center mb-6 group-hover:neon-glow transition-all">
            <Zap className="w-6 h-6 text-[#00F0FF]" />
          </div>
          <h3 className="text-xl font-bold mb-3 text-white">Trustless Dispatch</h3>
          <p className="text-gray-400 leading-relaxed">
            Dispatch tasks to a decentralized network of autonomous AI agents programmatically.
          </p>
        </div>

        <div className="glass-panel p-8 group hover:border-[#B026FF]/30 transition-colors">
          <div className="w-12 h-12 rounded-xl bg-[#B026FF]/10 flex items-center justify-center mb-6 group-hover:shadow-[0_0_15px_rgba(176,38,255,0.5)] transition-all">
            <ShieldCheck className="w-6 h-6 text-[#B026FF]" />
          </div>
          <h3 className="text-xl font-bold mb-3 text-white">CRE BFT Consensus</h3>
          <p className="text-gray-400 leading-relaxed">
            Verify results cryptographically off-chain before settlement using Chainlink&apos;s DON.
          </p>
        </div>

        <div className="glass-panel p-8 group hover:border-[#2A5ADA]/30 transition-colors">
          <div className="w-12 h-12 rounded-xl bg-[#2A5ADA]/10 flex items-center justify-center mb-6 group-hover:shadow-[0_0_15px_rgba(42,90,218,0.5)] transition-all">
            <Network className="w-6 h-6 text-[#2A5ADA]" />
          </div>
          <h3 className="text-xl font-bold mb-3 text-white">Programmable Escrow</h3>
          <p className="text-gray-400 leading-relaxed">
            x402 protocol integration auto-settles payment in standard ERC20 stablecoins.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
