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
import { type Address, encodeFunctionData, parseAbiParameters, encodeAbiParameters, verifyMessage, decodeFunctionResult } from 'viem'
import { z } from 'zod'

const configSchema = z.object({
	schedule: z.string(),
	agentEndpoints: z.array(z.string()),
	escrowAddress: z.string(),
	registryAddress: z.string(),
	taskId: z.string(),
	chainSelectorName: z.string(),
	gasLimit: z.string(),
})

type Config = z.infer<typeof configSchema>

const SLA_THRESHOLD_MS = 5000;

interface AgentResult {
	agentAddress: string
	result: string
	timestamp: number
	signature: string
	responseTime: number
}

const fetchAgentResult = async (runtime: Runtime<Config>, endpoint: string, taskId: string): Promise<AgentResult> => {
	const httpClient = new HTTPClient()
	const startTime = Date.now()

	try {
		// In a real scenario, payload would sent via POST.
		// For the simulation, I assume local agents that return JSON.
		const response = httpClient.sendRequest(runtime, {
			method: 'GET',
			url: `${endpoint}?taskId=${taskId}`,
		}).result()

		if (response.statusCode !== 200) {
			throw new Error(`Agent ${endpoint} failed with status: ${response.statusCode}`)
		}

		const responseText = Buffer.from(response.body).toString('utf-8')
		const agentResp = JSON.parse(responseText)
		const responseTime = Date.now() - startTime

		const agentAddress = agentResp.agentAddress as Address
		const message = agentResp.result
		const signature = agentResp.signature as `0x${string}`

		// Identity Verification (Signature Rule)
		// We use .result() pattern if the SDK provides a wrapped verifier, 
		// but viem's verifyMessage is usually async. However, in this environment 
		// we need to be careful with async. For now, we perform the check.
		// NOTE: In some CRE versions, you might need a sync wrapper or use recoverAddress.

		let isVerified = false;
		try {
			runtime.log(`[LinkGate] Verifying signature for ${agentAddress}...`)
			isVerified = await verifyMessage({
				address: agentAddress,
				message: message,
				signature: signature,
			});

			if (isVerified) {
				runtime.log(`[LinkGate] Identity VERIFIED for ${agentAddress}`)
			} else {
				runtime.log(`[LinkGate] Identity FAILED (Bad Signature) for ${agentAddress}`)
			}
		} catch (vErr) {
			runtime.log(`[LinkGate] Identity ERROR for ${agentAddress}: ${vErr}`)
			isVerified = false;
		}

		return {
			agentAddress: agentAddress || endpoint,
			result: isVerified ? (agentResp.result || 'Outcome: Team A won 2-1') : '__FAILED__',
			timestamp: Date.now(),
			signature: signature || '0xmocksig',
			responseTime
		}
	} catch (error) {
		runtime.log(`[LinkGate] Agent at ${endpoint} failed to respond: ${error}`)
		const responseTime = Date.now() - startTime
		return {
			agentAddress: endpoint,
			result: '__FAILED__',
			timestamp: Date.now(),
			signature: '',
			responseTime
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

const updateReputation = (runtime: Runtime<Config>, agentAddress: string, wasSuccessful: boolean, slaViolation: boolean): string => {
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

	runtime.log(`[LinkGate] Reporting performance: recordOutcome("${agentAddress}", success=${wasSuccessful}, slaViolation=${slaViolation})`)

	const recordOutcomeAbi = [{
		name: 'recordOutcome',
		type: 'function',
		stateMutability: 'nonpayable',
		inputs: [
			{ type: 'address', name: '_agent' },
			{ type: 'bool', name: '_wasSuccessful' },
			{ type: 'bool', name: '_slaViolation' }
		],
		outputs: []
	}]

	const callData = encodeFunctionData({
		abi: recordOutcomeAbi,
		functionName: 'recordOutcome',
		args: [agentAddress as Address, wasSuccessful, slaViolation],
	})

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
			receiver: config.registryAddress,
			report: reportResponse,
			gasConfig: {
				gasLimit: config.gasLimit,
			},
		})
		.result()

	if (resp.txStatus !== TxStatus.SUCCESS) {
		throw new Error(`Failed to write reputation report for ${agentAddress}: ${resp.errorMessage || resp.txStatus}`)
	}

	return bytesToHex(resp.txHash || new Uint8Array(32))
}

const fetchAgentsFromRegistry = async (runtime: Runtime<Config>): Promise<string[]> => {
	const config = runtime.config
	const network = getNetwork({
		chainFamily: 'evm',
		chainSelectorName: config.chainSelectorName,
		isTestnet: true,
	})

	if (!network) throw new Error(`Network not found for discovery`)
	const evmClient = new EVMClient(network.chainSelector.selector)
	const endpoints: string[] = []

	try {
		const registryAbi = [
			{ name: 'getAgentCount', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
			{ name: 'agentList', type: 'function', stateMutability: 'view', inputs: [{ type: 'uint256' }], outputs: [{ type: 'address' }] },
			{
				name: 'getAgent', type: 'function', stateMutability: 'view', inputs: [{ type: 'address' }], outputs: [{
					type: 'tuple', components: [
						{ name: 'agentOwner', type: 'address' },
						{ name: 'metadataURI', type: 'string' },
						{ name: 'metadataVersion', type: 'uint16' },
						{ name: 'isActive', type: 'bool' },
						{ name: 'reputationScore', type: 'uint16' },
						{ name: 'totalTasks', type: 'uint32' },
						{ name: 'successfulTasks', type: 'uint32' },
						{ name: 'slaViolations', type: 'uint32' }
					]
				}]
			}
		]

		runtime.log(`[LinkGate] Fetching active agents from registry: ${config.registryAddress}`)

		// 1. Get Count
		const countData = encodeFunctionData({
			abi: registryAbi,
			functionName: 'getAgentCount',
		})
		const countReply = await evmClient.callContract(runtime, {
			call: {
				to: config.registryAddress as Address,
				data: countData
			}
		}).result()

		const count = decodeFunctionResult({
			abi: registryAbi,
			functionName: 'getAgentCount',
			data: bytesToHex(countReply.data)
		}) as bigint

		// 2. Iterate and fetch metadata
		for (let i = 0n; i < count; i++) {
			const addrData = encodeFunctionData({
				abi: registryAbi,
				functionName: 'agentList',
				args: [i]
			})
			const addrReply = await evmClient.callContract(runtime, {
				call: {
					to: config.registryAddress as Address,
					data: addrData
				}
			}).result()

			const addr = decodeFunctionResult({
				abi: registryAbi,
				functionName: 'agentList',
				data: bytesToHex(addrReply.data)
			}) as Address

			const agentReadData = encodeFunctionData({
				abi: registryAbi,
				functionName: 'getAgent',
				args: [addr]
			})
			const agentReply = await evmClient.callContract(runtime, {
				call: {
					to: config.registryAddress as Address,
					data: agentReadData
				}
			}).result()

			const agentData = decodeFunctionResult({
				abi: registryAbi,
				functionName: 'getAgent',
				data: bytesToHex(agentReply.data)
			}) as any

			if (agentData.isActive) {
				endpoints.push(agentData.metadataURI)
			}
		}

	} catch (err) {
		runtime.log(`[LinkGate] Discovery failed: ${err}`)
	}

	return endpoints
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

const onCronTrigger = async (runtime: Runtime<Config>, payload: CronPayload): Promise<string> => {
	const config = runtime.config
	runtime.log(`[LinkGate] Starting orchestration for task ${config.taskId}`)

	let endpoints = config.agentEndpoints
	if (endpoints.length === 0) {
		runtime.log(`[LinkGate] Configuration endpoints empty. Initializing On-Chain Discovery...`)
		endpoints = await fetchAgentsFromRegistry(runtime)
	}

	if (endpoints.length === 0) {
		return `[LinkGate] Aborting: No active agents found in config or registry.`
	}

	const results: AgentResult[] = []
	for (const endpoint of endpoints) {
		results.push(await fetchAgentResult(runtime, endpoint, config.taskId))
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

	// NEW: Notify AgentRegistry of performance for each agent
	for (const res of results) {
		if (res.agentAddress && res.result !== '__FAILED__') {
			try {
				// In this MVP, we treat it as successful if it matches our consensus/passed status
				const wasSuccessful = passed && res.result !== '__FAILED__';

				// SLA calculation
				const slaViolation = res.responseTime > SLA_THRESHOLD_MS;
				if (slaViolation) {
					runtime.log(`[LinkGate] SLA Violation detected for ${res.agentAddress}: ${res.responseTime}ms > ${SLA_THRESHOLD_MS}ms`)
				}

				updateReputation(runtime, res.agentAddress, wasSuccessful, slaViolation);
			} catch (err) {
				runtime.log(`[LinkGate] Failed to update reputation for ${res.agentAddress}: ${err}`)
			}
		}
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
