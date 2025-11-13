// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title CashbackPool
 * @dev Manages the liquidity pool for cashback rewards
 */
contract CashbackPool is Ownable, ReentrancyGuard {
    // Pool token (can be USDT, USDC, or native token wrapper)
    IERC20 public poolToken;

    // Cashback token address
    address public cashbackTokenAddress;

    // Total deposited in pool
    uint256 public totalDeposited = 0;

    // Total withdrawn from pool
    uint256 public totalWithdrawn = 0;

    // Pool deposit fee (basis points)
    uint256 public depositFeePercentage = 0; // Default 0%

    // Pool withdrawal fee (basis points)
    uint256 public withdrawalFeePercentage = 100; // Default 1%

    // Fee collector address
    address public feeCollector;

    // Pool status
    bool public poolActive = true;

    // User deposit records
    struct DepositRecord {
        address user;
        uint256 amount;
        uint256 timestamp;
    }

    // User withdrawal records
    struct WithdrawalRecord {
        address user;
        uint256 amount;
        uint256 fee;
        uint256 timestamp;
    }

    // Mapping of user to deposits
    mapping(address => DepositRecord[]) public userDeposits;

    // Mapping of user to withdrawals
    mapping(address => WithdrawalRecord[]) public userWithdrawals;

    // Mapping of user to current balance
    mapping(address => uint256) public userBalance;

    // Events
    event TokensDeposited(
        address indexed user,
        uint256 amount,
        uint256 fee,
        uint256 timestamp
    );
    event TokensWithdrawn(
        address indexed user,
        uint256 amount,
        uint256 fee,
        uint256 timestamp
    );
    event DepositFeeUpdated(uint256 newFeePercentage);
    event WithdrawalFeeUpdated(uint256 newFeePercentage);
    event FeeCollectorUpdated(address newCollector);
    event PoolStatusUpdated(bool active);
    event CashbackTokenUpdated(address newTokenAddress);

    /**
     * @dev Constructor
     * @param _poolToken Address of the pool token (USDT, USDC, etc.)
     * @param _cashbackTokenAddress Address of the cashback token
     * @param _feeCollector Address to collect fees
     */
    constructor(
        address _poolToken,
        address _cashbackTokenAddress,
        address _feeCollector
    ) {
        require(_poolToken != address(0), "CashbackPool: invalid pool token");
        require(_cashbackTokenAddress != address(0), "CashbackPool: invalid cashback token");
        require(_feeCollector != address(0), "CashbackPool: invalid fee collector");

        poolToken = IERC20(_poolToken);
        cashbackTokenAddress = _cashbackTokenAddress;
        feeCollector = _feeCollector;
    }

    /**
     * @dev Deposit tokens into the pool
     * @param _amount Amount to deposit
     */
    function deposit(uint256 _amount) external nonReentrant {
        require(poolActive, "CashbackPool: pool is inactive");
        require(_amount > 0, "CashbackPool: invalid amount");
        require(
            poolToken.transferFrom(msg.sender, address(this), _amount),
            "CashbackPool: transfer failed"
        );

        // Calculate fee
        uint256 fee = (_amount * depositFeePercentage) / 10000;
        uint256 amountAfterFee = _amount - fee;

        // Update balance
        userBalance[msg.sender] += amountAfterFee;
        totalDeposited += amountAfterFee;

        // Record deposit
        userDeposits[msg.sender].push(
            DepositRecord({user: msg.sender, amount: amountAfterFee, timestamp: block.timestamp})
        );

        // Transfer fee to collector
        if (fee > 0) {
            require(
                poolToken.transfer(feeCollector, fee),
                "CashbackPool: fee transfer failed"
            );
        }

        emit TokensDeposited(msg.sender, amountAfterFee, fee, block.timestamp);
    }

    /**
     * @dev Withdraw tokens from the pool
     * @param _amount Amount to withdraw
     */
    function withdraw(uint256 _amount) external nonReentrant {
        require(poolActive, "CashbackPool: pool is inactive");
        require(_amount > 0, "CashbackPool: invalid amount");
        require(userBalance[msg.sender] >= _amount, "CashbackPool: insufficient balance");

        // Calculate withdrawal fee
        uint256 fee = (_amount * withdrawalFeePercentage) / 10000;
        uint256 amountAfterFee = _amount - fee;

        // Update balance
        userBalance[msg.sender] -= _amount;
        totalWithdrawn += amountAfterFee;

        // Record withdrawal
        userWithdrawals[msg.sender].push(
            WithdrawalRecord({
                user: msg.sender,
                amount: amountAfterFee,
                fee: fee,
                timestamp: block.timestamp
            })
        );

        // Transfer tokens to user
        require(
            poolToken.transfer(msg.sender, amountAfterFee),
            "CashbackPool: transfer failed"
        );

        // Transfer fee to collector
        if (fee > 0) {
            require(
                poolToken.transfer(feeCollector, fee),
                "CashbackPool: fee transfer failed"
            );
        }

        emit TokensWithdrawn(msg.sender, amountAfterFee, fee, block.timestamp);
    }

    /**
     * @dev Set deposit fee percentage
     * @param _feePercentage New fee percentage (basis points)
     */
    function setDepositFee(uint256 _feePercentage) external onlyOwner {
        require(_feePercentage <= 10000, "CashbackPool: invalid fee percentage");
        depositFeePercentage = _feePercentage;
        emit DepositFeeUpdated(_feePercentage);
    }

    /**
     * @dev Set withdrawal fee percentage
     * @param _feePercentage New fee percentage (basis points)
     */
    function setWithdrawalFee(uint256 _feePercentage) external onlyOwner {
        require(_feePercentage <= 10000, "CashbackPool: invalid fee percentage");
        withdrawalFeePercentage = _feePercentage;
        emit WithdrawalFeeUpdated(_feePercentage);
    }

    /**
     * @dev Update fee collector address
     * @param _newCollector New fee collector address
     */
    function setFeeCollector(address _newCollector) external onlyOwner {
        require(_newCollector != address(0), "CashbackPool: invalid address");
        feeCollector = _newCollector;
        emit FeeCollectorUpdated(_newCollector);
    }

    /**
     * @dev Update cashback token address
     * @param _newTokenAddress New cashback token address
     */
    function setCashbackTokenAddress(address _newTokenAddress) external onlyOwner {
        require(_newTokenAddress != address(0), "CashbackPool: invalid address");
        cashbackTokenAddress = _newTokenAddress;
        emit CashbackTokenUpdated(_newTokenAddress);
    }

    /**
     * @dev Toggle pool active status
     * @param _active New status
     */
    function setPoolActive(bool _active) external onlyOwner {
        poolActive = _active;
        emit PoolStatusUpdated(_active);
    }

    /**
     * @dev Get user deposit history
     * @param _user User address
     */
    function getUserDeposits(address _user)
        external
        view
        returns (DepositRecord[] memory)
    {
        return userDeposits[_user];
    }

    /**
     * @dev Get user withdrawal history
     * @param _user User address
     */
    function getUserWithdrawals(address _user)
        external
        view
        returns (WithdrawalRecord[] memory)
    {
        return userWithdrawals[_user];
    }

    /**
     * @dev Get pool balance
     */
    function getPoolBalance() external view returns (uint256) {
        return poolToken.balanceOf(address(this));
    }

    /**
     * @dev Get user balance
     * @param _user User address
     */
    function getUserBalance(address _user) external view returns (uint256) {
        return userBalance[_user];
    }

    /**
     * @dev Emergency withdraw
     * @param _amount Amount to withdraw
     */
    function emergencyWithdraw(uint256 _amount) external onlyOwner nonReentrant {
        require(_amount > 0, "CashbackPool: invalid amount");
        require(
            poolToken.balanceOf(address(this)) >= _amount,
            "CashbackPool: insufficient balance"
        );
        require(poolToken.transfer(owner(), _amount), "CashbackPool: transfer failed");
    }
}