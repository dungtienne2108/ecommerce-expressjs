// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title CashbackPool
 * @dev Manages a liquidity pool for cashback distributions
 * Allows depositing funds and managing rewards distribution
 */
contract CashbackPool is Ownable, ReentrancyGuard, Pausable {
    // Token
    IERC20 public cashbackToken;

    // Structs
    struct Pool {
        uint256 totalDeposited; // Total funds deposited
        uint256 totalDistributed; // Total funds distributed
        uint256 availableBalance; // Currently available
        bool active;
    }

    struct Deposit {
        address depositor;
        uint256 amount;
        uint256 timestamp;
        string reason;
    }

    struct Withdrawal {
        address recipient;
        uint256 amount;
        uint256 timestamp;
        string reason;
    }

    // State variables
    Pool public pool;
    Deposit[] public deposits;
    Withdrawal[] public withdrawals;

    mapping(address => uint256) public userDeposits;
    mapping(address => uint256) public userWithdrawals;

    address public operatorAddress;

    // Constants
    uint256 public constant MAX_POOL_SIZE = 1_000_000_000 * 10 ** 18; // 1 billion tokens

    // Events
    event PoolInitialized(uint256 timestamp);
    event FundsDeposited(
        address indexed depositor,
        uint256 amount,
        string reason,
        uint256 timestamp
    );
    event FundsWithdrawn(
        address indexed recipient,
        uint256 amount,
        string reason,
        uint256 timestamp
    );
    event PoolActivated();
    event PoolDeactivated();
    event OperatorChanged(address indexed newOperator);
    event LiquidityWarning(uint256 currentBalance, uint256 minimumRequired);

    // Modifiers
    modifier onlyOperator() {
        require(
            msg.sender == operatorAddress || msg.sender == owner(),
            "Only operator or owner"
        );
        _;
    }

    modifier poolActive() {
        require(pool.active, "Pool is not active");
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

        pool = Pool({
            totalDeposited: 0,
            totalDistributed: 0,
            availableBalance: 0,
            active: false
        });
    }

    /**
     * @dev Activate pool
     */
    function activatePool() external onlyOwner {
        pool.active = true;
        emit PoolActivated();
    }

    /**
     * @dev Deactivate pool
     */
    function deactivatePool() external onlyOwner {
        pool.active = false;
        emit PoolDeactivated();
    }

    /**
     * @dev Deposit funds into pool
     * Must have approved token first
     */
    function depositFunds(uint256 _amount, string memory _reason)
        external
        onlyOperator
        nonReentrant
        whenNotPaused
    {
        require(_amount > 0, "Amount must be > 0");
        require(
            pool.totalDeposited + _amount <= MAX_POOL_SIZE,
            "Exceeds max pool size"
        );

        // Transfer tokens from operator to pool
        require(
            cashbackToken.transferFrom(msg.sender, address(this), _amount),
            "Transfer failed"
        );

        // Update pool state
        pool.totalDeposited += _amount;
        pool.availableBalance += _amount;

        // Track deposit
        userDeposits[msg.sender] += _amount;
        deposits.push(
            Deposit({
                depositor: msg.sender,
                amount: _amount,
                timestamp: block.timestamp,
                reason: _reason
            })
        );

        emit FundsDeposited(msg.sender, _amount, _reason, block.timestamp);
    }

    /**
     * @dev Distribute funds from pool
     * Called by operator/manager when sending cashback
     */
    function distributeFunds(
        address _recipient,
        uint256 _amount,
        string memory _reason
    ) external onlyOperator nonReentrant whenNotPaused returns (bool) {
        require(_recipient != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");
        require(pool.availableBalance >= _amount, "Insufficient pool balance");

        // Transfer tokens to recipient
        require(
            cashbackToken.transfer(_recipient, _amount),
            "Transfer failed"
        );

        // Update pool state
        pool.availableBalance -= _amount;
        pool.totalDistributed += _amount;

        // Track withdrawal
        userWithdrawals[_recipient] += _amount;
        withdrawals.push(
            Withdrawal({
                recipient: _recipient,
                amount: _amount,
                timestamp: block.timestamp,
                reason: _reason
            })
        );

        // Check liquidity warning
        uint256 minimumRequired = (pool.totalDeposited * 10) / 100; // 10% minimum
        if (pool.availableBalance < minimumRequired) {
            emit LiquidityWarning(pool.availableBalance, minimumRequired);
        }

        emit FundsWithdrawn(_recipient, _amount, _reason, block.timestamp);
        return true;
    }

    /**
     * @dev Batch distribute funds
     */
    function batchDistribute(
        address[] calldata _recipients,
        uint256[] calldata _amounts,
        string memory _reason
    ) external onlyOperator nonReentrant whenNotPaused {
        require(
            _recipients.length == _amounts.length,
            "Arrays length mismatch"
        );
        require(_recipients.length > 0, "Empty arrays");
        require(_recipients.length <= 100, "Too many recipients");

        // Calculate total
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < _amounts.length; i++) {
            totalAmount += _amounts[i];
        }

        require(pool.availableBalance >= totalAmount, "Insufficient balance");

        // Distribute
        for (uint256 i = 0; i < _recipients.length; i++) {
            require(_recipients[i] != address(0), "Invalid recipient");
            require(_amounts[i] > 0, "Zero amount");

            require(
                cashbackToken.transfer(_recipients[i], _amounts[i]),
                "Transfer failed"
            );

            pool.availableBalance -= _amounts[i];
            pool.totalDistributed += _amounts[i];
            userWithdrawals[_recipients[i]] += _amounts[i];

            withdrawals.push(
                Withdrawal({
                    recipient: _recipients[i],
                    amount: _amounts[i],
                    timestamp: block.timestamp,
                    reason: _reason
                })
            );

            emit FundsWithdrawn(_recipients[i], _amounts[i], _reason, block.timestamp);
        }

        // Check liquidity
        uint256 minimumRequired = (pool.totalDeposited * 10) / 100;
        if (pool.availableBalance < minimumRequired) {
            emit LiquidityWarning(pool.availableBalance, minimumRequired);
        }
    }

    /**
     * @dev Get pool info
     */
    function getPoolInfo()
        external
        view
        returns (
            uint256 _totalDeposited,
            uint256 _totalDistributed,
            uint256 _availableBalance,
            bool _active
        )
    {
        return (
            pool.totalDeposited,
            pool.totalDistributed,
            pool.availableBalance,
            pool.active
        );
    }

    /**
     * @dev Get user deposit total
     */
    function getUserDepositTotal(address _user) external view returns (uint256) {
        return userDeposits[_user];
    }

    /**
     * @dev Get user withdrawal total
     */
    function getUserWithdrawalTotal(address _user)
        external
        view
        returns (uint256)
    {
        return userWithdrawals[_user];
    }

    /**
     * @dev Get deposit count
     */
    function getDepositCount() external view returns (uint256) {
        return deposits.length;
    }

    /**
     * @dev Get withdrawal count
     */
    function getWithdrawalCount() external view returns (uint256) {
        return withdrawals.length;
    }

    /**
     * @dev Get deposit by index
     */
    function getDeposit(uint256 _index)
        external
        view
        returns (Deposit memory)
    {
        require(_index < deposits.length, "Index out of bounds");
        return deposits[_index];
    }

    /**
     * @dev Get withdrawal by index
     */
    function getWithdrawal(uint256 _index)
        external
        view
        returns (Withdrawal memory)
    {
        require(_index < withdrawals.length, "Index out of bounds");
        return withdrawals[_index];
    }

    /**
     * @dev Get recent deposits
     */
    function getRecentDeposits(uint256 _limit)
        external
        view
        returns (Deposit[] memory)
    {
        uint256 count = _limit < deposits.length ? _limit : deposits.length;
        Deposit[] memory recent = new Deposit[](count);

        for (uint256 i = 0; i < count; i++) {
            recent[i] = deposits[deposits.length - 1 - i];
        }

        return recent;
    }

    /**
     * @dev Check liquidity status
     */
    function checkLiquidity() external view returns (bool isHealthy) {
        uint256 minimumRequired = (pool.totalDeposited * 10) / 100; // 10% minimum
        return pool.availableBalance >= minimumRequired;
    }

    /**
     * @dev Get liquidity percentage
     */
    function getLiquidityPercentage() external view returns (uint256) {
        if (pool.totalDeposited == 0) return 0;
        return (pool.availableBalance * 100) / pool.totalDeposited;
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
     * @dev Emergency withdraw (only owner, for emergency)
     */
    function emergencyWithdraw(uint256 _amount) external onlyOwner nonReentrant {
        require(_amount > 0, "Amount must be > 0");
        require(
            cashbackToken.balanceOf(address(this)) >= _amount,
            "Insufficient balance"
        );

        require(
            cashbackToken.transfer(owner(), _amount),
            "Transfer failed"
        );
    }

    /**
     * @dev Get contract balance
     */
    function getBalance() external view returns (uint256) {
        return cashbackToken.balanceOf(address(this));
    }
}

