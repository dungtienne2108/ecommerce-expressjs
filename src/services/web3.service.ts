import { JsonRpcProvider, Wallet, Contract, ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

interface PaymentResult {
  success: boolean;
  txHash?: string;
  blockNumber?: number;
  cashbackAmount?: string;
  message?: string;
  error?: string;
}

interface MerchantInfo {
  isActive: boolean;
  customCashback: string;
  totalTransactions: string;
  totalCashbackGiven: string;
}

interface ValidationResult {
  confirmed: boolean;
  blockNumber?: number;
  status?: string;
}

// Contract ABIs - Using JSON ABI for proper named returns
const CASHBACK_TOKEN_ABI = [
  {
    type: 'function',
    name: 'approve',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'transfer',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
    stateMutability: 'nonpayable',
  },
];

const CASHBACK_MANAGER_ABI = [
  {
    type: 'function',
    name: 'registerMerchant',
    inputs: [
      { name: '_merchant', type: 'address' },
      { name: '_isActive', type: 'bool' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'getUserCashback',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getMerchantInfo',
    inputs: [{ name: 'merchant', type: 'address' }],
    outputs: [
      { name: 'isActive', type: 'bool' },
      { name: 'customCashback', type: 'uint256' },
      { name: 'totalTransactions', type: 'uint256' },
      { name: 'totalCashbackGiven', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'claimCashback',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'recordTransaction',
    inputs: [
      { name: '_user', type: 'address' },
      { name: '_merchant', type: 'address' },
      { name: '_transactionAmount', type: 'uint256' },
    ],
    outputs: [{ name: 'cashbackAmount', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'setMerchantCashback',
    inputs: [
      { name: '_merchant', type: 'address' },
      { name: '_percentage', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'setCashbackPercentage',
    inputs: [{ name: '_percentage', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'claimCashbackFor',
    inputs: [{ name: '_user', type: 'address' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
];

const MERCHANT_PAYMENT_ABI = [
  {
    type: 'function',
    name: 'processPayment',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [{ type: 'bytes32' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'getTransaction',
    inputs: [{ name: 'txId', type: 'bytes32' }],
    outputs: [
      { type: 'address' },
      { type: 'uint256' },
      { type: 'uint256' },
      { type: 'uint256' },
      { type: 'bool' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getMerchantInfo',
    inputs: [{ name: 'merchant', type: 'address' }],
    outputs: [
      { name: 'isActive', type: 'bool' },
      { name: 'customCashback', type: 'uint256' },
      { name: 'totalTransactions', type: 'uint256' },
      { name: 'totalCashbackGiven', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
];

class Web3Service {
  public provider: JsonRpcProvider;
  public backendWallet: Wallet;
  public tokenAddress: string;
  public managerAddress: string;
  public paymentAddress: string;
  public tokenContract: Contract;
  public managerContract: Contract;
  public paymentContract: Contract;

  constructor() {
    // Connect to Sepolia testnet
    this.provider = new ethers.JsonRpcProvider(process.env.ETH_SEPOLIA_RPC_URL);

    // Private key for backend
    this.backendWallet = new ethers.Wallet(
      process.env.ETH_SEPOLIA_PRIVATE_KEY || '',
      this.provider
    );

    // Contract addresses
    this.tokenAddress = process.env.CASHBACK_TOKEN_ADDRESS || '';
    this.managerAddress = process.env.CASHBACK_MANAGER_ADDRESS || '';
    this.paymentAddress = process.env.MERCHANT_PAYMENT_ADDRESS || '';

    // Initialize contracts
    this.tokenContract = new ethers.Contract(
      this.tokenAddress,
      CASHBACK_TOKEN_ABI,
      this.provider
    );
    this.managerContract = new ethers.Contract(
      this.managerAddress,
      CASHBACK_MANAGER_ABI,
      this.provider
    );
    this.paymentContract = new ethers.Contract(
      this.paymentAddress,
      MERCHANT_PAYMENT_ABI,
      this.provider
    );
  }

  async processPaymentWithCashback(
    userAddress: string,
    amountInWei: bigint
  ): Promise<PaymentResult> {
    try {
      console.log(`\n📝 Processing payment for ${userAddress}`);
      console.log(`Amount: ${ethers.formatEther(amountInWei)} tokens`);

      console.log('🔄 Payment contract:', this.paymentContract);
      console.log('🔄 Payment address:', this.paymentAddress);
      console.log('🔄 Backend wallet:', this.backendWallet.address);
      console.log('🔄 User address:', userAddress);
      console.log('🔄 Amount in wei:', amountInWei);
      console.log('🔄 Merchant info:', await this.getMerchantInfo());
      console.log('🔄 Manager contract:', this.managerContract);
      console.log('🔄 Manager address:', this.managerAddress);
      console.log('🔄 Backend wallet:', this.backendWallet.address);
      console.log('🔄 User address:', userAddress);
      console.log('🔄 Amount in wei:', amountInWei);
      const managerWithSigner = this.managerContract.connect(
        this.backendWallet
      ) as any;
      console.log('🔄 Manager contract with signer:', managerWithSigner);
      const tx = await managerWithSigner.recordTransaction(
        userAddress,
        this.paymentAddress,
        amountInWei
      );
      console.log('🔄 Transaction recorded:', tx);
      console.log(`✅ Transaction recorded: ${tx.hash}`);

      const receipt = await tx.wait();
      console.log(`✅ Confirmed in block: ${receipt?.blockNumber}`);
      console.log('🔄 Receipt:', receipt);
      const cashbackAmount = await this.getCashbackForUser(userAddress);
      console.log('🔄 Cashback amount:', cashbackAmount);
      return {
        success: true,
        txHash: tx.hash,
        blockNumber: receipt?.blockNumber,
        cashbackAmount: ethers.formatEther(cashbackAmount),
        message: `Payment processed! User earned ${ethers.formatEther(cashbackAmount)} CASH tokens`,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error('❌ Error processing payment:', errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Claim cashback for a user (auto claim by backend)
   * @param userAddress - User wallet address to receive tokens
   * @returns Transaction result
   */
  async claimCashbackForUser(userAddress: string): Promise<PaymentResult> {
    try {
      console.log(`\n💰 Auto claiming cashback for user: ${userAddress}`);

      // Check pending cashback first
      const pendingCashback = await this.getCashbackForUser(userAddress);
      if (pendingCashback === 0n) {
        return {
          success: false,
          message: 'No cashback to claim for this user',
        };
      }

      console.log(`Pending cashback: ${ethers.formatEther(pendingCashback)} tokens`);

      // Call claimCashbackFor from contract
      const managerWithSigner = this.managerContract.connect(this.backendWallet) as any;
      const tx = await managerWithSigner.claimCashbackFor(userAddress);
      console.log(`✅ Claim transaction sent: ${tx.hash}`);

      const receipt = await tx.wait();
      console.log(`✅ Claim confirmed in block: ${receipt?.blockNumber}`);

      return {
        success: true,
        txHash: tx.hash,
        blockNumber: receipt?.blockNumber,
        cashbackAmount: ethers.formatEther(pendingCashback),
        message: `Successfully claimed ${ethers.formatEther(pendingCashback)} CASH tokens for user`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ Error claiming cashback:', errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  async getCashbackForUser(userAddress: string): Promise<bigint> {
    try {
      if (!this.managerContract) {
        throw new Error('Manager contract not initialized');
      }

      console.log('🔄 Getting cashback for user:', userAddress);
      const cashback = await (this.managerContract as any).getUserCashback(
        userAddress
      );
      return cashback;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error('Error getting cashback:', errorMessage);
      throw error;
    }
  }

  async getCashbackForUserFormatted(userAddress: string): Promise<string> {
    const cashback = await this.getCashbackForUser(userAddress);
    return ethers.formatEther(cashback);
  }

  async getUserTokenBalance(userAddress: string): Promise<string> {
    try {
      if (!this.tokenContract) {
        throw new Error('Token contract not initialized');
      }
      const balance = await (this.tokenContract as any).balanceOf(userAddress);
      return ethers.formatEther(balance);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error('Error getting balance:', errorMessage);
      throw error;
    }
  }

  async getMerchantInfo(): Promise<MerchantInfo> {
    try {
      const managerWithSigner = this.managerContract.connect(
        this.backendWallet
      ) as any;
      let info = await managerWithSigner.getMerchantInfo(this.paymentAddress);
      console.log('🔄 Merchant info raw:', info);

      // Destructure from Result object (supports both named and indexed access)
      const isActive = info.isActive || info[0];
      const customCashback = info.customCashback || info[1];
      const totalTransactions = info.totalTransactions || info[2];
      const totalCashbackGiven = info.totalCashbackGiven || info[3];

      console.log('🔄 Merchant info parsed:', {
        isActive,
        customCashback,
        totalTransactions,
        totalCashbackGiven,
      });

      // if merchant info is not found, register merchant
      if (!isActive) {
        console.log('🔄 Registering merchant...');
        await managerWithSigner.registerMerchant(this.paymentAddress, true);
        const newInfo = await managerWithSigner.getMerchantInfo(
          this.paymentAddress
        );
        console.log('🔄 New merchant info:', newInfo);
        info = newInfo;
      }

      return {
        isActive: isActive,
        customCashback: (customCashback || 0n).toString(),
        totalTransactions: (totalTransactions || 0n).toString(),
        totalCashbackGiven: ethers.formatEther(totalCashbackGiven || 0n),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error('Error getting merchant info:', errorMessage);
      throw error;
    }
  }

  async simulateCheckout(
    userAddress: string,
    productPrice: number,
    quantity: number
  ): Promise<PaymentResult> {
    try {
      const totalAmount = productPrice * quantity;
      const amountInWei = ethers.parseEther(totalAmount.toString());

      console.log(`\n🛒 Checkout:`);
      console.log(`Product price: ${productPrice} tokens`);
      console.log(`Quantity: ${quantity}`);
      console.log(`Total: ${totalAmount} tokens`);

      const result = await this.processPaymentWithCashback(
        userAddress,
        amountInWei
      );

      if (result.success) {
        const cashback = await this.getCashbackForUserFormatted(userAddress);
        return {
          ...result,
          cashbackAmount: cashback,
        };
      }

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error('Error in checkout:', errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  async validateTransaction(txHash: string): Promise<ValidationResult> {
    try {
      const receipt = await this.provider.getTransactionReceipt(txHash);
      return {
        confirmed: receipt !== null,
        blockNumber: receipt?.blockNumber ?? 0,
        status: receipt?.status === 1 ? 'Success' : 'Failed',
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error('Error validating transaction:', errorMessage);
      throw error;
    }
  }
}

export default Web3Service;
