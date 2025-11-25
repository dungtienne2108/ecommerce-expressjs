-- CreateTable
CREATE TABLE "voucher_usages" (
    "id" TEXT NOT NULL,
    "voucher_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "order_id" TEXT,
    "discount_amount" DECIMAL(15,2) NOT NULL,
    "used_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userRoleId" TEXT,

    CONSTRAINT "voucher_usages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "voucher_usages_voucher_id_idx" ON "voucher_usages"("voucher_id");

-- CreateIndex
CREATE INDEX "voucher_usages_user_id_idx" ON "voucher_usages"("user_id");

-- CreateIndex
CREATE INDEX "voucher_usages_order_id_idx" ON "voucher_usages"("order_id");

-- CreateIndex
CREATE INDEX "voucher_usages_used_at_idx" ON "voucher_usages"("used_at");

-- AddForeignKey
ALTER TABLE "voucher_usages" ADD CONSTRAINT "voucher_usages_voucher_id_fkey" FOREIGN KEY ("voucher_id") REFERENCES "vouchers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher_usages" ADD CONSTRAINT "voucher_usages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher_usages" ADD CONSTRAINT "voucher_usages_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher_usages" ADD CONSTRAINT "voucher_usages_userRoleId_fkey" FOREIGN KEY ("userRoleId") REFERENCES "user_roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
