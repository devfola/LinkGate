const { ethers } = require("ethers");
require("dotenv").config();

/**
 * @class X402PaymentHandler
 * @description Manages the machine-to-machine payment flow using the x402 standard.
 */
class X402PaymentHandler {
    constructor(wallet) {
        this.wallet = wallet;
    }

    /**
     * @notice Parses an HTTP 402 response and extracts payment metadata.
     * @param {Object} response Headers or body containing x402 requirements.
     */
    async handle402Response(response) {
        console.log("LinkGate: Received HTTP 402 - Payment Required");

        // Mock requirements extraction
        const requirements = {
            amount: response.headers["x402-amount"] || "100000", // 0.1 USDC (6 decimals)
            recipient: response.headers["x402-recipient"],
            nonce: ethers.hexlify(ethers.randomBytes(32)),
            validAfter: 0,
            validBefore: Math.floor(Date.now() / 1000) + 3600 // 1 hour validity
        };

        return this.createAuthorization(requirements);
    }

    /**
     * @notice Generates an EIP-3009 transfer authorization signature.
     */
    async createAuthorization(req) {
        const domain = {
            name: "USD Coin",
            version: "2",
            chainId: 1, // Mainnet (or testnet ID)
            verifyingContract: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" // USDC Address
        };

        const types = {
            TransferWithAuthorization: [
                { name: "from", type: "address" },
                { name: "to", type: "address" },
                { name: "value", type: "uint256" },
                { name: "validAfter", type: "uint256" },
                { name: "validBefore", type: "uint256" },
                { name: "nonce", type: "bytes32" }
            ]
        };

        const value = {
            from: this.wallet.address,
            to: req.recipient,
            value: req.amount,
            validAfter: req.validAfter,
            validBefore: req.validBefore,
            nonce: req.nonce
        };

        const signature = await this.wallet.signTypedData(domain, types, value);

        console.log("LinkGate: Generated Authorization Signature", signature);

        const sig = ethers.Signature.from(signature);

        return {
            ...value,
            v: sig.v,
            r: sig.r,
            s: sig.s
        };
    }
}

module.exports = X402PaymentHandler;
