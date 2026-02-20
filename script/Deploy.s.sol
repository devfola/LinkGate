// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../contracts/AgentRegistry.sol";
import "../contracts/escrow/StablecoinEscrow.sol";

/**
 * @notice Deploys AgentRegistry and StablecoinEscrow to Monad Testnet.
 *
 * Usage:
 *   forge script script/Deploy.s.sol:Deploy \
 *     --rpc-url $MONAD_RPC_URL \
 *     --private-key $PRIVATE_KEY \
 *     --broadcast \
 *     -vvvv
 *
 * Note: Monad testnet does not support Etherscan verification yet.
 *       Remove --verify flag.
 *
 * Required .env vars:
 *   PRIVATE_KEY       – deployer private key (without 0x)
 *   MONAD_RPC_URL     – RPC URL for Monad testnet
 *   ORCHESTRATOR_ADDRESS – address for the CRE orchestrator (defaults to deployer)
 *
 * Monad testnet constants (hardcoded):
 *   Chain ID : 10143
 *   TestUSDC : 0x7aEF350bE40E3e691230B1a08465B90B550e2205
 */
contract Deploy is Script {
    // Monad Testnet TestUSDC — official Monad-deployed token
    address constant MONAD_USDC = 0x7AEf350bE40E3e691230b1a08465b90b550e2205;

    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        // Orchestrator defaults to deployer if not explicitly set
        address orchestrator;
        try vm.envAddress("ORCHESTRATOR_ADDRESS") returns (address o) {
            orchestrator = o;
        } catch {
            orchestrator = deployer;
        }

        console.log("Deployer:     ", deployer);
        console.log("Orchestrator: ", orchestrator);
        console.log("USDC:         ", MONAD_USDC);

        vm.startBroadcast(deployerKey);

        // 1. Deploy AgentRegistry
        AgentRegistry registry = new AgentRegistry();
        console.log("AgentRegistry deployed at:", address(registry));

        // 2. Grant Orchestrator role
        registry.setOrchestrator(orchestrator, true);
        console.log("Orchestrator role granted to:", orchestrator);

        // 3. Deploy StablecoinEscrow
        StablecoinEscrow escrow = new StablecoinEscrow(
            MONAD_USDC,
            orchestrator
        );
        console.log("StablecoinEscrow deployed at:", address(escrow));

        vm.stopBroadcast();

        // Summary — copy these into README.md
        console.log("\n====== Deployment Summary (Monad Testnet) ======");
        console.log("AgentRegistry:   ", address(registry));
        console.log("StablecoinEscrow:", address(escrow));
        console.log("Orchestrator:    ", orchestrator);
        console.log("TestUSDC:        ", MONAD_USDC);
        console.log("Explorer: https://testnet.monadexplorer.com/");
    }
}
