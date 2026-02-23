"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Star, Activity, PlusCircle, Loader2, X, CheckCircle2, AlertCircle } from "lucide-react";
import { useReadContract, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { isAddress } from "viem";
import { AGENT_REGISTRY_ABI, AGENT_REGISTRY_ADDRESS } from "@/lib/abis";

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.1 }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
};

// Define structure matching our ABI components array for tuple
type ContractAgentData = {
    agentOwner: string;
    metadataURI: string;
    metadataVersion: number;
    isActive: boolean;
    reputationScore: number;
    totalTasks: number;
    successfulTasks: number;
    slaViolations: number;
};

// ─── Register Agent Modal ────────────────────────────────────────────────────

function RegisterAgentModal({ onClose }: { onClose: () => void }) {
    const [agentAddress, setAgentAddress] = useState("");
    const [metadataURI, setMetadataURI] = useState("");
    const [validationError, setValidationError] = useState("");

    const { writeContract, data: txHash, isPending, isError, error } = useWriteContract();

    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
        hash: txHash,
    });

    const handleSubmit = () => {
        setValidationError("");

        if (!isAddress(agentAddress)) {
            setValidationError("Please enter a valid Ethereum address (0x...).");
            return;
        }
        if (!metadataURI.startsWith("http") && !metadataURI.startsWith("ipfs://")) {
            setValidationError("Metadata URI must be a valid HTTP or IPFS URL.");
            return;
        }

        writeContract({
            address: AGENT_REGISTRY_ADDRESS,
            abi: AGENT_REGISTRY_ABI,
            functionName: "registerAgent",
            args: [agentAddress as `0x${string}`, metadataURI],
        });
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm"
        >
            <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                className="glass-panel w-full max-w-lg p-8 relative"
            >
                <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/10 transition-colors">
                    <X className="w-5 h-5 text-gray-400" />
                </button>

                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-[#2A5ADA]/10 flex items-center justify-center border border-[#2A5ADA]/30">
                        <PlusCircle className="w-5 h-5 text-[#2A5ADA]" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Register New Agent</h2>
                        <p className="text-sm text-gray-400">Add your AI agent to the LinkGate registry.</p>
                    </div>
                </div>

                {isConfirmed ? (
                    <div className="flex flex-col items-center py-8 text-center">
                        <CheckCircle2 className="w-16 h-16 text-green-400 mb-4" />
                        <h3 className="text-xl font-bold text-white mb-2">Agent Registered!</h3>
                        <p className="text-gray-400 text-sm mb-2">Your agent is now live on the Base Sepolia network.</p>
                        <a
                            href={`https://sepolia.basescan.org/tx/${txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#00F0FF] text-xs underline mt-1"
                        >
                            View on BaseScan →
                        </a>
                        <button onClick={onClose} className="mt-6 px-6 py-2.5 bg-[#2A5ADA] text-white font-semibold rounded-xl hover:bg-[#2A5ADA]/90 transition-colors">
                            Done
                        </button>
                    </div>
                ) : (
                    <div className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1.5">Agent Wallet Address</label>
                            <input
                                type="text"
                                placeholder="0x..."
                                value={agentAddress}
                                onChange={(e) => setAgentAddress(e.target.value)}
                                disabled={isPending || isConfirming}
                                className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-[#2A5ADA]/50 focus:outline-none focus:ring-1 focus:ring-[#2A5ADA]/30 font-mono text-sm disabled:opacity-50"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1.5">Metadata URI</label>
                            <input
                                type="text"
                                placeholder="https://your-agent.com/manifest.json or ipfs://..."
                                value={metadataURI}
                                onChange={(e) => setMetadataURI(e.target.value)}
                                disabled={isPending || isConfirming}
                                className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-[#2A5ADA]/50 focus:outline-none focus:ring-1 focus:ring-[#2A5ADA]/30 text-sm disabled:opacity-50"
                            />
                            <p className="text-xs text-gray-500 mt-1.5">
                                A URL pointing to a JSON manifest describing your agent&apos;s capabilities and endpoints.
                            </p>
                        </div>

                        {(validationError || (isError && error)) && (
                            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                                <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                                <p className="text-sm text-red-400">
                                    {validationError || (error as Error)?.message?.split("\n")[0]}
                                </p>
                            </div>
                        )}

                        <button
                            onClick={handleSubmit}
                            disabled={isPending || isConfirming || !agentAddress || !metadataURI}
                            className="w-full py-3.5 bg-[#2A5ADA] text-white font-bold rounded-xl hover:bg-[#2A5ADA]/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(42,90,218,0.3)]"
                        >
                            {isPending || isConfirming ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    {isPending ? "Confirm in Wallet..." : "Confirming on-chain..."}
                                </>
                            ) : (
                                <>
                                    <PlusCircle className="w-5 h-5" />
                                    Register Agent on Base Sepolia
                                </>
                            )}
                        </button>
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function AgentsDirectory() {
    const [showRegisterModal, setShowRegisterModal] = useState(false);

    // 1. Fetch total number of agents
    const { data: agentCount, isLoading: isLoadingCount } = useReadContract({
        address: AGENT_REGISTRY_ADDRESS,
        abi: AGENT_REGISTRY_ABI,
        functionName: "getAgentCount",
    });

    // 2. Build map of address fetches
    const indices = agentCount ? Array.from({ length: Number(agentCount) }, (_, i) => BigInt(i)) : [];

    // 3. Fetch all agent addresses
    const { data: agentAddresses, isLoading: isLoadingAddresses } = useReadContracts({
        contracts: indices.map((index) => ({
            address: AGENT_REGISTRY_ADDRESS,
            abi: AGENT_REGISTRY_ABI,
            functionName: "agentList",
            args: [index],
        })),
        query: {
            enabled: !!agentCount && Number(agentCount) > 0,
        }
    });

    // 4. Fetch the Agent struct details for each address
    const validAddresses = agentAddresses
        ?.map(res => res.status === "success" ? res.result as unknown as `0x${string}` : null)
        .filter((addr): addr is `0x${string}` => addr !== null) || [];

    const { data: agentsData, isLoading: isLoadingData } = useReadContracts({
        contracts: validAddresses.map((addr) => ({
            address: AGENT_REGISTRY_ADDRESS,
            abi: AGENT_REGISTRY_ABI,
            functionName: "getAgent",
            args: [addr],
        })),
        query: {
            enabled: validAddresses.length > 0,
        }
    });

    const isLoading = isLoadingCount || isLoadingAddresses || isLoadingData;

    const activeAgents = (agentsData || [])
        .map((res, idx) => {
            if (res.status !== "success" || !res.result) return null;
            const data = res.result as unknown as ContractAgentData;
            return {
                address: validAddresses[idx],
                ...data
            }
        })
        .filter((agent) => agent !== null && agent.isActive);

    // Helper to safely parse hostname from metadataURI
    const getAgentName = (uri: string) => {
        try { return new URL(uri).hostname; }
        catch { return uri.slice(0, 24) || "Unknown Agent"; }
    };

    return (
        <div className="max-w-7xl mx-auto px-6 py-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
                <div>
                    <h1 className="text-4xl font-bold mb-2">Agent <span className="text-[#00F0FF]">Directory</span></h1>
                    <p className="text-gray-400">Discover and hire decentralized AI agents via the LinkGate registry.</p>
                </div>
                <button
                    onClick={() => setShowRegisterModal(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-[#2A5ADA]/10 text-[#2A5ADA] border border-[#2A5ADA]/30 hover:bg-[#2A5ADA]/20 hover:border-[#2A5ADA] rounded-xl font-medium transition-all group"
                >
                    <PlusCircle className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                    Register New Agent
                </button>
            </div>

            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="w-12 h-12 text-[#00F0FF] animate-spin mb-4" />
                    <p className="text-gray-400">Syncing with Decentralized Network...</p>
                </div>
            ) : activeAgents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 glass-panel">
                    <Bot className="w-16 h-16 text-gray-500 mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">No Active Agents Found</h3>
                    <p className="text-gray-400 max-w-md text-center text-sm">
                        There are currently no active AI agents registered on the Base Sepolia testnet.
                        Be the first to deploy and register a node!
                    </p>
                    <button
                        onClick={() => setShowRegisterModal(true)}
                        className="mt-6 flex items-center gap-2 px-6 py-3 bg-[#2A5ADA] text-white font-semibold rounded-xl hover:bg-[#2A5ADA]/90 transition-colors"
                    >
                        <PlusCircle className="w-4 h-4" />
                        Register the First Agent
                    </button>
                </div>
            ) : (
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                    {activeAgents.map((agent) => (
                        <motion.div
                            key={agent!.address}
                            variants={itemVariants}
                            className="glass-panel p-6 group hover:border-[#00F0FF]/30 transition-all hover:-translate-y-1"
                        >
                            <div className="flex justify-between items-start mb-6">
                                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:border-[#00F0FF]/30 group-hover:bg-[#00F0FF]/10 transition-colors">
                                    <Bot className="w-6 h-6 text-gray-300 group-hover:text-[#00F0FF] transition-colors" />
                                </div>
                                <span className="px-3 py-1 rounded-full text-xs font-medium border bg-green-500/10 text-green-400 border-green-500/20">
                                    Active
                                </span>
                            </div>

                            <h3 className="text-xl font-bold mb-1 line-clamp-1" title={agent!.metadataURI}>
                                {getAgentName(agent!.metadataURI)}
                            </h3>
                            <p className="text-sm text-gray-500 font-mono mb-4">{agent!.address.slice(0, 6)}...{agent!.address.slice(-4)}</p>

                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="bg-black/20 rounded-lg p-3 border border-white/5">
                                    <div className="flex items-center gap-1.5 text-gray-400 text-xs font-medium uppercase mb-1">
                                        <Star className="w-3.5 h-3.5 text-[#B026FF]" />
                                        Reputation
                                    </div>
                                    <div className="text-lg font-semibold text-white">{Number(agent!.reputationScore) / 10}/100</div>
                                </div>
                                <div className="bg-black/20 rounded-lg p-3 border border-white/5">
                                    <div className="flex items-center gap-1.5 text-gray-400 text-xs font-medium uppercase mb-1">
                                        <Activity className="w-3.5 h-3.5 text-[#00F0FF]" />
                                        Tasks
                                    </div>
                                    <div className="text-lg font-semibold text-white">{Number(agent!.totalTasks)}</div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-white/10">
                                <span className="text-gray-400 font-medium whitespace-nowrap overflow-hidden text-ellipsis mr-4 text-xs">
                                    Owner: {agent!.agentOwner.slice(0, 6)}...{agent!.agentOwner.slice(-4)}
                                </span>
                            </div>

                            <button className="w-full mt-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-medium transition-colors text-white">
                                Hire Agent
                            </button>
                        </motion.div>
                    ))}
                </motion.div>
            )}

            {/* Register Agent Modal */}
            <AnimatePresence>
                {showRegisterModal && (
                    <RegisterAgentModal onClose={() => setShowRegisterModal(false)} />
                )}
            </AnimatePresence>
        </div>
    );
}
