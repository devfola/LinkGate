// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IERC20 {
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external returns (bool);

    function transfer(address to, uint256 amount) external returns (bool);
}

/**
 * @title StablecoinEscrow
 * @dev Escrow contract for LinkGate marketplace.
 * Holds payments until task verification is confirmed by the CRE Workflow.
 */
contract StablecoinEscrow {
    address public usdcToken;
    address public owner;
    address public orchestrator; // CRE Workflow DON address

    struct Payment {
        address buyer;
        address seller;
        uint256 amount;
        bool isReleased;
        bool isRefunded;
    }

    mapping(bytes32 => Payment) public payments;

    event PaymentLocked(
        bytes32 indexed taskId,
        address buyer,
        address seller,
        uint256 amount
    );
    event PaymentReleased(
        bytes32 indexed taskId,
        address seller,
        uint256 amount
    );
    event PaymentRefunded(
        bytes32 indexed taskId,
        address buyer,
        uint256 amount
    );

    modifier onlyOrchestrator() {
        require(msg.sender == orchestrator, "Only Orchestrator can trigger");
        _;
    }

    constructor(address _usdcToken, address _orchestrator) {
        usdcToken = _usdcToken;
        orchestrator = _orchestrator;
        owner = msg.sender;
    }

    /**
     * @notice Locks funds in escrow.
     * @dev In production, this would use `transferWithAuthorization` for gasless txs.
     * For MVP, we use standard `transferFrom`.
     */
    function lockPayment(
        bytes32 _taskId,
        address _seller,
        uint256 _amount
    ) external {
        require(payments[_taskId].amount == 0, "Task already exists");

        IERC20(usdcToken).transferFrom(msg.sender, address(this), _amount);

        payments[_taskId] = Payment({
            buyer: msg.sender,
            seller: _seller,
            amount: _amount,
            isReleased: false,
            isRefunded: false
        });

        emit PaymentLocked(_taskId, msg.sender, _seller, _amount);
    }

    /**
     * @notice Releases funds to the seller. Triggered by CRE Workflow.
     */
    function releasePayment(bytes32 _taskId) external onlyOrchestrator {
        Payment storage p = payments[_taskId];
        require(!p.isReleased && !p.isRefunded, "Payment already settled");

        p.isReleased = true;
        IERC20(usdcToken).transfer(p.seller, p.amount);

        emit PaymentReleased(_taskId, p.seller, p.amount);
    }

    /**
     * @notice Refunds funds to the buyer if task fails.
     */
    function refundPayment(bytes32 _taskId) external onlyOrchestrator {
        Payment storage p = payments[_taskId];
        require(!p.isReleased && !p.isRefunded, "Payment already settled");

        p.isRefunded = true;
        IERC20(usdcToken).transfer(p.buyer, p.amount);

        emit PaymentRefunded(_taskId, p.buyer, p.amount);
    }
}
