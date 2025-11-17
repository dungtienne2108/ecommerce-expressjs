// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";

/**
 * @title CashbackToken
 * @dev ERC20 token dùng cho cashback rewards trong e-commerce platform
 * Token này có thể tạm dừng, đốt (burn), và có owner control
 */
contract CashbackToken is ERC20, ERC20Burnable, Ownable, ERC20Pausable {
    // Events
    event TokensMinted(address indexed to, uint256 amount, string reason);
    event TokensBurned(address indexed from, uint256 amount, string reason);

    // Minting permissions
    mapping(address => bool) public minters;

    // Max supply
    uint256 public maxSupply = 1_000_000_000 * 10 ** 18; // 1 billion tokens

    // Modifiers
    modifier onlyMinter() {
        require(minters[msg.sender] || msg.sender == owner(), "Only minters can call this");
        _;
    }

    /**
     * @dev Constructor - Initialize token with name "Cashback Token" and symbol "CBT"
     * Mint initial supply to owner
     */
    constructor(uint256 initialSupply) ERC20("Cashback Token", "CBT") Ownable(msg.sender) {
        require(initialSupply <= maxSupply, "Initial supply exceeds max supply");
        _mint(msg.sender, initialSupply);
    }

    /**
     * @dev Pause all token transfers
     * Only owner can call
     */
    function pause() public onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause token transfers
     * Only owner can call
     */
    function unpause() public onlyOwner {
        _unpause();
    }

    /**
     * @dev Mint new tokens
     * @param to Address to mint to
     * @param amount Amount to mint
     * @param reason Reason for minting
     */
    function mint(
        address to,
        uint256 amount,
        string memory reason
    ) public onlyMinter {
        require(totalSupply() + amount <= maxSupply, "Exceeds max supply");
        require(to != address(0), "Invalid recipient");
        require(amount > 0, "Amount must be greater than 0");

        _mint(to, amount);
        emit TokensMinted(to, amount, reason);
    }

    /**
     * @dev Burn tokens
     * @param amount Amount to burn
     * @param reason Reason for burning
     */
    function burnWithReason(uint256 amount, string memory reason) public {
        _burn(msg.sender, amount);
        emit TokensBurned(msg.sender, amount, reason);
    }

    /**
     * @dev Add minter address
     * Only owner can call
     */
    function addMinter(address minter) public onlyOwner {
        require(minter != address(0), "Invalid minter address");
        require(!minters[minter], "Already a minter");
        minters[minter] = true;
    }

    /**
     * @dev Remove minter address
     * Only owner can call
     */
    function removeMinter(address minter) public onlyOwner {
        require(minters[minter], "Not a minter");
        minters[minter] = false;
    }

    /**
     * @dev Check if address is a minter
     */
    function isMinter(address account) public view returns (bool) {
        return minters[account] || account == owner();
    }

    /**
     * @dev Get remaining mintable tokens
     */
    function remainingMintable() public view returns (uint256) {
        return maxSupply - totalSupply();
    }

    // Override required functions
    function _update(
        address from,
        address to,
        uint256 amount
    ) internal override(ERC20, ERC20Pausable) {
        super._update(from, to, amount);
    }

    function nonces(address owner) public view override(ERC20) returns (uint256) {
        return super.nonces(owner);
    }
}

