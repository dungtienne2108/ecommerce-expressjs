import { Permission, PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config'

const connectionString = `${process.env.DATABASE_URL}`;

const adapter = new PrismaPg({connectionString});

const prisma = new PrismaClient({
  adapter: adapter,
});

async function main() {
  console.log('🧹 Clearing existing data...')
  
  // Xóa data theo thứ tự dependency (con trước, cha sau)
  await prisma.userActivity.deleteMany()
  await prisma.userPermission.deleteMany()
  await prisma.userRole.deleteMany()
  await prisma.rolePermission.deleteMany()
  
  await prisma.kycHistory.deleteMany()
  await prisma.kycDocument.deleteMany()
  await prisma.kycData.deleteMany()
  await prisma.kycSettings.deleteMany()
  
  await prisma.productVariantOptionValue.deleteMany()
  await prisma.productOptionValue.deleteMany()
  await prisma.productOption.deleteMany()
  await prisma.productImage.deleteMany()
  await prisma.productVariant.deleteMany()
  await prisma.productCategory.deleteMany()
  await prisma.product.deleteMany()
  
  await prisma.category.deleteMany()
  await prisma.shop.deleteMany()
  await prisma.user.deleteMany()
  await prisma.permission.deleteMany()
  await prisma.role.deleteMany()

  console.log('✅ All data cleared successfully')

  console.log('🌱 Starting to seed data...')

  // 1. Tạo Roles
  console.log('Creating roles...')
  const systemAdminRole = await prisma.role.create({
    data: {
      name: 'System Administrator',
      type: 'SYSTEM_ADMIN',
      description: 'Full quyền',
      createdBy: 'system'
    }
  })

  const sellerRole = await prisma.role.create({
    data: {
      name: 'Seller',
      type: 'SELLER',
      description: 'Chủ shop',
      createdBy: 'system'
    }
  })

  const customerRole = await prisma.role.create({
    data: {
      name: 'Customer',
      type: 'CUSTOMER',
      description: 'Khách hàng thông thường',
      createdBy: 'system'
    }
  })

  const kycReviewerRole = await prisma.role.create({
    data: {
      name: 'KYC Reviewer',
      type: 'KYC_REVIEWER',
      description: 'Người xác minh KYC',
      createdBy: 'system'
    }
  })

  // 2. Tạo Permissions
  console.log('Creating permissions...')
  const permissions: Permission[] = []

  // User Management Permissions
  for (const action of ['CREATE', 'READ', 'UPDATE', 'DELETE']) {
    const permission = await prisma.permission.create({
      data: {
        module: 'USER_MANAGEMENT',
        action: action as any,
        description: `${action} users`,
        createdBy: 'system'
      }
    }) 
    permissions.push(permission)
  }

  // Shop Management Permissions
  for (const action of ['CREATE', 'READ', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT']) {
    const permission = await prisma.permission.create({
      data: {
        module: 'SHOP_MANAGEMENT',
        action: action as any,
        description: `${action} shops`,
        createdBy: 'system'
      }
    })
    permissions.push(permission)
  }

  // Product Management Permissions
  for (const action of ['CREATE', 'READ', 'UPDATE', 'DELETE']) {
    const permission = await prisma.permission.create({
      data: {
        module: 'PRODUCT_MANAGEMENT',
        action: action as any,
        description: `${action} products`,
        createdBy: 'system'
      }
    })
    permissions.push(permission)
  }

  //cart management
  for (const action of ['CREATE', 'READ', 'UPDATE', 'DELETE']) {
    const permission = await prisma.permission.create({
      data: {
        module: 'CART_MANAGEMENT',
        action: action as any,
        description: `${action} cart`,
        createdBy: 'system'
      }
    })
    permissions.push(permission)
  }

  // order management
  for (const action of ['CREATE', 'READ', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT']) {
    const permission = await prisma.permission.create({
      data: {
        module: 'ORDER_MANAGEMENT',
        action: action as any,
        description: `${action} orders`,
        createdBy: 'system'
      }
    })
    permissions.push(permission)
  }

  // KYC Management Permissions
  for (const action of ['READ', 'APPROVE', 'REJECT']) {
    const permission = await prisma.permission.create({
      data: {
        module: 'KYC_MANAGEMENT',
        action: action as any,
        description: `${action} KYC documents`,
        createdBy: 'system'
      }
    })
    permissions.push(permission)
  }

  // 3. Gán quyền cho Role
  console.log('Assigning permissions to roles...')
  
  // System Admin có tất cả quyền
  for (const permission of permissions) {
    await prisma.rolePermission.create({
      data: {
        roleId: systemAdminRole.id,
        permissionId: permission.id,
        createdBy: 'system'
      }
    })
  }

  // Seller có quyền quản lý shop và sản phẩm
  const sellerPermissions = permissions.filter(p => 
    p.module === 'SHOP_MANAGEMENT' || 
    p.module === 'PRODUCT_MANAGEMENT'
  )
  for (const permission of sellerPermissions) {
    await prisma.rolePermission.create({
      data: {
        roleId: sellerRole.id,
        permissionId: permission.id,
        createdBy: 'system'
      }
    })
  }

  // KYC Reviewer có quyền xem và duyệt KYC
  const kycPermissions = permissions.filter(p => p.module === 'KYC_MANAGEMENT')
  for (const permission of kycPermissions) {
    await prisma.rolePermission.create({
      data: {
        roleId: kycReviewerRole.id,
        permissionId: permission.id,
        createdBy: 'system'
      }
    })
  }

  //CUSTOMER 
  const customerPermissions = permissions.filter(p => 
  (p.module === 'USER_MANAGEMENT' && ['READ', 'UPDATE'].includes(p.action)) ||
    (p.module === 'PRODUCT_MANAGEMENT' && p.action === 'READ') ||
    (p.module === 'ORDER_MANAGEMENT' && ['CREATE', 'READ', 'UPDATE'].includes(p.action)) ||
    (p.module === 'CATEGORY_MANAGEMENT' && p.action === 'READ')
  )
  for (const permission of customerPermissions) {
    await prisma.rolePermission.create({
      data: {
        roleId: customerRole.id,
        permissionId: permission.id,
        createdBy: 'system'
      }
    })
  }

  // 4. Tạo Users
  console.log('Creating users...')
  const hashedPassword = await bcrypt.hash('Ecommerce@123', 12)

  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      password: hashedPassword,
      firstName: 'System',
      lastName: 'Admin',
      phoneNumber: '+84901234567',
      status: 'ACTIVE',
      emailVerified: true,
      emailVerifiedAt: new Date(),
      createdBy: 'system'
    }
  })

  const kycReviewerUser = await prisma.user.create({
    data: {
      email: 'kyc.reviewer@example.com',
      password: hashedPassword,
      firstName: 'KYC',
      lastName: 'Reviewer',
      phoneNumber: '+84901234568',
      status: 'ACTIVE',
      emailVerified: true,
      emailVerifiedAt: new Date(),
      createdBy: 'system'
    }
  })

  const sellerUser1 = await prisma.user.create({
    data: {
      email: 'seller1@example.com',
      password: hashedPassword,
      firstName: 'Nguyễn',
      lastName: 'Văn A',
      phoneNumber: '+84901234569',
      address: '123 Phố Huế, Quận Hai Bà Trưng, Hà Nội',
      birthday: new Date('1990-01-15'),
      gender: 'MALE',
      status: 'ACTIVE',
      emailVerified: true,
      emailVerifiedAt: new Date(),
      createdBy: 'system'
    }
  })

  const sellerUser2 = await prisma.user.create({
    data: {
      email: 'seller2@example.com',
      password: hashedPassword,
      firstName: 'Trần',
      lastName: 'Thị B',
      phoneNumber: '+84901234570',
      address: '456 Nguyễn Trãi, Quận Thanh Xuân, Hà Nội',
      birthday: new Date('1985-03-20'),
      gender: 'FEMALE',
      status: 'ACTIVE',
      emailVerified: true,
      emailVerifiedAt: new Date(),
      createdBy: 'system'
    }
  })

  const customerUser = await prisma.user.create({
    data: {
      email: 'customer@example.com',
      password: hashedPassword,
      firstName: 'Lê',
      lastName: 'Văn C',
      phoneNumber: '+84901234571',
      address: '789 Láng Hạ, Quận Đống Đa, Hà Nội',
      birthday: new Date('1995-07-10'),
      gender: 'MALE',
      status: 'ACTIVE',
      emailVerified: true,
      emailVerifiedAt: new Date(),
      createdBy: 'system'
    }
  })

  // 5. Gán roles cho users
  console.log('Assigning roles to users...')
  await prisma.userRole.create({
    data: {
      userId: adminUser.id,
      roleId: systemAdminRole.id,
      createdBy: 'system'
    }
  })

  await prisma.userRole.create({
    data: {
      userId: kycReviewerUser.id,
      roleId: kycReviewerRole.id,
      createdBy: 'system'
    }
  })

  await prisma.userRole.create({
    data: {
      userId: sellerUser1.id,
      roleId: sellerRole.id,
      createdBy: 'system'
    }
  })

  await prisma.userRole.create({
    data: {
      userId: sellerUser2.id,
      roleId: sellerRole.id,
      createdBy: 'system'
    }
  })

  await prisma.userRole.create({
    data: {
      userId: customerUser.id,
      roleId: customerRole.id,
      createdBy: 'system'
    }
  })

  // 6. Tạo Categories
  console.log('Creating categories...')
  const electronicsCategory = await prisma.category.create({
    data: {
      name: 'Điện tử',
      description: 'Các sản phẩm điện tử',
      createdBy: 'system'
    }
  })

  const fashionCategory = await prisma.category.create({
    data: {
      name: 'Thời trang',
      description: 'Quần áo, giày dép, phụ kiện',
      createdBy: 'system'
    }
  })

  const homeCategory = await prisma.category.create({
    data: {
      name: 'Nhà cửa & Đời sống',
      description: 'Đồ gia dụng, nội thất',
      createdBy: 'system'
    }
  })

  // Tạo subcategories
  const phonesCategory = await prisma.category.create({
    data: {
      name: 'Điện thoại & Phụ kiện',
      description: 'Điện thoại, ốp lưng, cáp sạc',
      parentCategoryId: electronicsCategory.id,
      createdBy: 'system'
    }
  })

  const menFashionCategory = await prisma.category.create({
    data: {
      name: 'Thời trang Nam',
      description: 'Quần áo nam',
      parentCategoryId: fashionCategory.id,
      createdBy: 'system'
    }
  })

  // 7. Tạo KYC Settings
  console.log('Creating KYC settings...')
  await prisma.kycSettings.create({
    data: {
      requiredDocuments: ['IDENTITY_CARD'],
      kycExpiryDays: 365,
      autoApprovalEnabled: false,
      maxFileSize: 10485760, // 10MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf']
    }
  })

  // 8. Tạo Shops
  console.log('Creating shops...')
  const shop1 = await prisma.shop.create({
    data: {
      ownerId: sellerUser1.id,
      name: 'Tech Store VN',
      status: 'ACTIVE',
      approvalStatus: 'APPROVED',
      approvedBy: adminUser.id,
      approvedAt: new Date(),
      email: 'contact@techstore.vn',
      phoneNumber: '+84901111111',
      street: '123 Phố Huế',
      ward: 'Phường Phố Huế',
      district: 'Quận Hai Bà Trưng',
      city: 'Hà Nội',
      category: 'Công nghệ',
      isVerified: true,
      verifiedAt: new Date(),
      bankName: 'Vietcombank',
      bankAccount: 'Tech Store Vietnam',
      bankAccountNumber: '1234567890',
      totalRevenue: 50000000,
      totalOrders: 150,
      rating: 4.5,
      reviewCount: 45,
      createdBy: sellerUser1.id
    }
  })

  const shop2 = await prisma.shop.create({
    data: {
      ownerId: sellerUser2.id,
      name: 'Fashion Hub',
      status: 'ACTIVE',
      approvalStatus: 'APPROVED',
      approvedBy: adminUser.id,
      approvedAt: new Date(),
      email: 'info@fashionhub.vn',
      phoneNumber: '+84902222222',
      street: '456 Nguyễn Trãi',
      ward: 'Phường Thanh Xuân Trung',
      district: 'Quận Thanh Xuân',
      city: 'Hà Nội',
      category: 'Thời trang',
      isVerified: false,
      bankName: 'Techcombank',
      bankAccount: 'Fashion Hub Store',
      bankAccountNumber: '0987654321',
      totalRevenue: 25000000,
      totalOrders: 80,
      rating: 4.2,
      reviewCount: 32,
      createdBy: sellerUser2.id
    }
  })

  // 9. Tạo KYC Data cho shops
  console.log('Creating KYC data...')
  const kycData1 = await prisma.kycData.create({
    data: {
      status: 'APPROVED',
      submittedAt: new Date(),
      reviewedAt: new Date(),
      approvedAt: new Date(),
      reviewerUserId: kycReviewerUser.id,
      fullName: 'Nguyễn Văn A',
      birthday: new Date('1990-01-15'),
      personalAddress: '123 Phố Huế, Quận Hai Bà Trưng, Hà Nội',
      personalPhone: '+84901234569',
      personalEmail: 'seller1@example.com',
      identityCard: '001090012345',
      shopName: 'Tech Store VN',
      taxCode: '0123456789',
      shopAddress: '123 Phố Huế, Quận Hai Bà Trưng, Hà Nội',
      shopPhone: '+84901111111',
      shopEmail: 'contact@techstore.vn',
      shopRegDate: new Date('2023-01-01'),
      userId: sellerUser1.id,
      shopId: shop1.id
    }
  })

  const kycData2 = await prisma.kycData.create({
    data: {
      status: 'PENDING',
      submittedAt: new Date(),
      fullName: 'Trần Thị B',
      birthday: new Date('1985-03-20'),
      personalAddress: '456 Nguyễn Trãi, Quận Thanh Xuân, Hà Nội',
      personalPhone: '+84901234570',
      personalEmail: 'seller2@example.com',
      identityCard: '001085098765',
      shopName: 'Fashion Hub',
      taxCode: '0987654321',
      shopAddress: '456 Nguyễn Trãi, Quận Thanh Xuân, Hà Nội',
      shopPhone: '+84902222222',
      shopEmail: 'info@fashionhub.vn',
      shopRegDate: new Date('2023-06-01'),
      userId: sellerUser2.id,
      shopId: shop2.id
    }
  })

  // Update shops với currentKycId
  await prisma.shop.update({
    where: { id: shop1.id },
    data: { currentKycId: kycData1.id }
  })

  await prisma.shop.update({
    where: { id: shop2.id },
    data: { currentKycId: kycData2.id }
  })

  // 10. Tạo Products
  console.log('Creating products...')
  const product1 = await prisma.product.create({
    data: {
      shopId: shop1.id,
      name: 'iPhone 15 Pro',
      status: 'PUBLISHED',
      averageRating: 4.8,
      reviewCount: 25,
      createdBy: sellerUser1.id
    }
  })

  const product2 = await prisma.product.create({
    data: {
      shopId: shop2.id,
      name: 'Áo Thun Nam Basic',
      status: 'PUBLISHED',
      averageRating: 4.3,
      reviewCount: 18,
      createdBy: sellerUser2.id
    }
  })

  // 11. Tạo Product Categories
  console.log('Creating product categories...')
  await prisma.productCategory.create({
    data: {
      productId: product1.id,
      categoryId: phonesCategory.id,
      createdBy: sellerUser1.id
    }
  })

  await prisma.productCategory.create({
    data: {
      productId: product2.id,
      categoryId: menFashionCategory.id,
      createdBy: sellerUser2.id
    }
  })

  // 12. Tạo Product Options và Values
  console.log('Creating product options...')
  const colorOption = await prisma.productOption.create({
    data: {
      productId: product1.id,
      name: 'Màu sắc',
      createdBy: sellerUser1.id
    }
  })

  const storageOption = await prisma.productOption.create({
    data: {
      productId: product1.id,
      name: 'Dung lượng',
      createdBy: sellerUser1.id
    }
  })

  const sizeOption = await prisma.productOption.create({
    data: {
      productId: product2.id,
      name: 'Kích thước',
      createdBy: sellerUser2.id
    }
  })

  // Option Values
  const colorValues = await Promise.all([
    prisma.productOptionValue.create({
      data: { productOptionId: colorOption.id, value: 'Đen', sortOrder: 1, createdBy: sellerUser1.id }
    }),
    prisma.productOptionValue.create({
      data: { productOptionId: colorOption.id, value: 'Trắng', sortOrder: 2, createdBy: sellerUser1.id }
    }),
    prisma.productOptionValue.create({
      data: { productOptionId: colorOption.id, value: 'Xanh', sortOrder: 3, createdBy: sellerUser1.id }
    })
  ])

  const storageValues = await Promise.all([
    prisma.productOptionValue.create({
      data: { productOptionId: storageOption.id, value: '128GB', sortOrder: 1, createdBy: sellerUser1.id }
    }),
    prisma.productOptionValue.create({
      data: { productOptionId: storageOption.id, value: '256GB', sortOrder: 2, createdBy: sellerUser1.id }
    })
  ])

  const sizeValues = await Promise.all([
    prisma.productOptionValue.create({
      data: { productOptionId: sizeOption.id, value: 'S', sortOrder: 1, createdBy: sellerUser2.id }
    }),
    prisma.productOptionValue.create({
      data: { productOptionId: sizeOption.id, value: 'M', sortOrder: 2, createdBy: sellerUser2.id }
    }),
    prisma.productOptionValue.create({
      data: { productOptionId: sizeOption.id, value: 'L', sortOrder: 3, createdBy: sellerUser2.id }
    })
  ])

  // 13. Tạo Product Variants
  console.log('Creating product variants...')
  const variant1 = await prisma.productVariant.create({
    data: {
      productId: product1.id,
      sku: 'IPHONE15PRO-BLACK-128GB',
      name: 'iPhone 15 Pro Đen 128GB',
      value: 'Đen - 128GB',
      price: 28900000,
      status: 'PUBLISHED',
      stock: 50,
      description: 'iPhone 15 Pro màu đen, dung lượng 128GB',
      createdBy: sellerUser1.id
    }
  })

  const variant2 = await prisma.productVariant.create({
    data: {
      productId: product1.id,
      sku: 'IPHONE15PRO-WHITE-256GB',
      name: 'iPhone 15 Pro Trắng 256GB',
      value: 'Trắng - 256GB',
      price: 32900000,
      status: 'PUBLISHED',
      stock: 30,
      description: 'iPhone 15 Pro màu trắng, dung lượng 256GB',
      createdBy: sellerUser1.id
    }
  })

  const variant3 = await prisma.productVariant.create({
    data: {
      productId: product2.id,
      sku: 'BASIC-TSHIRT-WHITE-M',
      name: 'Áo Thun Basic Trắng Size M',
      value: 'Trắng - M',
      price: 199000,
      status: 'PUBLISHED',
      stock: 100,
      description: 'Áo thun basic màu trắng size M',
      createdBy: sellerUser2.id
    }
  })

  // 14. Tạo Product Variant Option Values (liên kết variants với options)
  console.log('Creating product variant option values...')
  // iPhone 15 Pro Đen 128GB
  await prisma.productVariantOptionValue.create({
    data: {
      productVariantId: variant1.id,
      productOptionId: colorOption.id,
      productOptionValueId: colorValues[0].id, // Đen
      createdBy: sellerUser1.id
    }
  })
  await prisma.productVariantOptionValue.create({
    data: {
      productVariantId: variant1.id,
      productOptionId: storageOption.id,
      productOptionValueId: storageValues[0].id, // 128GB
      createdBy: sellerUser1.id
    }
  })

  // iPhone 15 Pro Trắng 256GB
  await prisma.productVariantOptionValue.create({
    data: {
      productVariantId: variant2.id,
      productOptionId: colorOption.id,
      productOptionValueId: colorValues[1].id, // Trắng
      createdBy: sellerUser1.id
    }
  })
  await prisma.productVariantOptionValue.create({
    data: {
      productVariantId: variant2.id,
      productOptionId: storageOption.id,
      productOptionValueId: storageValues[1].id, // 256GB
      createdBy: sellerUser1.id
    }
  })

  // Áo thun size M
  await prisma.productVariantOptionValue.create({
    data: {
      productVariantId: variant3.id,
      productOptionId: sizeOption.id,
      productOptionValueId: sizeValues[1].id, // M
      createdBy: sellerUser2.id
    }
  })

  // 15. Tạo Product Images
  console.log('Creating product images...')
  await prisma.productImage.create({
    data: {
      productId: product1.id,
      imageUrl: 'https://example.com/images/iphone15pro-main.jpg',
      isPrimary: true,
      sortOrder: 1,
      description: 'iPhone 15 Pro - Ảnh chính',
      createdBy: sellerUser1.id
    }
  })

  await prisma.productImage.create({
    data: {
      productId: product1.id,
      variantId: variant1.id,
      imageUrl: 'https://example.com/images/iphone15pro-black.jpg',
      isPrimary: false,
      sortOrder: 2,
      description: 'iPhone 15 Pro màu đen',
      createdBy: sellerUser1.id
    }
  })

  await prisma.productImage.create({
    data: {
      productId: product2.id,
      imageUrl: 'https://example.com/images/basic-tshirt-main.jpg',
      isPrimary: true,
      sortOrder: 1,
      description: 'Áo thun basic - Ảnh chính',
      createdBy: sellerUser2.id
    }
  })

  console.log('✅ Database seeding completed successfully!')
  
  console.log('\n📊 Summary:')
  console.log(`- Users: ${await prisma.user.count()}`)
  console.log(`- Roles: ${await prisma.role.count()}`)
  console.log(`- Permissions: ${await prisma.permission.count()}`)
  console.log(`- Shops: ${await prisma.shop.count()}`)
  console.log(`- Categories: ${await prisma.category.count()}`)
  console.log(`- Products: ${await prisma.product.count()}`)
  console.log(`- Product Variants: ${await prisma.productVariant.count()}`)
  console.log(`- KYC Data: ${await prisma.kycData.count()}`)

  console.log('\n🔐 Default accounts:')
  console.log('Admin: admin@example.com / Ecommerce@123')
  console.log('KYC Reviewer: kyc.reviewer@example.com / Ecommerce@123')
  console.log('Seller 1: seller1@example.com / Ecommerce@123')
  console.log('Seller 2: seller2@example.com / Ecommerce@123')
  console.log('Customer: customer@example.com / Ecommerce@123')
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })