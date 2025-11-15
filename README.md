# E-Commerce Backend - ExpressJS + TypeScript

Hệ thống backend cho ứng dụng thương mại điện tử được xây dựng với ExpressJS, TypeScript, PostgreSQL và tích hợp blockchain để quản lý cashback.

## Công nghệ sử dụng

- **Framework**: ExpressJS 5.x
- **Ngôn ngữ**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Cache**: Redis
- **File Upload**: Cloudinary
- **Authentication**: JWT (JsonWebToken)
- **Validation**: Class Validator, Joi
- **Security**: Helmet, CORS, Rate Limiting
- **Blockchain**: Ethers.js (BSC, Ethereum, Polygon)

## Tính năng chính

- **Quản lý người dùng**: Đăng ký, đăng nhập, phân quyền (RBAC)
- **Quản lý shop**: KYC verification, approval workflow
- **Quản lý sản phẩm**: Products với variants và options
- **Quản lý danh mục**: Category hierarchy
- **Giỏ hàng**: Cart management cho cả user và guest
- **Đơn hàng**: Order processing với status tracking
- **Thanh toán**: Multiple payment methods
- **Cashback**: Blockchain-based cashback system
- **Activity Logging**: User activity tracking

## Cấu trúc thư mục

```
ecommerce-expressjs/
├── prisma/
│   ├── migrations/          # Database migrations
│   ├── schema.prisma        # Prisma schema definition
│   ├── seed.ts             # Database seeding script
│   └── seed_products.ts    # Product seeding script
│
├── src/
│   ├── config/             # Cấu hình ứng dụng
│   │   ├── database.ts     # PostgreSQL configuration
│   │   ├── redis.ts        # Redis configuration
│   │   ├── cloudinary.ts   # Cloudinary configuration
│   │   ├── prisma.ts       # Prisma client instance
│   │   └── container.ts    # Dependency injection container
│   │
│   ├── constants/          # Các hằng số của ứng dụng
│   │
│   ├── controllers/        # Xử lý HTTP requests
│   │   # Nhận request từ routes, gọi services, trả về response
│   │
│   ├── services/           # Business logic
│   │   # Chứa logic nghiệp vụ, orchestrate các repositories
│   │
│   ├── repositories/       # Làm việc với database qua Prisma Client
│   │   # Data access layer, truy vấn trực tiếp database
│   │
│   ├── routes/             # Định nghĩa API routes
│   │   # Map HTTP methods và paths tới controllers
│   │
│   ├── middleware/         # Express middleware
│   │   # Authentication, authorization, validation, error handling
│   │
│   ├── validators/         # Request validation schemas
│   │   # Validate request body, params, query
│   │
│   ├── types/              # TypeScript type definitions
│   │   # Interfaces, types, enums cho TypeScript
│   │
│   ├── utils/              # Utility functions
│   │   # Helper functions, common utilities
│   │
│   ├── errors/             # Custom error classes
│   │   # Error handling và custom exceptions
│   │
│   ├── index.ts            # Entry point
│   └── server.ts           # Server setup
│
├── tests/                  # Test cases
│   ├── repositories/       # Repository tests
│   └── integration/        # Integration tests
│
├── scripts/                # Utility scripts
│   ├── generate-ssl.js     # Generate SSL certificates
│   └── check-ssl.js        # Check SSL certificates
│
├── contracts/              # Smart contract ABIs (nếu có)
│
└── ssl/                    # SSL certificates (cho HTTPS)
```

## Yêu cầu hệ thống

- Node.js >= 18.x
- PostgreSQL >= 14.x
- Redis >= 6.x (optional, cho caching)
- npm hoặc yarn

## Cài đặt

### 1. Clone repository

```bash
git clone <repository-url>
cd ecommerce-expressjs
```

### 2. Cài đặt dependencies

```bash
npm install
```

### 3. Cấu hình môi trường

Tạo file `.env` trong thư mục gốc dự án với nội dung sau:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DATABASE_URL="postgresql://postgres:password@localhost:5432/ecommerce?schema=public"
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ecommerce
DB_USER=postgres
DB_PASSWORD=your_password
DB_MAX_CONNECTIONS=10
DB_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=5000

# Redis Configuration (Optional)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=7d

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# HTTPS Configuration (Optional)
ENABLE_HTTPS=false

# Blockchain Configuration (Optional)
BLOCKCHAIN_NETWORK=BSC_TESTNET
BLOCKCHAIN_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545/
BLOCKCHAIN_PRIVATE_KEY=your_private_key_here
```

### 4. Tạo database

Chạy lần lượt các lệnh sau để tạo database và seed dữ liệu:

```bash
# Tạo migration và apply vào database
npm run db:migrate

# Generate Prisma Client
npm run db:generate

# Seed dữ liệu mẫu
npm run db:seed
```

## Chạy ứng dụng

### Development mode

```bash
npm run dev
```

Server sẽ chạy tại: `http://localhost:3000`

### Production mode

```bash
# Build TypeScript
npm run build

# Start server
npm start
```

## Tài khoản mặc định

Sau khi chạy `npm run db:seed`, bạn có thể đăng nhập với các tài khoản sau:

| Role | Email | Password |
|------|-------|----------|
| System Admin | admin@example.com | Ecommerce@123 |
| KYC Reviewer | kyc.reviewer@example.com | Ecommerce@123 |
| Seller 1 | seller1@example.com | Ecommerce@123 |
| Seller 2 | seller2@example.com | Ecommerce@123 |
| Customer | customer@example.com | Ecommerce@123 |

## Scripts có sẵn

```bash
# Development
npm run dev              # Chạy server ở chế độ development với nodemon
npm run dev:http         # Chạy server với HTTP (không HTTPS)
npm run debug            # Chạy server với debugger

# Build
npm run build            # Build TypeScript sang JavaScript
npm run clean            # Xóa thư mục dist

# Database
npm run db:generate      # Generate Prisma Client
npm run db:push          # Push schema changes to database
npm run db:migrate       # Tạo và apply migrations
npm run db:migrate:prod  # Apply migrations cho production
npm run db:studio        # Mở Prisma Studio
npm run db:reset         # Reset database
npm run db:seed          # Seed dữ liệu mẫu
npm run db:seedProducts  # Seed dữ liệu sản phẩm

# Testing
npm test                 # Chạy tất cả tests
npm run test:watch       # Chạy tests ở watch mode
npm run test:cov         # Chạy tests với coverage report
npm run test:integration # Chạy integration tests
npm run test:unit        # Chạy unit tests

# Code Quality
npm run lint             # Chạy ESLint
npm run lint:fix         # Tự động fix linting errors
npm run format           # Format code với Prettier

# SSL (Optional)
npm run generate-ssl     # Generate SSL certificates
npm run check-ssl        # Kiểm tra SSL certificates
```

## Architecture

### Layered Architecture

Dự án sử dụng kiến trúc phân lớp (Layered Architecture):

1. **Routes Layer**: Định nghĩa API endpoints
2. **Controller Layer**: Xử lý HTTP requests/responses
3. **Service Layer**: Business logic
4. **Repository Layer**: Data access qua Prisma
5. **Database Layer**: PostgreSQL

### Flow của một request

```
Request → Routes → Middleware → Controller → Service → Repository → Database
                                    ↓
                                Response
```

### Ví dụ:

```typescript
// 1. Route (routes/product.routes.ts)
router.post('/products', authMiddleware, productController.create);

// 2. Controller (controllers/product.controller.ts)
async create(req, res) {
  const result = await productService.createProduct(req.body);
  res.json(result);
}

// 3. Service (services/product.service.ts)
async createProduct(data) {
  // Business logic
  return await productRepository.create(data);
}

// 4. Repository (repositories/product.repository.ts)
async create(data) {
  return await prisma.product.create({ data });
}
```

## Database Schema

Dự án sử dụng Prisma ORM với PostgreSQL. Các bảng chính:

- **users**: Người dùng
- **roles**: Vai trò (Admin, Seller, Customer, KYC Reviewer)
- **permissions**: Quyền hạn
- **shops**: Cửa hàng
- **kyc_data**: Dữ liệu KYC verification
- **products**: Sản phẩm
- **product_variants**: Biến thể sản phẩm
- **categories**: Danh mục (hỗ trợ hierarchy)
- **carts**: Giỏ hàng
- **orders**: Đơn hàng
- **payments**: Thanh toán
- **cashbacks**: Hoàn tiền blockchain

Chi tiết schema xem tại: `prisma/schema.prisma`

## API Documentation

API documentation có thể được tạo bằng Swagger/OpenAPI (chưa implement).

### Base URL
```
http://localhost:3000/api/v1
```

### Authentication

Hầu hết các endpoints yêu cầu JWT token trong header:

```
Authorization: Bearer <your_jwt_token>
```

## Security Features

- **Helmet**: Bảo vệ khỏi các lỗ hổng web phổ biến
- **CORS**: Cấu hình Cross-Origin Resource Sharing
- **Rate Limiting**: Giới hạn số request để chống DDoS
- **Password Hashing**: Sử dụng bcrypt với salt rounds = 12
- **JWT**: Token-based authentication
- **Input Validation**: Class-validator và Joi
- **SQL Injection Protection**: Prisma ORM
- **HTTPS Support**: Optional SSL/TLS

## Error Handling

Dự án sử dụng centralized error handling với custom error classes:

```typescript
throw new BadRequestError('Invalid input');
throw new UnauthorizedError('Invalid credentials');
throw new ForbiddenError('Access denied');
throw new NotFoundError('Resource not found');
```

## Logging

- **Development**: Morgan với format 'dev'
- **Production**: Morgan với format 'combined'
- User activities được log vào bảng `user_activities`

## Testing

```bash
# Chạy tất cả tests
npm test

# Chạy với coverage
npm run test:cov

# Chạy tests ở watch mode
npm run test:watch
```

## Troubleshooting

### Database connection error
- Kiểm tra PostgreSQL đang chạy
- Kiểm tra DATABASE_URL trong .env
- Kiểm tra credentials (username/password)

### Redis connection error
- Redis là optional, có thể bỏ qua nếu không sử dụng
- Kiểm tra Redis đang chạy nếu cần

### Migration errors
```bash
# Reset database
npm run db:reset

# Hoặc xóa migrations và tạo lại
rm -rf prisma/migrations
npm run db:migrate
```

## Contributing

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License.

## Contact

Nếu có vấn đề hoặc câu hỏi, vui lòng tạo issue trên GitHub repository.
