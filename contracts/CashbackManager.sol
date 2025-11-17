// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title CashbackManager
 * @dev Manages cashback distribution logic and payment processing
 * Handles cashback claims, distributions, and track all transactions
 */
contract CashbackManager is Ownable, ReentrancyGuard, Pausable {
    // Token interface
    IERC20 public cashbackToken;

    // Structs
    struct CashbackRecord {
        bytes32 id; // Unique ID từ backend
        address user;
        uint256 amount;
        uint256 percentage;
        uint256 eligibleAt; // Timestamp eligible for claim
        uint256 expiresAt; // Expiration timestamp
        uint256 claimedAt; // When user claimed
        bool claimed;
        string orderId; // Order ID từ backend
    }

    struct CashbackConfig {
        uint256 minCashbackAmount; // Minimum cashback amount
        uint256 maxCashbackAmount; // Maximum per transaction
        uint256 claimWindow; // Days user can claim after eligible
        uint256 platformFeePercentage; // Platform fee
        bool enabled;
    }

    // State variables
    CashbackConfig public config;
    mapping(bytes32 => CashbackRecord) public cashbacks;
    mapping(address => bytes32[]) public userCashbacks;
    mapping(address => uint256) public totalClaimed;

    uint256 public totalDistributed;
    uint256 public totalClaimed_;
    address public operatorAddress;

    // Events
    event CashbackCreated(
        bytes32 indexed cashbackId,
        address indexed user,
        uint256 amount,
        uint256 percentage,
        string orderId
    );
    event CashbackClaimed(
        bytes32 indexed cashbackId,
        address indexed user,
        uint256 amount,
        uint256 timestamp
    );
    event CashbackExpired(bytes32 indexed cashbackId, address indexed user);
    event ConfigUpdated(uint256 minAmount, uint256 maxAmount, uint256 claimDays, uint256 fee);
    event TokensWithdrawn(address indexed to, uint256 amount);
    event OperatorChanged(address indexed newOperator);

    // Modifiers
    modifier onlyOperator() {
        require(msg.sender == operatorAddress || msg.sender == owner(), "Only operator or owner");
        _;
    }

    /**
     * @dev Constructor
     * @param _token Address of CashbackToken
     * @param _operator Initial operator address
     */
    constructor(address _token, address _operator) Ownable(msg.sender) {
        require(_token != address(0), "Invalid token address");
        require(_operator != address(0), "Invalid operator address");

        cashbackToken = IERC20(_token);
        operatorAddress = _operator;

        // Default config
        config = CashbackConfig({
            minCashbackAmount: 1000 * 10 ** 18, // 1000 tokens minimum
            maxCashbackAmount: 1_000_000 * 10 ** 18, // 1M tokens max
            claimWindow: 90 days,
            platformFeePercentage: 2, // 2% fee
            enabled: true
        });
    }

    /**
     * @dev Create a cashback record
     * Only operator can call
     */
    function createCashback(
        bytes32 _cashbackId,
        address _user,
        uint256 _amount,
        uint256 _percentage,
        uint256 _eligibleAt,
        uint256 _expiresAt,
        string memory _orderId
    ) external onlyOperator whenNotPaused {
        require(_user != address(0), "Invalid user");
        require(_amount >= config.minCashbackAmount, "Amount below minimum");
        require(_amount <= config.maxCashbackAmount, "Amount exceeds maximum");
        require(_eligibleAt < _expiresAt, "Invalid dates");
        require(config.enabled, "Cashback disabled");

        bytes32 cashbackId = _cashbackId;
        require(cashbacks[cashbackId].user == address(0), "Cashback already exists");

        // Create cashback record
        cashbacks[cashbackId] = CashbackRecord({
            id: cashbackId,
            user: _user,
            amount: _amount,
            percentage: _percentage,
            eligibleAt: _eligibleAt,
            expiresAt: _expiresAt,
            claimedAt: 0,
            claimed: false,
            orderId: _orderId
        });

        userCashbacks[_user].push(cashbackId);
        totalDistributed += _amount;

        emit CashbackCreated(_cashbackId, _user, _amount, _percentage, _orderId);
    }

    /**
     * @dev User claims cashback
     */
    function claimCashback(bytes32 _cashbackId) external nonReentrant whenNotPaused {
        CashbackRecord storage cashback = cashbacks[_cashbackId];

        require(cashback.user == msg.sender, "Not cashback owner");
        require(!cashback.claimed, "Already claimed");
        require(block.timestamp >= cashback.eligibleAt, "Not eligible yet");
        require(block.timestamp <= cashback.expiresAt, "Cashback expired");

        // Calculate fee
        uint256 fee = (cashback.amount * config.platformFeePercentage) / 100;
        uint256 userAmount = cashback.amount - fee;

        // Mark as claimed
        cashback.claimed = true;
        cashback.claimedAt = block.timestamp;

        // Update stats
        totalClaimed += userAmount;
        totalClaimed_ += userAmount;

        // Transfer tokens to user
        require(
            cashbackToken.transfer(msg.sender, userAmount),
            "Token transfer failed"
        );

        emit CashbackClaimed(_cashbackId, msg.sender, userAmount, block.timestamp);
    }

    /**
     * @dev Admin force claim cashback (for system operations)
     */
    function adminClaimCashback(bytes32 _cashbackId, address _recipient)
        external
        onlyOperator
        nonReentrant
    {
        CashbackRecord storage cashback = cashbacks[_cashbackId];

        require(cashback.user != address(0), "Cashback not found");
        require(!cashback.claimed, "Already claimed");
        require(_recipient != address(0), "Invalid recipient");

        // Calculate fee
        uint256 fee = (cashback.amount * config.platformFeePercentage) / 100;
        uint256 userAmount = cashback.amount - fee;

        // Mark as claimed
        cashback.claimed = true;
        cashback.claimedAt = block.timestamp;

        // Update stats
        totalClaimed += userAmount;
        totalClaimed_ += userAmount;

        // Transfer tokens to recipient
        require(
            cashbackToken.transfer(_recipient, userAmount),
            "Token transfer failed"
        );

        emit CashbackClaimed(_cashbackId, _recipient, userAmount, block.timestamp);
    }

    /**
     * @dev Mark cashback as expired
     * Only operator or owner can call
     */
    function expireCashback(bytes32 _cashbackId) external onlyOperator {
        CashbackRecord storage cashback = cashbacks[_cashbackId];
        require(cashback.user != address(0), "Cashback not found");
        require(!cashback.claimed, "Already claimed");
        require(block.timestamp > cashback.expiresAt, "Not expired yet");

        cashback.claimed = true; // Mark as claimed to prevent future claims
        emit CashbackExpired(_cashbackId, cashback.user);
    }

    /**
     * @dev Get user's cashback history
     */
    function getUserCashbacks(address _user)
        external
        view
        returns (bytes32[] memory)
    {
        return userCashbacks[_user];
    }

    /**
     * @dev Get cashback details
     */
    function getCashback(bytes32 _cashbackId)
        external
        view
        returns (CashbackRecord memory)
    {
        return cashbacks[_cashbackId];
    }

    /**
     * @dev Check if cashback is claimable
     */
    function isClaimable(bytes32 _cashbackId) external view returns (bool) {
        CashbackRecord memory cashback = cashbacks[_cashbackId];
        return
            !cashback.claimed &&
            block.timestamp >= cashback.eligibleAt &&
            block.timestamp <= cashback.expiresAt;
    }

    /**
     * @dev Update configuration
     */
    function updateConfig(
        uint256 _minAmount,
        uint256 _maxAmount,
        uint256 _claimDays,
        uint256 _feePercentage
    ) external onlyOwner {
        require(_minAmount > 0, "Min amount must be > 0");
        require(_maxAmount > _minAmount, "Max must be > min");
        require(_feePercentage <= 10, "Fee too high");

        config.minCashbackAmount = _minAmount;
        config.maxCashbackAmount = _maxAmount;
        config.claimWindow = _claimDays * 1 days;
        config.platformFeePercentage = _feePercentage;

        emit ConfigUpdated(_minAmount, _maxAmount, _claimDays, _feePercentage);
    }

    /**
     * @dev Toggle cashback system enabled/disabled
     */
    function toggleCashbackEnabled() external onlyOwner {
        config.enabled = !config.enabled;
    }

    /**
     * @dev Set operator address
     */
    function setOperator(address _operator) external onlyOwner {
        require(_operator != address(0), "Invalid operator");
        operatorAddress = _operator;
        emit OperatorChanged(_operator);
    }

    /**
     * @dev Pause contract
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Withdraw unclaimed tokens
     * Only owner can call
     */
    function withdrawTokens(uint256 _amount) external onlyOwner {
        require(_amount > 0, "Amount must be > 0");
        require(
            cashbackToken.balanceOf(address(this)) >= _amount,
            "Insufficient balance"
        );

        require(
            cashbackToken.transfer(msg.sender, _amount),
            "Transfer failed"
        );
        emit TokensWithdrawn(msg.sender, _amount);
    }

    /**
     * @dev Get contract balance
     */
    function getBalance() external view returns (uint256) {
        return cashbackToken.balanceOf(address(this));
    }

    /**
     * @dev Get user total claimed
     */
    function getUserTotalClaimed(address _user) external view returns (uint256) {
        return totalClaimed[_user];
    }

    /**
     * @dev Get statistics
     */
    function getStatistics()
        external
        view
        returns (
            uint256 _totalDistributed,
            uint256 _totalClaimed,
            uint256 _contractBalance,
            uint256 _activeCashbacks
        )
    {
        return (
            totalDistributed,
            totalClaimed_,
            cashbackToken.balanceOf(address(this)),
            totalDistributed - totalClaimed_
        );
    }
}

