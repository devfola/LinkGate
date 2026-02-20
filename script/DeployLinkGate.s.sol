// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {AgentRegistry} from "../contracts/AgentRegistry.sol";
import {StablecoinEscrow} from "../contracts/escrow/StablecoinEscrow.sol";

contract DeployLinkGate is Script {
    function run() public {
        // Load configurations from .env
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address orchestratorAddress = vm.envAddress("ORCHESTRATOR_ADDRESS");

        // The user's .env has a real Base Sepolia USDC address. We'll use this.
        address usdcAddress = vm.envAddress("USDC_ADDRESS");

        console.log("-----------------------------------------");
        console.log("Starting LinkGate Deployment on Base Sepolia");
        console.log("Deployer Address:", vm.addr(deployerPrivateKey));
        console.log("Orchestrator Address:", orchestratorAddress);
        console.log("USDC Address:", usdcAddress);
        console.log("-----------------------------------------");

        // Start broadcasting transactions
        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy Agent Registry
        AgentRegistry registry = new AgentRegistry();
        console.log("1. AgentRegistry deployed to:", address(registry));

        // 2. Set Orchestrator in Registry
        registry.setOrchestrator(orchestratorAddress, true);
        console.log("2. Orchestrator role granted in AgentRegistry");

        // 3. Deploy Escrow (using the real USDC address provided in .env)
        StablecoinEscrow escrow = new StablecoinEscrow(
            usdcAddress,
            orchestratorAddress
        );
        console.log("3. StablecoinEscrow deployed to:", address(escrow));

        // Stop broadcasting
        vm.stopBroadcast();

        console.log("-----------------------------------------");
        console.log("Deployment Complete!");
        console.log("AgentRegistry:", address(registry));
        console.log("StablecoinEscrow:", address(escrow));
        console.log("-----------------------------------------");
    }
}
