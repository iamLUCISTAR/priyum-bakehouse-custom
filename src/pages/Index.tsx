import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Minus, Plus, Trash2, Receipt, ShoppingCart, Heart, LogOut, Settings, Package } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface InvoiceSettings {
  businessName: string;
  businessSubtitle: string;
  phone: string;
  email: string;
  orderDate: string;
  invoiceDate: string;
}

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  selectedWeight?: number;
  selectedUnit?: string;
  weight?: number;
  weight_unit?: string;
}

interface WeightOption {
  weight: number;
  price: number;
  unit: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  image: string;
  category: string;
  base_weight?: number;
  weight_unit?: string;
  weight_options?: string | WeightOption[];
}

interface CustomerDetails {
  name: string;
  phone: string;
  address: string;
  notes: string;
  orderDate: string;
  invoiceDate: string;
  deliveryDate: string;
  shippingCharge: number;
}

const sampleProducts: Product[] = [
  {
    id: "1",
    name: "Chocolate Chip Cookies",
    price: 299,
    description: "Classic homemade cookies with premium chocolate chips",
    image: "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=400",
    category: "cookies"
  },
  {
    id: "2", 
    name: "Double Fudge Brownies",
    price: 399,
    description: "Rich, moist brownies with extra chocolate goodness",
    image: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=400",
    category: "brownies"
  },
  {
    id: "3",
    name: "Butter Croissants", 
    price: 199,
    description: "Flaky, buttery pastries perfect for breakfast",
    image: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400",
    category: "pastries"
  },
  {
    id: "4",
    name: "Oatmeal Raisin Cookies",
    price: 279, 
    description: "Healthy cookies with oats and sweet raisins",
    image: "https://images.unsplash.com/photo-1617016517476-9b9a083de78d?w=400",
    category: "cookies"
  },
  {
    id: "5",
    name: "Walnut Brownies",
    price: 449,
    description: "Premium brownies with crunchy walnuts", 
    image: "https://images.unsplash.com/photo-1551058622-2b5b76ccc050?w=400",
    category: "brownies"
  },
  {
    id: "6", 
    name: "Danish Pastries",
    price: 249,
    description: "Sweet pastries with fruit fillings",
    image: "https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=400", 
    category: "pastries"
  }
];

const Index = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [customerDetails, setCustomerDetails] = useState<CustomerDetails>({
    name: "",
    phone: "",
    address: "",
    notes: "",
    orderDate: new Date().toISOString().split('T')[0],
    invoiceDate: new Date().toISOString().split('T')[0],
    deliveryDate: "",
    shippingCharge: 0
  });
  const [invoiceSettings, setInvoiceSettings] = useState<InvoiceSettings>({
    businessName: "❤️ PRIYUM",
    businessSubtitle: "Cakes & Bakes",
    phone: "+91 98765 43210",
    email: "orders@priyumbakes.com",
    orderDate: new Date().toLocaleDateString(),
    invoiceDate: new Date().toLocaleDateString()
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isWeightDialogOpen, setIsWeightDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedWeight, setSelectedWeight] = useState<WeightOption | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [discount, setDiscount] = useState<number>(0);

  // Define categories
  const categories = ["cookies", "brownies", "eggless brownies"];

  useEffect(() => {
    checkAuth();
    loadProducts();
    loadInvoiceSettings();
  }, []);

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
          orderDate: new Date().toISOString().split('T')[0],
          invoiceDate: new Date().toISOString().split('T')[0]
        });
      }
    } catch (error) {
      console.error('Error loading invoice settings:', error);
    }
  };

  const saveInvoiceSettings = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase
        .from('invoice_settings')
        .upsert({
          user_id: session.user.id,
          business_name: invoiceSettings.businessName,
          business_subtitle: invoiceSettings.businessSubtitle,
          phone: invoiceSettings.phone,
          email: invoiceSettings.email
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Invoice settings saved successfully",
      });
    } catch (error) {
      console.error('Error saving invoice settings:', error);
      toast({
        title: "Error",
        description: "Failed to save invoice settings",
        variant: "destructive",
      });
    }
  };

  const checkAuth = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) throw error;
      
      if (!session) {
        navigate('/auth');
        return;
      }
      
      setUser(session.user);
      
      // Set up auth state listener
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (event, session) => {
          if (event === 'SIGNED_OUT' || !session) {
            navigate('/auth');
          } else {
            setUser(session.user);
          }
        }
      );

      return () => subscription.unsubscribe();
    } catch (error) {
      console.error('Auth error:', error);
      navigate('/auth');
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // If no products in database, use sample products
      if (data && data.length > 0) {
        // Transform database products to match our Product interface
        const transformedProducts = data.map(product => ({
          ...product,
          weight_options: product.weight_options ? 
            (typeof product.weight_options === 'string' ? 
              JSON.parse(product.weight_options) : 
              product.weight_options) : 
            []
        }));
        setProducts(transformedProducts);
      } else {
        setProducts(sampleProducts);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      // Fallback to sample products
      setProducts(sampleProducts);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Round prices for invoice generation
  const roundPrice = (price: number): number => {
    const decimal = price - Math.floor(price);
    if (decimal >= 0.5) {
      return Math.ceil(price);
    } else {
      return Math.floor(price);
    }
  };

  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shippingCharge = customerDetails.shippingCharge;
  const discountAmount = roundPrice((subtotal * discount) / 100);
  const total = roundPrice(subtotal + shippingCharge - discountAmount);

  const handleAddToCart = (product: Product, selectedWeight?: number, selectedPrice?: number, selectedUnit?: string) => {
    const price = selectedPrice || product.price;
    const weight = selectedWeight;
    const unit = selectedUnit;
    const categoryLower = (product.category || '').toLowerCase();
    const isBrownie = categoryLower.includes('brownie');
    const isEggless = categoryLower.includes('eggless');
    const brownieTag = isBrownie ? (isEggless ? ' (Eggless)' : ' (Regular)') : '';
    
    setCartItems(prev => {
      const cartKey = `${product.id}-${weight || 'base'}`;
      console.log('Creating cart with product ID:', product.id);
      console.log('Generated cart key:', cartKey);
      
      const existingItem = prev.find(item => 
        item.id === cartKey
      );
      
      if (existingItem) {
        return prev.map(item =>
          item.id === cartKey
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      
      const baseName = `${product.name}${brownieTag}`;
      const displayName = weight && unit ? `${baseName} (${weight}${unit})` : baseName;
      
      return [...prev, {
        id: cartKey,
        name: displayName,
        price,
        quantity: 1,
        image: product.image,
        selectedWeight: weight,
        selectedUnit: unit,
        weight: weight,
        weight_unit: unit
      }];
    });
  };

  const handleSelectWeight = (product: Product) => {
    const weightOptions = Array.isArray(product.weight_options) ? product.weight_options : [];
    
    if (weightOptions && weightOptions.length > 0) {
      setSelectedProduct(product);
      setIsWeightDialogOpen(true);
    } else {
      handleAddToCart(product);
    }
  };

  const handleWeightSelection = (weight: number, price: number, unit: string) => {
    if (selectedProduct) {
      handleAddToCart(selectedProduct, weight, price, unit);
      setIsWeightDialogOpen(false);
      setSelectedProduct(null);
    }
  };

  const handleUpdateQuantity = (id: string, quantity: number) => {
    if (quantity === 0) {
      handleRemoveItem(id);
      return;
    }
    setCartItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, quantity } : item
      )
    );
  };

  const handleRemoveItem = (id: string) => {
    setCartItems(prev => prev.filter(item => item.id !== id));
  };

  const handleClearCart = () => {
    setCartItems([]);
  };

  const handleInputChange = (field: keyof CustomerDetails, value: string) => {
    setCustomerDetails(prev => ({ 
      ...prev, 
      [field]: field === 'shippingCharge' ? parseFloat(value) || 0 : value 
    }));
  };

  const generateInvoice = async () => {
    if (!customerDetails.name || !customerDetails.phone || !customerDetails.address) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required customer details.",
        variant: "destructive"
      });
      return;
    }

    if (cartItems.length === 0) {
      toast({
        title: "Empty Cart",
        description: "Please add items to your cart before placing an order.",
        variant: "destructive"
      });
      return;
    }

    setIsGeneratingPDF(true);

    try {
      // First, save the order to database
      const orderData = {
        customer_name: customerDetails.name,
        customer_phone: customerDetails.phone,
        customer_address: customerDetails.address,
        customer_email: customerDetails.phone + "@placeholder.com", // We'll use phone as email placeholder
        subtotal,
        shipping_charges: shippingCharge,
        discount_amount: discountAmount,
        total,
        user_id: user.id,
        status: 'pending',
        custom_order_date: customerDetails.orderDate,
        custom_invoice_date: customerDetails.invoiceDate,
        delivery_date: customerDetails.deliveryDate
      };

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItemsData = cartItems.map(item => {
        // Debug: log the item to see what we're working with
        console.log('Processing cart item:', item);
        console.log('Item ID:', item.id);
        
        // Extract product ID correctly - UUIDs have format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
        // Our cart keys have format: uuid-weight, so we need to find the last hyphen and split there
        let productId = item.id;
        if (item.id && (item.id.includes('-base') || /.*-\d+$/.test(item.id))) {
          // Find the weight suffix (either '-base' or '-number')
          const lastHyphenIndex = item.id.lastIndexOf('-');
          if (lastHyphenIndex > 35) { // UUID is 36 chars with 4 hyphens, so last hyphen should be after position 35
            productId = item.id.substring(0, lastHyphenIndex);
          }
        }
        
        console.log('Extracted product ID:', productId);
        console.log('Product ID length:', productId.length);
        
        // Validate it's a proper UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const isValidUUID = uuidRegex.test(productId);
        console.log('Is valid UUID:', isValidUUID);
        
        if (!isValidUUID) {
          console.error('Invalid UUID detected:', productId, 'from original:', item.id);
          throw new Error(`Invalid product ID: ${productId}`);
        }
        
        return {
          order_id: order.id,
          product_id: productId,
          product_name: item.name,
          product_price: item.price,
          quantity: item.quantity,
          total: item.price * item.quantity,
          weight: item.weight || null,
          weight_unit: item.weight_unit || null
        };
      });

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItemsData);

      if (itemsError) throw itemsError;

      // Send order confirmation email with PDF invoice
      try {
        await supabase.functions.invoke('send-order-email', {
          body: {
            orderId: order.id,
            customerEmail: orderData.customer_email,
            customerName: customerDetails.name,
            orderItems: orderItemsData,
            subtotal,
            shippingCharges: shippingCharge,
            discountAmount,
            total,
            orderDate: customerDetails.orderDate,
            invoiceDate: customerDetails.invoiceDate,
            deliveryDate: customerDetails.deliveryDate,
            invoiceSettings,
            adminEmail: user.email
          }
        });
      } catch (emailError) {
        console.error('Failed to send order email:', emailError);
        // Don't fail the order if email fails
      }

      // Dynamic import for jsPDF and generate text-based PDF (copy-pastable)
      const { default: jsPDF } = await import('jspdf');

      const pdf = new jsPDF('p', 'mm', 'a4');
      const marginLeft = 15;
      let y = 20;

      // Header
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(18);
      pdf.text(invoiceSettings.businessName || 'PRIYUM Cakes & Bakes', marginLeft, y);
      y += 6;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.text(invoiceSettings.businessSubtitle || 'Cakes & Bakes', marginLeft, y);
      y += 6;
      pdf.text(`Phone: ${invoiceSettings.phone}`, marginLeft, y);
      y += 5;
      pdf.text(`Email: ${invoiceSettings.email}`, marginLeft, y);
      y += 8;
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.text(`Invoice #INV-${order.id.slice(0, 8)}`, marginLeft, y);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.text(`Order ID: ${order.id}`, marginLeft + 80, y);
      y += 6;
      pdf.text(`Invoice Date: ${customerDetails.invoiceDate}`, marginLeft, y);
      pdf.text(`Order Date: ${customerDetails.orderDate}`, marginLeft + 80, y);
      y += 10;

      // Customer details
      pdf.setFont('helvetica', 'bold');
      pdf.text('Customer Details', marginLeft, y);
      pdf.setFont('helvetica', 'normal');
      y += 6;
      const customerLines = [
        `Name: ${customerDetails.name}`,
        `Phone: ${customerDetails.phone}`,
        `Address: ${customerDetails.address}`,
        `Delivery Date: ${customerDetails.deliveryDate || '-'}`,
      ];
      customerLines.forEach(line => { pdf.text(line, marginLeft, y); y += 5; });
      if (customerDetails.notes) { pdf.text(`Notes: ${customerDetails.notes}`, marginLeft, y); y += 5; }
      y += 5;

      // Items table header
      const colX = { item: marginLeft, qty: 140, price: 160, total: 185 };
      pdf.setFont('helvetica', 'bold');
      pdf.text('Item', colX.item, y);
      pdf.text('Qty', colX.qty, y);
      pdf.text('Price', colX.price, y);
      pdf.text('Total', colX.total, y);
      pdf.setFont('helvetica', 'normal');
      y += 3;
      pdf.line(marginLeft, y, 195, y);
      y += 6;

      const addPageIfNeeded = () => {
        if (y > 270) {
          pdf.addPage();
          y = 20;
        }
      };

      // Items rows
      cartItems.forEach(item => {
        addPageIfNeeded();
        const lineTotal = roundPrice(item.price * item.quantity);
        // Wrap long item names
        const maxWidth = colX.qty - colX.item - 2;
        const lines = pdf.splitTextToSize(item.name, maxWidth);
        lines.forEach((ln, idx) => {
          pdf.text(ln, colX.item, y + idx * 5);
        });
        pdf.text(String(item.quantity), colX.qty, y);
        pdf.text(`₹${item.price}`, colX.price, y);
        pdf.text(`₹${lineTotal}`, colX.total, y);
        y += Math.max(6, lines.length * 5 + 1);
      });

      y += 4;
      pdf.line(120, y, 195, y);
      y += 6;
      pdf.text(`Subtotal: ₹${roundPrice(subtotal)}`, 120, y);
      y += 6;
      pdf.text(`Shipping: ₹${roundPrice(shippingCharge)}`, 120, y);
      if (discount > 0) {
        y += 6;
        pdf.text(`Discount (${discount}%): -₹${roundPrice(discountAmount)}`, 120, y);
      }
      y += 8;
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Total Amount: ₹${roundPrice(total)}`, 120, y);
      pdf.setFont('helvetica', 'normal');
      y += 14;

      pdf.setFontSize(9);
      pdf.text('Thank you for choosing PRIYUM Cakes & Bakes! Made with ❤️', marginLeft, y);

      // Download PDF with customer name and order ID in filename
      const safeCustomerName = customerDetails.name.replace(/[^a-zA-Z0-9]/g, '-');
      pdf.save(`${safeCustomerName}-invoice-${order.id.slice(0, 8)}.pdf`);

      toast({
        title: "PDF Invoice Generated! 🎉",
        description: "Your order has been placed and PDF invoice downloaded successfully.",
      });

      // Clear the cart and form
      handleClearCart();
      setCustomerDetails({ 
        name: "", 
        phone: "", 
        address: "", 
        notes: "",
        orderDate: new Date().toISOString().split('T')[0],
        invoiceDate: new Date().toISOString().split('T')[0],
        deliveryDate: new Date().toISOString().split('T')[0],
        shippingCharge: 0
      });
      setDiscount(0);

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
      {/* Header */}
      <header className="bg-card/95 backdrop-blur-sm border-b border-border shadow-warm sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-golden rounded-full flex items-center justify-center">
                <Heart className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">PRIYUM</h1>
                <p className="text-sm text-muted-foreground -mt-1">Cakes & Bakes - Invoice Generator</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Receipt className="w-4 h-4 mr-2" />
                    Invoice Settings
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Invoice Settings</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="businessName">Business Name</Label>
                      <Input
                        id="businessName"
                        value={invoiceSettings.businessName}
                        onChange={(e) => setInvoiceSettings(prev => ({ ...prev, businessName: e.target.value }))}
                        placeholder="❤️ PRIYUM"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="businessSubtitle">Business Subtitle</Label>
                      <Input
                        id="businessSubtitle"
                        value={invoiceSettings.businessSubtitle}
                        onChange={(e) => setInvoiceSettings(prev => ({ ...prev, businessSubtitle: e.target.value }))}
                        placeholder="Cakes & Bakes"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="businessPhone">Phone Number</Label>
                      <Input
                        id="businessPhone"
                        value={invoiceSettings.phone}
                        onChange={(e) => setInvoiceSettings(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="+91 98765 43210"
                      />
                    </div>
                     <div className="grid gap-2">
                       <Label htmlFor="businessEmail">Email Address</Label>
                       <Input
                         id="businessEmail"
                         type="email"
                         value={invoiceSettings.email}
                         onChange={(e) => setInvoiceSettings(prev => ({ ...prev, email: e.target.value }))}
                         placeholder="orders@priyumbakes.com"
                       />
                     </div>
                     
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsSettingsOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={() => { saveInvoiceSettings(); setIsSettingsOpen(false); }}>
                      Save Settings
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              
              <Button onClick={() => navigate('/admin')} variant="outline" size="sm">
                <Settings className="w-4 h-4 mr-2" />
                Admin
              </Button>
              <Button onClick={handleSignOut} variant="outline" size="sm">
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Title */}
        <div className="text-center mb-8">
          <Badge variant="secondary" className="mb-4">
            <Receipt className="w-3 h-3 mr-1 text-accent" />
            Order & Invoice Generator
          </Badge>
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
            Create Your Order Invoice
          </h2>
          <p className="text-lg text-muted-foreground">
            Select products, enter customer details, and generate a professional PDF invoice
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {/* Products Selection */}
          <div className="lg:col-span-1">
            <Card className="shadow-warm">
              <CardHeader>
                <CardTitle>Select Products</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Category Tabs */}
                <Tabs defaultValue={categories[0]} className="w-full">
                  <TabsList className="grid w-full grid-cols-3 mb-4">
                    {categories.map((category) => (
                      <TabsTrigger key={category} value={category} className="text-xs">
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  
                  {categories.map((category) => (
                    <TabsContent key={category} value={category}>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold">
                            {category.charAt(0).toUpperCase() + category.slice(1)}
                          </h4>
                          <Badge variant="outline" className="text-xs">
                            {products.filter(p => p.category === category).length} products
                          </Badge>
                        </div>
                        
                        {(() => {
                          const categoryProducts = products.filter(p => p.category === category);
                          
                          if (categoryProducts.length === 0) {
                            return (
                              <div className="text-center py-6">
                                <div className="text-muted-foreground">
                                  <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                  <p className="text-sm">No products in this category</p>
                                </div>
                              </div>
                            );
                          }
                          
                          return (
                            <div className="space-y-3">
                              {categoryProducts.map((product) => (
                                <div key={product.id} className="flex items-center space-x-3 p-3 bg-background rounded-lg border">
                                  <img
                                    src={product.image}
                                    alt={product.name}
                                    className="w-16 h-16 object-cover rounded-lg"
                                  />
                                  <div className="flex-1">
                                    <h4 className="font-medium text-foreground text-sm">{product.name}</h4>
                                    <p className="text-xs text-muted-foreground">{product.description}</p>
                                    <div className="flex items-center gap-2">
                                      <p className="text-sm font-bold text-primary">₹{product.price}</p>
                                      {Array.isArray(product.weight_options) && product.weight_options.length > 0 && (
                                        <Badge variant="secondary" className="text-xs">
                                          {product.weight_options.length} sizes
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                  <Button
                                    onClick={() => handleSelectWeight(product)}
                                    size="sm"
                                    variant="outline"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Cart & Customer Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Cart Items */}
            <Card className="shadow-warm">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <ShoppingCart className="w-5 h-5 mr-2" />
                    Cart Items ({cartItems.length})
                  </span>
                  {cartItems.length > 0 && (
                    <Button variant="outline" size="sm" onClick={handleClearCart}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Clear Cart
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {cartItems.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <ShoppingCart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Your cart is empty</p>
                    <p className="text-sm">Add some delicious items from the left!</p>
                  </div>
                ) : (
                  cartItems.map((item) => (
                    <div key={item.id} className="flex items-center space-x-4 p-4 bg-background rounded-lg">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-12 h-12 object-cover rounded-lg"
                      />
                      <div className="flex-1">
                        <h4 className="font-medium text-foreground text-sm">{item.name}</h4>
                        <p className="text-xs text-muted-foreground">₹{item.price} each</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleUpdateQuantity(item.id, Math.max(0, item.quantity - 1))}
                          className="h-6 w-6"
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                          className="h-6 w-6"
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleRemoveItem(item.id)}
                          className="h-6 w-6 ml-2"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                      <div className="font-medium text-foreground text-sm">
                        ₹{roundPrice(item.price * item.quantity)}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Customer Details */}
            <Card className="shadow-warm">
              <CardHeader>
                <CardTitle>Customer Details</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={customerDetails.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    placeholder="Enter customer name"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={customerDetails.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    placeholder="+91 98765 43210"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="address">Delivery Address *</Label>
                  <Textarea
                    id="address"
                    value={customerDetails.address}
                    onChange={(e) => handleInputChange("address", e.target.value)}
                    placeholder="Enter complete delivery address"
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="orderDate">Order Date</Label>
                  <Input
                    id="orderDate"
                    type="date"
                    value={customerDetails.orderDate}
                    onChange={(e) => handleInputChange("orderDate", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="invoiceDate">Invoice Date</Label>
                  <Input
                    id="invoiceDate"
                    type="date"
                    value={customerDetails.invoiceDate}
                    onChange={(e) => handleInputChange("invoiceDate", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="deliveryDate">Delivery Date</Label>
                  <Input
                    id="deliveryDate"
                    type="date"
                    value={customerDetails.deliveryDate}
                    onChange={(e) => handleInputChange("deliveryDate", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="shippingCharge">Shipping Charge (₹)</Label>
                  <Input
                    id="shippingCharge"
                    type="number"
                    min="0"
                    value={customerDetails.shippingCharge}
                    onChange={(e) => handleInputChange("shippingCharge", e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="notes">Special Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={customerDetails.notes}
                    onChange={(e) => handleInputChange("notes", e.target.value)}
                    placeholder="Any special instructions or requests"
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Order Summary & Invoice Generation */}
            <Card className="shadow-golden">
              <CardHeader>
                <CardTitle>Order Summary & Invoice</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>₹{subtotal}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span className={shippingCharge === 0 ? "text-green-600 font-medium" : ""}>
                    {shippingCharge === 0 ? "FREE" : `₹${shippingCharge}`}
                  </span>
                </div>
                
                <Separator />
                
                <div>
                  <Label htmlFor="discount">Discount (%)</Label>
                  <Input
                    id="discount"
                    type="number"
                    min="0"
                    max="100"
                    value={discount}
                    onChange={(e) => setDiscount(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                    placeholder="0"
                  />
                </div>
                
                {discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount ({discount}%)</span>
                    <span>-₹{discountAmount}</span>
                  </div>
                )}
                
                <Separator />
                
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-primary">₹{total}</span>
                </div>
                
                <Button
                  onClick={generateInvoice}
                  disabled={isGeneratingPDF || cartItems.length === 0}
                  className="w-full shadow-golden"
                  size="lg"
                  variant="hero"
                >
                  <Receipt className="w-4 h-4 mr-2" />
                  {isGeneratingPDF ? "Generating Invoice..." : "Generate & Download PDF Invoice"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Weight Selector Dialog */}
      <Dialog open={isWeightDialogOpen} onOpenChange={setIsWeightDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Select Weight & Price</DialogTitle>
          </DialogHeader>
          {selectedProduct && (
            <div className="grid gap-4 py-4">
              <div className="flex items-center space-x-3 mb-4">
                <img
                  src={selectedProduct.image}
                  alt={selectedProduct.name}
                  className="w-16 h-16 object-cover rounded-lg"
                />
                <div>
                  <h4 className="font-medium">{selectedProduct.name}</h4>
                  <p className="text-sm text-muted-foreground">{selectedProduct.description}</p>
                </div>
              </div>
              
              <div className="space-y-3">
                {/* Base option */}
                <div 
                  className="p-3 border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => handleWeightSelection(selectedProduct.base_weight || 500, selectedProduct.price, selectedProduct.weight_unit || 'grams')}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium">
                      {selectedProduct.base_weight || 500} {selectedProduct.weight_unit || 'grams'} (Base)
                    </span>
                    <span className="font-bold text-primary">₹{selectedProduct.price}</span>
                  </div>
                </div>

                {/* Weight options */}
                {Array.isArray(selectedProduct.weight_options) && 
                  selectedProduct.weight_options.map((option, index) => (
                    <div 
                      key={index}
                      className="p-3 border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors"
                      onClick={() => handleWeightSelection(option.weight, option.price, option.unit)}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium">
                          {option.weight} {option.unit}
                        </span>
                        <span className="font-bold text-primary">₹{option.price}</span>
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;