/**
 * Smart Contract Type Definitions
 */

// Cashback Token Types
export interface CashbackTokenDeployment {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: bigint;
}

export interface CashbackTokenConfig {
  name: string;
  symbol: string;
  initialSupply: bigint;
}

// Cashback Manager Types
export interface Campaign {
  id: bigint;
  name: string;
  rate: bigint; // basis points
  startTime: bigint;
  endTime: bigint;
  active: boolean;
  totalBudget: bigint;
  remaining: bigint;
}

export interface UserCashback {
  user: string;
  amount: bigint;
  campaignId: bigint;
  timestamp: bigint;
  claimed: boolean;
}

export interface CashbackManagerDeployment {
  address: string;
  admin: string;
  cashbackToken: string;
  minimumWithdrawal: bigint;
}

export interface CreateCampaignInput {
  name: string;
  rate: bigint; // basis points
  startTime: bigint;
  endTime: bigint;
  totalBudget: bigint;
}

// Cashback Pool Types
export interface DepositRecord {
  user: string;
  amount: bigint;
  timestamp: bigint;
}

export interface WithdrawalRecord {
  user: string;
  amount: bigint;
  fee: bigint;
  timestamp: bigint;
}

export interface CashbackPoolDeployment {
  address: string;
  poolToken: string;
  cashbackTokenAddress: string;
  feeCollector: string;
  depositFeePercentage: bigint;
  withdrawalFeePercentage: bigint;
}

// Deployment Summary
export interface ContractDeployment {
  network: string;
  cashbackToken: {
    address: string;
    name: string;
    symbol: string;
  };
  cashbackManager: {
    address: string;
    admin: string;
  };
  cashbackPool: {
    address: string;
    feeCollector: string;
  };
  deployer: string;
  deploymentTime: string;
  blockNumber?: number;
  transactionHash?: string;
}

// Transaction Types
export interface TransactionResult {
  hash: string;
  from: string;
  to: string;
  blockNumber: number;
  gasUsed: bigint;
  status: number; // 1 = success, 0 = failure
  transactionIndex: number;
}

// Event Types
export enum CashbackEventType {
  ALLOCATED = 'ALLOCATED',
  CLAIMED = 'CLAIMED',
  CAMPAIGN_CREATED = 'CAMPAIGN_CREATED',
  CAMPAIGN_UPDATED = 'CAMPAIGN_UPDATED',
  DEPOSITED = 'DEPOSITED',
  WITHDRAWN = 'WITHDRAWN',
}

export interface BlockchainEvent {
  id: string;
  eventType: CashbackEventType;
  blockNumber: number;
  transactionHash: string;
  logIndex: number;
  eventData: Record<string, any>;
  processedAt: Date;
}

// Error Types
export class ContractDeploymentError extends Error {
  constructor(message: string, public contract: string, public network: string) {
    super(message);
    this.name = 'ContractDeploymentError';
  }
}

export class ContractInteractionError extends Error {
  constructor(message: string, public contract: string, public method: string) {
    super(message);
    this.name = 'ContractInteractionError';
  }
}

export class BlockchainNetworkError extends Error {
  constructor(message: string, public network: string) {
    super(message);
    this.name = 'BlockchainNetworkError';
  }
}
