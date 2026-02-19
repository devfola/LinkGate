const { ethers } = require("ethers");
const X402PaymentHandler = require("./X402PaymentHandler");

async function main() {
    console.log("--- LinkGate: x402 Payment Simulation ---");

    // 1. Setup Mock Wallet
    const wallet = ethers.Wallet.createRandom();
    console.log("Agent Address:", wallet.address);

    const handler = new X402PaymentHandler(wallet);

    // 2. Mock HTTP 402 Response from a Seller Agent
    const mock402Response = {
        status: 402,
        headers: {
            "x402-amount": "500000", // 0.5 USDC
            "x402-recipient": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8" // Mock Seller
        }
    };

    // 3. Handle the Payment Required response
    try {
        const authorization = await handler.handle402Response(mock402Response);

        console.log("\n--- Authorization Details ---");
        console.log("Recipient:", authorization.to);
        console.log("Value:", authorization.value);
        console.log("Nonce:", authorization.nonce);
        console.log("Signature (V, R, S):", authorization.v, authorization.r, authorization.s);

        console.log("\nLinkGate: Simulation Successful. Authorization is ready for post-to-escrow.");
    } catch (error) {
        console.error("LinkGate: Simulation Failed", error);
    }
}

main();
