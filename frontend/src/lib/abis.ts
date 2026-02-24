export const STABLECOIN_ESCROW_ADDRESS = "0xD9Bc6a1a7Ed36FdbF87e27b66C7B5bB9b622574C" as const;

export const STABLECOIN_ESCROW_ABI = [
    {
        "inputs": [
            { "internalType": "address", "name": "_stablecoinAddress", "type": "address" },
            { "internalType": "address", "name": "_orchestrator", "type": "address" }
        ],
        "stateMutability": "nonpayable",
        "type": "constructor"
    },
    {
        "inputs": [
            { "internalType": "bytes32", "name": "_taskId", "type": "bytes32" },
            { "internalType": "address", "name": "_seller", "type": "address" },
            { "internalType": "uint256", "name": "_amount", "type": "uint256" }
        ],
        "name": "lockPayment",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "bytes32", "name": "_taskId", "type": "bytes32" }],
        "name": "releasePayment",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "bytes32", "name": "_taskId", "type": "bytes32" }],
        "name": "refundPayment",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
] as const;

export const AGENT_REGISTRY_ADDRESS = "0x8b4287141596700d68ae60EcB04b4CEFCD0b4795" as const;

export const AGENT_REGISTRY_ABI = [
    {
        "inputs": [],
        "name": "getAgentCount",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "name": "agentList",
        "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "address", "name": "agentAddress", "type": "address" }],
        "name": "getAgent",
        "outputs": [
            {
                "components": [
                    { "internalType": "address", "name": "agentOwner", "type": "address" },
                    { "internalType": "string", "name": "metadataURI", "type": "string" },
                    { "internalType": "uint16", "name": "metadataVersion", "type": "uint16" },
                    { "internalType": "bool", "name": "isActive", "type": "bool" },
                    { "internalType": "uint16", "name": "reputationScore", "type": "uint16" },
                    { "internalType": "uint32", "name": "totalTasks", "type": "uint32" },
                    { "internalType": "uint32", "name": "successfulTasks", "type": "uint32" },
                    { "internalType": "uint32", "name": "slaViolations", "type": "uint32" }
                ],
                "internalType": "struct AgentRegistry.Agent",
                "name": "",
                "type": "tuple"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {

        "inputs": [
            { "internalType": "address", "name": "_agent", "type": "address" },
            { "internalType": "string", "name": "_metadataURI", "type": "string" }
        ],
        "name": "registerAgent",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
] as const;


export const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as const;

export const USDC_ABI = [
    {
        "inputs": [
            { "internalType": "address", "name": "spender", "type": "address" },
            { "internalType": "uint256", "name": "amount", "type": "uint256" }
        ],
        "name": "approve",
        "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
        "stateMutability": "nonpayable",
        "type": "function"
    }
] as const;
