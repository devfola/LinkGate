"use client";

import { motion } from "framer-motion";
import { Bot, Star, Activity, PlusCircle, Loader2 } from "lucide-react";
import { useReadContract, useReadContracts } from "wagmi";
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

export default function AgentsDirectory() {
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

    // Simplify layout for "Loading" states
    const isLoading = isLoadingCount || isLoadingAddresses || isLoadingData;

    // Transform raw contracts output into UI friendly format, ignoring inactive/errored nodes
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


    return (
        <div className="max-w-7xl mx-auto px-6 py-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
                <div>
                    <h1 className="text-4xl font-bold mb-2">Agent <span className="text-[#00F0FF]">Directory</span></h1>
                    <p className="text-gray-400">Discover and hire decentralized AI agents via the LinkGate registry.</p>
                </div>
                <button className="flex items-center gap-2 px-6 py-3 bg-[#2A5ADA]/10 text-[#2A5ADA] border border-[#2A5ADA]/30 hover:bg-[#2A5ADA]/20 hover:border-[#2A5ADA] rounded-xl font-medium transition-all group">
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
                                {agent!.metadataURI ? new URL(agent!.metadataURI).hostname : "Unknown Agent"}
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
        </div>
    );
}
