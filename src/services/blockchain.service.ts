import { ethers } from 'ethers';
import {
  BlockchainConfig,
  SendCashbackParams,
  TransactionResult,
} from '../types/blockchain.types';

export class BlockchainService {
  private providers: Map<string, ethers.JsonRpcProvider> = new Map();
  private wallets: Map<string, ethers.Wallet> = new Map();

  // Network configurations
  private readonly networks: Record<string, BlockchainConfig> = {
    // ===== BSC Networks =====
    BSC_TESTNET: {
      rpcUrl:
        process.env.BSC_TESTNET_RPC_URL ||
        'https://data-seed-prebsc-1-s1.binance.org:8545/',
      privateKey: process.env.BSC_TESTNET_PRIVATE_KEY || '',
      tokenAddress: process.env.BSC_TESTNET_TOKEN_ADDRESS || '', // Nếu gửi token
      gasLimit: 100000,
    },
    // ===== Ethereum Sepolia Testnet =====
    ETH_SEPOLIA: {
      rpcUrl:
        process.env.ETH_SEPOLIA_RPC_URL ||
        'https://sepolia.infura.io/v3/YOUR_INFURA_KEY',
      privateKey: process.env.ETH_SEPOLIA_PRIVATE_KEY || '',
      tokenAddress: process.env.ETH_SEPOLIA_TOKEN_ADDRESS || '', // Nếu gửi ERC20 token
      gasLimit: 100000,
    },
    // ===== Commented Networks (For Future Use) =====
    // BSC_MAINNET: {
    //   rpcUrl: process.env.BSC_MAINNET_RPC_URL || 'https://bsc-dataseed.binance.org/',
    //   privateKey: process.env.BSC_MAINNET_PRIVATE_KEY || '',
    //   tokenAddress: process.env.BSC_MAINNET_TOKEN_ADDRESS,
    //   gasLimit: 100000,
    // },
    // ETH_MAINNET: {
    //   rpcUrl: process.env.ETH_MAINNET_RPC_URL || 'https://mainnet.infura.io/v3/YOUR_INFURA_KEY',
    //   privateKey: process.env.ETH_MAINNET_PRIVATE_KEY || '',
    //   tokenAddress: process.env.ETH_MAINNET_TOKEN_ADDRESS,
    //   gasLimit: 100000,
    // },
    // POLYGON_MUMBAI: {
    //   rpcUrl: process.env.POLYGON_MUMBAI_RPC_URL || 'https://rpc-mumbai.maticvigil.com',
    //   privateKey: process.env.POLYGON_MUMBAI_PRIVATE_KEY || '',
    //   tokenAddress: process.env.POLYGON_MUMBAI_TOKEN_ADDRESS,
    //   gasLimit: 100000,
    // },
    // POLYGON_MAINNET: {
    //   rpcUrl: process.env.POLYGON_MAINNET_RPC_URL || 'https://polygon-rpc.com',
    //   privateKey: process.env.POLYGON_MAINNET_PRIVATE_KEY || '',
    //   tokenAddress: process.env.POLYGON_MAINNET_TOKEN_ADDRESS,
    //   gasLimit: 100000,
    // },
  };

  constructor() {
    this.initializeProviders();
  }

  /**
   * Khởi tạo providers và wallets cho các networks
   */
  private initializeProviders(): void {
    for (const [network, config] of Object.entries(this.networks)) {
      try {
        const provider = new ethers.JsonRpcProvider(config.rpcUrl);
        this.providers.set(network, provider);

        if (config.privateKey && config.privateKey !== '') {
          const wallet = new ethers.Wallet(config.privateKey, provider);
          this.wallets.set(network, wallet);
          console.log(
            `✅ Initialized wallet for ${network}: ${wallet.address}`
          );
        } else {
          console.warn(`⚠️  No private key configured for ${network}`);
        }
      } catch (error) {
        console.error(`❌ Failed to initialize ${network}:`, error);
      }
    }
  }

  /**
   * Gửi cashback (native token hoặc ERC20)
   * @param params
   * @returns
   */
  async sendCashback(params: SendCashbackParams): Promise<TransactionResult> {
    const { toAddress, amount, network } = params;

    console.log(`🔄 Sending cashback: ${amount} to ${toAddress} on ${network}`);

    // Validate network
    if (!this.networks[network]) {
      throw new Error(`Network ${network} không được hỗ trợ`);
    }

    const wallet = this.wallets.get(network);
    if (!wallet) {
      throw new Error(`Wallet cho network ${network} chưa được cấu hình`);
    }

    // Validate address
    if (!ethers.isAddress(toAddress)) {
      throw new Error(`Địa chỉ ví không hợp lệ: ${toAddress}`);
    }

    const config = this.networks[network];

    try {
      let tx: ethers.TransactionResponse;

      if (config.tokenAddress) {
        // Gửi ERC20 token (BEP20, ERC20, etc.)
        console.log(`📤 Sending ${amount} tokens to ${toAddress}`);
        tx = await this.sendERC20Token(
          wallet,
          config.tokenAddress,
          toAddress,
          amount
        );
      } else {
        // Gửi native token (BNB, ETH, MATIC...)
        console.log(`📤 Sending ${amount} native tokens to ${toAddress}`);
        tx = await this.sendNativeToken(wallet, toAddress, amount);
      }

      console.log(
        `⏳ Transaction sent: ${tx.hash}, waiting for confirmation...`
      );

      // Đợi transaction được confirm (1 block)
      const receipt = await tx.wait(1);

      if (!receipt) {
        throw new Error('Transaction receipt is null');
      }

      if (receipt.status === 0) {
        throw new Error('Transaction failed on blockchain');
      }

      // Tính gas fee
      const gasFee = Number(
        ethers.formatEther(receipt.gasUsed * receipt.gasPrice)
      );

      console.log(`✅ Transaction confirmed: ${receipt.hash}`);
      console.log(`   Block: ${receipt.blockNumber}`);
      console.log(`   Gas used: ${receipt.gasUsed.toString()}`);
      console.log(
        `   Gas fee: ${gasFee} ${this.getNativeTokenSymbol(network)}`
      );

      return {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        gasFee,
      };
    } catch (error: any) {
      console.error('❌ Blockchain transaction failed:', error);

      // Parse error message
      let errorMessage = error.message;
      if (error.code === 'INSUFFICIENT_FUNDS') {
        errorMessage = 'Số dư ví không đủ để thực hiện giao dịch';
      } else if (error.code === 'NETWORK_ERROR') {
        errorMessage = 'Lỗi kết nối mạng blockchain';
      } else if (error.code === 'NONCE_EXPIRED') {
        errorMessage = 'Nonce đã hết hạn, vui lòng thử lại';
      }

      throw new Error(`Gửi cashback thất bại: ${errorMessage}`);
    }
  }

  /**
   * Gửi native token (BNB, ETH, MATIC...)
   */
  private async sendNativeToken(
    wallet: ethers.Wallet,
    toAddress: string,
    amount: number
  ): Promise<ethers.TransactionResponse> {
    // Convert amount to Wei
    const amountInWei = ethers.parseEther(amount.toString());

    const tx = await wallet.sendTransaction({
      to: toAddress,
      value: amountInWei,
    });

    return tx;
  }

  /**
   * Gửi ERC20/BEP20 token
   */
  private async sendERC20Token(
    wallet: ethers.Wallet,
    tokenAddress: string,
    toAddress: string,
    amount: number
  ): Promise<ethers.TransactionResponse> {
    // ERC20 ABI (chỉ cần các hàm cần thiết)
    const abi = [
      'function transfer(address to, uint256 amount) returns (bool)',
      'function decimals() view returns (uint8)',
      'function balanceOf(address account) view returns (uint256)',
      'function symbol() view returns (string)',
    ];

    const tokenContract = new ethers.Contract(tokenAddress, abi, wallet);

    if (!tokenContract || !tokenContract.decimals) {
      throw new Error('Invalid token contract');
    }

    // Lấy thông tin token
    const [decimals, balance, symbol] = await Promise.all([
      tokenContract.decimals(),
      tokenContract.balanceOf?.(wallet.address) ?? 0,
      tokenContract.symbol?.() ?? 'UNKNOWN',
    ]);

    console.log(`   Token: ${symbol} (${decimals} decimals)`);
    console.log(
      `   Wallet balance: ${ethers.formatUnits(balance, decimals)} ${symbol}`
    );

    // Convert amount với decimals
    const amountInTokenUnits = ethers.parseUnits(amount.toString(), decimals);

    // Kiểm tra balance
    if (balance < amountInTokenUnits) {
      throw new Error(
        `Insufficient token balance. Required: ${amount} ${symbol}, Available: ${ethers.formatUnits(balance, decimals)} ${symbol}`
      );
    }

    if (!tokenContract || !tokenContract.decimals) {
      throw new Error('Invalid token contract');
    }

    // Gửi transaction
    const tx = await tokenContract.transfer?.(toAddress, amountInTokenUnits);

    return tx;
  }

  /**
   * Verify transaction trên blockchain
   * @param txHash
   * @param network
   * @returns
   */
  async verifyTransaction(txHash: string, network: string): Promise<boolean> {
    const provider = this.providers.get(network);
    if (!provider) {
      throw new Error(`Provider cho network ${network} không tồn tại`);
    }

    try {
      console.log(`🔍 Verifying transaction: ${txHash} on ${network}`);

      const receipt = await provider.getTransactionReceipt(txHash);

      if (!receipt) {
        console.log(`⚠️  Transaction not found: ${txHash}`);
        return false;
      }

      // Transaction tồn tại và thành công
      const isValid = receipt.status === 1;

      console.log(
        `${isValid ? '✅' : '❌'} Transaction ${txHash}: ${isValid ? 'Valid' : 'Failed'}`
      );
      console.log(`   Block: ${receipt.blockNumber}`);
      console.log(`   Confirmations: ${await receipt.confirmations()}`);

      return isValid;
    } catch (error) {
      console.error('❌ Verify transaction failed:', error);
      return false;
    }
  }

  /**
   * Lấy thông tin transaction
   * @param txHash
   * @param network
   * @returns
   */
  async getTransactionInfo(txHash: string, network: string) {
    const provider = this.providers.get(network);
    if (!provider) {
      throw new Error(`Provider cho network ${network} không tồn tại`);
    }

    try {
      const [tx, receipt] = await Promise.all([
        provider.getTransaction(txHash),
        provider.getTransactionReceipt(txHash),
      ]);

      if (!tx || !receipt) {
        return null;
      }

      return {
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        value: ethers.formatEther(tx.value),
        gasUsed: receipt.gasUsed.toString(),
        gasPrice: tx.gasPrice?.toString(),
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'success' : 'failed',
        confirmations: await tx.confirmations(),
        timestamp: (await provider.getBlock(receipt.blockNumber))?.timestamp,
      };
    } catch (error) {
      console.error('❌ Get transaction info failed:', error);
      return null;
    }
  }

  /**
   * Kiểm tra balance của wallet
   * @param address
   * @param network
   * @returns
   */
  async getBalance(address: string, network: string): Promise<string> {
    const provider = this.providers.get(network);
    if (!provider) {
      throw new Error(`Provider cho network ${network} không tồn tại`);
    }

    const balance = await provider.getBalance(address);
    return ethers.formatEther(balance);
  }

  /**
   * Kiểm tra token balance
   * @param address
   * @param tokenAddress
   * @param network
   * @returns
   */
  async getTokenBalance(
    address: string,
    tokenAddress: string,
    network: string
  ): Promise<string> {
    const provider = this.providers.get(network);
    if (!provider) {
      throw new Error(`Provider cho network ${network} không tồn tại`);
    }

    const abi = [
      'function balanceOf(address account) view returns (uint256)',
      'function decimals() view returns (uint8)',
    ];

    const tokenContract = new ethers.Contract(tokenAddress, abi, provider);
    if (!tokenContract || !tokenContract.decimals) {
      throw new Error('Invalid token contract');
    }
    const [balance, decimals] = await Promise.all([
      tokenContract.balanceOf?.(address) ?? 0,
      tokenContract.decimals(),
    ]);

    return ethers.formatUnits(balance, decimals);
  }

  /**
   * Estimate gas cho transaction
   * @param params
   * @returns
   */
  async estimateGas(params: SendCashbackParams): Promise<{
    gasLimit: bigint;
    gasPrice: bigint;
    estimatedCost: string;
  }> {
    const { toAddress, amount, network } = params;

    const wallet = this.wallets.get(network);
    if (!wallet) {
      throw new Error(`Wallet cho network ${network} chưa được cấu hình`);
    }

    const config = this.networks[network];
    const provider = this.providers.get(network);
    if (!provider) {
      throw new Error(`Provider cho network ${network} không tồn tại`);
    }

    let gasLimit: bigint;

    if (config && config.tokenAddress) {
      // Estimate cho ERC20
      const abi = [
        'function transfer(address to, uint256 amount) returns (bool)',
        'function decimals() view returns (uint8)',
      ];
      const tokenContract = new ethers.Contract(
        config.tokenAddress,
        abi,
        wallet
      );

      if (
        !tokenContract ||
        !tokenContract.decimals ||
        !tokenContract.transfer
      ) {
        throw new Error('Invalid token contract');
      }

      const decimals = await tokenContract.decimals();
      const amountInWei = ethers.parseUnits(amount.toString(), decimals);
      gasLimit = await tokenContract.transfer.estimateGas(
        toAddress,
        amountInWei
      );
    } else {
      // Estimate cho native token
      gasLimit = await wallet.estimateGas({
        to: toAddress,
        value: ethers.parseEther(amount.toString()),
      });
    }

    // Lấy gas price hiện tại
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('5', 'gwei');

    // Tính estimated cost
    const estimatedCost = ethers.formatEther(gasLimit * gasPrice);

    return {
      gasLimit,
      gasPrice,
      estimatedCost,
    };
  }

  /**
   * Lấy wallet address cho network
   * @param network
   * @returns
   */
  getWalletAddress(network: string): string | null {
    const wallet = this.wallets.get(network);
    return wallet ? wallet.address : null;
  }

  /**
   * Kiểm tra network có được support không
   * @param network
   * @returns
   */
  isNetworkSupported(network: string): boolean {
    return this.networks.hasOwnProperty(network);
  }

  /**
   * Lấy danh sách networks được support
   * @returns
   */
  getSupportedNetworks(): string[] {
    return Object.keys(this.networks);
  }

  /**
   * Get native token symbol
   */
  private getNativeTokenSymbol(network: string): string {
    const symbols: Record<string, string> = {
      BSC_TESTNET: 'tBNB',
      BSC_MAINNET: 'BNB',
      ETH_SEPOLIA: 'SepoliaETH',
      ETH_MAINNET: 'ETH',
      POLYGON_MUMBAI: 'tMATIC',
      POLYGON_MAINNET: 'MATIC',
    };
    return symbols[network] || 'TOKEN';
  }

  /**
   * Health check - kiểm tra kết nối với các networks
   */
  async healthCheck(): Promise<
    Record<string, { status: string; blockNumber?: number; error?: string }>
  > {
    const results: Record<string, any> = {};

    for (const [network, provider] of this.providers.entries()) {
      try {
        const blockNumber = await provider.getBlockNumber();
        results[network] = {
          status: 'healthy',
          blockNumber,
        };
      } catch (error: any) {
        results[network] = {
          status: 'unhealthy',
          error: error.message,
        };
      }
    }

    return results;
  }
}
