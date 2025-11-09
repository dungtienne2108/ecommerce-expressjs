import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

interface DeploymentConfig {
  network: string;
  tokenName: string;
  initialSupply: string;
  admin: string;
  poolToken: string;
  feeCollector: string;
}

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log(`Deploying contracts with account: ${deployer.address}`);
  console.log(`Account balance: ${await ethers.provider.getBalance(deployer.address)}`);

  // Get network name
  const networkName = (await ethers.provider.getNetwork()).name;
  console.log(`Deploying to network: ${networkName}`);

  // Configuration based on network
  let config: DeploymentConfig;
  switch (networkName) {
    case "bsc-testnet":
      config = {
        network: "bscTestnet",
        tokenName: "Ecommerce Cashback Token",
        initialSupply: "10000000", // 10 million tokens
        admin: deployer.address,
        poolToken: "0x337610d27c682E347C9cD60BD4b3b107C9d34dDd", // USDT on BSC testnet
        feeCollector: deployer.address,
      };
      break;
    case "bsc":
      config = {
        network: "bscMainnet",
        tokenName: "Ecommerce Cashback Token",
        initialSupply: "100000000", // 100 million tokens
        admin: deployer.address,
        poolToken: "0x55d398326f99059ff775485246999027b3197955", // USDT on BSC mainnet
        feeCollector: deployer.address,
      };
      break;
    case "ethereum":
      config = {
        network: "ethereum",
        tokenName: "Ecommerce Cashback Token",
        initialSupply: "50000000", // 50 million tokens
        admin: deployer.address,
        poolToken: "0xdAC17F958D2ee523a2206206994597C13D831ec7", // USDT on Ethereum mainnet
        feeCollector: deployer.address,
      };
      break;
    case "sepolia":
      config = {
        network: "ethereumSepolia",
        tokenName: "Ecommerce Cashback Token",
        initialSupply: "10000000", // 10 million tokens
        admin: deployer.address,
        poolToken: "0x7169D38eAF756338BTEB0991ADA41081949f7232", // Test USDT on Sepolia
        feeCollector: deployer.address,
      };
      break;
    case "polygon":
      config = {
        network: "polygon",
        tokenName: "Ecommerce Cashback Token",
        initialSupply: "50000000", // 50 million tokens
        admin: deployer.address,
        poolToken: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", // USDT on Polygon
        feeCollector: deployer.address,
      };
      break;
    case "maticmum": // Polygon Mumbai
      config = {
        network: "polygonMumbai",
        tokenName: "Ecommerce Cashback Token",
        initialSupply: "10000000", // 10 million tokens
        admin: deployer.address,
        poolToken: "0xD6D7d85f5C45c5bfd48c6666E915e29cd9aA8C2d", // Test USDT on Mumbai
        feeCollector: deployer.address,
      };
      break;
    default:
      throw new Error(`Unsupported network: ${networkName}`);
  }

  console.log("\n=== Deployment Configuration ===");
  console.log(`Network: ${config.network}`);
  console.log(`Initial Supply: ${config.initialSupply} tokens`);
  console.log(`Admin: ${config.admin}`);
  console.log(`Pool Token: ${config.poolToken}`);
  console.log(`Fee Collector: ${config.feeCollector}`);

  // Deploy CashbackToken
  console.log("\n=== Deploying CashbackToken ===");
  const CashbackToken = await ethers.getContractFactory("CashbackToken");
  const cashbackToken = await CashbackToken.deploy(config.initialSupply);
  await cashbackToken.waitForDeployment();
  const cashbackTokenAddress = await cashbackToken.getAddress();
  console.log(`CashbackToken deployed to: ${cashbackTokenAddress}`);

  // Deploy CashbackManager
  console.log("\n=== Deploying CashbackManager ===");
  const CashbackManager = await ethers.getContractFactory("CashbackManager");
  const cashbackManager = await CashbackManager.deploy(cashbackTokenAddress, config.admin);
  await cashbackManager.waitForDeployment();
  const cashbackManagerAddress = await cashbackManager.getAddress();
  console.log(`CashbackManager deployed to: ${cashbackManagerAddress}`);

  // Deploy CashbackPool
  console.log("\n=== Deploying CashbackPool ===");
  const CashbackPool = await ethers.getContractFactory("CashbackPool");
  const cashbackPool = await CashbackPool.deploy(
    config.poolToken,
    cashbackTokenAddress,
    config.feeCollector
  );
  await cashbackPool.waitForDeployment();
  const cashbackPoolAddress = await cashbackPool.getAddress();
  console.log(`CashbackPool deployed to: ${cashbackPoolAddress}`);

  // Add CashbackManager as distributor in CashbackPool
  console.log("\n=== Setting up access controls ===");
  const addDistributorTx = await cashbackPool.addDistributor(cashbackManagerAddress);
  await addDistributorTx.wait();
  console.log("CashbackManager added as distributor in CashbackPool");

  // Transfer some tokens to CashbackManager for distribution
  console.log("\n=== Transferring tokens ===");
  const transferAmount = ethers.parseEther("1000000"); // 1 million tokens
  const transferTx = await cashbackToken.transfer(cashbackManagerAddress, transferAmount);
  await transferTx.wait();
  console.log(`Transferred ${ethers.formatEther(transferAmount)} tokens to CashbackManager`);

  // Save deployment addresses
  const deploymentAddresses = {
    network: config.network,
    cashbackToken: cashbackTokenAddress,
    cashbackManager: cashbackManagerAddress,
    cashbackPool: cashbackPoolAddress,
    deployer: deployer.address,
    deploymentTime: new Date().toISOString(),
  };

  const deploymentDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentDir)) {
    fs.mkdirSync(deploymentDir, { recursive: true });
  }

  const deploymentFile = path.join(deploymentDir, `${config.network}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentAddresses, null, 2));
  console.log(`\nDeployment addresses saved to: ${deploymentFile}`);

  console.log("\n=== Deployment Summary ===");
  console.log(JSON.stringify(deploymentAddresses, null, 2));

  // Verify on block explorer
  console.log("\n=== Verification Commands ===");
  console.log(`\nTo verify CashbackToken:`);
  console.log(`npx hardhat verify --network ${config.network} ${cashbackTokenAddress} "${config.initialSupply}"`);
  console.log(`\nTo verify CashbackManager:`);
  console.log(`npx hardhat verify --network ${config.network} ${cashbackManagerAddress} ${cashbackTokenAddress} ${config.admin}`);
  console.log(`\nTo verify CashbackPool:`);
  console.log(`npx hardhat verify --network ${config.network} ${cashbackPoolAddress} ${config.poolToken} ${cashbackTokenAddress} ${config.feeCollector}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
