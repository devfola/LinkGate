"use client";

import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import { LogIn, LogOut, Cpu } from "lucide-react";

export default function Navbar() {
    const { ready, authenticated, user, login, logout } = usePrivy();

    return (
        <nav className="fixed top-0 w-full z-50 glass-panel border-b-0 border-t-0 rounded-none px-6 py-4">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2 group">
                    <div className="p-2 rounded-lg bg-[#2A5ADA]/20 border border-[#2A5ADA]/50 group-hover:neon-glow transition-all duration-300">
                        <Cpu className="w-5 h-5 text-[#00F0FF]" />
                    </div>
                    <span className="text-xl font-bold tracking-tight text-white group-hover:text-gradient transition-all duration-300">
                        LinkGate
                    </span>
                </Link>

                <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-300">
                    <Link href="/agents" className="hover:text-[#00F0FF] transition-colors">
                        Agent Directory
                    </Link>
                    <Link href="/orchestrator" className="hover:text-[#00F0FF] transition-colors">
                        Orchestrator
                    </Link>
                </div>

                <div className="flex items-center gap-4">
                    {!ready ? (
                        <div className="w-24 h-10 animate-pulse bg-white/5 rounded-lg" />
                    ) : authenticated ? (
                        <div className="flex items-center gap-4">
                            <span className="text-sm text-gray-400 hidden sm:block">
                                {user?.wallet?.address?.slice(0, 6)}...{user?.wallet?.address?.slice(-4)}
                            </span>
                            <button
                                onClick={logout}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-400 bg-red-400/10 hover:bg-red-400/20 rounded-lg transition-colors border border-red-400/20"
                            >
                                <LogOut className="w-4 h-4" />
                                Disconnect
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={login}
                            className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-[#2A5ADA] hover:bg-[#2A5ADA]/80 rounded-lg transition-all shadow-[0_0_15px_rgba(42,90,218,0.5)] hover:shadow-[0_0_25px_rgba(42,90,218,0.8)] border border-white/10"
                        >
                            <LogIn className="w-4 h-4" />
                            Connect Wallet
                        </button>
                    )}
                </div>
            </div>
        </nav>
    );
}
