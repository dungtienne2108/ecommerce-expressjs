import { ethers } from 'ethers';
import { Contract, ContractInterface } from 'ethers';
import { IUnitOfWork } from '../repositories/interfaces/IUnitOfWork';
import { asyncHandler } from '../utils/middleware.util';
import {
  ContractDeployment,
  ContractDeploymentError,
  ContractInteractionError,
  SmartContractType,
} from '../contracts/types';
import { CashbackTokenABI, CashbackManagerABI, CashbackPoolABI } from '../contracts/abis';

/**
 * SmartContractService
 * Handles smart contract interactions, deployment, and management
 */
export class SmartContractService {
  constructor(private uow: IUnitOfWork) {}

  /**
   * Deploy a smart contract
   * @param contractType Type of contract to deploy
   * @param networkId Network ID to deploy to
   * @param constructorArgs Constructor arguments
   * @param signer Ethers signer object
   */
  async deployContract(
    contractType: SmartContractType,
    networkId: string,
    constructorArgs: any[],
    signer: ethers.Signer
  ): Promise<ContractDeployment> {
    return await this.uow.executeInTransaction(async (uow) => {
      try {
        // Get network info
        const network = await uow.blockchainNetworks.findById(networkId);
        if (!network) {
          throw new ContractDeploymentError('Network not found', contractType, networkId);
        }

        // Select contract factory based on type
        let contractName: string;
        let abi: any;
        let bytecode: string | undefined;

        switch (contractType) {
          case 'CASHBACK_TOKEN':
            contractName = 'CashbackToken';
            abi = CashbackTokenABI;
            break;
          case 'CASHBACK_MANAGER':
            contractName = 'CashbackManager';
            abi = CashbackManagerABI;
            break;
          case 'CASHBACK_POOL':
            contractName = 'CashbackPool';
            abi = CashbackPoolABI;
            break;
          default:
            throw new ContractDeploymentError(`Unknown contract type: ${contractType}`, contractType, networkId);
        }

        // Create contract factory (in production, use actual bytecode)
        const ContractFactory = new ethers.ContractFactory(abi, bytecode || '0x', signer);

        // Deploy contract
        const contract = await ContractFactory.deploy(...constructorArgs);
        const deploymentTx = contract.deploymentTransaction();

        if (!deploymentTx) {
          throw new ContractDeploymentError('Deployment transaction not found', contractName, networkId);
        }

        // Wait for deployment confirmation
        const receipt = await contract.waitForDeployment();
        const contractAddress = await receipt.getAddress();
        const deployerAddress = await signer.getAddress();

        // Save contract to database
        await uow.smartContracts.create({
          name: contractName,
          type: contractType,
          networkId,
          address: contractAddress,
          abi: abi,
          bytecode,
          deploymentTxHash: deploymentTx.hash,
          deployerAddress,
          version: '1.0.0',
          verified: false,
          isActive: true,
        });

        // Track deployment transaction
        await uow.blockchainTransactions.create({
          txHash: deploymentTx.hash,
          networkId,
          fromAddress: deployerAddress,
          toAddress: contractAddress,
          value: deploymentTx.value?.toString() || '0',
          data: deploymentTx.data,
          gasPrice: deploymentTx.gasPrice?.toString(),
          status: 'CONFIRMED',
          sentAt: new Date(),
          confirmedAt: new Date(),
        });

        return {
          network: network.name,
          cashbackToken: contractType === 'CASHBACK_TOKEN' ? { address: contractAddress, name: contractName, symbol: 'ECT' } : { address: '', name: '', symbol: '' },
          cashbackManager: contractType === 'CASHBACK_MANAGER' ? { address: contractAddress, admin: deployerAddress } : { address: '', admin: '' },
          cashbackPool: contractType === 'CASHBACK_POOL' ? { address: contractAddress, feeCollector: deployerAddress } : { address: '', feeCollector: '' },
          deployer: deployerAddress,
          deploymentTime: new Date().toISOString(),
        };
      } catch (error) {
        if (error instanceof ContractDeploymentError) {
          throw error;
        }
        throw new ContractDeploymentError(
          error instanceof Error ? error.message : 'Unknown deployment error',
          contractType,
          networkId
        );
      }
    });
  }

  /**
   * Get a deployed contract instance
   * @param contractAddress Contract address
   * @param contractType Contract type
   * @param provider Ethers provider
   */
  getContractInstance(
    contractAddress: string,
    contractType: SmartContractType,
    provider: ethers.Provider
  ): Contract {
    let abi: ContractInterface;

    switch (contractType) {
      case 'CASHBACK_TOKEN':
        abi = CashbackTokenABI;
        break;
      case 'CASHBACK_MANAGER':
        abi = CashbackManagerABI;
        break;
      case 'CASHBACK_POOL':
        abi = CashbackPoolABI;
        break;
      default:
        throw new ContractInteractionError(`Unknown contract type: ${contractType}`, '', '');
    }

    return new ethers.Contract(contractAddress, abi, provider);
  }

  /**
   * Call a read-only contract method
   * @param contractAddress Contract address
   * @param contractType Contract type
   * @param methodName Method name
   * @param args Method arguments
   * @param provider Ethers provider
   */
  async callMethod(
    contractAddress: string,
    contractType: SmartContractType,
    methodName: string,
    args: any[],
    provider: ethers.Provider
  ): Promise<any> {
    try {
      const contract = this.getContractInstance(contractAddress, contractType, provider);

      if (!contract[methodName]) {
        throw new ContractInteractionError(`Method ${methodName} not found`, contractAddress, methodName);
      }

      return await contract[methodName](...args);
    } catch (error) {
      throw new ContractInteractionError(
        error instanceof Error ? error.message : 'Contract call failed',
        contractAddress,
        methodName
      );
    }
  }

  /**
   * Execute a state-changing contract method (write)
   * @param contractAddress Contract address
   * @param contractType Contract type
   * @param methodName Method name
   * @param args Method arguments
   * @param signer Ethers signer
   */
  async executeMethod(
    contractAddress: string,
    contractType: SmartContractType,
    methodName: string,
    args: any[],
    signer: ethers.Signer
  ): Promise<any> {
    try {
      const contract = this.getContractInstance(contractAddress, contractType, signer);

      if (!contract[methodName]) {
        throw new ContractInteractionError(`Method ${methodName} not found`, contractAddress, methodName);
      }

      const tx = await contract[methodName](...args);
      return await tx.wait();
    } catch (error) {
      throw new ContractInteractionError(
        error instanceof Error ? error.message : 'Contract execution failed',
        contractAddress,
        methodName
      );
    }
  }

  /**
   * Get contract info from database
   * @param networkId Network ID
   * @param contractType Contract type
   */
  async getContractByType(networkId: string, contractType: SmartContractType) {
    return this.uow.smartContracts.findByTypeAndNetwork(contractType, networkId);
  }

  /**
   * Verify contract on blockchain explorer
   * @param networkId Network ID
   * @param contractAddress Contract address
   * @param constructorArgs Constructor arguments for verification
   */
  async verifyContract(
    networkId: string,
    contractAddress: string,
    constructorArgs: any[]
  ): Promise<void> {
    return await this.uow.executeInTransaction(async (uow) => {
      try {
        // Update contract verification status in database
        await uow.smartContracts.updateByAddress(contractAddress, {
          verified: true,
          verifiedAt: new Date(),
        });
      } catch (error) {
        throw new ContractDeploymentError(
          error instanceof Error ? error.message : 'Verification failed',
          'UNKNOWN',
          networkId
        );
      }
    });
  }

  /**
   * Get contract events
   * @param networkId Network ID
   * @param contractId Contract ID
   * @param eventName Event name to filter
   */
  async getContractEvents(networkId: string, contractId: string, eventName?: string) {
    return this.uow.blockchainEvents.findByContract(contractId, eventName);
  }

  /**
   * Get contract transactions
   * @param contractId Contract ID
   * @param status Filter by transaction status
   */
  async getContractTransactions(contractId: string, status?: string) {
    return this.uow.blockchainTransactions.findByContract(contractId, status);
  }

  /**
   * Get all smart contracts for a network
   * @param networkId Network ID
   */
  async getContractsByNetwork(networkId: string) {
    return this.uow.smartContracts.findByNetwork(networkId);
  }
}
