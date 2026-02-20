"use client";

import { motion } from "framer-motion";
import { Play, Lock, CheckCircle2, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useWriteContract, useAccount, usePublicClient } from "wagmi";
import { STABLECOIN_ESCROW_ABI, STABLECOIN_ESCROW_ADDRESS, USDC_ABI, USDC_ADDRESS } from "@/lib/abis";
import { parseUnits, stringToHex, pad } from "viem";

export default function OrchestratorDashboard() {
    const { address } = useAccount();
    const publicClient = usePublicClient();
    const [taskStatus, setTaskStatus] = useState<"idle" | "approving" | "locking" | "verifying" | "settled">("idle");
    const [taskId] = useState(() => `task-${Date.now()}`);

    const { writeContractAsync: writeApprove } = useWriteContract();
    const { writeContractAsync: writeLock } = useWriteContract();

    const handleLock = async () => {
        try {
            setTaskStatus("locking");
            const paddedTaskId = pad(stringToHex(taskId), { size: 32 });
            const hash = await writeLock({
                address: STABLECOIN_ESCROW_ADDRESS,
                abi: STABLECOIN_ESCROW_ABI,
                functionName: "lockPayment",
                args: [paddedTaskId, parseUnits("10", 6), address!],
            });

            if (publicClient) {
                await publicClient.waitForTransactionReceipt({ hash });
            }

            setTaskStatus("verifying");

            // Simulate the CRE execution and DON verification after locking
            setTimeout(() => {
                setTaskStatus("settled");
            }, 5000);
        } catch (e) {
            console.error(e);
            setTaskStatus("idle");
        }
    };

    const handleApprove = async () => {
        if (!address) return alert("Please connect wallet first");
        try {
            setTaskStatus("approving");
            const hash = await writeApprove({
                address: USDC_ADDRESS,
                abi: USDC_ABI,
                functionName: "approve",
                args: [STABLECOIN_ESCROW_ADDRESS, parseUnits("10", 6)], // 10 USDC
            });

            if (publicClient) {
                await publicClient.waitForTransactionReceipt({ hash });
            }

            // Immediately chain the lock after approve Tx confirms
            await handleLock();
        } catch (e) {
            console.error(e);
            setTaskStatus("idle");
        }
    };

    return (
        <div className="max-w-4xl mx-auto px-6 py-12">
            <div className="text-center mb-12">
                <h1 className="text-4xl font-bold mb-4">Task <span className="text-[#B026FF]">Orchestrator</span></h1>
                <p className="text-gray-400 text-lg">Submit a task to the Decentralized Oracle Network for AI verification.</p>
            </div>

            <div className="glass-panel p-8 mb-8 relative overflow-hidden">
                {/* Decorative background glow */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#B026FF]/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />

                <div className="relative z-10">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold">Submit New Job</h2>
                        <div className="px-3 py-1 bg-black/40 border border-white/10 rounded-lg text-sm font-mono text-gray-400">
                            {taskId}
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Job Description / Prompt</label>
                            <textarea
                                className="w-full h-32 bg-black/40 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-[#00F0FF]/50 transition-colors resize-none"
                                placeholder="E.g., Analyze the sentiment of the latest FOMC meeting minutes..."
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Bounty (USDC)</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        disabled
                                        className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-[#00F0FF]/50 transition-colors"
                                        value="10.00"
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                        <div className="w-5 h-5 rounded-full bg-blue-500/20 border border-blue-500/50 flex items-center justify-center">
                                            <span className="text-[10px] text-blue-400 font-bold">$</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Consensus Threshold</label>
                                <select className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-[#00F0FF]/50 transition-colors appearance-none">
                                    <option>2 of 3 Agents must agree</option>
                                    <option>3 of 5 Agents must agree</option>
                                    <option>Local Fallback Only</option>
                                </select>
                            </div>
                        </div>

                        <button
                            onClick={handleApprove}
                            disabled={taskStatus !== "idle" || !address}
                            className="w-full mt-6 py-4 bg-gradient-to-r from-[#2A5ADA] to-[#B026FF] text-white font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(176,38,255,0.4)] hover:shadow-[0_0_30px_rgba(176,38,255,0.6)] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {taskStatus === "idle" ? (
                                <>
                                    <Play className="w-5 h-5 fill-current" />
                                    {address ? "Approve USDC & Dispatch Job" : "Connect Wallet to Dispatch"}
                                </>
                            ) : taskStatus === "approving" ? (
                                "Approving 10 USDC..."
                            ) : taskStatus === "locking" ? (
                                "Locking Funds in Escrow..."
                            ) : taskStatus === "verifying" ? (
                                "DON Simulating Workflow..."
                            ) : (
                                "Execution Complete!"
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Visualizer Flowchart */}
            {taskStatus !== "idle" && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="space-y-4"
                >
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">

                        {/* Step 1: Escrow */}
                        <div className={`flex-1 w-full glass-panel p-6 border-2 transition-all duration-500 ${(taskStatus === 'approving' || taskStatus === 'locking') ? 'border-[#00F0FF] neon-glow scale-105' : 'border-white/10 opacity-60'}`}>
                            <div className="flex items-center gap-4 mb-2">
                                <Lock className={`w-6 h-6 ${(taskStatus === 'approving' || taskStatus === 'locking') ? 'text-[#00F0FF]' : 'text-gray-400'}`} />
                                <h3 className="font-bold">1. Escrow Lock</h3>
                            </div>
                            <p className="text-sm text-gray-400">{taskStatus === 'approving' ? 'Waiting for USDC Approval...' : 'Confirming Lock Tx...'}</p>
                        </div>

                        <div className="hidden md:block w-8 h-1 bg-gradient-to-r from-[#00F0FF] to-[#B026FF] opacity-50" />

                        {/* Step 2: CRE Execution */}
                        <div className={`flex-1 w-full glass-panel p-6 border-2 transition-all duration-500 ${taskStatus === 'verifying' ? 'border-[#B026FF] shadow-[0_0_15px_rgba(176,38,255,0.5)] scale-105' : 'border-white/10 opacity-60'}`}>
                            <div className="flex items-center gap-4 mb-2">
                                <ShieldCheck className={`w-6 h-6 ${taskStatus === 'verifying' ? 'text-[#B026FF]' : 'text-gray-400'}`} />
                                <h3 className="font-bold">2. DON Consensus</h3>
                            </div>
                            <p className="text-sm text-gray-400">Agents executing & CRE verifiying BFT report.</p>
                        </div>

                        <div className="hidden md:block w-8 h-1 bg-gradient-to-r from-[#B026FF] to-green-500 opacity-50" />

                        {/* Step 3: Settlement */}
                        <div className={`flex-1 w-full glass-panel p-6 border-2 transition-all duration-500 ${taskStatus === 'settled' ? 'border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.5)] scale-105' : 'border-white/10 opacity-60'}`}>
                            <div className="flex items-center gap-4 mb-2">
                                <CheckCircle2 className={`w-6 h-6 ${taskStatus === 'settled' ? 'text-green-500' : 'text-gray-400'}`} />
                                <h3 className="font-bold">3. Escrow Settled</h3>
                            </div>
                            <p className="text-sm text-gray-400">Agents paid securely on-chain.</p>
                        </div>

                    </div>
                </motion.div>
            )}
        </div>
    );
}
