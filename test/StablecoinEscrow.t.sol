// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../contracts/StablecoinEscrow.sol";

/// @dev Minimal ERC-20 mock for testing — no approvals needed for `deal`.
contract MockUSDC {
    string public name = "USD Coin";
    string public symbol = "USDC";
    uint8 public decimals = 6;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external returns (bool) {
        require(
            allowance[from][msg.sender] >= amount,
            "USDC: allowance too low"
        );
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "USDC: insufficient balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}

contract StablecoinEscrowTest is Test {
    StablecoinEscrow public escrow;
    MockUSDC public usdc;

    address public orch = makeAddr("orchestrator");
    address public buyer = makeAddr("buyer");
    address public seller = makeAddr("seller");
    address public outsider = makeAddr("outsider");

    bytes32 constant TASK_A = keccak256("task-a");
    bytes32 constant TASK_B = keccak256("task-b");

    uint256 constant AMOUNT = 500_000; // 0.5 USDC (6 decimals)

    // ── Setup ──────────────────────────────────────────────────────────────

    function setUp() public {
        usdc = new MockUSDC();
        escrow = new StablecoinEscrow(address(usdc), orch);

        // Fund buyer and approve escrow
        usdc.mint(buyer, 10_000_000); // 10 USDC
        vm.prank(buyer);
        usdc.approve(address(escrow), type(uint256).max);
    }

    // ── Lock Payment ───────────────────────────────────────────────────────

    function test_LockPayment() public {
        vm.prank(buyer);
        escrow.lockPayment(TASK_A, seller, AMOUNT);

        (
            address b,
            address s,
            uint256 amt,
            bool released,
            bool refunded
        ) = escrow.payments(TASK_A);
        assertEq(b, buyer);
        assertEq(s, seller);
        assertEq(amt, AMOUNT);
        assertFalse(released);
        assertFalse(refunded);

        // Funds should have moved from buyer to escrow
        assertEq(usdc.balanceOf(buyer), 10_000_000 - AMOUNT);
        assertEq(usdc.balanceOf(address(escrow)), AMOUNT);
    }

    function test_RevertWhen_LockSameTaskTwice() public {
        vm.prank(buyer);
        escrow.lockPayment(TASK_A, seller, AMOUNT);

        vm.prank(buyer);
        vm.expectRevert(TaskAlreadyExists.selector);
        escrow.lockPayment(TASK_A, seller, AMOUNT);
    }

    // ── Release Payment ────────────────────────────────────────────────────

    function test_ReleasePayment() public {
        vm.prank(buyer);
        escrow.lockPayment(TASK_A, seller, AMOUNT);

        vm.prank(orch);
        escrow.releasePayment(TASK_A);

        // Seller should have received the funds
        assertEq(usdc.balanceOf(seller), AMOUNT);
        assertEq(usdc.balanceOf(address(escrow)), 0);

        (, , , bool released, ) = escrow.payments(TASK_A);
        assertTrue(released);
    }

    function test_RevertWhen_ReleaseByNonOrchestrator() public {
        vm.prank(buyer);
        escrow.lockPayment(TASK_A, seller, AMOUNT);

        vm.prank(outsider);
        vm.expectRevert(NotOrchestrator.selector);
        escrow.releasePayment(TASK_A);
    }

    function test_RevertWhen_ReleaseTwice() public {
        vm.prank(buyer);
        escrow.lockPayment(TASK_A, seller, AMOUNT);

        vm.prank(orch);
        escrow.releasePayment(TASK_A);

        vm.prank(orch);
        vm.expectRevert(PaymentAlreadySettled.selector);
        escrow.releasePayment(TASK_A);
    }

    // ── Refund Payment ─────────────────────────────────────────────────────

    function test_RefundPayment() public {
        vm.prank(buyer);
        escrow.lockPayment(TASK_A, seller, AMOUNT);

        uint256 buyerBefore = usdc.balanceOf(buyer);

        vm.prank(orch);
        escrow.refundPayment(TASK_A);

        // Buyer should have received their funds back
        assertEq(usdc.balanceOf(buyer), buyerBefore + AMOUNT);
        assertEq(usdc.balanceOf(address(escrow)), 0);

        (, , , , bool refunded) = escrow.payments(TASK_A);
        assertTrue(refunded);
    }

    function test_RevertWhen_RefundByNonOrchestrator() public {
        vm.prank(buyer);
        escrow.lockPayment(TASK_A, seller, AMOUNT);

        vm.prank(outsider);
        vm.expectRevert(NotOrchestrator.selector);
        escrow.refundPayment(TASK_A);
    }

    function test_RevertWhen_RefundTwice() public {
        vm.prank(buyer);
        escrow.lockPayment(TASK_A, seller, AMOUNT);

        vm.prank(orch);
        escrow.refundPayment(TASK_A);

        vm.prank(orch);
        vm.expectRevert(PaymentAlreadySettled.selector);
        escrow.refundPayment(TASK_A);
    }

    function test_RevertWhen_ReleaseAfterRefund() public {
        vm.prank(buyer);
        escrow.lockPayment(TASK_A, seller, AMOUNT);

        vm.prank(orch);
        escrow.refundPayment(TASK_A);

        vm.prank(orch);
        vm.expectRevert(PaymentAlreadySettled.selector);
        escrow.releasePayment(TASK_A);
    }

    // ── Multiple Tasks ─────────────────────────────────────────────────────

    function test_MultipleIndependentTasks() public {
        usdc.mint(buyer, 10_000_000);

        vm.startPrank(buyer);
        escrow.lockPayment(TASK_A, seller, AMOUNT);
        escrow.lockPayment(TASK_B, seller, AMOUNT * 2);
        vm.stopPrank();

        // Release task A, refund task B
        vm.prank(orch);
        escrow.releasePayment(TASK_A);
        vm.prank(orch);
        escrow.refundPayment(TASK_B);

        assertEq(usdc.balanceOf(seller), AMOUNT); // only Task A
        assertEq(usdc.balanceOf(address(escrow)), 0);
    }

    // ── Events ────────────────────────────────────────────────────────────

    function test_EmitsPaymentLockedEvent() public {
        vm.expectEmit(true, false, false, true);
        emit StablecoinEscrow.PaymentLocked(TASK_A, buyer, seller, AMOUNT);

        vm.prank(buyer);
        escrow.lockPayment(TASK_A, seller, AMOUNT);
    }

    function test_EmitsPaymentReleasedEvent() public {
        vm.prank(buyer);
        escrow.lockPayment(TASK_A, seller, AMOUNT);

        vm.expectEmit(true, false, false, true);
        emit StablecoinEscrow.PaymentReleased(TASK_A, seller, AMOUNT);

        vm.prank(orch);
        escrow.releasePayment(TASK_A);
    }

    function test_EmitsPaymentRefundedEvent() public {
        vm.prank(buyer);
        escrow.lockPayment(TASK_A, seller, AMOUNT);

        vm.expectEmit(true, false, false, true);
        emit StablecoinEscrow.PaymentRefunded(TASK_A, buyer, AMOUNT);

        vm.prank(orch);
        escrow.refundPayment(TASK_A);
    }

    // ── Fuzz ───────────────────────────────────────────────────────────────

    /// @dev For any amount, escrow balance should always be zero after settlement.
    function testFuzz_EscrowAlwaysEmptiesAfterSettlement(
        uint128 amount,
        bool shouldRelease
    ) public {
        vm.assume(amount > 0 && amount <= 10_000_000);

        usdc.mint(buyer, amount);
        vm.prank(buyer);
        escrow.lockPayment(TASK_A, seller, amount);

        vm.prank(orch);
        if (shouldRelease) {
            escrow.releasePayment(TASK_A);
        } else {
            escrow.refundPayment(TASK_A);
        }

        assertEq(usdc.balanceOf(address(escrow)), 0);
    }
}
