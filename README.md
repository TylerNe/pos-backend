# POS System Backend API

A full-featured REST API backend for the Point of Sale system built with Node.js, Express, TypeScript, and PostgreSQL.

## Features

- 🔐 **Authentication & Authorization** with JWT
- 📦 **Product Management** (CRUD operations)
- 🛒 **Order Processing** with inventory tracking
- 👥 **User Management** (Admin/Cashier roles)
- 📊 **Order Statistics & Analytics**
- 🖼️ **Image Upload Support**
- 🔒 **Security Middleware** (Helmet, CORS)
- 📝 **Request Logging** with Morgan
- 🗃️ **PostgreSQL Database** with connection pooling

## Tech Stack

- **Runtime**: Node.js + TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Authentication**: JWT + bcrypt
- **File Upload**: Multer
- **Security**: Helmet, CORS
- **Logging**: Morgan

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile (protected)

### Products
- `GET /api/products` - Get all products (with pagination & search)
- `GET /api/products/categories` - Get product categories
- `GET /api/products/:id` - Get product by ID
- `POST /api/products` - Create product (auth required)
- `PUT /api/products/:id` - Update product (auth required)
- `DELETE /api/products/:id` - Delete product (admin only)

### Orders
- `GET /api/orders` - Get all orders (auth required)
- `GET /api/orders/stats` - Get order statistics (auth required)
- `GET /api/orders/:id` - Get order by ID (auth required)
- `POST /api/orders` - Create new order (auth required)

### Health Check
- `GET /api/health` - API health status

## Setup & Installation

### Prerequisites
- Node.js (v16+)
- PostgreSQL (v12+)
- npm or yarn

### 1. Install Dependencies
\`\`\`bash
cd backend
npm install
\`\`\`

### 2. Environment Configuration
Create a \`.env\` file from the example:
\`\`\`bash
cp env.example .env
\`\`\`

Update the \`.env\` file with your configuration:
\`\`\`env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=pos_system
DB_USER=postgres
DB_PASSWORD=your_password

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d
\`\`\`

### 3. Database Setup
Make sure PostgreSQL is running, then:
\`\`\`bash
# Create database
createdb pos_system

# Initialize database schema
npm run init-db
\`\`\`

### 4. Start Development Server
\`\`\`bash
npm run dev
\`\`\`

The API will be available at \`http://localhost:5000\`

## Database Schema

### Users Table
- \`id\` (UUID, Primary Key)
- \`username\` (String, Unique)
- \`email\` (String, Unique)
- \`password\` (String, Hashed)
- \`role\` (Enum: 'admin', 'cashier')
- \`created_at\`, \`updated_at\` (Timestamps)

### Products Table
- \`id\` (UUID, Primary Key)
- \`name\` (String)
- \`price\` (Decimal)
- \`category\` (String)
- \`stock\` (Integer)
- \`image\` (Text, Optional)
- \`barcode\` (String, Optional)
- \`created_at\`, \`updated_at\` (Timestamps)

### Orders Table
- \`id\` (UUID, Primary Key)
- \`subtotal\`, \`tax\`, \`discount\`, \`total\` (Decimal)
- \`payment_method\` (Enum: 'cash', 'card', 'digital')
- \`user_id\` (UUID, Foreign Key)
- \`customer_name\`, \`customer_phone\`, \`customer_email\` (Optional)
- \`created_at\`, \`updated_at\` (Timestamps)

### Order Items Table
- \`id\` (UUID, Primary Key)
- \`order_id\` (UUID, Foreign Key)
- \`product_id\` (UUID, Foreign Key)
- \`quantity\` (Integer)
- \`unit_price\`, \`total_price\` (Decimal)
- \`created_at\` (Timestamp)

## Default Users

After running \`npm run init-db\`, you'll have these default users:

| Username | Email | Password | Role |
|----------|--------|----------|------|
| admin | admin@pos.com | admin123 | admin |
| cashier1 | cashier1@pos.com | cashier123 | cashier |

## API Usage Examples

### Login
\`\`\`bash
curl -X POST http://localhost:5000/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"username": "admin", "password": "admin123"}'
\`\`\`

### Create Product
\`\`\`bash
curl -X POST http://localhost:5000/api/products \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -d '{
    "name": "New Product",
    "price": 9.99,
    "category": "Electronics",
    "stock": 50
  }'
\`\`\`

### Create Order
\`\`\`bash
curl -X POST http://localhost:5000/api/orders \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -d '{
    "items": [
      {"product_id": "product-uuid", "quantity": 2}
    ],
    "payment_method": "cash",
    "discount": 0
  }'
\`\`\`

## Development

### Build for Production
\`\`\`bash
npm run build
npm start
\`\`\`

### Project Structure
\`\`\`
backend/
├── src/
│   ├── config/         # Database & configuration
│   ├── controllers/    # Route handlers
│   ├── middleware/     # Authentication & validation
│   ├── models/         # TypeScript types
│   ├── routes/         # API routes
│   ├── scripts/        # Database scripts
│   ├── utils/          # Helper functions
│   └── index.ts        # Main server file
├── package.json
├── tsconfig.json
└── README.md
\`\`\`

## Security Features

- 🔐 JWT-based authentication
- 🛡️ Password hashing with bcrypt
- 🔒 Role-based access control
- 🚫 CORS protection
- 🛠️ Security headers with Helmet
- ✅ Input validation & sanitization

## Error Handling

The API uses consistent error responses:
\`\`\`json
{
  "error": "Error description",
  "details": "Additional error details (dev mode only)"
}
\`\`\`

Common HTTP status codes:
- \`200\` - Success
- \`201\` - Created
- \`400\` - Bad Request
- \`401\` - Unauthorized
- \`403\` - Forbidden
- \`404\` - Not Found
- \`500\` - Internal Server Error
