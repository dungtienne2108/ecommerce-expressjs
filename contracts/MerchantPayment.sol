// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

interface ICashbackManager {
    function recordTransaction(
        address _user,
        address _merchant,
        uint256 _amount
    ) external returns (uint256);
}

contract MerchantPayment is Ownable, ReentrancyGuard {
    IERC20 public paymentToken;
    ICashbackManager public cashbackManager;
    
    address public merchantWallet;
    
    // Transaction records
    struct Transaction {
        address user;
        uint256 amount;
        uint256 cashbackAmount;
        uint256 timestamp;
        bool completed;
    }
    
    mapping(bytes32 => Transaction) public transactions;
    
    // Events
    event PaymentProcessed(
        bytes32 indexed txId,
        address indexed user,
        uint256 amount,
        uint256 cashbackAmount,
        uint256 timestamp
    );
    event MerchantWalletUpdated(address newWallet);
    
    constructor(
        address _paymentToken,
        address _cashbackManager,
        address _merchantWallet
    ) Ownable(msg.sender) {
        require(_paymentToken != address(0), "Invalid payment token");
        require(_cashbackManager != address(0), "Invalid cashback manager");
        require(_merchantWallet != address(0), "Invalid merchant wallet");
        
        paymentToken = IERC20(_paymentToken);
        cashbackManager = ICashbackManager(_cashbackManager);
        merchantWallet = _merchantWallet;
    }
    
    // Process payment with cashback
    function processPayment(uint256 _amount) external nonReentrant returns (bytes32 txId) {
        require(_amount > 0, "Invalid amount");
        require(
            paymentToken.balanceOf(msg.sender) >= _amount,
            "Insufficient balance"
        );
        require(
            paymentToken.allowance(msg.sender, address(this)) >= _amount,
            "Insufficient allowance"
        );
        
        // Transfer payment to merchant
        require(
            paymentToken.transferFrom(msg.sender, merchantWallet, _amount),
            "Payment transfer failed"
        );
        
        // Record transaction and get cashback
        uint256 cashbackAmount = cashbackManager.recordTransaction(
            msg.sender,
            address(this),
            _amount
        );
        
        // Generate unique transaction ID
        txId = keccak256(
            abi.encodePacked(msg.sender, _amount, block.timestamp, block.number)
        );
        
        // Store transaction record
        transactions[txId] = Transaction({
            user: msg.sender,
            amount: _amount,
            cashbackAmount: cashbackAmount,
            timestamp: block.timestamp,
            completed: true
        });
        
        emit PaymentProcessed(txId, msg.sender, _amount, cashbackAmount, block.timestamp);
        
        return txId;
    }
    
    // Get transaction details
    function getTransaction(bytes32 _txId) external view returns (
        address user,
        uint256 amount,
        uint256 cashbackAmount,
        uint256 timestamp,
        bool completed
    ) {
        Transaction storage transaction = transactions[_txId];
        return (
            transaction.user,
            transaction.amount,
            transaction.cashbackAmount,
            transaction.timestamp,
            transaction.completed
        );
    }
    
    // Update merchant wallet (only owner)
    function setMerchantWallet(address _newWallet) external onlyOwner {
        require(_newWallet != address(0), "Invalid wallet");
        merchantWallet = _newWallet;
        emit MerchantWalletUpdated(_newWallet);
    }
}
