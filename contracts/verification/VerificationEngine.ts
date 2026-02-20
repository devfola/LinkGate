/**
 * @module VerificationEngine
 * @description Production-grade result verification for LinkGate.
 *
 * Provides:
 *  - Multi-source consensus: same task dispatched to N agents, result compared.
 *  - SLA enforcement: tasks that take longer than their declared SLA are failed.
 *  - Confidence scoring: final score indicates how many agents agreed.
 */

export interface AgentResult {
    agentAddress: string;
    result: string;
    timestamp: number; // ms since epoch
    signature: string; // Signed to prove this agent produced this output
}

export interface SLA {
    maxResponseTimeMs: number; // from agent_schema.jsonld
    minConsensus: number; // Fraction of agents that must agree, e.g. 0.67
}

export interface VerificationReport {
    taskId: string;
    consensusResult: string | null;
    confidenceScore: number; // 0.0 – 1.0
    agentsQueried: number;
    agentsAgreed: number;
    slaViolations: string[]; // List of agent addresses that violated SLA
    passed: boolean;
}

export class VerificationEngine {
    /**
     * Verifies a set of results from multiple agents.
     * @param taskId Unique task identifier
     * @param results Array of results from different agents
     * @param sla     SLA constraints declared by the seller
     * @param taskStartedAt Timestamp (ms) when the task was dispatched
     */
    static verify(
        taskId: string,
        results: AgentResult[],
        sla: SLA,
        taskStartedAt: number
    ): VerificationReport {
        const report: VerificationReport = {
            taskId,
            consensusResult: null,
            confidenceScore: 0,
            agentsQueried: results.length,
            agentsAgreed: 0,
            slaViolations: [],
            passed: false,
        };

        if (results.length === 0) {
            console.warn(`[VerificationEngine] Task ${taskId}: No results received.`);
            return report;
        }

        // 1. SLA enforcement: detect agents that responded too slowly
        for (const r of results) {
            const elapsed = r.timestamp - taskStartedAt;
            if (elapsed > sla.maxResponseTimeMs) {
                report.slaViolations.push(r.agentAddress);
                console.warn(
                    `[VerificationEngine] SLA violation: Agent ${r.agentAddress} took ${elapsed}ms (limit: ${sla.maxResponseTimeMs}ms)`
                );
            }
        }

        // Filter out SLA violators for consensus calculation
        const validResults = results.filter(
            (r) => !report.slaViolations.includes(r.agentAddress)
        );

        if (validResults.length === 0) {
            console.error(`[VerificationEngine] Task ${taskId}: All agents violated SLA.`);
            return report;
        }

        // 2. Consensus: group by normalised result, pick the majority
        const freq: Record<string, AgentResult[]> = {};
        for (const r of validResults) {
            const key = r.result.trim().toLowerCase();
            freq[key] = freq[key] ?? [];
            freq[key].push(r);
        }

        let bestKey = "";
        let bestCount = 0;
        for (const [key, group] of Object.entries(freq)) {
            if (group.length > bestCount) {
                bestCount = group.length;
                bestKey = key;
            }
        }

        const consensusFraction = bestCount / validResults.length;
        report.agentsAgreed = bestCount;
        report.confidenceScore = consensusFraction;
        report.consensusResult = freq[bestKey]![0]!.result; // return un-normalised version

        // 3. Pass/fail based on min-consensus threshold
        report.passed = consensusFraction >= sla.minConsensus;

        console.log(
            `[VerificationEngine] Task ${taskId}: ${report.passed ? "PASSED" : "FAILED"} ` +
            `(confidence=${(consensusFraction * 100).toFixed(1)}%, ` +
            `${bestCount}/${validResults.length} agents agreed)`
        );

        return report;
    }
}
