export interface User {
  id: string;
  username: string;
  email: string;
  password: string;
  role: 'admin' | 'cashier';
  created_at: Date;
  updated_at: Date;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  stock: number;
  image?: string;
  barcode?: string;
  created_at: Date;
  updated_at: Date;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface Order {
  id: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  payment_method: 'cash' | 'card' | 'digital';
  user_id: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateProductRequest {
  name: string;
  price: number;
  category: string;
  stock: number;
  image?: string;
  barcode?: string;
}

export interface UpdateProductRequest {
  name?: string;
  price?: number;
  category?: string;
  stock?: number;
  image?: string;
  barcode?: string;
}

export interface CreateOrderRequest {
  items: {
    product_id: string;
    quantity: number;
  }[];
  payment_method: 'cash' | 'card' | 'digital';
  discount?: number;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
}
