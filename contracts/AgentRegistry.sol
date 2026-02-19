// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title AgentRegistry
 * @dev Registry for AI Agents in the LinkGate marketplace.
 * Stores agent identity, capability metadata URIs, and performance metrics.
 */
contract AgentRegistry {
    struct Agent {
        address owner;
        string metadataURI; // Link to JSON-LD manifest
        bool isActive;
        uint256 reputationScore; // Aggregated score (0-1000)
        uint256 totalTasks;
        uint256 successfulTasks;
    }

    mapping(address => Agent) public agents;
    address[] public agentList;

    event AgentRegistered(
        address indexed agentAddress,
        address indexed owner,
        string metadataURI
    );
    event AgentUpdated(
        address indexed agentAddress,
        string metadataURI,
        bool isActive
    );
    event PerformanceUpdated(
        address indexed agentAddress,
        uint256 reputationScore,
        uint256 totalTasks,
        uint256 successfulTasks
    );

    modifier onlyOwner(address _agent) {
        require(agents[_agent].owner == msg.sender, "Not the agent owner");
        _;
    }

    /**
     * @notice Registers a new AI agent.
     * @param _agent The address of the agent (could be a wallet or contract).
     * @param _metadataURI URI pointing to the agent's JSON-LD manifest.
     */
    function registerAgent(
        address _agent,
        string calldata _metadataURI
    ) external {
        require(agents[_agent].owner == address(0), "Agent already registered");

        agents[_agent] = Agent({
            owner: msg.sender,
            metadataURI: _metadataURI,
            isActive: true,
            reputationScore: 500, // Default mid-range score
            totalTasks: 0,
            successfulTasks: 0
        });

        agentList.push(_agent);
        emit AgentRegistered(_agent, msg.sender, _metadataURI);
    }

    /**
     * @notice Updates an agent's metadata or status.
     * @param _agent The address of the agent.
     * @param _metadataURI New URI for metadata.
     * @param _isActive Active status of the agent.
     */
    function updateAgent(
        address _agent,
        string calldata _metadataURI,
        bool _isActive
    ) external onlyOwner(_agent) {
        agents[_agent].metadataURI = _metadataURI;
        agents[_agent].isActive = _isActive;
        emit AgentUpdated(_agent, _metadataURI, _isActive);
    }

    /**
     * @notice Internal hook to update agent performance metrics.
     * @dev In production, this would be restricted to the Marketplace Orchestrator (CRE).
     */
    function updatePerformance(
        address _agent,
        uint256 _score,
        bool _wasSuccessful
    ) external {
        // TODO: Access control for Orchestrator
        Agent storage agent = agents[_agent];
        agent.reputationScore = _score;
        agent.totalTasks += 1;
        if (_wasSuccessful) {
            agent.successfulTasks += 1;
        }
        emit PerformanceUpdated(
            _agent,
            _score,
            agent.totalTasks,
            agent.successfulTasks
        );
    }

    function getAgentCount() external view returns (uint256) {
        return agentList.length;
    }
}
