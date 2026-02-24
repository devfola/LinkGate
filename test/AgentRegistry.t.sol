// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../contracts/AgentRegistry.sol";

contract AgentRegistryTest is Test {
    AgentRegistry public registry;

    address public owner = address(this);
    address public orch = makeAddr("orchestrator");
    address public agent1 = makeAddr("agent1");
    address public agent2 = makeAddr("agent2");
    address public outsider = makeAddr("outsider");

    string constant METADATA_URI = "ipfs://QmTestAgent123";
    string constant METADATA_URI_V2 = "ipfs://QmTestAgentV2";

    // ── Setup ──────────────────────────────────────────────────────────────

    function setUp() public {
        registry = new AgentRegistry();
        registry.setOrchestrator(orch, true);
    }

    // ── Registration ───────────────────────────────────────────────────────

    function test_RegisterAgent() public {
        registry.registerAgent(agent1, METADATA_URI);

        AgentRegistry.Agent memory a = registry.getAgent(agent1);
        assertEq(a.agentOwner, address(this));
        assertEq(a.metadataURI, METADATA_URI);
        assertEq(a.metadataVersion, 1);
        assertTrue(a.isActive);
        assertEq(a.reputationScore, 500); // Neutral starting score
        assertEq(registry.getAgentCount(), 1);
    }

    function test_RevertWhen_RegisterSameAgentTwice() public {
        vm.prank(address(this));
        registry.registerAgent(agent1, METADATA_URI);

        vm.prank(address(this));
        vm.expectRevert(AgentRegistry.AgentAlreadyRegistered.selector);
        registry.registerAgent(agent1, METADATA_URI);
    }

    function test_RegisterMultipleAgents() public {
        registry.registerAgent(agent1, METADATA_URI);
        registry.registerAgent(agent2, METADATA_URI);
        assertEq(registry.getAgentCount(), 2);
    }

    // ── Metadata Update ────────────────────────────────────────────────────

    function test_UpdateMetadata() public {
        registry.registerAgent(agent1, METADATA_URI);
        registry.updateMetadata(agent1, METADATA_URI_V2, true);

        AgentRegistry.Agent memory a = registry.getAgent(agent1);
        assertEq(a.metadataURI, METADATA_URI_V2);
        assertEq(a.metadataVersion, 2);
    }

    function test_DeactivateAgent() public {
        registry.registerAgent(agent1, METADATA_URI);
        registry.updateMetadata(agent1, METADATA_URI, false);

        AgentRegistry.Agent memory a = registry.getAgent(agent1);
        assertFalse(a.isActive);
    }

    function test_RevertWhen_NonOwnerUpdatesMetadata() public {
        vm.prank(address(this));
        registry.registerAgent(agent1, METADATA_URI);

        vm.prank(outsider);
        vm.expectRevert(AgentRegistry.NotAgentOwner.selector);
        registry.updateMetadata(agent1, METADATA_URI_V2, true);
    }

    // ── Access Control ─────────────────────────────────────────────────────

    function test_SetOrchestrator() public {
        assertFalse(registry.orchestrators(outsider));
        registry.setOrchestrator(outsider, true);
        assertTrue(registry.orchestrators(outsider));
    }

    function test_RevertWhen_NonOwnerSetsOrchestrator() public {
        vm.prank(outsider);
        vm.expectRevert(AgentRegistry.NotOwner.selector);
        registry.setOrchestrator(orch, true);
    }

    function test_RevertWhen_NonOrchestratorRecordsOutcome() public {
        vm.prank(address(this));
        registry.registerAgent(agent1, METADATA_URI);

        vm.prank(outsider);
        vm.expectRevert(AgentRegistry.NotOrchestrator.selector);
        registry.recordOutcome(agent1, true, false);
    }

    // ── Reputation & Scoring ───────────────────────────────────────────────

    function test_ReputationIncreasesOnSuccess() public {
        registry.registerAgent(agent1, METADATA_URI);
        uint16 before = registry.getAgent(agent1).reputationScore;

        vm.prank(orch);
        registry.recordOutcome(agent1, true, false);

        uint16 after_ = registry.getAgent(agent1).reputationScore;
        assertGt(after_, before);
        assertEq(after_, 510); // 500 + 10
    }

    function test_ReputationDecreasesOnFailure() public {
        registry.registerAgent(agent1, METADATA_URI);

        vm.prank(orch);
        registry.recordOutcome(agent1, false, false);

        uint16 score = registry.getAgent(agent1).reputationScore;
        assertEq(score, 450); // 500 - 50
    }

    function test_SlaViolationPenalty() public {
        registry.registerAgent(agent1, METADATA_URI);

        vm.prank(orch);
        registry.recordOutcome(agent1, true, true); // success but SLA violation

        AgentRegistry.Agent memory a = registry.getAgent(agent1);
        assertEq(a.slaViolations, 1);
        // +10 for success, -20 for SLA = net -10
        assertEq(a.reputationScore, 490);
    }

    function test_AgentAutoDeactivatedAfterFiveSlaViolations() public {
        registry.registerAgent(agent1, METADATA_URI);

        for (uint i = 0; i < 5; i++) {
            vm.prank(orch);
            registry.recordOutcome(agent1, true, true);
        }

        AgentRegistry.Agent memory a = registry.getAgent(agent1);
        assertFalse(a.isActive);
        assertEq(a.slaViolations, 5);
    }

    function test_ReputationCapsAtMaximum() public {
        registry.registerAgent(agent1, METADATA_URI);

        // Run 50 successes — should cap at 1000, not overflow
        for (uint i = 0; i < 50; i++) {
            vm.prank(orch);
            registry.recordOutcome(agent1, true, false);
        }

        uint16 score = registry.getAgent(agent1).reputationScore;
        assertLe(score, 1000);
    }

    function test_ReputationFloorIsZero() public {
        registry.registerAgent(agent1, METADATA_URI);

        // Run 20 failures — score should not underflow below 0
        for (uint i = 0; i < 20; i++) {
            vm.prank(orch);
            registry.recordOutcome(agent1, false, false);
        }

        uint16 score = registry.getAgent(agent1).reputationScore;
        assertEq(score, 0);
    }

    // ── Fuzz ───────────────────────────────────────────────────────────────

    /// @dev Reputation should always remain between 0 and 1000 regardless of inputs.
    function testFuzz_ReputationAlwaysInBounds(bool success, bool sla) public {
        registry.registerAgent(agent1, METADATA_URI);

        vm.startPrank(orch);
        for (uint i = 0; i < 10; i++) {
            if (registry.getAgent(agent1).isActive) {
                registry.recordOutcome(agent1, success, sla);
            }
        }
        vm.stopPrank();

        uint16 score = registry.getAgent(agent1).reputationScore;
        assertLe(score, 1000);
    }
}
