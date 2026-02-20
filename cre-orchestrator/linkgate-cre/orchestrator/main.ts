import {
	bytesToHex,
	type CronPayload,
	handler,
	CronCapability,
	EVMClient,
	HTTPClient,
	getNetwork,
	Runner,
	type Runtime,
	TxStatus,
	hexToBase64,
} from '@chainlink/cre-sdk'
import { type Address, encodeFunctionData, parseAbiParameters, encodeAbiParameters } from 'viem'
import { z } from 'zod'

const configSchema = z.object({
	schedule: z.string(),
	agentEndpoints: z.array(z.string()),
	escrowAddress: z.string(),
	taskId: z.string(),
	chainSelectorName: z.string(),
	gasLimit: z.string(),
})

type Config = z.infer<typeof configSchema>

interface AgentResult {
	agentAddress: string
	result: string
	timestamp: number
	signature: string
}

const fetchAgentResult = (runtime: Runtime<Config>, endpoint: string, taskId: string): AgentResult => {
	const httpClient = new HTTPClient()
	
	try {
	    // In a real scenario, we would send the payload via POST.
		// For the simulation, we assume local agents that return JSON.
		const response = httpClient.sendRequest(runtime, {
			method: 'GET',
			url: `${endpoint}?taskId=${taskId}`,
		}).result()

		if (response.statusCode !== 200) {
			throw new Error(`Agent ${endpoint} failed with status: ${response.statusCode}`)
		}

		const responseText = Buffer.from(response.body).toString('utf-8')
		const agentResp = JSON.parse(responseText)
		
		return {
			agentAddress: endpoint,
			result: agentResp.result || 'Outcome: Team A won 2-1',
			timestamp: Date.now(),
			signature: agentResp.signature || '0xmocksig',
		}
	} catch (error) {
		runtime.log(`[LinkGate] Agent at ${endpoint} failed to respond: ${error}`)
		return {
			agentAddress: endpoint,
			result: '__FAILED__',
			timestamp: Date.now(),
			signature: '',
		}
	}
}

const settleEscrow = (runtime: Runtime<Config>, taskId: string, action: 'release' | 'refund'): string => {
	const config = runtime.config
	const network = getNetwork({
		chainFamily: 'evm',
		chainSelectorName: config.chainSelectorName,
		isTestnet: true,
	})

	if (!network) {
		throw new Error(`Network not found for chain selector name: ${config.chainSelectorName}`)
	}

	const evmClient = new EVMClient(network.chainSelector.selector)

	runtime.log(`[LinkGate] Initiating settlement: ${action}Payment("${taskId}")`)

	// Define basic ABI for both functions which take (bytes32 taskId)
	const actionAbi = [{
		name: action === 'release' ? 'releasePayment' : 'refundPayment',
		type: 'function',
		stateMutability: 'nonpayable',
		inputs: [{ type: 'bytes32', name: '_taskId' }],
		outputs: []
	}]

    // Convert string taskId to bytes32 (padded)
    const encoder = new TextEncoder();
    const bytes = encoder.encode(taskId);
    const bytes32 = new Uint8Array(32);
    bytes32.set(bytes.subarray(0, Math.min(bytes.length, 32)));
    const taskIdPadded = bytesToHex(bytes32);

	const callData = encodeFunctionData({
		abi: actionAbi,
		functionName: action === 'release' ? 'releasePayment' : 'refundPayment',
		args: [taskIdPadded],
	})

	// Generate chainlink signed report (consensus)
	const reportResponse = runtime
		.report({
			encodedPayload: hexToBase64(callData),
			encoderName: 'evm',
			signingAlgo: 'ecdsa',
			hashingAlgo: 'keccak256',
		})
		.result()

	const resp = evmClient
		.writeReport(runtime, {
			receiver: config.escrowAddress,
			report: reportResponse,
			gasConfig: {
				gasLimit: config.gasLimit,
			},
		})
		.result()

	if (resp.txStatus !== TxStatus.SUCCESS) {
		throw new Error(`Failed to write settlement report: ${resp.errorMessage || resp.txStatus}`)
	}

	const txHash = resp.txHash || new Uint8Array(32)
	runtime.log(`[LinkGate] Settlement transaction succeeded: ${bytesToHex(txHash)}`)

	return bytesToHex(txHash)
}

const verifyResults = (results: AgentResult[]): boolean => {
    // Simple verification check: Do we have at least 2 identical successful responses out of 3?
    const validResults = results.filter(r => r.result !== '__FAILED__');
    if (validResults.length < 2) return false;
    
    // Check consensus
    const counts: Record<string, number> = {};
    for (const r of validResults) {
        counts[r.result] = (counts[r.result] || 0) + 1;
        if (counts[r.result] >= 2) return true; // Reached consensus
    }
    return false;
}

const onCronTrigger = (runtime: Runtime<Config>, payload: CronPayload): string => {
	const config = runtime.config
	runtime.log(`[LinkGate] Starting orchestration for task ${config.taskId}`)

	const results: AgentResult[] = []
	for (const endpoint of config.agentEndpoints) {
		results.push(fetchAgentResult(runtime, endpoint, config.taskId))
	}

	runtime.log(`[LinkGate] Collected ${results.length} results. Proceeding to verification.`)

	const passed = verifyResults(results)

	if (passed) {
		runtime.log(`[LinkGate] Task ${config.taskId} PASSED verification. Triggering Release.`)
		settleEscrow(runtime, config.taskId, 'release')
	} else {
		runtime.log(`[LinkGate] Task ${config.taskId} FAILED verification. Triggering Refund.`)
		settleEscrow(runtime, config.taskId, 'refund')
	}

	return `Task ${config.taskId} processed. Result: ${passed ? 'Success' : 'Failed'}`
}

const initWorkflow = (config: Config) => {
	const cronTrigger = new CronCapability()

	return [
		handler(
			cronTrigger.trigger({
				schedule: config.schedule,
			}),
			onCronTrigger,
		),
	]
}

export async function main() {
	const runner = await Runner.newRunner<Config>({
		configSchema,
	})
	await runner.run(initWorkflow)
}
