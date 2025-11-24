import { ICartItemRepository, ICartRepository } from "./cart.interface";
import { ICashbackRepository } from "./cashback.interface";
import { ICategoryRepository, IProductCategoryRepository } from "./category.interface";
import { IConversationRepository } from "./conversation.interface";
import { IConversationParticipantRepository } from "./conversationParticipant.interface";
import { IKycDataRepository } from "./kyc.interface";
import { IKycDocumentRepository } from "./kycDoc.interface";
import { IMessageRepository } from "./message.interface";
import { IOrderItemRepository, IOrderRepository, IOrderStatusHistoryRepository } from "./order.interface";
import { IPaymentRepository } from "./payment.interface";
import { IRolePermissionRepository, IUserPermissionRepository } from "./permission.interface";
import { IProductRepository, IProductVariantRepository } from "./product.interface";
import { IRoleRepository, IUserRoleRepository } from "./role.interface";
import { IShopRepository } from "./shop.interface";
import { IUserRepository } from "./user.interface";
import { IVoucherRepository } from "./voucher.interface";

export interface IUnitOfWork {
  users: IUserRepository;
  shops: IShopRepository;
  products: IProductRepository;
  productVariants: IProductVariantRepository;
  categories: ICategoryRepository;
  productCategories: IProductCategoryRepository;
  kycDatas: IKycDataRepository;
  kycDocuments: IKycDocumentRepository;
  roles: IRoleRepository;
  userRoles: IUserRoleRepository;
  userPermissions: IUserPermissionRepository;
  rolePermissions: IRolePermissionRepository;
  cart: ICartRepository;
  cartItem: ICartItemRepository;
  orders: IOrderRepository;
  orderItems: IOrderItemRepository;
  orderStatusHistory: IOrderStatusHistoryRepository;
  payments: IPaymentRepository;
  cashbacks: ICashbackRepository;
  messages: IMessageRepository;
  conversations: IConversationRepository;
  conversationParticipants: IConversationParticipantRepository;
  vouchers: IVoucherRepository;

  executeInTransaction<T>(operation: (uow: IUnitOfWork) => Promise<T>): Promise<T>; // saveChanges
}