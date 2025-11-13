// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Snapshot.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title CashbackToken
 * @dev ERC20 token for cashback rewards in the ecommerce platform
 */
contract CashbackToken is ERC20, ERC20Burnable, ERC20Snapshot, Ownable, Pausable {
    // Maximum total supply
    uint256 public constant MAX_SUPPLY = 1000000000 * 10 ** 18; // 1 billion tokens

    // Admin role for minting and snapshot management
    mapping(address => bool) public minters;
    mapping(address => bool) public snapshotter;

    // Events
    event MinterAdded(address indexed account);
    event MinterRemoved(address indexed account);
    event SnapshotterAdded(address indexed account);
    event SnapshotterRemoved(address indexed account);
    event TokensMinted(address indexed to, uint256 amount);
    event TokensBurned(address indexed from, uint256 amount);

    modifier onlyMinter() {
        require(minters[msg.sender], "CashbackToken: caller is not a minter");
        _;
    }

    modifier onlySnapshotter() {
        require(
            snapshotter[msg.sender],
            "CashbackToken: caller is not a snapshotter"
        );
        _;
    }

    /**
     * @dev Constructor sets initial token supply
     * @param initialSupply Initial number of tokens to create
     */
    constructor(uint256 initialSupply) ERC20("Ecommerce Cashback Token", "ECT") {
        require(initialSupply <= MAX_SUPPLY, "CashbackToken: initial supply exceeds max");
        _mint(msg.sender, initialSupply * 10 ** 18);
        minters[msg.sender] = true;
        snapshotter[msg.sender] = true;
    }

    /**
     * @dev Mint new tokens
     * @param to Recipient address
     * @param amount Amount of tokens to mint
     */
    function mint(address to, uint256 amount) public onlyMinter {
        require(to != address(0), "CashbackToken: mint to zero address");
        require(totalSupply() + amount <= MAX_SUPPLY, "CashbackToken: exceeds max supply");
        _mint(to, amount);
        emit TokensMinted(to, amount);
    }

    /**
     * @dev Add minter role
     * @param account Address to grant minter role
     */
    function addMinter(address account) public onlyOwner {
        require(account != address(0), "CashbackToken: invalid address");
        minters[account] = true;
        emit MinterAdded(account);
    }

    /**
     * @dev Remove minter role
     * @param account Address to revoke minter role
     */
    function removeMinter(address account) public onlyOwner {
        minters[account] = false;
        emit MinterRemoved(account);
    }

    /**
     * @dev Add snapshotter role
     * @param account Address to grant snapshotter role
     */
    function addSnapshotter(address account) public onlyOwner {
        require(account != address(0), "CashbackToken: invalid address");
        snapshotter[account] = true;
        emit SnapshotterAdded(account);
    }

    /**
     * @dev Remove snapshotter role
     * @param account Address to revoke snapshotter role
     */
    function removeSnapshotter(address account) public onlyOwner {
        snapshotter[account] = false;
        emit SnapshotterRemoved(account);
    }

    /**
     * @dev Create a snapshot
     */
    function snapshot() public onlySnapshotter {
        _snapshot();
    }

    /**
     * @dev Pause token transfers
     */
    function pause() public onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause token transfers
     */
    function unpause() public onlyOwner {
        _unpause();
    }

    /**
     * @dev Override burn to emit custom event
     */
    function burn(uint256 amount) public override {
        super.burn(amount);
        emit TokensBurned(msg.sender, amount);
    }

    /**
     * @dev Override _beforeTokenTransfer to implement pause functionality
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override(ERC20, ERC20Snapshot) whenNotPaused {
        super._beforeTokenTransfer(from, to, amount);
    }

    /**
     * @dev Override _afterTokenTransfer
     */
    function _afterTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override(ERC20) {
        super._afterTokenTransfer(from, to, amount);
    }

    /**
     * @dev Override _mint
     */
    function _mint(address to, uint256 amount) internal override(ERC20) {
        super._mint(to, amount);
    }

    /**
     * @dev Override _burn
     */
    function _burn(address account, uint256 amount) internal override(ERC20) {
        super._burn(account, amount);
    }
}