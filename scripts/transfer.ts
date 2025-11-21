import { ethers } from "ethers";
import dotenv from "dotenv";
dotenv.config();

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.ETH_SEPOLIA_RPC_URL);
  const wallet = new ethers.Wallet(process.env.ETH_SEPOLIA_PRIVATE_KEY!, provider);

  const tokenAddress = process.env.CASHBACK_TOKEN_ADDRESS!;
  const managerAddress = process.env.CASHBACK_MANAGER_ADDRESS!;

  const tokenABI = ["function transfer(address to, uint256 amount) returns (bool)"];
  const tokenContract = new ethers.Contract(tokenAddress, tokenABI, wallet) as any;

  // Transfer 100,000,000 tokens
  const amount = ethers.parseEther("100000000");
  const tx = await tokenContract.transfer(managerAddress, amount);
  console.log(`Transaction sent: ${tx.hash}`);
  await tx.wait();
  console.log(`✅ Transferred ${ethers.formatEther(amount)} CASH to CashbackManager`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
