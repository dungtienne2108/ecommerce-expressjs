import axios from 'axios'
import { PrismaClient } from '@prisma/client'

import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config'

const connectionString = `${process.env.DATABASE_URL}`;

const adapter = new PrismaPg({connectionString});

const prisma = new PrismaClient({
  adapter: adapter,
});
interface Product {
  name: string
  price: number
  image: string
  rating: number
  reviewCount: number
  stock: number
  description?: string
  category?: string
  source: string
}

// ============= VARIANT CONFIG =============
interface VariantConfig {
  name: string
  colors?: string[]
  sizes?: string[]
  capacities?: string[]
  models?: string[]
}

const variantConfigs: { [key: string]: VariantConfig } = {
  'Điện thoại': {
    name: 'Điện thoại',
    colors: ['Đen', 'Trắng', 'Xanh', 'Vàng'],
    capacities: ['128GB', '256GB', '512GB', '1TB']
  },
  'Tablet': {
    name: 'Tablet',
    colors: ['Đen', 'Bạc', 'Xanh'],
    capacities: ['64GB', '128GB', '256GB']
  },
  'Laptop': {
    name: 'Laptop',
    colors: ['Bạc', 'Xám', 'Đen'],
    capacities: ['256GB', '512GB', '1TB']
  },
  'Âm thanh': {
    name: 'Âm thanh',
    colors: ['Đen', 'Trắng', 'Xanh', 'Bạc'],
    models: ['Standard', 'Pro', 'Max']
  },
  'Phụ kiện': {
    name: 'Phụ kiện',
    colors: ['Đen', 'Trắng', 'Vàng', 'Đỏ'],
    sizes: ['S', 'M', 'L', 'XL']
  },
  'Camera & Video': {
    name: 'Camera & Video',
    colors: ['Đen', 'Bạc'],
    models: ['Standard', 'Pro', '12MP', '48MP']
  },
  'Thời trang Nam': {
    name: 'Thời trang Nam',
    colors: ['Đen', 'Trắng', 'Xanh', 'Đỏ'],
    sizes: ['S', 'M', 'L', 'XL', 'XXL']
  },
  'Thời trang Nữ': {
    name: 'Thời trang Nữ',
    colors: ['Đen', 'Trắng', 'Xanh', 'Đỏ', 'Hồng'],
    sizes: ['XS', 'S', 'M', 'L', 'XL']
  },
  'Giày dép': {
    name: 'Giày dép',
    colors: ['Đen', 'Trắng', 'Xám', 'Nâu'],
    sizes: ['36', '37', '38', '39', '40', '41', '42', '43', '44', '45']
  },
  'Nhà cửa & Đời sống': {
    name: 'Nhà cửa & Đời sống',
    colors: ['Trắng', 'Đen', 'Bạc'],
    models: ['Standard', 'Pro', 'Plus']
  },
  'Thực phẩm & Đồ uống': {
    name: 'Thực phẩm & Đồ uống',
    capacities: ['250g', '500g', '1kg', '2kg']
  },
  'Sách & Văn phòng phẩm': {
    name: 'Sách & Văn phòng phẩm',
    models: ['Bìa mềm', 'Bìa cứng', 'E-book']
  },
  'Electronics': {
    name: 'Electronics',
    colors: ['Đen', 'Bạc', 'Xám'],
    models: ['V1', 'V2', 'V3']
  },
  'Fashion': {
    name: 'Fashion',
    colors: ['Đen', 'Trắng', 'Xanh', 'Đỏ'],
    sizes: ['XS', 'S', 'M', 'L', 'XL']
  },
  'Premium': {
    name: 'Premium',
    colors: ['Đen', 'Bạc', 'Vàng'],
    models: ['Standard', 'Pro', 'Max']
  },
  'Tech': {
    name: 'Tech',
    colors: ['Đen', 'Bạc'],
    capacities: ['64GB', '128GB', '256GB']
  }
}

// ============= GENERATE VARIANTS =============
function generateVariants(
  productName: string,
  basePrice: number,
  baseStock: number,
  category: string
): Array<{
  sku: string
  name: string
  value: string
  price: number
  stock: number
}> {
  const config = variantConfigs[category]

  if (!config) {
    return [{
      sku: `SKU-${Date.now()}-0`,
      name: productName,
      value: 'Standard',
      price: basePrice,
      stock: baseStock
    }]
  }

  const variants: Array<{
    sku: string
    name: string
    value: string
    price: number
    stock: number
  }> = []
  let variantIndex = 0

  // Kết hợp colors + capacities
  if (config.colors && config.capacities) {
    for (const color of config.colors) {
      for (const capacity of config.capacities) {
        variants.push({
          sku: `SKU-${Date.now()}-${variantIndex}`,
          name: `${productName} ${color} ${capacity}`,
          value: `${color} - ${capacity}`,
          price: basePrice + (parseInt(capacity) - parseInt(config.capacities[0])) * 1000000,
          stock: Math.max(5, baseStock - Math.floor(Math.random() * 30))
        })
        variantIndex++
      }
    }
  }
  // Kết hợp colors + sizes
  else if (config.colors && config.sizes) {
    for (const color of config.colors) {
      for (const size of config.sizes) {
        variants.push({
          sku: `SKU-${Date.now()}-${variantIndex}`,
          name: `${productName} ${color} Size ${size}`,
          value: `${color} - ${size}`,
          price: basePrice,
          stock: Math.max(5, baseStock - Math.floor(Math.random() * 30))
        })
        variantIndex++
      }
    }
  }
  // Kết hợp colors + models
  else if (config.colors && config.models) {
    for (const color of config.colors.slice(0, 2)) {
      for (const model of config.models.slice(0, 2)) {
        variants.push({
          sku: `SKU-${Date.now()}-${variantIndex}`,
          name: `${productName} ${color} ${model}`,
          value: `${color} - ${model}`,
          price: basePrice + (config.models.indexOf(model) * 500000),
          stock: Math.max(5, baseStock - Math.floor(Math.random() * 30))
        })
        variantIndex++
      }
    }
  }
  // Chỉ colors
  else if (config.colors) {
    for (const color of config.colors) {
      variants.push({
        sku: `SKU-${Date.now()}-${variantIndex}`,
        name: `${productName} ${color}`,
        value: color,
        price: basePrice,
        stock: Math.max(5, baseStock - Math.floor(Math.random() * 20))
      })
      variantIndex++
    }
  }
  // Chỉ capacities
  else if (config.capacities) {
    for (const capacity of config.capacities) {
      variants.push({
        sku: `SKU-${Date.now()}-${variantIndex}`,
        name: `${productName} ${capacity}`,
        value: capacity,
        price: basePrice + (parseInt(capacity) - parseInt(config.capacities[0])) * 1000000,
        stock: Math.max(5, baseStock - Math.floor(Math.random() * 30))
      })
      variantIndex++
    }
  }
  // Chỉ sizes
  else if (config.sizes) {
    for (const size of config.sizes) {
      variants.push({
        sku: `SKU-${Date.now()}-${variantIndex}`,
        name: `${productName} Size ${size}`,
        value: size,
        price: basePrice,
        stock: Math.max(5, baseStock - Math.floor(Math.random() * 20))
      })
      variantIndex++
    }
  }
  // Chỉ models
  else if (config.models) {
    for (const model of config.models) {
      variants.push({
        sku: `SKU-${Date.now()}-${variantIndex}`,
        name: `${productName} ${model}`,
        value: model,
        price: basePrice + (config.models.indexOf(model) * 500000),
        stock: Math.max(5, baseStock - Math.floor(Math.random() * 30))
      })
      variantIndex++
    }
  }

  if (variants.length === 0) {
    variants.push({
      sku: `SKU-${Date.now()}-0`,
      name: productName,
      value: 'Standard',
      price: basePrice,
      stock: baseStock
    })
  }

  return variants
}

// ============= 1. FAKE STORE API =============
async function fetchFakeStore(): Promise<Product[]> {
  try {
    console.log('📦 Fetching Fake Store API...')
    const { data } = await axios.get('https://fakestoreapi.com/products')
    
    return data.map((p: any) => ({
      name: p.title,
      price: Math.round(p.price * 23500),
      image: p.image,
      rating: 3.5 + Math.random() * 1.5,
      reviewCount: Math.floor(Math.random() * 500) + 10,
      stock: Math.floor(Math.random() * 200) + 20,
      description: p.description,
      category: p.category,
      source: 'FAKE_STORE'
    }))
  } catch (e) {
    console.error('❌ Fake Store:', (e as Error).message)
    return []
  }
}

// ============= 2. RANDOM USER API =============
async function fetchRandomUsers(): Promise<Product[]> {
  try {
    console.log('📦 Fetching Random User API...')
    const { data } = await axios.get('https://randomuser.me/api/?results=80')
    
    return data.results.map((user: any, idx: number) => ({
      name: `${user.name.first} ${user.name.last} Premium Collection ${idx}`,
      price: Math.floor(Math.random() * 5000000) + 500000,
      image: user.picture.large,
      rating: 3.8 + Math.random() * 1.2,
      reviewCount: Math.floor(Math.random() * 400) + 10,
      stock: Math.floor(Math.random() * 150) + 15,
      description: `Exclusive collection`,
      category: 'Premium',
      source: 'RANDOM_USER'
    }))
  } catch (e) {
    console.error('❌ Random User:', (e as Error).message)
    return []
  }
}

// ============= 3. PICSUM PHOTOS =============
async function fetchPicsumProducts(): Promise<Product[]> {
  try {
    console.log('📦 Fetching Picsum Photos...')
    const products: Product[] = []
    const categories = ['Electronics', 'Fashion', 'Sports', 'Home', 'Books', 'Beauty', 'Food', 'Toys']
    
    for (let i = 0; i < 60; i++) {
      const photoId = Math.floor(Math.random() * 200) + 1
      products.push({
        name: `${categories[Math.floor(Math.random() * categories.length)]} Product #${i + 1}`,
        price: Math.floor(Math.random() * 9000000) + 500000,
        image: `https://picsum.photos/500/500?random=${photoId}`,
        rating: 4 + Math.random(),
        reviewCount: Math.floor(Math.random() * 500) + 10,
        stock: Math.floor(Math.random() * 200) + 10,
        description: 'High quality product',
        category: categories[Math.floor(Math.random() * categories.length)],
        source: 'PICSUM'
      })
    }
    
    return products
  } catch (e) {
    console.error('❌ Picsum:', (e as Error).message)
    return []
  }
}

// ============= 4. JSON PLACEHOLDER =============
async function fetchJsonPlaceholder(): Promise<Product[]> {
  try {
    console.log('📦 Fetching JSONPlaceholder API...')
    const { data: posts } = await axios.get('https://jsonplaceholder.typicode.com/posts')
    
    return posts.slice(0, 60).map((post: any, idx: number) => ({
      name: post.title.substring(0, 50),
      price: Math.floor(Math.random() * 8000000) + 500000,
      image: `https://picsum.photos/500/500?random=${idx + 100}`,
      rating: 4 + Math.random() * 0.99,
      reviewCount: Math.floor(Math.random() * 300) + 10,
      stock: Math.floor(Math.random() * 150) + 10,
      description: post.body.substring(0, 100),
      category: 'Electronics',
      source: 'JSONPLACEHOLDER'
    }))
  } catch (e) {
    console.error('❌ JSONPlaceholder:', (e as Error).message)
    return []
  }
}

// ============= 5. ROBOHASH =============
async function fetchRoboHashProducts(): Promise<Product[]> {
  try {
    console.log('📦 Generating RoboHash products...')
    const products: Product[] = []
    
    for (let i = 0; i < 70; i++) {
      products.push({
        name: `Robot Tech Series #${i + 1}`,
        price: Math.floor(Math.random() * 7000000) + 500000,
        image: `https://robohash.org/robo${i + 1}.png?size=500x500`,
        rating: 4.1 + Math.random() * 0.9,
        reviewCount: Math.floor(Math.random() * 250) + 10,
        stock: Math.floor(Math.random() * 180) + 10,
        description: 'Tech gadget from RoboHash series',
        category: 'Tech',
        source: 'ROBOHASH'
      })
    }
    
    return products
  } catch (e) {
    console.error('❌ RoboHash:', (e as Error).message)
    return []
  }
}

// ============= 6. AVATAAARS =============
async function fetchAvataaarsProducts(): Promise<Product[]> {
  try {
    console.log('📦 Generating Avataaars products...')
    const products: Product[] = []
    
    for (let i = 0; i < 50; i++) {
      const seed = Math.random().toString(36).substring(7)
      products.push({
        name: `Avatar Series ${i + 1}`,
        price: Math.floor(Math.random() * 6000000) + 500000,
        image: `https://avataaars.io/?avatarStyle=Circle&topType=LongHairStraight&accessoriesType=Blank&hairColor=Black&facialHairType=Blank&clotheType=BlazerShirt&eyeType=Default&eyebrowType=Default&mouthType=Default&skinColor=Light&seed=${seed}`,
        rating: 4.2 + Math.random() * 0.8,
        reviewCount: Math.floor(Math.random() * 200) + 10,
        stock: Math.floor(Math.random() * 160) + 10,
        description: 'Avatar styled product',
        category: 'Premium',
        source: 'AVATAAARS'
      })
    }
    
    return products
  } catch (e) {
    console.error('❌ Avataaars:', (e as Error).message)
    return []
  }
}

// ============= 7. LOREM FLICKR =============
async function fetchLoremFlickr(): Promise<Product[]> {
  try {
    console.log('📦 Fetching LoremFlickr images...')
    const keywords = ['electronics', 'fashion', 'watch', 'shoes', 'camera', 'laptop', 'phone', 'headphones', 'tablet', 'keyboard']
    const products: Product[] = []
    
    for (let i = 0; i < 80; i++) {
      const keyword = keywords[Math.floor(Math.random() * keywords.length)]
      const random = Math.random().toString(36).substring(7)
      
      products.push({
        name: `${keyword.charAt(0).toUpperCase() + keyword.slice(1)} Item #${i + 1}`,
        price: Math.floor(Math.random() * 9000000) + 500000,
        image: `https://loremflickr.com/500/500/${keyword}?random=${random}`,
        rating: 4 + Math.random() * 1,
        reviewCount: Math.floor(Math.random() * 400) + 10,
        stock: Math.floor(Math.random() * 200) + 10,
        description: `High quality ${keyword} product`,
        category: 'Tech',
        source: 'LOREMFLICKR'
      })
    }
    
    return products
  } catch (e) {
    console.error('❌ LoremFlickr:', (e as Error).message)
    return []
  }
}

// ============= 8. MOCK VIETNAMESE PRODUCTS =============
const expandedMockProducts: Product[] = [
  { name: 'iPhone 15 Pro Max 256GB', price: 32990000, image: 'https://picsum.photos/500/500?random=1001', rating: 4.9, reviewCount: 580, stock: 50, category: 'Điện thoại', source: 'MOCK' },
  { name: 'Samsung Galaxy S24 Ultra', price: 28990000, image: 'https://picsum.photos/500/500?random=1002', rating: 4.8, reviewCount: 420, stock: 45, category: 'Điện thoại', source: 'MOCK' },
  { name: 'iPad Air M2 2024', price: 18990000, image: 'https://picsum.photos/500/500?random=1003', rating: 4.7, reviewCount: 310, stock: 35, category: 'Tablet', source: 'MOCK' },
  { name: 'MacBook Pro 16 M3 Max', price: 45990000, image: 'https://picsum.photos/500/500?random=1004', rating: 4.9, reviewCount: 250, stock: 20, category: 'Laptop', source: 'MOCK' },
  { name: 'Dell XPS 15', price: 35990000, image: 'https://picsum.photos/500/500?random=1005', rating: 4.7, reviewCount: 180, stock: 25, category: 'Laptop', source: 'MOCK' },
  { name: 'Asus ROG Gaming Laptop', price: 42990000, image: 'https://picsum.photos/500/500?random=1006', rating: 4.8, reviewCount: 320, stock: 15, category: 'Laptop', source: 'MOCK' },
  { name: 'Sony WH-1000XM5 Headphones', price: 8990000, image: 'https://picsum.photos/500/500?random=1007', rating: 4.8, reviewCount: 620, stock: 80, category: 'Âm thanh', source: 'MOCK' },
  { name: 'Apple AirPods Pro Max', price: 12990000, image: 'https://picsum.photos/500/500?random=1008', rating: 4.7, reviewCount: 450, stock: 60, category: 'Âm thanh', source: 'MOCK' },
  { name: 'Bose QuietComfort 45', price: 7990000, image: 'https://picsum.photos/500/500?random=1009', rating: 4.6, reviewCount: 380, stock: 70, category: 'Âm thanh', source: 'MOCK' },
  { name: 'Apple Watch Series 9', price: 11990000, image: 'https://picsum.photos/500/500?random=1010', rating: 4.7, reviewCount: 520, stock: 90, category: 'Phụ kiện', source: 'MOCK' },
  { name: 'DJI Air 3S Drone', price: 19990000, image: 'https://picsum.photos/500/500?random=1011', rating: 4.8, reviewCount: 280, stock: 30, category: 'Camera & Video', source: 'MOCK' },
  { name: 'GoPro Hero 12 Black', price: 15990000, image: 'https://picsum.photos/500/500?random=1012', rating: 4.7, reviewCount: 340, stock: 40, category: 'Camera & Video', source: 'MOCK' },
  { name: 'Áo Sơ Mi Nam Calvin Klein', price: 1290000, image: 'https://picsum.photos/500/500?random=1013', rating: 4.5, reviewCount: 240, stock: 120, category: 'Thời trang Nam', source: 'MOCK' },
  { name: 'Quần Jeans Levi\'s 501', price: 1490000, image: 'https://picsum.photos/500/500?random=1014', rating: 4.6, reviewCount: 310, stock: 100, category: 'Thời trang Nam', source: 'MOCK' },
  { name: 'Giày Nike Air Jordan 1', price: 2990000, image: 'https://picsum.photos/500/500?random=1015', rating: 4.7, reviewCount: 480, stock: 80, category: 'Giày dép', source: 'MOCK' },
  { name: 'Váy Maxi Nữ Cao Cấp', price: 1890000, image: 'https://picsum.photos/500/500?random=1016', rating: 4.6, reviewCount: 200, stock: 60, category: 'Thời trang Nữ', source: 'MOCK' },
  { name: 'Tủ lạnh LG Inverter', price: 14990000, image: 'https://picsum.photos/500/500?random=1017', rating: 4.6, reviewCount: 200, stock: 25, category: 'Nhà cửa & Đời sống', source: 'MOCK' },
  { name: 'Máy Giặt Samsung 9kg', price: 8990000, image: 'https://picsum.photos/500/500?random=1018', rating: 4.7, reviewCount: 180, stock: 30, category: 'Nhà cửa & Đời sống', source: 'MOCK' },
  { name: 'Cà phê Trung Nguyên Legend 500g', price: 350000, image: 'https://picsum.photos/500/500?random=1019', rating: 4.7, reviewCount: 450, stock: 200, category: 'Thực phẩm & Đồ uống', source: 'MOCK' },
  { name: 'Mật ong rừng Ngàn Hoa 500ml', price: 580000, image: 'https://picsum.photos/500/500?random=1020', rating: 4.8, reviewCount: 320, stock: 150, category: 'Thực phẩm & Đồ uống', source: 'MOCK' },
  { name: 'Sách "Sapiens" bản đặc biệt', price: 350000, image: 'https://picsum.photos/500/500?random=1023', rating: 4.8, reviewCount: 420, stock: 100, category: 'Sách & Văn phòng phẩm', source: 'MOCK' },
]

// ============= SETUP MOCK DATA =============
async function setupMockData() {
  console.log('⚙️ Kiểm tra và tạo dữ liệu cơ bản...\n')

  let sellerRole = await prisma.role.findFirst({ where: { type: 'SELLER' } })
  if (!sellerRole) {
    sellerRole = await prisma.role.create({
      data: {
        name: 'Seller',
        type: 'SELLER',
        description: 'Chủ shop',
        createdBy: 'system'
      }
    })
    console.log('  ✅ Tạo role Seller')
  }

  let seller = await prisma.user.findFirst({ where: { email: 'seller@megastore.vn' } })
  if (!seller) {
    seller = await prisma.user.create({
      data: {
        email: 'seller@megastore.vn',
        password: 'hashed_password_123',
        firstName: 'Mega',
        lastName: 'Store',
        phoneNumber: '+84901244567',
        status: 'ACTIVE',
        emailVerified: true,
        emailVerifiedAt: new Date(),
        createdBy: 'system'
      }
    })
    console.log('  ✅ Tạo seller')

    await prisma.userRole.create({
      data: {
        userId: seller.id,
        roleId: sellerRole.id,
        createdBy: 'system'
      }
    })
  }

  let shop = await prisma.shop.findFirst({ where: { name: 'Mega Store Vietnam' } })
  if (!shop) {
    shop = await prisma.shop.create({
      data: {
        ownerId: seller.id,
        name: 'Mega Store Vietnam',
        status: 'ACTIVE',
        approvalStatus: 'APPROVED',
        approvedAt: new Date(),
        email: 'support@megastore.vn',
        phoneNumber: '+84901234567',
        city: 'Hà Nội',
        category: 'Đa dạng',
        isVerified: true,
        verifiedAt: new Date(),
        bankName: 'Vietcombank',
        bankAccount: 'MEGA STORE',
        bankAccountNumber: '1234567891',
        totalRevenue: 1000000000,
        totalOrders: 5000,
        rating: 4.8,
        reviewCount: 2500,
        createdBy: seller.id
      }
    })
    console.log('  ✅ Tạo shop Mega Store Vietnam')
  }

  const categoryNames = [
    { name: 'Điện tử & Công nghệ', desc: 'Điện thoại, laptop, máy tính' },
    { name: 'Thời trang Nam', desc: 'Áo, quần, giày dép nam' },
    { name: 'Thời trang Nữ', desc: 'Áo, quần, giày dép nữ' },
    { name: 'Giày dép', desc: 'Giày thể thao, giày cao gót' },
    { name: 'Âm thanh', desc: 'Tai nghe, loa, micro' },
    { name: 'Camera & Video', desc: 'Camera, máy quay, drone' },
    { name: 'Nhà cửa & Đời sống', desc: 'Đồ gia dụng, nội thất' },
    { name: 'Thực phẩm & Đồ uống', desc: 'Thực phẩm, đồ uống, cà phê' },
    { name: 'Sách & Văn phòng phẩm', desc: 'Sách, bút, giấy' },
    { name: 'Phụ kiện', desc: 'Túi xách, dây chuyền, kính' },
    { name: 'Premium', desc: 'Sản phẩm cao cấp' },
    { name: 'Tech', desc: 'Công nghệ tiên tiến' },
    { name: 'Electronics', desc: 'Điện tử quốc tế' },
    { name: 'Fashion', desc: 'Thời trang quốc tế' }
  ]

  const categories = []
  for (const cat of categoryNames) {
    let category = await prisma.category.findFirst({ where: { name: cat.name } })
    if (!category) {
      category = await prisma.category.create({
        data: {
          name: cat.name,
          description: cat.desc,
          createdBy: 'system'
        }
      })
    }
    categories.push(category)
  }
  console.log(`  ✅ Tạo ${categories.length} danh mục\n`)

  return { seller, shop, categories }
}

// ============= INSERT TO DATABASE =============
async function insertToDB(
  products: Product[],
  shop: any,
  seller: any,
  categories: any[]
): Promise<{ inserted: number; variants: number; images: number }> {
  let inserted = 0
  let variantsCreated = 0
  let imagesCreated = 0
  let skipped = 0

  for (let i = 0; i < products.length; i++) {
    try {
      const product = products[i]

      const existing = await prisma.product.findFirst({
        where: { name: product.name }
      })

      if (existing) {
        skipped++
        continue
      }

      const matchCategory = categories.find(c =>
        c.name.toLowerCase().includes(product.category?.toLowerCase() || '')
      ) || categories[i % categories.length]

      const created = await prisma.product.create({
        data: {
          shopId: shop.id,
          name: product.name,
          status: 'PUBLISHED',
          averageRating: Math.min(5, Math.max(0, product.rating)),
          reviewCount: product.reviewCount,
          createdBy: seller.id
        }
      })

      await prisma.productCategory.create({
        data: {
          productId: created.id,
          categoryId: matchCategory.id,
          createdBy: seller.id
        }
      })

      // Tạo primary image
      await prisma.productImage.create({
        data: {
          productId: created.id,
          imageUrl: product.image,
          isPrimary: true,
          sortOrder: 1,
          description: product.name,
          createdBy: seller.id
        }
      })
      imagesCreated++

      // Generate và tạo variants
      const variants = generateVariants(
        product.name,
        product.price,
        product.stock,
        matchCategory.name
      )

      for (let j = 0; j < variants.length; j++) {
        const variant = variants[j]

        await prisma.productVariant.create({
          data: {
            productId: created.id,
            sku: variant.sku,
            name: variant.name,
            value: variant.value,
            price: variant.price,
            stock: variant.stock,
            status: 'PUBLISHED',
            description: `${product.description || product.name} - ${variant.value}`,
            createdBy: seller.id
          }
        })

        variantsCreated++

        // Tạo variant image cho một số variants
        if (j > 0 && j % 3 === 0) {
          await prisma.productImage.create({
            data: {
              productId: created.id,
              imageUrl: product.image,
              isPrimary: false,
              sortOrder: j + 1,
              description: `${product.name} - ${variant.value}`,
              createdBy: seller.id
            }
          })
          imagesCreated++
        }
      }

      inserted++
      if (inserted % 10 === 0) {
        console.log(`  ✅ ${inserted} sản phẩm (${variantsCreated} variants, ${imagesCreated} ảnh)...`)
      }
    } catch (e) {
      console.error(`❌ Lỗi product ${i}:`, (e as Error).message)
    }
  }

  console.log(`  📊 Tổng: ${inserted} sản phẩm, ${variantsCreated} variants, ${imagesCreated} ảnh, ${skipped} trùng`)
  return { inserted, variants: variantsCreated, images: imagesCreated }
}

// ============= MAIN =============
async function main() {
  console.log('\n' + '='.repeat(90))
  console.log('🚀 MEGA PRODUCT DATA SEEDER - Với Multiple Variants')
  console.log('='.repeat(90) + '\n')

  let allProducts: Product[] = []
  const sources: { [key: string]: number } = {}

  try {
    console.log('📡 Fetching từ tất cả các sources...\n')

    const fakeStore = await fetchFakeStore()
    allProducts = [...allProducts, ...fakeStore]
    sources['Fake Store'] = fakeStore.length
    console.log(`  ✅ Fake Store: ${fakeStore.length}`)

    const randomUsers = await fetchRandomUsers()
    allProducts = [...allProducts, ...randomUsers]
    sources['Random User'] = randomUsers.length
    console.log(`  ✅ Random User: ${randomUsers.length}`)

    const picsum = await fetchPicsumProducts()
    allProducts = [...allProducts, ...picsum]
    sources['Picsum'] = picsum.length
    console.log(`  ✅ Picsum Photos: ${picsum.length}`)

    const jsonPlaceholder = await fetchJsonPlaceholder()
    allProducts = [...allProducts, ...jsonPlaceholder]
    sources['JSONPlaceholder'] = jsonPlaceholder.length
    console.log(`  ✅ JSONPlaceholder: ${jsonPlaceholder.length}`)

    const roboHash = await fetchRoboHashProducts()
    allProducts = [...allProducts, ...roboHash]
    sources['RoboHash'] = roboHash.length
    console.log(`  ✅ RoboHash: ${roboHash.length}`)

    const avataaars = await fetchAvataaarsProducts()
    allProducts = [...allProducts, ...avataaars]
    sources['Avataaars'] = avataaars.length
    console.log(`  ✅ Avataaars: ${avataaars.length}`)

    const loremFlickr = await fetchLoremFlickr()
    allProducts = [...allProducts, ...loremFlickr]
    sources['LoremFlickr'] = loremFlickr.length
    console.log(`  ✅ LoremFlickr: ${loremFlickr.length}`)

    sources['Mock Data (VN)'] = expandedMockProducts.length
    console.log(`  ✅ Mock Data (VN): ${expandedMockProducts.length}\n`)
    allProducts = [...allProducts, ...expandedMockProducts]

    // Deduplicate
    const seen = new Set<string>()
    allProducts = allProducts.filter(p => {
      if (seen.has(p.name)) return false
      seen.add(p.name)
      return true
    })

    console.log('='.repeat(90))
    console.log(`📊 Tổng cộng sản phẩm unique: ${allProducts.length}`)
    console.log('='.repeat(90) + '\n')

    // Setup
    const { seller, shop, categories } = await setupMockData()

    console.log('💾 Đang insert vào database...\n')
    const result = await insertToDB(allProducts, shop, seller, categories)

    console.log('\n' + '='.repeat(90))
    console.log('✅ SEEDING HOÀN TẤT!')
    console.log('='.repeat(90))

    console.log('\n📈 Thống kê theo nguồn:')
    Object.entries(sources).forEach(([source, count]) => {
      console.log(`  - ${source}: ${count}`)
    })

    console.log('\n📊 Thống kê database:')
    const totalProducts = await prisma.product.count()
    const totalVariants = await prisma.productVariant.count()
    const totalImages = await prisma.productImage.count()
    console.log(`  - Tổng sản phẩm: ${totalProducts}`)
    console.log(`  - Tổng variants: ${totalVariants}`)
    console.log(`  - Tổng ảnh: ${totalImages}`)

    console.log('\n💡 Chi tiết insert:')
    console.log(`  - Sản phẩm được insert: ${result.inserted}`)
    console.log(`  - Variants được tạo: ${result.variants}`)
    console.log(`  - Ảnh được tạo: ${result.images}`)

  } catch (error) {
    console.error('❌ Lỗi:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()