import Joi from 'joi';
import { CashbackStatus } from '@prisma/client';

export const createCashbackSchema = Joi.object({
  paymentId: Joi.string().uuid().required().messages({
    'string.empty': 'Payment ID là bắt buộc',
    'string.guid': 'Payment ID không hợp lệ',
  }),
  userId: Joi.string().uuid().required(),
  amount: Joi.number().positive().optional(),
  percentage: Joi.number().min(0).max(100).required().messages({
    'number.min': 'Phần trăm cashback phải >= 0',
    'number.max': 'Phần trăm cashback phải <= 100',
  }),
  walletAddress: Joi.string().required().messages({
    'string.empty': 'Địa chỉ ví là bắt buộc',
  }),
  blockchainNetwork: Joi.string()
    .valid('BSC', 'ETH', 'POLYGON')
    .required()
    .messages({
      'any.only': 'Blockchain network không hợp lệ',
    }),
  eligibleAt: Joi.date().optional(),
  expiresAt: Joi.date().optional(),
  metadata: Joi.object().optional(),
});

export const getCashbacksQuerySchema = Joi.object({
  page: Joi.number().integer().min(0).default(0),
  limit: Joi.number().integer().min(1).max(100).default(10),
  status: Joi.string()
    .valid(...Object.values(CashbackStatus))
    .optional(),
});

export const processCashbackSchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(50),
  maxRetries: Joi.number().integer().min(1).max(10).default(3),
});

// Blockchain cashback schemas
export const claimCashbackSchema = Joi.object({
  amount: Joi.number().positive().required().messages({
    'number.positive': 'Amount must be positive',
    'any.required': 'Amount is required',
  }),
  walletAddress: Joi.string().hex().length(42).optional().messages({
    'string.hex': 'Invalid Ethereum address format',
    'string.length': 'Ethereum address must be 42 characters',
  }),
});

export const blockchainWebhookSchema = Joi.object({
  event: Joi.string().required().messages({
    'any.required': 'Event name is required',
  }),
  blockNumber: Joi.number().required().messages({
    'any.required': 'Block number is required',
  }),
  transactionHash: Joi.string().hex().required().messages({
    'any.required': 'Transaction hash is required',
    'string.hex': 'Invalid transaction hash format',
  }),
  logIndex: Joi.number().optional(),
  data: Joi.object().optional(),
  blockHash: Joi.string().optional(),
});

export const deployContractSchema = Joi.object({
  contractType: Joi.string()
    .valid('CASHBACK_TOKEN', 'CASHBACK_MANAGER', 'CASHBACK_POOL')
    .required()
    .messages({
      'any.only': 'Invalid contract type',
      'any.required': 'Contract type is required',
    }),
  networkId: Joi.string().uuid().required().messages({
    'any.required': 'Network ID is required',
  }),
  constructorArgs: Joi.array().required().messages({
    'any.required': 'Constructor arguments are required',
  }),
});

export const getTransactionSchema = Joi.object({
  txHash: Joi.string().hex().required().messages({
    'any.required': 'Transaction hash is required',
    'string.hex': 'Invalid transaction hash format',
  }),
});

export const getNetworksSchema = Joi.object({
  type: Joi.string()
    .valid(
      'BSC_TESTNET',
      'BSC_MAINNET',
      'ETHEREUM_SEPOLIA',
      'ETHEREUM_MAINNET',
      'POLYGON_MUMBAI',
      'POLYGON_MAINNET'
    )
    .optional(),
});

export const processPendingSchema = Joi.object({
  batchSize: Joi.number().integer().min(1).max(100).default(10),
});

export const retryFailedSchema = Joi.object({
  maxRetries: Joi.number().integer().min(1).max(10).default(3),
  batchSize: Joi.number().integer().min(1).max(100).default(10),
});