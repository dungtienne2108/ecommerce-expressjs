// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

contract CashbackManager is Ownable, ReentrancyGuard, Pausable {
    IERC20 public cashbackToken;
    
    // Cashback percentage (base 10000, so 100 = 1%)
    uint256 public cashbackPercentage = 100; // 1% default
    
    // Merchant configs
    struct MerchantConfig {
        bool isActive;
        uint256 customCashbackPercentage; // 0 = use default
        uint256 totalTransactions;
        uint256 totalCashbackGiven;
    }
    
    mapping(address => MerchantConfig) public merchants;
    mapping(address => uint256) public userCashbackBalance;
    
    // Events
    event CashbackRewarded(address indexed user, address indexed merchant, uint256 amount, uint256 cashbackAmount);
    event MerchantRegistered(address indexed merchant, bool isActive);
    event CashbackClaimed(address indexed user, uint256 amount);
    event CashbackPercentageUpdated(uint256 newPercentage);
    event MerchantCashbackUpdated(address indexed merchant, uint256 customPercentage);
    
    constructor(address _cashbackToken) Ownable(msg.sender) {
        require(_cashbackToken != address(0), "Invalid token address");
        cashbackToken = IERC20(_cashbackToken);
    }
    
    // Register or update merchant
    function registerMerchant(address _merchant, bool _isActive) external onlyOwner {
        require(_merchant != address(0), "Invalid merchant address");
        merchants[_merchant].isActive = _isActive;
        emit MerchantRegistered(_merchant, _isActive);
    }
    
    // Set custom cashback % for merchant
    function setMerchantCashback(address _merchant, uint256 _percentage) external onlyOwner {
        require(_merchant != address(0), "Invalid merchant address");
        require(_percentage <= 1000, "Percentage too high"); // Max 10%
        merchants[_merchant].customCashbackPercentage = _percentage;
        emit MerchantCashbackUpdated(_merchant, _percentage);
    }
    
    // Update default cashback percentage
    function setCashbackPercentage(uint256 _percentage) external onlyOwner {
        require(_percentage <= 1000, "Percentage too high"); // Max 10%
        cashbackPercentage = _percentage;
        emit CashbackPercentageUpdated(_percentage);
    }
    
    // Record transaction and reward cashback
    // Called by merchant contract or backend
    function recordTransaction(
        address _user,
        address _merchant,
        uint256 _transactionAmount
    ) external onlyOwner whenNotPaused returns (uint256 cashbackAmount) {
        require(_user != address(0), "Invalid user address");
        require(_merchant != address(0), "Invalid merchant address");
        require(merchants[_merchant].isActive, "Merchant not active");
        require(_transactionAmount > 0, "Invalid transaction amount");
        
        // Get applicable cashback percentage
        uint256 percentage = merchants[_merchant].customCashbackPercentage;
        if (percentage == 0) {
            percentage = cashbackPercentage;
        }
        
        // Calculate cashback amount
        cashbackAmount = (_transactionAmount * percentage) / 10000;
        
        // Add to user's balance
        userCashbackBalance[_user] += cashbackAmount;
        
        // Update merchant stats
        merchants[_merchant].totalTransactions += 1;
        merchants[_merchant].totalCashbackGiven += cashbackAmount;
        
        emit CashbackRewarded(_user, _merchant, _transactionAmount, cashbackAmount);
        
        return cashbackAmount;
    }
    
    // Claim cashback tokens
    function claimCashback() external nonReentrant {
        uint256 amount = userCashbackBalance[msg.sender];
        require(amount > 0, "No cashback to claim");
        require(cashbackToken.balanceOf(address(this)) >= amount, "Insufficient contract balance");

        userCashbackBalance[msg.sender] = 0;

        require(cashbackToken.transfer(msg.sender, amount), "Transfer failed");

        emit CashbackClaimed(msg.sender, amount);
    }

    // Claim cashback for a user (only owner can call - for automatic claim by backend)
    function claimCashbackFor(address _user) external onlyOwner nonReentrant {
        require(_user != address(0), "Invalid user address");
        uint256 amount = userCashbackBalance[_user];
        require(amount > 0, "No cashback to claim");
        require(cashbackToken.balanceOf(address(this)) >= amount, "Insufficient contract balance");

        userCashbackBalance[_user] = 0;

        require(cashbackToken.transfer(_user, amount), "Transfer failed");

        emit CashbackClaimed(_user, amount);
    }
    
    // Get user's pending cashback
    function getUserCashback(address _user) external view returns (uint256) {
        return userCashbackBalance[_user];
    }
    
    // Get merchant info
    function getMerchantInfo(address _merchant) external view returns (
        bool isActive,
        uint256 customCashback,
        uint256 totalTransactions,
        uint256 totalCashbackGiven
    ) {
        MerchantConfig storage config = merchants[_merchant];
        return (
            config.isActive,
            config.customCashbackPercentage,
            config.totalTransactions,
            config.totalCashbackGiven
        );
    }
    
    // Pause/unpause contract
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
    
    // Emergency: withdraw tokens
    function withdrawTokens(uint256 _amount) external onlyOwner {
        require(cashbackToken.transfer(owner(), _amount), "Withdrawal failed");
    }
    
    // Fallback
    receive() external payable {}
}
