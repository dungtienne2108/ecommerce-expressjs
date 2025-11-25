import { PrismaClient, ProductCategory } from '@prisma/client';
import { IUnitOfWork } from '../interfaces/uow.interface'; 
import { IUserRepository } from '../interfaces/user.interface'; 
import { UserRepository } from './user.repository'; 
import { IShopRepository } from '../interfaces/shop.interface';
import { ShopRepository } from './shop.repository';
import { IProductRepository, IProductVariantRepository } from '../interfaces/product.interface';
import { ICategoryRepository, IProductCategoryRepository } from '../interfaces/category.interface';
import { ProductRepository } from './product.repository';
import { CategoryRepository, ProductCategoryRepository } from './category.repository';
import { ProductVariantRepository } from './productVariant.repository';
import { IKycDataRepository } from '../interfaces/kyc.interface';
import { IKycDocumentRepository } from '../interfaces/kycDoc.interface';
import { KycDataRepository } from './kyc.repository';
import { KycDocumentRepository } from './kycDoc.repository';
import { IRoleRepository, IUserRoleRepository } from '../interfaces/role.interface';
import { IPermissionRepository, IRolePermissionRepository, IUserPermissionRepository } from '../interfaces/permission.interface';
import { RoleRepository, UserRoleRepository } from './role.repository';
import { PermissionRepository, RolePermissionRepository, UserPermissionRepository } from './permission.repository';
import { ICartItemRepository, ICartRepository } from '../interfaces/cart.interface';
import { CartItemRepository, CartRepository } from './cart.repository';
import { IOrderItemRepository, IOrderRepository, IOrderStatusHistoryRepository } from '../interfaces/order.interface';
import { OrderRepository } from './order.repository';
import { OrderItemRepository } from './orderItem.repository';
import { OrderStatusHistoryRepository } from './orderHistory.repository';
import { IPaymentRepository } from '../interfaces/payment.interface';
import { ICashbackRepository } from '../interfaces/cashback.interface';
import { CashbackRepository } from './cashback.repository';
import { PaymentRepository } from './payment.repository';
import { IMessageRepository } from '../interfaces/message.interface';
import { IConversationParticipantRepository } from '../interfaces/conversationParticipant.interface';
import { IConversationRepository } from '../interfaces/conversation.interface';
import { ConversationParticipantRepository } from './conversationParticipant.repository';
import { ConversationRepository } from './conversation.repository';
import { MessageRepository } from './message.repository';
import { IVoucherRepository } from '../interfaces/voucher.interface';
import { VoucherRepository } from './voucher.repository';
import { IVoucherUsageRepository } from '../interfaces/voucherUsage.interface';
import { VoucherUsageRepository } from './voucherUsage.repository';


export class UnitOfWork implements IUnitOfWork {
  private isInTransaction = false;
  private _users: IUserRepository;
  private _shops: IShopRepository;
  private _products: IProductRepository;
  private _categories: ICategoryRepository;
  private _productVariants: IProductVariantRepository;
  private _productCategories: IProductCategoryRepository;
  private _kycDatas: IKycDataRepository;
  private _kycDocuments: IKycDocumentRepository;
  private _roles: IRoleRepository;
  private _userRoles: IUserRoleRepository;
  private _rolePermissions: IRolePermissionRepository;
  private _userPermissions: IUserPermissionRepository;
  private _permissions: IPermissionRepository;
  private _cart: ICartRepository;
  private _cartItem: ICartItemRepository;
  private _orders: IOrderRepository;
  private _orderItems: IOrderItemRepository;
  private _orderStatusHistory: IOrderStatusHistoryRepository;
  private _payments: IPaymentRepository;
  private _cashbacks: ICashbackRepository;
  private _messages: IMessageRepository;
  private _conversations: IConversationRepository;
  private _conversationParticipants: IConversationParticipantRepository;
  private _vouchers: IVoucherRepository;
  private _voucherUsages: IVoucherUsageRepository;

  constructor(private prisma: PrismaClient) {
    this._users = new UserRepository(this.prisma);
    this._shops = new ShopRepository(this.prisma);
    this._products = new ProductRepository(this.prisma);
    this._categories = new CategoryRepository(this.prisma);
    this._productVariants = new ProductVariantRepository(this.prisma);
    this._productCategories = new ProductCategoryRepository(this.prisma);
    this._kycDatas = new KycDataRepository(this.prisma);
    this._kycDocuments = new KycDocumentRepository(this.prisma);
    this._roles = new RoleRepository(this.prisma);
    this._permissions = new PermissionRepository(this.prisma);
    this._userRoles = new UserRoleRepository(this.prisma);
    this._rolePermissions = new RolePermissionRepository(this.prisma);
    this._userPermissions = new UserPermissionRepository(this.prisma);
    this._cart = new CartRepository(this.prisma);
    this._cartItem = new CartItemRepository(this.prisma);
    this._orders = new OrderRepository(this.prisma);
    this._orderItems = new OrderItemRepository(this.prisma);
    this._orderStatusHistory = new OrderStatusHistoryRepository(this.prisma);
    this._payments = new PaymentRepository(this.prisma);
    this._cashbacks = new CashbackRepository(this.prisma);
    this._messages = new MessageRepository(this.prisma);
    this._conversations = new ConversationRepository(this.prisma);
    this._conversationParticipants = new ConversationParticipantRepository(this.prisma);
    this._vouchers = new VoucherRepository(this.prisma);
    this._voucherUsages = new VoucherUsageRepository(this.prisma);
  }

  get users(): IUserRepository {
    return this._users;
  }

  get shops(): IShopRepository {
    return this._shops;
  }

  get products(): IProductRepository {
    return this._products;
  }

  get categories(): ICategoryRepository {
    return this._categories;
  }

  get productVariants(): IProductVariantRepository {
    return this._productVariants;
  }

  get productCategories(): IProductCategoryRepository {
    return this._productCategories;
  }

  get kycDatas(): IKycDataRepository {
    return this._kycDatas;
  }

  get kycDocuments(): IKycDocumentRepository {
    return this._kycDocuments;
  }

  get rolePermissions(): IRolePermissionRepository {
    return this._rolePermissions;
  }

  get userPermissions(): IUserPermissionRepository {
    return this._userPermissions;
  }

  get userRoles(): IUserRoleRepository {
    return this._userRoles;
  }

  get roles(): IRoleRepository {
    return this._roles;
  }

  get permissions(): IPermissionRepository{
    return this._permissions;
  }

  get cart(): ICartRepository {
    return this._cart;
  }

  get cartItem(): ICartItemRepository {
    return this._cartItem;
  }

  get orders(): IOrderRepository {
    return this._orders;
  }

  get orderItems(): IOrderItemRepository {
    return this._orderItems;
  }

  get orderStatusHistory(): IOrderStatusHistoryRepository {
    return this._orderStatusHistory;
  }

  get payments(): IPaymentRepository {
    return this._payments;
  }

  get cashbacks(): ICashbackRepository {
    return this._cashbacks;
  }

  get messages(): IMessageRepository {
    return this._messages;
  }

  get conversations(): IConversationRepository {
    return this._conversations;
  }

  get conversationParticipants(): IConversationParticipantRepository {
    return this._conversationParticipants;
  }

  get vouchers(): IVoucherRepository {
    return this._vouchers;
  }

  get voucherUsages(): IVoucherUsageRepository {
    return this._voucherUsages;
  }

  async executeInTransaction<T>(operation: (uow: IUnitOfWork) => Promise<T>): Promise<T> {
    if(this.isInTransaction){
      return await operation(this);
    }
    return await this.prisma.$transaction(async (tx) => {
      const transactionalUow = new UnitOfWork(tx as PrismaClient);
      transactionalUow.isInTransaction = true;
      return await operation(transactionalUow);
    }, {timeout: 50000});
  }
}