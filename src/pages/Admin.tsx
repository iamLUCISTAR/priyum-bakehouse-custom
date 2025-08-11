import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Package, Users, BarChart3, Download, LogOut, Upload, X } from "lucide-react";

interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  image: string;
  category: string;
  stock: number;
  weight_options?: Array<{weight: number; price: number; unit: string}> | null;
  base_weight?: number | null;
  weight_unit?: string | null;
}

interface WeightOption {
  weight: number;
  price: number;
  unit: string;
}

interface Order {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  customer_address: string | null;
  total: number;
  status: string;
  order_date: string;
  subtotal?: number;
  shipping_charges?: number;
  discount_amount?: number;
  custom_order_date?: string;
  custom_invoice_date?: string;
  delivery_date?: string;
  shipment_number?: string | null;
}

interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  product_price: number;
  quantity: number;
  total: number;
  weight?: number;
  weight_unit?: string;
}

interface InvoiceSettings {
  businessName: string;
  businessSubtitle: string;
  phone: string;
  email: string;
  orderDate: string;
  invoiceDate: string;
}

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  created_at: string;
}

export default function Admin() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [isEditProductOpen, setIsEditProductOpen] = useState(false);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  
  const [newProduct, setNewProduct] = useState({
    name: "",
    price: "",
    description: "",
    image: "",
    category: "",
    stock: "",
    base_weight: "500",
    weight_unit: "grams"
  });
  const [weightOptions, setWeightOptions] = useState<WeightOption[]>([]);
  const [editWeightOptions, setEditWeightOptions] = useState<WeightOption[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    full_name: "",
    phone: "",
    address: ""
  });

  const categories = ["cookies", "brownies", "pastries", "cakes"];
  const weightUnits = ["grams", "kg", "pieces"];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const year = date.getFullYear().toString().slice(-2);
    return `${day} ${month} ${year}`;
  };

  useEffect(() => {
    checkAuth();
    fetchProducts();
    fetchOrders();
    fetchUsers();
    loadInvoiceSettings();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/auth');
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transform the data to match our interface
      const transformedData = data?.map(item => ({
        ...item,
        weight_options: item.weight_options ? (typeof item.weight_options === 'string' ? JSON.parse(item.weight_options) : item.weight_options) : null
      })) || [];
      
      setProducts(transformedData);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch products",
        variant: "destructive",
      });
    }
  };

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch orders",
        variant: "destructive",
      });
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      });
    }
  };

  const uploadImage = async (file: File) => {
    try {
      setUploadingImage(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload image",
        variant: "destructive",
      });
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const imageUrl = await uploadImage(file);
    if (imageUrl) {
      setNewProduct(prev => ({ ...prev, image: imageUrl }));
    }
  };

  const addWeightOption = () => {
    setWeightOptions([...weightOptions, { weight: 0, price: 0, unit: newProduct.weight_unit }]);
  };

  const updateWeightOption = (index: number, field: keyof WeightOption, value: string | number) => {
    const updated = weightOptions.map((option, i) => 
      i === index ? { ...option, [field]: field === 'unit' ? value : Number(value) } : option
    );
    setWeightOptions(updated);
  };

  const removeWeightOption = (index: number) => {
    setWeightOptions(weightOptions.filter((_, i) => i !== index));
  };

  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.category || !newProduct.price) {
      toast({
        title: "Invalid Product",
        description: "Please fill in all required fields with valid values.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('products')
        .insert([{
          name: newProduct.name,
          price: parseFloat(newProduct.price),
          description: newProduct.description || null,
          image: newProduct.image || null,
          category: newProduct.category || null,
          stock: parseInt(newProduct.stock) || 0,
          base_weight: parseFloat(newProduct.base_weight) || 500,
          weight_unit: newProduct.weight_unit || 'grams',
          weight_options: weightOptions.length > 0 ? JSON.stringify(weightOptions) : null
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Product added successfully",
      });

      setNewProduct({
        name: "",
        price: "",
        description: "",
        image: "",
        category: "",
        stock: "",
        base_weight: "500",
        weight_unit: "grams"
      });
      setWeightOptions([]);
      setIsAddProductOpen(false);
      fetchProducts();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add product",
        variant: "destructive",
      });
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setNewProduct({
      name: product.name,
      price: product.price.toString(),
      description: product.description || "",
      image: product.image || "",
      category: product.category || "",
      stock: product.stock.toString(),
      base_weight: product.base_weight?.toString() || "500",
      weight_unit: product.weight_unit || "grams"
    });
    setEditWeightOptions(product.weight_options || []);
    setIsEditProductOpen(true);
  };

  const handleUpdateProduct = async () => {
    if (!editingProduct || !newProduct.name || !newProduct.category || !newProduct.price) {
      toast({
        title: "Invalid Product",
        description: "Please fill in all required fields with valid values.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('products')
        .update({
          name: newProduct.name,
          price: parseFloat(newProduct.price),
          description: newProduct.description || null,
          image: newProduct.image || null,
          category: newProduct.category || null,
          stock: parseInt(newProduct.stock) || 0,
          base_weight: parseFloat(newProduct.base_weight) || 500,
          weight_unit: newProduct.weight_unit || 'grams',
          weight_options: editWeightOptions.length > 0 ? JSON.stringify(editWeightOptions) : null
        })
        .eq('id', editingProduct.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Product updated successfully",
      });

      setNewProduct({
        name: "",
        price: "",
        description: "",
        image: "",
        category: "",
        stock: "",
        base_weight: "500",
        weight_unit: "grams"
      });
      setEditWeightOptions([]);
      setEditingProduct(null);
      setIsEditProductOpen(false);
      fetchProducts();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update product",
        variant: "destructive",
      });
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Product deleted successfully",
      });
      fetchProducts();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete product",
        variant: "destructive",
      });
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Order status updated successfully",
      });
      fetchOrders();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive",
      });
    }
  };

  const handleAddUser = async () => {
    if (!newUser.email || !newUser.full_name) {
      toast({
        title: "Invalid User",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', newUser.email)
        .single();

      if (existingUser) {
        // Update existing user
        const { error } = await supabase
          .from('profiles')
          .update({
            full_name: newUser.full_name,
            phone: newUser.phone || null,
            address: newUser.address || null
          })
          .eq('id', existingUser.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Existing user updated successfully",
        });
      } else {
        // Create new user
        if (!newUser.password) {
          toast({
            title: "Invalid User",
            description: "Password is required for new users.",
            variant: "destructive"
          });
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email: newUser.email,
          password: newUser.password,
          options: {
            data: {
              full_name: newUser.full_name,
              phone: newUser.phone,
              address: newUser.address
            }
          }
        });

        if (error) throw error;

        toast({
          title: "Success",
          description: "User created successfully",
        });
      }

      setNewUser({
        email: "",
        password: "",
        full_name: "",
        phone: "",
        address: ""
      });
      setIsAddUserOpen(false);
      fetchUsers();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process user",
        variant: "destructive",
      });
    }
  };

  const handleEditUser = (user: UserProfile) => {
    setEditingUser(user);
    setNewUser({
      email: user.email || "",
      password: "",
      full_name: user.full_name || "",
      phone: user.phone || "",
      address: user.address || ""
    });
    setIsEditUserOpen(true);
  };

  const [orderDetailsDialog, setOrderDetailsDialog] = useState(false);
  const [orderDetails, setOrderDetails] = useState<{order: Order | null, items: OrderItem[]}>({order: null, items: []});
  const [isEditOrderOpen, setIsEditOrderOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editingOrderItems, setEditingOrderItems] = useState<OrderItem[]>([]);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [invoiceSettings, setInvoiceSettings] = useState<InvoiceSettings>({
    businessName: "❤️ PRIYUM",
    businessSubtitle: "Cakes & Bakes",
    phone: "+91 98765 43210",
    email: "orders@priyumbakes.com",
    orderDate: new Date().toLocaleDateString(),
    invoiceDate: new Date().toLocaleDateString()
  });

  const handleViewOrderDetails = async (orderId: string) => {
    try {
      // Fetch complete order details
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;

      // Fetch order items
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId);

      if (itemsError) throw itemsError;

      setOrderDetails({order, items: orderItems || []});
      setOrderDetailsDialog(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch order details",
        variant: "destructive",
      });
    }
  };

  const handleDeleteOrder = async (orderId: string, orderTotal: number) => {
    if (!confirm('Are you sure you want to delete this order? This will reduce the total revenue.')) {
      return;
    }

    try {
      // Delete order items first
      const { error: itemsError } = await supabase
        .from('order_items')
        .delete()
        .eq('order_id', orderId);

      if (itemsError) throw itemsError;

      // Delete the order
      const { error: orderError } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId);

      if (orderError) throw orderError;

      toast({
        title: "Success",
        description: `Order deleted successfully. Revenue reduced by ₹${orderTotal}`,
      });
      
      fetchOrders();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete order",
        variant: "destructive",
      });
    }
  };

  const handleEditOrder = async (orderId: string) => {
    try {
      // Fetch order details
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;

      // Fetch order items
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId);

      if (itemsError) throw itemsError;

      setEditingOrder(order);
      setEditingOrderItems(orderItems || []);
      setIsEditOrderOpen(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load order for editing",
        variant: "destructive",
      });
    }
  };

  const handleUpdateOrder = async () => {
    if (!editingOrder) return;

    try {
      // Update the order
      const { error: orderError } = await supabase
        .from('orders')
        .update({
          customer_name: editingOrder.customer_name,
          customer_email: editingOrder.customer_email,
          customer_phone: editingOrder.customer_phone,
          customer_address: editingOrder.customer_address,
          subtotal: editingOrder.subtotal,
          shipping_charges: editingOrder.shipping_charges,
          discount_amount: editingOrder.discount_amount,
          total: editingOrder.total,
          custom_order_date: editingOrder.custom_order_date,
          custom_invoice_date: editingOrder.custom_invoice_date,
          delivery_date: editingOrder.delivery_date,
          shipment_number: editingOrder.shipment_number
        })
        .eq('id', editingOrder.id);

      if (orderError) throw orderError;

      // Update order items
      for (const item of editingOrderItems) {
        const { error: itemError } = await supabase
          .from('order_items')
          .update({
            product_name: item.product_name,
            product_price: item.product_price,
            quantity: item.quantity,
            total: item.total,
            weight: item.weight,
            weight_unit: item.weight_unit
          })
          .eq('id', item.id);

        if (itemError) throw itemError;
      }

      toast({
        title: "Success",
        description: "Order updated successfully",
      });

      setIsEditOrderOpen(false);
      setEditingOrder(null);
      setEditingOrderItems([]);
      fetchOrders();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update order",
        variant: "destructive",
      });
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser || !newUser.full_name) {
      toast({
        title: "Invalid User",
        description: "Please fill in the required fields.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: newUser.full_name,
          phone: newUser.phone || null,
          address: newUser.address || null
        })
        .eq('id', editingUser.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "User updated successfully",
      });

      setNewUser({
        email: "",
        password: "",
        full_name: "",
        phone: "",
        address: ""
      });
      setEditingUser(null);
      setIsEditUserOpen(false);
      fetchUsers();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update user",
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "User deleted successfully",
      });
      fetchUsers();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive",
      });
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const getTotalStats = () => {
    const totalProducts = products.length;
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
    const pendingOrders = orders.filter(order => order.status === "pending").length;
    const shippedOrders = orders.filter(order => order.status === "shipped").length;

    return { totalProducts, totalOrders, totalRevenue, pendingOrders, shippedOrders };
  };

  const stats = getTotalStats();

  const formatStatus = (status: string) => {
    return status.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const loadInvoiceSettings = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('invoice_settings')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading invoice settings:', error);
        return;
      }

      if (data) {
        setInvoiceSettings({
          businessName: data.business_name,
          businessSubtitle: data.business_subtitle,
          phone: data.phone,
          email: data.email,
          orderDate: formatDate(new Date().toISOString()),
          invoiceDate: formatDate(new Date().toISOString())
        });
      }
    } catch (error) {
      console.error('Error loading invoice settings:', error);
    }
  };

  const generateOrderPDF = async (order: Order, items: OrderItem[]) => {
    setIsGeneratingPDF(true);

    try {
      // Dynamic import for jsPDF and html2canvas
      const { default: jsPDF } = await import('jspdf');
      const html2canvas = (await import('html2canvas')).default;
      
      // Create a temporary HTML element for PDF generation
      const invoiceHtml = document.createElement('div');
      invoiceHtml.innerHTML = `
        <div style="font-family: Arial, sans-serif; padding: 40px; background: white; width: 800px;">
          <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #d4a574; padding-bottom: 20px;">
            <div style="color: #8b4513; font-size: 32px; font-weight: bold; margin-bottom: 5px;">${invoiceSettings.businessName}</div>
            <div style="color: #d4a574; font-size: 14px;">${invoiceSettings.businessSubtitle}</div>
            <div style="margin-top: 10px; color: #666; font-size: 12px;">
              📞 ${invoiceSettings.phone} | 📧 ${invoiceSettings.email}
            </div>
            <div style="margin-top: 10px; font-size: 14px;">Invoice #INV-${order.id.slice(0, 8)}</div>
            <div style="font-size: 12px; color: #666;">Invoice Date: ${order.custom_invoice_date ? formatDate(order.custom_invoice_date) : formatDate(new Date().toISOString())}</div>
            <div style="font-size: 12px; color: #666;">Order Date: ${order.custom_order_date ? formatDate(order.custom_order_date) : formatDate(order.order_date)}</div>
          </div>
          
          <div style="margin: 20px 0; padding: 15px; background: #f9f7f4; border-radius: 5px;">
            <h3 style="color: #8b4513; margin-bottom: 10px;">Customer Details:</h3>
            <p style="margin: 5px 0;"><strong>Name:</strong> ${order.customer_name}</p>
            <p style="margin: 5px 0;"><strong>Phone:</strong> ${order.customer_phone || 'N/A'}</p>
            <p style="margin: 5px 0;"><strong>Address:</strong> ${order.customer_address || 'N/A'}</p>
            ${order.delivery_date ? `<p style="margin: 5px 0;"><strong>Delivery Date:</strong> ${formatDate(order.delivery_date)}</p>` : ''}
            ${order.shipment_number ? `<p style="margin: 5px 0;"><strong>Shipment Number:</strong> ${order.shipment_number}</p>` : ''}
          </div>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <thead>
              <tr style="background: #d4a574; color: white;">
                <th style="padding: 12px; text-align: left; border-bottom: 1px solid #ddd;">Item</th>
                <th style="padding: 12px; text-align: left; border-bottom: 1px solid #ddd;">Weight</th>
                <th style="padding: 12px; text-align: left; border-bottom: 1px solid #ddd;">Quantity</th>
                <th style="padding: 12px; text-align: left; border-bottom: 1px solid #ddd;">Price</th>
                <th style="padding: 12px; text-align: left; border-bottom: 1px solid #ddd;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(item => `
                <tr>
                  <td style="padding: 12px; border-bottom: 1px solid #ddd;">${item.product_name}</td>
                  <td style="padding: 12px; border-bottom: 1px solid #ddd;">${item.weight ? `${item.weight} ${item.weight_unit}` : 'N/A'}</td>
                  <td style="padding: 12px; border-bottom: 1px solid #ddd;">${item.quantity}</td>
                  <td style="padding: 12px; border-bottom: 1px solid #ddd;">₹${item.product_price}</td>
                  <td style="padding: 12px; border-bottom: 1px solid #ddd;">₹${item.total}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div style="margin-top: 30px; text-align: right;">
            <div style="margin: 5px 0;">
              <span>Subtotal: ₹${order.subtotal || 0}</span>
            </div>
            <div style="margin: 5px 0;">
              <span>Shipping: ₹${order.shipping_charges || 0}</span>
            </div>
            ${order.discount_amount && order.discount_amount > 0 ? `
              <div style="margin: 5px 0;">
                <span>Discount: -₹${order.discount_amount}</span>
              </div>
            ` : ''}
            <div style="font-size: 18px; font-weight: bold; color: #8b4513; border-top: 2px solid #d4a574; padding-top: 10px; margin-top: 10px;">
              Total Amount: ₹${order.total}
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 30px; color: #666; font-size: 12px;">
            <p>Thank you for choosing PRIYUM Cakes & Bakes!</p>
            <p>Order Date: ${formatDate(order.order_date)}</p>
            <p>Made with ❤️ for delicious moments</p>
          </div>
        </div>
      `;

      // Temporarily add to DOM for rendering
      invoiceHtml.style.position = 'absolute';
      invoiceHtml.style.left = '-9999px';
      document.body.appendChild(invoiceHtml);

      // Convert to canvas then PDF
      const canvas = await html2canvas(invoiceHtml, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Clean up
      if (invoiceHtml.parentNode) {
        invoiceHtml.parentNode.removeChild(invoiceHtml);
      }

      // Download PDF with customer name in filename
      const safeCustomerName = order.customer_name.replace(/[^a-zA-Z0-9]/g, '-');
      pdf.save(`${safeCustomerName}-invoice-${order.id.slice(0, 8)}.pdf`);

      toast({
        title: "PDF Invoice Generated! 🎉",
        description: "Invoice downloaded successfully.",
      });

    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error",
        description: "Failed to generate PDF invoice. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-warm">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage your bakehouse products and orders</p>
          </div>
          <div className="flex space-x-2">
            <Button onClick={() => navigate('/dashboard')} variant="outline">
              Back to Store
            </Button>
            <Button onClick={handleSignOut} variant="outline">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <Card className="shadow-warm">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Package className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Products</p>
                  <p className="text-2xl font-bold text-foreground">{stats.totalProducts}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-warm">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Users className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Orders</p>
                  <p className="text-2xl font-bold text-foreground">{stats.totalOrders}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-warm">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <BarChart3 className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold text-foreground">₹{stats.totalRevenue}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-warm">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Download className="w-8 h-8 text-accent" />
                <div>
                  <p className="text-sm text-muted-foreground">Pending Orders</p>
                  <p className="text-2xl font-bold text-foreground">{stats.pendingOrders}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-warm">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Package className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Shipped Orders</p>
                  <p className="text-2xl font-bold text-foreground">{stats.shippedOrders}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="products" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-lg">
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
          </TabsList>

          {/* Products Tab */}
          <TabsContent value="products">
            <Card className="shadow-warm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Product Management</CardTitle>
                  <Dialog open={isAddProductOpen} onOpenChange={setIsAddProductOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Product
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Add New Product</DialogTitle>
                      </DialogHeader>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="productName">Product Name</Label>
                          <Input
                            id="productName"
                            value={newProduct.name}
                            onChange={(e) => setNewProduct(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Enter product name"
                          />
                        </div>
                        <div>
                          <Label htmlFor="productPrice">Base Price (₹)</Label>
                          <Input
                            id="productPrice"
                            type="number"
                            value={newProduct.price}
                            onChange={(e) => setNewProduct(prev => ({ ...prev, price: e.target.value }))}
                            placeholder="299"
                          />
                        </div>
                        <div>
                          <Label htmlFor="productCategory">Category</Label>
                          <Select
                            value={newProduct.category}
                            onValueChange={(value) => setNewProduct(prev => ({ ...prev, category: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map(category => (
                                <SelectItem key={category} value={category}>
                                  {category.charAt(0).toUpperCase() + category.slice(1)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="productStock">Stock Quantity</Label>
                          <Input
                            id="productStock"
                            type="number"
                            value={newProduct.stock}
                            onChange={(e) => setNewProduct(prev => ({ ...prev, stock: e.target.value }))}
                            placeholder="50"
                          />
                        </div>
                        
                        {/* Base Weight and Unit */}
                        <div>
                          <Label htmlFor="baseWeight">Base Weight</Label>
                          <Input
                            id="baseWeight"
                            type="number"
                            value={newProduct.base_weight}
                            onChange={(e) => setNewProduct(prev => ({ ...prev, base_weight: e.target.value }))}
                            placeholder="500"
                          />
                        </div>
                        <div>
                          <Label htmlFor="weightUnit">Weight Unit</Label>
                          <Select
                            value={newProduct.weight_unit}
                            onValueChange={(value) => setNewProduct(prev => ({ ...prev, weight_unit: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select unit" />
                            </SelectTrigger>
                            <SelectContent>
                              {weightUnits.map(unit => (
                                <SelectItem key={unit} value={unit}>
                                  {unit}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="col-span-2">
                          <Label htmlFor="productDescription">Description</Label>
                          <Textarea
                            id="productDescription"
                            value={newProduct.description}
                            onChange={(e) => setNewProduct(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Enter product description"
                            rows={3}
                          />
                        </div>
                        
                        {/* Image Upload */}
                        <div className="col-span-2">
                          <Label>Product Image</Label>
                          <div className="space-y-2">
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={handleImageUpload}
                              disabled={uploadingImage}
                            />
                            {uploadingImage && (
                              <p className="text-sm text-muted-foreground">Uploading image...</p>
                            )}
                            {newProduct.image && (
                              <img 
                                src={newProduct.image} 
                                alt="Preview" 
                                className="w-20 h-20 object-cover rounded"
                              />
                            )}
                          </div>
                        </div>

                        {/* Weight Options */}
                        <div className="col-span-2">
                          <div className="flex items-center justify-between mb-2">
                            <Label>Weight & Price Options</Label>
                            <Button type="button" variant="outline" size="sm" onClick={addWeightOption}>
                              <Plus className="w-4 h-4 mr-1" />
                              Add Option
                            </Button>
                          </div>
                          <div className="space-y-2">
                            {weightOptions.map((option, index) => (
                              <div key={index} className="flex items-center space-x-2 p-2 border rounded">
                                <Input
                                  type="number"
                                  placeholder="Weight"
                                  value={option.weight}
                                  onChange={(e) => updateWeightOption(index, 'weight', e.target.value)}
                                  className="w-20"
                                />
                                <Select
                                  value={option.unit}
                                  onValueChange={(value) => updateWeightOption(index, 'unit', value)}
                                >
                                  <SelectTrigger className="w-24">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {weightUnits.map(unit => (
                                      <SelectItem key={unit} value={unit}>
                                        {unit}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Input
                                  type="number"
                                  placeholder="Price"
                                  value={option.price}
                                  onChange={(e) => updateWeightOption(index, 'price', e.target.value)}
                                  className="w-20"
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => removeWeightOption(index)}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="col-span-2 flex justify-end space-x-2">
                          <Button variant="outline" onClick={() => setIsAddProductOpen(false)}>
                            Cancel
                          </Button>
                          <Button onClick={handleAddProduct}>
                            Add Product
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Weight Options</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <img
                              src={product.image || "/placeholder.svg"}
                              alt={product.name}
                              className="w-12 h-12 object-cover rounded-lg"
                            />
                            <div>
                              <p className="font-medium">{product.name}</p>
                              <p className="text-sm text-muted-foreground">{product.description}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{product.category}</Badge>
                        </TableCell>
                        <TableCell>₹{product.price}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>Base: {product.base_weight} {product.weight_unit}</p>
                            {product.weight_options && product.weight_options.length > 0 && (
                              <p className="text-muted-foreground">
                                +{product.weight_options.length} options
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={product.stock > 10 ? "default" : "destructive"}>
                            {product.stock} units
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleEditProduct(product)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteProduct(product.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders">
            <Card className="shadow-warm">
              <CardHeader>
                <CardTitle>Order Management</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Shipment</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.id}</TableCell>
                         <TableCell>
                           <div>
                             <p className="font-medium">{order.customer_name}</p>
                             <p className="text-sm text-muted-foreground">{order.customer_phone}</p>
                           </div>
                         </TableCell>
                         <TableCell>
                           <div className="space-y-1">
                             <p className="text-sm">Order Details</p>
                           </div>
                         </TableCell>
                         <TableCell className="font-medium">₹{order.total}</TableCell>
                         <TableCell>
                           <Select
                             value={order.status}
                             onValueChange={(value) => handleUpdateOrderStatus(order.id, value)}
                           >
                             <SelectTrigger className="w-32">
                               <SelectValue />
                             </SelectTrigger>
                             <SelectContent>
                               <SelectItem value="pending">Pending</SelectItem>
                               <SelectItem value="preparing">Preparing</SelectItem>
                               <SelectItem value="ready">Ready</SelectItem>
                               <SelectItem value="shipped">Shipped</SelectItem>
                               <SelectItem value="delivered">Delivered</SelectItem>
                               <SelectItem value="cancelled">Cancelled</SelectItem>
                             </SelectContent>
                           </Select>
                         </TableCell>
                         <TableCell>
                           <div className="text-sm">
                             {order.shipment_number ? (
                               <span className="font-mono bg-muted px-2 py-1 rounded text-xs">
                                 {order.shipment_number}
                               </span>
                             ) : (
                               <span className="text-muted-foreground text-xs">Not set</span>
                             )}
                           </div>
                         </TableCell>
                         <TableCell>{formatDate(order.order_date)}</TableCell>
                         <TableCell>
                           <div className="flex space-x-2">
                             <Button 
                               variant="outline" 
                               size="sm"
                               onClick={() => handleViewOrderDetails(order.id)}
                             >
                               View Details
                             </Button>
                             <Button 
                               variant="outline" 
                               size="sm"
                               onClick={() => handleEditOrder(order.id)}
                             >
                               <Edit className="w-4 h-4" />
                             </Button>
                             <Button
                               variant="outline"
                               size="sm"
                               onClick={() => handleDeleteOrder(order.id, order.total)}
                             >
                               <Trash2 className="w-4 h-4" />
                             </Button>
                           </div>
                         </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card className="shadow-warm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>User Management</CardTitle>
                  <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Add User
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Add New User</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="userEmail">Email</Label>
                          <Input
                            id="userEmail"
                            type="email"
                            value={newUser.email}
                            onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                            placeholder="user@example.com"
                          />
                        </div>
                        <div>
                          <Label htmlFor="userPassword">Password</Label>
                          <Input
                            id="userPassword"
                            type="password"
                            value={newUser.password}
                            onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                            placeholder="Enter password"
                          />
                        </div>
                        <div>
                          <Label htmlFor="userFullName">Full Name</Label>
                          <Input
                            id="userFullName"
                            value={newUser.full_name}
                            onChange={(e) => setNewUser(prev => ({ ...prev, full_name: e.target.value }))}
                            placeholder="Enter full name"
                          />
                        </div>
                        <div>
                          <Label htmlFor="userPhone">Phone</Label>
                          <Input
                            id="userPhone"
                            value={newUser.phone}
                            onChange={(e) => setNewUser(prev => ({ ...prev, phone: e.target.value }))}
                            placeholder="Enter phone number"
                          />
                        </div>
                        <div>
                          <Label htmlFor="userAddress">Address</Label>
                          <Textarea
                            id="userAddress"
                            value={newUser.address}
                            onChange={(e) => setNewUser(prev => ({ ...prev, address: e.target.value }))}
                            placeholder="Enter address"
                            rows={3}
                          />
                        </div>
                        <div className="flex justify-end space-x-2">
                          <Button variant="outline" onClick={() => setIsAddUserOpen(false)}>
                            Cancel
                          </Button>
                          <Button onClick={handleAddUser}>
                            Add User
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.full_name || 'N/A'}</TableCell>
                        <TableCell>{user.email || 'N/A'}</TableCell>
                        <TableCell>{user.phone || 'N/A'}</TableCell>
                        <TableCell>{formatDate(user.created_at)}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditUser(user)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteUser(user.user_id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit Product Dialog */}
        <Dialog open={isEditProductOpen} onOpenChange={setIsEditProductOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Product</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="editProductName">Product Name</Label>
                <Input
                  id="editProductName"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter product name"
                />
              </div>
              <div>
                <Label htmlFor="editProductPrice">Base Price (₹)</Label>
                <Input
                  id="editProductPrice"
                  type="number"
                  value={newProduct.price}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, price: e.target.value }))}
                  placeholder="299"
                />
              </div>
              <div>
                <Label htmlFor="editProductCategory">Category</Label>
                <Select
                  value={newProduct.category}
                  onValueChange={(value) => setNewProduct(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category} value={category}>
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="editProductStock">Stock Quantity</Label>
                <Input
                  id="editProductStock"
                  type="number"
                  value={newProduct.stock}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, stock: e.target.value }))}
                  placeholder="50"
                />
              </div>
              
              <div>
                <Label htmlFor="editBaseWeight">Base Weight</Label>
                <Input
                  id="editBaseWeight"
                  type="number"
                  value={newProduct.base_weight}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, base_weight: e.target.value }))}
                  placeholder="500"
                />
              </div>
              <div>
                <Label htmlFor="editWeightUnit">Weight Unit</Label>
                <Select
                  value={newProduct.weight_unit}
                  onValueChange={(value) => setNewProduct(prev => ({ ...prev, weight_unit: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {weightUnits.map(unit => (
                      <SelectItem key={unit} value={unit}>
                        {unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2">
                <Label htmlFor="editProductDescription">Description</Label>
                <Textarea
                  id="editProductDescription"
                  value={newProduct.description}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter product description"
                  rows={3}
                />
              </div>

              <div className="col-span-2">
                <Label>Product Image</Label>
                <div className="space-y-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                  />
                  {uploadingImage && (
                    <p className="text-sm text-muted-foreground">Uploading image...</p>
                  )}
                  {newProduct.image && (
                    <img 
                      src={newProduct.image} 
                      alt="Preview" 
                      className="w-20 h-20 object-cover rounded"
                    />
                  )}
                </div>
              </div>

              <div className="col-span-2">
                <div className="flex items-center justify-between mb-2">
                  <Label>Weight & Price Options</Label>
                  <Button type="button" variant="outline" size="sm" onClick={() => setEditWeightOptions([...editWeightOptions, { weight: 0, price: 0, unit: newProduct.weight_unit }])}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add Option
                  </Button>
                </div>
                <div className="space-y-2">
                  {editWeightOptions.map((option, index) => (
                    <div key={index} className="flex items-center space-x-2 p-2 border rounded">
                      <Input
                        type="number"
                        placeholder="Weight"
                        value={option.weight}
                        onChange={(e) => {
                          const updated = editWeightOptions.map((opt, i) => 
                            i === index ? { ...opt, weight: Number(e.target.value) } : opt
                          );
                          setEditWeightOptions(updated);
                        }}
                        className="w-20"
                      />
                      <Select
                        value={option.unit}
                        onValueChange={(value) => {
                          const updated = editWeightOptions.map((opt, i) => 
                            i === index ? { ...opt, unit: value } : opt
                          );
                          setEditWeightOptions(updated);
                        }}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {weightUnits.map(unit => (
                            <SelectItem key={unit} value={unit}>
                              {unit}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        placeholder="Price"
                        value={option.price}
                        onChange={(e) => {
                          const updated = editWeightOptions.map((opt, i) => 
                            i === index ? { ...opt, price: Number(e.target.value) } : opt
                          );
                          setEditWeightOptions(updated);
                        }}
                        className="w-20"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setEditWeightOptions(editWeightOptions.filter((_, i) => i !== index))}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="col-span-2 flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsEditProductOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateProduct}>
                  Update Product
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Order Details Dialog */}
        <Dialog open={orderDetailsDialog} onOpenChange={setOrderDetailsDialog}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Order Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {orderDetails.order && (
                <>
                  <div className="flex justify-end space-x-2 mb-4">
                    <Button
                      variant="outline"
                      onClick={() => handleEditOrder(orderDetails.order!.id)}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Order
                    </Button>
                    <Button
                      onClick={() => generateOrderPDF(orderDetails.order!, orderDetails.items)}
                      disabled={isGeneratingPDF}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      {isGeneratingPDF ? "Generating..." : "Download PDF"}
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Customer Name</Label>
                      <p className="text-foreground">{orderDetails.order.customer_name}</p>
                    </div>
                    <div>
                      <Label>Customer Email</Label>
                      <p className="text-foreground">{orderDetails.order.customer_email}</p>
                    </div>
                    <div>
                      <Label>Phone</Label>
                      <p className="text-foreground">{orderDetails.order.customer_phone || 'N/A'}</p>
                    </div>
                    <div>
                      <Label>Total Amount</Label>
                      <p className="text-foreground">₹{orderDetails.order.total}</p>
                    </div>
                    <div>
                      <Label>Subtotal</Label>
                      <p className="text-foreground">₹{orderDetails.order.subtotal || 0}</p>
                    </div>
                    <div>
                      <Label>Shipping Charges</Label>
                      <p className="text-foreground">₹{orderDetails.order.shipping_charges || 0}</p>
                    </div>
                    <div>
                      <Label>Discount Amount</Label>
                      <p className="text-foreground">₹{orderDetails.order.discount_amount || 0}</p>
                    </div>
                    <div>
                      <Label>Order Status</Label>
                      <Badge variant="outline">{formatStatus(orderDetails.order.status)}</Badge>
                    </div>
                    <div>
                      <Label>Order Date</Label>
                      <p className="text-foreground">{orderDetails.order.custom_order_date ? formatDate(orderDetails.order.custom_order_date) : formatDate(orderDetails.order.order_date)}</p>
                    </div>
                    <div>
                      <Label>Invoice Date</Label>
                      <p className="text-foreground">{orderDetails.order.custom_invoice_date ? formatDate(orderDetails.order.custom_invoice_date) : formatDate(new Date().toISOString())}</p>
                    </div>
                    <div>
                      <Label>Delivery Date</Label>
                      <p className="text-foreground">{orderDetails.order.delivery_date ? formatDate(orderDetails.order.delivery_date) : 'Not specified'}</p>
                    </div>
                    <div>
                      <Label>Shipment Number</Label>
                      <p className="text-foreground">{orderDetails.order.shipment_number || 'Not specified'}</p>
                    </div>
                  </div>
                  
                  <div>
                    <Label>Address</Label>
                    <p className="text-foreground">{orderDetails.order.customer_address || 'N/A'}</p>
                  </div>

                  <div>
                    <Label>Order Items ({orderDetails.items.length})</Label>
                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead>Weight</TableHead>
                            <TableHead>Quantity</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {orderDetails.items.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell>{item.product_name}</TableCell>
                              <TableCell>{item.weight ? `${item.weight} ${item.weight_unit}` : 'N/A'}</TableCell>
                              <TableCell>{item.quantity}</TableCell>
                              <TableCell>₹{item.product_price}</TableCell>
                              <TableCell>₹{item.total}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Order Dialog */}
        <Dialog open={isEditOrderOpen} onOpenChange={setIsEditOrderOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Order</DialogTitle>
            </DialogHeader>
            {editingOrder && (
              <div className="space-y-6">
                {/* Customer Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="editCustomerName">Customer Name</Label>
                    <Input
                      id="editCustomerName"
                      value={editingOrder.customer_name}
                      onChange={(e) => setEditingOrder(prev => prev ? { ...prev, customer_name: e.target.value } : null)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="editCustomerEmail">Customer Email</Label>
                    <Input
                      id="editCustomerEmail"
                      type="email"
                      value={editingOrder.customer_email}
                      onChange={(e) => setEditingOrder(prev => prev ? { ...prev, customer_email: e.target.value } : null)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="editCustomerPhone">Phone</Label>
                    <Input
                      id="editCustomerPhone"
                      value={editingOrder.customer_phone || ''}
                      onChange={(e) => setEditingOrder(prev => prev ? { ...prev, customer_phone: e.target.value } : null)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="editOrderStatus">Status</Label>
                    <Select
                      value={editingOrder.status}
                      onValueChange={(value) => setEditingOrder(prev => prev ? { ...prev, status: value } : null)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="preparing">Preparing</SelectItem>
                        <SelectItem value="ready">Ready</SelectItem>
                        <SelectItem value="shipped">Shipped</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="editOrderDate">Order Date</Label>
                    <Input
                      id="editOrderDate"
                      type="date"
                      value={editingOrder.custom_order_date || new Date(editingOrder.order_date).toISOString().split('T')[0]}
                      onChange={(e) => setEditingOrder(prev => prev ? { ...prev, custom_order_date: e.target.value } : null)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="editInvoiceDate">Invoice Date</Label>
                    <Input
                      id="editInvoiceDate"
                      type="date"
                      value={editingOrder.custom_invoice_date || new Date().toISOString().split('T')[0]}
                      onChange={(e) => setEditingOrder(prev => prev ? { ...prev, custom_invoice_date: e.target.value } : null)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="editDeliveryDate">Delivery Date</Label>
                    <Input
                      id="editDeliveryDate"
                      type="date"
                      value={editingOrder.delivery_date || ''}
                      onChange={(e) => setEditingOrder(prev => prev ? { ...prev, delivery_date: e.target.value } : null)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="editShippingCharges">Shipping Charges (₹)</Label>
                    <Input
                      id="editShippingCharges"
                      type="number"
                      min="0"
                      value={editingOrder.shipping_charges || 0}
                      onChange={(e) => {
                        const shipping = parseFloat(e.target.value) || 0;
                        const subtotal = editingOrder.subtotal || 0;
                        const discount = editingOrder.discount_amount || 0;
                        const total = subtotal + shipping - discount;
                        setEditingOrder(prev => prev ? { 
                          ...prev, 
                          shipping_charges: shipping,
                          total: total
                        } : null);
                      }}
                    />
                  </div>
                  <div>
                    <Label htmlFor="editDiscountAmount">Discount Amount (₹)</Label>
                    <Input
                      id="editDiscountAmount"
                      type="number"
                      min="0"
                      value={editingOrder.discount_amount || 0}
                      onChange={(e) => {
                        const discount = parseFloat(e.target.value) || 0;
                        const subtotal = editingOrder.subtotal || 0;
                        const shipping = editingOrder.shipping_charges || 0;
                        const total = subtotal + shipping - discount;
                        setEditingOrder(prev => prev ? { 
                          ...prev, 
                          discount_amount: discount,
                          total: total
                        } : null);
                      }}
                    />
                  </div>
                  <div>
                    <Label htmlFor="editShipmentNumber">Shipment Number</Label>
                    <Input
                      id="editShipmentNumber"
                      placeholder="Enter tracking number"
                      value={editingOrder.shipment_number || ''}
                      onChange={(e) => setEditingOrder(prev => prev ? { ...prev, shipment_number: e.target.value } : null)}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="editCustomerAddress">Address</Label>
                  <Textarea
                    id="editCustomerAddress"
                    value={editingOrder.customer_address || ''}
                    onChange={(e) => setEditingOrder(prev => prev ? { ...prev, customer_address: e.target.value } : null)}
                    rows={3}
                  />
                </div>

                {/* Order Items */}
                <div>
                  <Label>Order Items</Label>
                  <div className="space-y-2">
                    {editingOrderItems.map((item, index) => (
                      <div key={item.id} className="grid grid-cols-6 gap-2 p-3 border rounded">
                        <div>
                          <Label className="text-xs">Product Name</Label>
                          <Input
                            value={item.product_name}
                            onChange={(e) => {
                              const updated = [...editingOrderItems];
                              updated[index].product_name = e.target.value;
                              setEditingOrderItems(updated);
                            }}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Weight</Label>
                          <Input
                            type="number"
                            value={item.weight || ''}
                            onChange={(e) => {
                              const updated = [...editingOrderItems];
                              updated[index].weight = parseFloat(e.target.value) || null;
                              setEditingOrderItems(updated);
                            }}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Unit</Label>
                          <Input
                            value={item.weight_unit || ''}
                            onChange={(e) => {
                              const updated = [...editingOrderItems];
                              updated[index].weight_unit = e.target.value;
                              setEditingOrderItems(updated);
                            }}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Quantity</Label>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => {
                              const quantity = parseInt(e.target.value) || 1;
                              const updated = [...editingOrderItems];
                              updated[index].quantity = quantity;
                              updated[index].total = item.product_price * quantity;
                              setEditingOrderItems(updated);
                              
                              // Recalculate order totals
                              const newSubtotal = updated.reduce((sum, i) => sum + i.total, 0);
                              const shipping = editingOrder.shipping_charges || 0;
                              const discount = editingOrder.discount_amount || 0;
                              const newTotal = newSubtotal + shipping - discount;
                              setEditingOrder(prev => prev ? { 
                                ...prev, 
                                subtotal: newSubtotal,
                                total: newTotal
                              } : null);
                            }}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Price (₹)</Label>
                          <Input
                            type="number"
                            min="0"
                            value={item.product_price}
                            onChange={(e) => {
                              const price = parseFloat(e.target.value) || 0;
                              const updated = [...editingOrderItems];
                              updated[index].product_price = price;
                              updated[index].total = price * item.quantity;
                              setEditingOrderItems(updated);
                              
                              // Recalculate order totals
                              const newSubtotal = updated.reduce((sum, i) => sum + i.total, 0);
                              const shipping = editingOrder.shipping_charges || 0;
                              const discount = editingOrder.discount_amount || 0;
                              const newTotal = newSubtotal + shipping - discount;
                              setEditingOrder(prev => prev ? { 
                                ...prev, 
                                subtotal: newSubtotal,
                                total: newTotal
                              } : null);
                            }}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Total (₹)</Label>
                          <Input
                            value={item.total}
                            disabled
                            className="bg-muted"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Order Summary */}
                <div className="border-t pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Subtotal</Label>
                      <p className="text-lg font-medium">₹{editingOrder.subtotal || 0}</p>
                    </div>
                    <div>
                      <Label>Shipping</Label>
                      <p className="text-lg font-medium">₹{editingOrder.shipping_charges || 0}</p>
                    </div>
                    <div>
                      <Label>Discount</Label>
                      <p className="text-lg font-medium">₹{editingOrder.discount_amount || 0}</p>
                    </div>
                    <div>
                      <Label>Total</Label>
                      <p className="text-xl font-bold text-primary">₹{editingOrder.total}</p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsEditOrderOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleUpdateOrder}>
                    Update Order
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit User Dialog */}
        <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="editUserEmail">Email (Read-only)</Label>
                <Input
                  id="editUserEmail"
                  type="email"
                  value={newUser.email}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div>
                <Label htmlFor="editUserFullName">Full Name</Label>
                <Input
                  id="editUserFullName"
                  value={newUser.full_name}
                  onChange={(e) => setNewUser(prev => ({ ...prev, full_name: e.target.value }))}
                  placeholder="Enter full name"
                />
              </div>
              <div>
                <Label htmlFor="editUserPhone">Phone</Label>
                <Input
                  id="editUserPhone"
                  value={newUser.phone}
                  onChange={(e) => setNewUser(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Enter phone number"
                />
              </div>
              <div>
                <Label htmlFor="editUserAddress">Address</Label>
                <Textarea
                  id="editUserAddress"
                  value={newUser.address}
                  onChange={(e) => setNewUser(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Enter address"
                  rows={3}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsEditUserOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateUser}>
                  Update User
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}