import { OrderStatus, PaymentMethod, PaymentStatus, Prisma, ShippingMethod } from "@prisma/client";
import { PaginationParams } from './common';

export interface OrderSearchFilters extends PaginationParams{
  createdFrom?: Date;
  createdTo?: Date;
  status?: OrderStatus;
  paymentStatus?: string;
  minTotalAmount?: number;
  maxTotalAmount?: number;
  shopId?: string;
}

export type OrderIncludes = {
  user?: boolean;
  shop?: boolean;
  items?: boolean | {
    include?: {
      product?: boolean;
      productVariant?: boolean;
    };
  };
  statusHistory?: boolean;
};

export type OrderWithRelations = Prisma.OrderGetPayload<{
  include: {
    user: true;
    shop: true;
    items: {
      include: {
        product: true;
        productVariant: true;
      };
    };
    statusHistory: true;
  };
}>;

export type CreateOrderInput = {
  shippingMethod: ShippingMethod;
  shippingAddress: string;
  recipientName: string;
  recipientPhone: string;
  paymentMethod: PaymentMethod;
  customerNote?: string;
  shippingFee?: number;
  discount?: number;
  voucherCode?: string; // Mã voucher
};

export type UpdateOrderStatusInput = {
  status: OrderStatus;
  note?: string;
};

export type OrderItemResponse = {
  id: string;
  productId: string;
  variantId: string;
  productName: string;
  variantName?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  productImageUrl?: string;
};

export type OrderResponse = {
  id: string;
  orderNumber: string;
  userId: string;
  shopId: string;
  status: OrderStatus;
  paymentStatus: string;
  paymentMethod: PaymentMethod;
  shippingMethod: ShippingMethod;
  shippingAddress: string;
  recipientName: string;
  recipientPhone: string;
  subtotal: number;
  shippingFee: number;
  discount: number;
  totalAmount: number;
  currency: string;
  customerNote?: string | null;
  shopNote?: string | null;
  cancelReason?: string | null;
  items: OrderItemResponse[];
  createdAt: Date;
  updatedAt: Date;
  confirmedAt?: Date | null;
  shippedAt?: Date | null;
  deliveredAt?: Date | null;
  completedAt?: Date | null;
  cancelledAt?: Date | null;
};

export type OrderListResponse = {
  orders: {
    id: string;
    orderNumber: string;
    status: OrderStatus;
    paymentStatus: string;
    totalAmount: number;
    createdAt: Date;
  }[];
  total: number;
  skip: number;
  take: number;
};

export interface OrderFilters extends PaginationParams {
  status?: OrderStatus;
  paymentStatus?: string;
  minTotalAmount?: number;
  maxTotalAmount?: number;
  shopId?: string;
}
