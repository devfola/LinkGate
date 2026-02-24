// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title AgentRegistry
 * @dev Registry for AI Agents in the LinkGate marketplace.
 *
 * Production enhancements over MVP:
 *  - Role-based access control (ORCHESTRATOR_ROLE) for performance updates.
 *  - Agent deactivation / slashing for SLA violations.
 *  - Versioned metadata URI for upgradeable manifests.
 */
contract AgentRegistry {
    error NotOwner();
    error NotOrchestrator();
    error AgentNotRegistered();
    error AgentAlreadyRegistered();
    error NotAgentOwner();

    address public owner;
    mapping(address => bool) public orchestrators;

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyOrchestrator() {
        if (!orchestrators[msg.sender]) revert NotOrchestrator();
        _;
    }


    struct Agent {
        address agentOwner;
        string metadataURI; // Points to JSON-LD manifest (IPFS / HTTPS)
        uint16 metadataVersion;
        bool isActive;
        uint16 reputationScore; // 0 – 1000
        uint32 totalTasks;
        uint32 successfulTasks;
        uint32 slaViolations;
    }

    mapping(address => Agent) public agents;
    address[] public agentList;

    event AgentRegistered(
        address indexed agentAddress,
        address indexed agentOwner,
        string metadataURI
    );
    event AgentUpdated(
        address indexed agentAddress,
        string metadataURI,
        uint16 version,
        bool isActive
    );
    event PerformanceUpdated(
        address indexed agentAddress,
        uint16 newScore,
        bool wasSuccessful,
        uint32 slaViolations
    );
    event OrchestratorSet(address indexed orchestrator, bool granted);

    constructor() {
        owner = msg.sender;
    }

    function setOrchestrator(
        address _orchestrator,
        bool _granted
    ) external onlyOwner {
        orchestrators[_orchestrator] = _granted;
        emit OrchestratorSet(_orchestrator, _granted);
    }

    /**
     * @notice Register a new AI agent.
     * @param _agent      Address representing the agent (EOA or contract).
     * @param _metadataURI URI pointing to the agent's JSON-LD manifest.
     */
    function registerAgent(
        address _agent,
        string calldata _metadataURI
    ) external {
        if (agents[_agent].agentOwner != address(0))
            revert AgentAlreadyRegistered();

        agents[_agent] = Agent({
            agentOwner: msg.sender,
            metadataURI: _metadataURI,
            metadataVersion: 1,
            isActive: true,
            reputationScore: 500, // Neutral starting score
            totalTasks: 0,
            successfulTasks: 0,
            slaViolations: 0
        });

        agentList.push(_agent);
        emit AgentRegistered(_agent, msg.sender, _metadataURI);
    }

    /**
     * @notice Update metadata URI. Only the agent owner may call.
     */
    function updateMetadata(
        address _agent,
        string calldata _metadataURI,
        bool _isActive
    ) external {
        Agent storage a = agents[_agent];
        if (a.agentOwner != msg.sender) revert NotAgentOwner();

        a.metadataURI = _metadataURI;
        a.metadataVersion += 1;
        a.isActive = _isActive;

        emit AgentUpdated(_agent, _metadataURI, a.metadataVersion, _isActive);
    }

    /**
     * @notice Called by the CRE Orchestrator after every task settlement.
     * @param _agent         The agent that worked the task.
     * @param _wasSuccessful True = task passed verification, false = failed.
     * @param _slaViolation  True = agent exceeded its declared response-time SLA.
     */
    function recordOutcome(
        address _agent,
        bool _wasSuccessful,
        bool _slaViolation
    ) external onlyOrchestrator {
        Agent storage a = agents[_agent];
        if (a.agentOwner == address(0)) revert AgentNotRegistered();

        a.totalTasks += 1;

        if (_wasSuccessful) {
            a.successfulTasks += 1;
            // this is to slowly increase reputation on success (cap at 1000)
            if (a.reputationScore < 990) a.reputationScore += 10;
        } else {
            // this is to penalise on failure; minimum score 0
            if (a.reputationScore > 50) a.reputationScore -= 50;
            else a.reputationScore = 0;
        }

        if (_slaViolation) {
            a.slaViolations += 1;
            // this is to penalise for SLA breach
            if (a.reputationScore > 20) a.reputationScore -= 20;
            else a.reputationScore = 0;

            // this is to auto-deactivate after 5 SLA violations
            if (a.slaViolations >= 5) {
                a.isActive = false;
            }
        }

        emit PerformanceUpdated(
            _agent,
            a.reputationScore,
            _wasSuccessful,
            a.slaViolations
        );
    }

    function getAgentCount() external view returns (uint256) {
        return agentList.length;
    }

    function getAgent(address _agent) external view returns (Agent memory) {
        return agents[_agent];
    }
}
