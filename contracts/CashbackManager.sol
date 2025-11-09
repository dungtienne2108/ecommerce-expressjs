// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title CashbackManager
 * @dev Manages cashback distribution and user claims
 */
contract CashbackManager is Ownable, ReentrancyGuard, Pausable {
    // Token address for cashback rewards
    IERC20 public cashbackToken;

    // Minimum withdrawal amount
    uint256 public minimumWithdrawal = 1 * 10 ** 18; // 1 token default

    // Cashback campaign settings
    struct Campaign {
        uint256 id;
        string name;
        uint256 rate; // Rate in basis points (e.g., 100 = 1%)
        uint256 startTime;
        uint256 endTime;
        bool active;
        uint256 totalBudget;
        uint256 remaining;
    }

    // User cashback records
    struct UserCashback {
        address user;
        uint256 amount;
        uint256 campaignId;
        uint256 timestamp;
        bool claimed;
    }

    // Admin address
    address public admin;

    // Mapping of user address to claimable balance
    mapping(address => uint256) public claimableBalance;

    // Mapping of user address to total claimed
    mapping(address => uint256) public totalClaimed;

    // Mapping of campaign ID to campaign details
    mapping(uint256 => Campaign) public campaigns;

    // Campaign counter
    uint256 public campaignCounter = 0;

    // User cashback history
    mapping(address => UserCashback[]) public userCashbackHistory;

    // Allowed addresses to distribute cashback
    mapping(address => bool) public distributors;

    // Events
    event CashbackAllocated(
        address indexed user,
        uint256 amount,
        uint256 campaignId,
        uint256 timestamp
    );
    event CashbackClaimed(
        address indexed user,
        uint256 amount,
        uint256 timestamp
    );
    event CampaignCreated(
        uint256 indexed campaignId,
        string name,
        uint256 rate,
        uint256 budget
    );
    event CampaignUpdated(uint256 indexed campaignId, bool active);
    event MinimumWithdrawalUpdated(uint256 newAmount);
    event DistributorAdded(address indexed distributor);
    event DistributorRemoved(address indexed distributor);
    event AdminChanged(address indexed newAdmin);

    modifier onlyAdmin() {
        require(msg.sender == admin, "CashbackManager: caller is not admin");
        _;
    }

    modifier onlyDistributor() {
        require(
            distributors[msg.sender],
            "CashbackManager: caller is not a distributor"
        );
        _;
    }

    /**
     * @dev Constructor
     * @param _cashbackToken Address of the ERC20 cashback token
     * @param _admin Address of the admin
     */
    constructor(address _cashbackToken, address _admin) {
        require(_cashbackToken != address(0), "CashbackManager: invalid token address");
        require(_admin != address(0), "CashbackManager: invalid admin address");
        cashbackToken = IERC20(_cashbackToken);
        admin = _admin;
        distributors[msg.sender] = true;
        distributors[_admin] = true;
    }

    /**
     * @dev Add a distributor address
     * @param _distributor Address to add as distributor
     */
    function addDistributor(address _distributor) external onlyAdmin {
        require(_distributor != address(0), "CashbackManager: invalid address");
        distributors[_distributor] = true;
        emit DistributorAdded(_distributor);
    }

    /**
     * @dev Remove a distributor address
     * @param _distributor Address to remove as distributor
     */
    function removeDistributor(address _distributor) external onlyAdmin {
        distributors[_distributor] = false;
        emit DistributorRemoved(_distributor);
    }

    /**
     * @dev Create a new cashback campaign
     * @param _name Campaign name
     * @param _rate Cashback rate in basis points
     * @param _startTime Campaign start time
     * @param _endTime Campaign end time
     * @param _totalBudget Total budget for the campaign
     */
    function createCampaign(
        string memory _name,
        uint256 _rate,
        uint256 _startTime,
        uint256 _endTime,
        uint256 _totalBudget
    ) external onlyAdmin {
        require(bytes(_name).length > 0, "CashbackManager: invalid campaign name");
        require(_rate > 0 && _rate <= 10000, "CashbackManager: invalid rate"); // Max 100%
        require(_startTime < _endTime, "CashbackManager: invalid time range");
        require(_totalBudget > 0, "CashbackManager: invalid budget");

        campaignCounter++;
        campaigns[campaignCounter] = Campaign({
            id: campaignCounter,
            name: _name,
            rate: _rate,
            startTime: _startTime,
            endTime: _endTime,
            active: true,
            totalBudget: _totalBudget,
            remaining: _totalBudget
        });

        emit CampaignCreated(campaignCounter, _name, _rate, _totalBudget);
    }

    /**
     * @dev Allocate cashback to a user
     * @param _user User address to allocate cashback
     * @param _amount Amount of cashback to allocate
     * @param _campaignId Campaign ID
     */
    function allocateCashback(
        address _user,
        uint256 _amount,
        uint256 _campaignId
    ) external onlyDistributor whenNotPaused {
        require(_user != address(0), "CashbackManager: invalid user address");
        require(_amount > 0, "CashbackManager: invalid amount");
        require(campaigns[_campaignId].active, "CashbackManager: inactive campaign");
        require(
            campaigns[_campaignId].remaining >= _amount,
            "CashbackManager: insufficient campaign budget"
        );

        // Update balance
        claimableBalance[_user] += _amount;
        campaigns[_campaignId].remaining -= _amount;

        // Record in history
        userCashbackHistory[_user].push(
            UserCashback({
                user: _user,
                amount: _amount,
                campaignId: _campaignId,
                timestamp: block.timestamp,
                claimed: false
            })
        );

        emit CashbackAllocated(_user, _amount, _campaignId, block.timestamp);
    }

    /**
     * @dev Claim cashback
     * @param _amount Amount to claim
     */
    function claimCashback(uint256 _amount) external nonReentrant whenNotPaused {
        require(_amount > 0, "CashbackManager: invalid amount");
        require(_amount >= minimumWithdrawal, "CashbackManager: below minimum withdrawal");
        require(
            claimableBalance[msg.sender] >= _amount,
            "CashbackManager: insufficient balance"
        );

        // Update balance
        claimableBalance[msg.sender] -= _amount;
        totalClaimed[msg.sender] += _amount;

        // Mark history as claimed
        uint256 remaining = _amount;
        for (uint256 i = userCashbackHistory[msg.sender].length; i > 0 && remaining > 0; i--) {
            if (!userCashbackHistory[msg.sender][i - 1].claimed) {
                uint256 claimAmount = remaining > userCashbackHistory[msg.sender][i - 1].amount
                    ? userCashbackHistory[msg.sender][i - 1].amount
                    : remaining;
                userCashbackHistory[msg.sender][i - 1].claimed = true;
                remaining -= claimAmount;
            }
        }

        // Transfer tokens to user
        require(
            cashbackToken.transfer(msg.sender, _amount),
            "CashbackManager: token transfer failed"
        );

        emit CashbackClaimed(msg.sender, _amount, block.timestamp);
    }

    /**
     * @dev Update minimum withdrawal amount
     * @param _newAmount New minimum withdrawal amount
     */
    function setMinimumWithdrawal(uint256 _newAmount) external onlyAdmin {
        require(_newAmount > 0, "CashbackManager: invalid amount");
        minimumWithdrawal = _newAmount;
        emit MinimumWithdrawalUpdated(_newAmount);
    }

    /**
     * @dev Toggle campaign status
     * @param _campaignId Campaign ID
     * @param _active New status
     */
    function toggleCampaign(uint256 _campaignId, bool _active) external onlyAdmin {
        require(campaigns[_campaignId].id != 0, "CashbackManager: campaign not found");
        campaigns[_campaignId].active = _active;
        emit CampaignUpdated(_campaignId, _active);
    }

    /**
     * @dev Change admin address
     * @param _newAdmin New admin address
     */
    function changeAdmin(address _newAdmin) external onlyAdmin {
        require(_newAdmin != address(0), "CashbackManager: invalid address");
        admin = _newAdmin;
        emit AdminChanged(_newAdmin);
    }

    /**
     * @dev Pause contract
     */
    function pause() external onlyAdmin {
        _pause();
    }

    /**
     * @dev Unpause contract
     */
    function unpause() external onlyAdmin {
        _unpause();
    }

    /**
     * @dev Get user cashback history
     * @param _user User address
     */
    function getUserCashbackHistory(address _user)
        external
        view
        returns (UserCashback[] memory)
    {
        return userCashbackHistory[_user];
    }

    /**
     * @dev Get user cashback history length
     * @param _user User address
     */
    function getUserCashbackHistoryLength(address _user) external view returns (uint256) {
        return userCashbackHistory[_user].length;
    }

    /**
     * @dev Get campaign details
     * @param _campaignId Campaign ID
     */
    function getCampaign(uint256 _campaignId) external view returns (Campaign memory) {
        return campaigns[_campaignId];
    }

    /**
     * @dev Get user claimable balance
     * @param _user User address
     */
    function getClaimableBalance(address _user) external view returns (uint256) {
        return claimableBalance[_user];
    }

    /**
     * @dev Get user total claimed amount
     * @param _user User address
     */
    function getTotalClaimed(address _user) external view returns (uint256) {
        return totalClaimed[_user];
    }

    /**
     * @dev Withdraw tokens from contract (emergency function)
     * @param _amount Amount to withdraw
     */
    function emergencyWithdraw(uint256 _amount) external onlyAdmin nonReentrant {
        require(_amount > 0, "CashbackManager: invalid amount");
        require(
            cashbackToken.balanceOf(address(this)) >= _amount,
            "CashbackManager: insufficient balance"
        );
        require(
            cashbackToken.transfer(admin, _amount),
            "CashbackManager: transfer failed"
        );
    }
}
