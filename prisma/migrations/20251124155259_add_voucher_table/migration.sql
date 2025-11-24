-- CreateEnum
CREATE TYPE "VoucherType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT', 'FREE_SHIPPING');

-- CreateEnum
CREATE TYPE "VoucherStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'EXPIRED', 'DEPLETED');

-- CreateEnum
CREATE TYPE "VoucherScope" AS ENUM ('ALL', 'SHOP', 'CATEGORY', 'PRODUCT');

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "voucher_id" TEXT;

-- CreateTable
CREATE TABLE "vouchers" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "VoucherType" NOT NULL,
    "discount_value" DECIMAL(15,2) NOT NULL,
    "max_discount" DECIMAL(15,2),
    "min_order_value" DECIMAL(15,2),
    "scope" "VoucherScope" NOT NULL DEFAULT 'ALL',
    "shop_id" TEXT,
    "total_limit" INTEGER,
    "used_count" INTEGER NOT NULL DEFAULT 0,
    "limit_per_user" INTEGER,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "status" "VoucherStatus" NOT NULL DEFAULT 'ACTIVE',
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,

    CONSTRAINT "vouchers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vouchers_code_key" ON "vouchers"("code");

-- CreateIndex
CREATE INDEX "vouchers_code_idx" ON "vouchers"("code");

-- CreateIndex
CREATE INDEX "vouchers_shop_id_idx" ON "vouchers"("shop_id");

-- CreateIndex
CREATE INDEX "vouchers_status_idx" ON "vouchers"("status");

-- CreateIndex
CREATE INDEX "vouchers_scope_idx" ON "vouchers"("scope");

-- CreateIndex
CREATE INDEX "vouchers_start_date_idx" ON "vouchers"("start_date");

-- CreateIndex
CREATE INDEX "vouchers_end_date_idx" ON "vouchers"("end_date");

-- CreateIndex
CREATE INDEX "vouchers_created_at_idx" ON "vouchers"("created_at");

-- CreateIndex
CREATE INDEX "vouchers_deleted_at_idx" ON "vouchers"("deleted_at");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_voucher_id_fkey" FOREIGN KEY ("voucher_id") REFERENCES "vouchers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;
