-- CreateEnum
CREATE TYPE "BlockchainNetworkType" AS ENUM ('BSC_TESTNET', 'BSC_MAINNET', 'ETHEREUM_SEPOLIA', 'ETHEREUM_MAINNET', 'POLYGON_MUMBAI', 'POLYGON_MAINNET');

-- CreateEnum
CREATE TYPE "SmartContractType" AS ENUM ('CASHBACK_TOKEN', 'CASHBACK_MANAGER', 'CASHBACK_POOL');

-- CreateEnum
CREATE TYPE "BlockchainTransactionStatus" AS ENUM ('PENDING', 'CONFIRMED', 'FAILED', 'DROPPED');

-- CreateTable
CREATE TABLE "blockchain_networks" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "BlockchainNetworkType" NOT NULL,
    "rpc_url" TEXT NOT NULL,
    "chain_id" BIGINT NOT NULL,
    "native_token" TEXT NOT NULL,
    "explorer_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "gas_limit" BIGINT,
    "gas_price" BIGINT,
    "max_fee_per_gas" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "blockchain_networks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "smart_contracts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "SmartContractType" NOT NULL,
    "network_id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "abi" JSONB NOT NULL,
    "bytecode" TEXT,
    "deployment_tx_hash" TEXT,
    "deployer_address" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "source_url" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verified_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "smart_contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blockchain_transactions" (
    "id" TEXT NOT NULL,
    "tx_hash" TEXT NOT NULL,
    "network_id" TEXT NOT NULL,
    "contract_id" TEXT,
    "from_address" TEXT NOT NULL,
    "to_address" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "data" TEXT,
    "gas_used" BIGINT,
    "gas_price" BIGINT,
    "gas_fee" DECIMAL(20,8),
    "status" "BlockchainTransactionStatus" NOT NULL DEFAULT 'PENDING',
    "block_number" BIGINT,
    "block_hash" TEXT,
    "confirmations" INTEGER NOT NULL DEFAULT 0,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmed_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),
    "error_message" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "last_retry_at" TIMESTAMP(3),
    "metadata" JSONB,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blockchain_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blockchain_events" (
    "id" TEXT NOT NULL,
    "network_id" TEXT NOT NULL,
    "contract_id" TEXT NOT NULL,
    "event_name" TEXT NOT NULL,
    "log_index" INTEGER NOT NULL,
    "transaction_hash" TEXT NOT NULL,
    "block_number" BIGINT NOT NULL,
    "block_hash" TEXT NOT NULL,
    "event_data" JSONB NOT NULL,
    "raw_log" JSONB,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processed_at" TIMESTAMP(3),
    "processing_error" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blockchain_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cashback_claims" (
    "id" TEXT NOT NULL,
    "cashback_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "claimed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validity_expires" TIMESTAMP(3) NOT NULL,
    "network_id" TEXT,
    "wallet_address" TEXT NOT NULL,
    "tx_hash" TEXT,
    "status" "CashbackStatus" NOT NULL DEFAULT 'PENDING',
    "claimed_tx_hash" TEXT,
    "processed_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),
    "failure_reason" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "max_retries" INTEGER NOT NULL DEFAULT 3,
    "last_retry_at" TIMESTAMP(3),
    "metadata" JSONB,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cashback_claims_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "blockchain_networks_name_key" ON "blockchain_networks"("name");

-- CreateIndex
CREATE INDEX "blockchain_networks_type_idx" ON "blockchain_networks"("type");

-- CreateIndex
CREATE INDEX "blockchain_networks_chain_id_idx" ON "blockchain_networks"("chain_id");

-- CreateIndex
CREATE INDEX "blockchain_networks_is_active_idx" ON "blockchain_networks"("is_active");

-- CreateIndex
CREATE INDEX "blockchain_networks_created_at_idx" ON "blockchain_networks"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "smart_contracts_deployment_tx_hash_key" ON "smart_contracts"("deployment_tx_hash");

-- CreateIndex
CREATE INDEX "smart_contracts_network_id_idx" ON "smart_contracts"("network_id");

-- CreateIndex
CREATE INDEX "smart_contracts_type_idx" ON "smart_contracts"("type");

-- CreateIndex
CREATE INDEX "smart_contracts_address_idx" ON "smart_contracts"("address");

-- CreateIndex
CREATE INDEX "smart_contracts_verified_idx" ON "smart_contracts"("verified");

-- CreateIndex
CREATE INDEX "smart_contracts_is_active_idx" ON "smart_contracts"("is_active");

-- CreateIndex
CREATE INDEX "smart_contracts_created_at_idx" ON "smart_contracts"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "smart_contracts_network_id_address_key" ON "smart_contracts"("network_id", "address");

-- CreateIndex
CREATE UNIQUE INDEX "blockchain_transactions_tx_hash_key" ON "blockchain_transactions"("tx_hash");

-- CreateIndex
CREATE INDEX "blockchain_transactions_network_id_idx" ON "blockchain_transactions"("network_id");

-- CreateIndex
CREATE INDEX "blockchain_transactions_contract_id_idx" ON "blockchain_transactions"("contract_id");

-- CreateIndex
CREATE INDEX "blockchain_transactions_tx_hash_idx" ON "blockchain_transactions"("tx_hash");

-- CreateIndex
CREATE INDEX "blockchain_transactions_status_idx" ON "blockchain_transactions"("status");

-- CreateIndex
CREATE INDEX "blockchain_transactions_from_address_idx" ON "blockchain_transactions"("from_address");

-- CreateIndex
CREATE INDEX "blockchain_transactions_to_address_idx" ON "blockchain_transactions"("to_address");

-- CreateIndex
CREATE INDEX "blockchain_transactions_block_number_idx" ON "blockchain_transactions"("block_number");

-- CreateIndex
CREATE INDEX "blockchain_transactions_sent_at_idx" ON "blockchain_transactions"("sent_at");

-- CreateIndex
CREATE INDEX "blockchain_transactions_confirmed_at_idx" ON "blockchain_transactions"("confirmed_at");

-- CreateIndex
CREATE INDEX "blockchain_transactions_created_at_idx" ON "blockchain_transactions"("created_at");

-- CreateIndex
CREATE INDEX "blockchain_events_network_id_idx" ON "blockchain_events"("network_id");

-- CreateIndex
CREATE INDEX "blockchain_events_contract_id_idx" ON "blockchain_events"("contract_id");

-- CreateIndex
CREATE INDEX "blockchain_events_event_name_idx" ON "blockchain_events"("event_name");

-- CreateIndex
CREATE INDEX "blockchain_events_block_number_idx" ON "blockchain_events"("block_number");

-- CreateIndex
CREATE INDEX "blockchain_events_processed_idx" ON "blockchain_events"("processed");

-- CreateIndex
CREATE INDEX "blockchain_events_created_at_idx" ON "blockchain_events"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "blockchain_events_transaction_hash_log_index_key" ON "blockchain_events"("transaction_hash", "log_index");

-- CreateIndex
CREATE UNIQUE INDEX "cashback_claims_cashback_id_key" ON "cashback_claims"("cashback_id");

-- CreateIndex
CREATE UNIQUE INDEX "cashback_claims_tx_hash_key" ON "cashback_claims"("tx_hash");

-- CreateIndex
CREATE UNIQUE INDEX "cashback_claims_claimed_tx_hash_key" ON "cashback_claims"("claimed_tx_hash");

-- CreateIndex
CREATE INDEX "cashback_claims_user_id_idx" ON "cashback_claims"("user_id");

-- CreateIndex
CREATE INDEX "cashback_claims_status_idx" ON "cashback_claims"("status");

-- CreateIndex
CREATE INDEX "cashback_claims_wallet_address_idx" ON "cashback_claims"("wallet_address");

-- CreateIndex
CREATE INDEX "cashback_claims_claimed_at_idx" ON "cashback_claims"("claimed_at");

-- CreateIndex
CREATE INDEX "cashback_claims_created_at_idx" ON "cashback_claims"("created_at");

-- AddForeignKey
ALTER TABLE "smart_contracts" ADD CONSTRAINT "smart_contracts_network_id_fkey" FOREIGN KEY ("network_id") REFERENCES "blockchain_networks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blockchain_transactions" ADD CONSTRAINT "blockchain_transactions_network_id_fkey" FOREIGN KEY ("network_id") REFERENCES "blockchain_networks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blockchain_transactions" ADD CONSTRAINT "blockchain_transactions_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "smart_contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blockchain_events" ADD CONSTRAINT "blockchain_events_network_id_fkey" FOREIGN KEY ("network_id") REFERENCES "blockchain_networks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blockchain_events" ADD CONSTRAINT "blockchain_events_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "smart_contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
