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

  useEffect(() => {
    checkAuth();
    fetchProducts();
    fetchOrders();
    fetchUsers();
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
  const [orderDetails, setOrderDetails] = useState<{order: Order | null, items: any[]}>({order: null, items: []});

  const handleViewOrderDetails = async (orderId: string) => {
    try {
      const { data: orderItems, error } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId);

      if (error) throw error;

      const order = orders.find(o => o.id === orderId);
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

    return { totalProducts, totalOrders, totalRevenue, pendingOrders };
  };

  const stats = getTotalStats();

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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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
                               <SelectItem value="delivered">Delivered</SelectItem>
                               <SelectItem value="cancelled">Cancelled</SelectItem>
                             </SelectContent>
                           </Select>
                         </TableCell>
                         <TableCell>{new Date(order.order_date).toLocaleDateString()}</TableCell>
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
                        <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
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
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Order Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {orderDetails.order && (
                <>
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
                              <TableCell>{item.weight} {item.weight_unit}</TableCell>
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