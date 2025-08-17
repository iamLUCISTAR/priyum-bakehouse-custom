import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Phone, Mail, Instagram, Heart, X, Menu, Star, ShoppingBag, Clock, MapPin } from "lucide-react";
import ProductQuickView from "@/components/ProductQuickView";
import MobileSearchFilter from "@/components/MobileSearchFilter";
import type { Database } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";

type Product = Database["public"]["Tables"]["products"]["Row"];

interface InvoiceSettings {
  phone: string;
  email: string;
  business_name: string;
}

interface FilterOptions {
  priceRange: string;
  sortBy: string;
  availability: string;
}

const Landing = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [contactInfo, setContactInfo] = useState<InvoiceSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("Cookies");
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<FilterOptions>({
    priceRange: "all",
    sortBy: "name",
    availability: "all"
  });
  const [orderIdToCheck, setOrderIdToCheck] = useState("");
  const [orderStatusResult, setOrderStatusResult] = useState<any>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterAndSortProducts();
  }, [products, selectedCategory, searchQuery, filters]);

  const loadData = async () => {
    try {
      // Load products
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("*")
        .order("category", { ascending: true });

      if (productsError) {
        console.error("Error loading products:", productsError);
      } else if (productsData) {
        setProducts(productsData);
        console.log("Products loaded:", productsData.length);
      }

      // Set hardcoded contact information
      setContactInfo({
        phone: "+91 9677349169",
        email: "priyum.orders@gmail.com",
        business_name: "PRIYUM CAKES & BAKES"
      });
      console.log("Contact info set to hardcoded values");
    } catch (error) {
      console.error("Error loading data:", error);
      // Set hardcoded contact information even on error
      setContactInfo({
        phone: "+91 9677349169",
        email: "priyum.orders@gmail.com",
        business_name: "PRIYUM CAKES & BAKES"
      });
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortProducts = () => {
    let filtered = products.filter(product => {
      // Filter by category
      const normalizedCategory = product.category 
        ? product.category.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')
        : "Others";
      
      if (normalizedCategory !== selectedCategory) return false;

      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = product.name?.toLowerCase().includes(query);
        const matchesDescription = product.description?.toLowerCase().includes(query);
        if (!matchesName && !matchesDescription) return false;
      }

      // Filter by price range
      if (filters.priceRange !== "all") {
        const price = product.price;
        switch (filters.priceRange) {
          case "0-100":
            if (price > 100) return false;
            break;
          case "100-200":
            if (price < 100 || price > 200) return false;
            break;
          case "200-500":
            if (price < 200 || price > 500) return false;
            break;
          case "500+":
            if (price < 500) return false;
            break;
        }
      }

      return true;
    });

    // Sort products
    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case "name":
          return (a.name || "").localeCompare(b.name || "");
        case "name-desc":
          return (b.name || "").localeCompare(a.name || "");
        case "price":
          return (a.price || 0) - (b.price || 0);
        case "price-desc":
          return (b.price || 0) - (a.price || 0);
        case "popular":
          // For now, sort by name as popularity isn't tracked
          return (a.name || "").localeCompare(b.name || "");
        default:
          return 0;
      }
    });

    setFilteredProducts(filtered);
  };

  const groupedProducts = filteredProducts.reduce((acc, product) => {
    // Normalize category to match UI categories (capitalize first letter of each word)
    const normalizedCategory = product.category 
      ? product.category.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')
      : "Others";
    
    // Parse weight_options if it's a string
    const processedProduct = {
      ...product,
      weight_options: typeof product.weight_options === 'string' 
        ? JSON.parse(product.weight_options || '[]')
        : product.weight_options || []
    };
    
    if (!acc[normalizedCategory]) {
      acc[normalizedCategory] = [];
    }
    acc[normalizedCategory].push(processedProduct);
    return acc;
  }, {} as Record<string, Product[]>);

  const categories = ["Cookies", "Brownies", "Eggless Brownies"];
  
  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setIsProductModalOpen(true);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleFilterChange = (newFilters: FilterOptions) => {
    setFilters(newFilters);
  };

  const formatPrice = (price: number, weight?: number, unit?: string) => {
    if (weight && unit) {
      return `₹${price} (${weight}${unit})`;
    }
    return `₹${price}`;
  };

  const getCookieCountInfo = (product: Product) => {
    if (product.category?.toLowerCase() === 'cookies') {
      return '10-11 cookies approx';
    }
    return null;
  };

  const formatStatus = (status: string) => {
    return status.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const year = date.getFullYear().toString().slice(-2);
    return `${day} ${month} ${year}`;
  };

  const getStatusAnimation = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-yellow-500 border-t-transparent"></div>
            <span className="text-xs text-yellow-600">⏰</span>
          </div>
        );
      case "preparing":
        return (
          <div className="flex items-center space-x-2">
            <div className="animate-whisk-rotate h-4 w-4 text-blue-600">🥄</div>
            <span className="text-xs text-blue-600">Whisking</span>
          </div>
        );
      case "ready":
        return (
          <div className="flex items-center space-x-2">
            <div className="animate-package-bounce h-4 w-4 text-green-600">📦</div>
            <span className="text-xs text-green-600">Packed</span>
          </div>
        );
      case "shipped":
        return (
          <div className="flex items-center space-x-2">
            <div className="animate-truck-move h-4 w-4 text-blue-600">🚚</div>
            <span className="text-xs text-blue-600">Moving</span>
          </div>
        );
      case "delivered":
        return (
          <div className="flex items-center space-x-2">
            <div className="animate-heart-eyes h-4 w-4 text-pink-600">😍</div>
            <span className="text-xs text-pink-600">Delivered</span>
          </div>
        );
      case "cancelled":
        return (
          <div className="flex items-center space-x-2">
            <div className="h-4 w-4 text-red-500">❌</div>
            <span className="text-xs text-red-500">Cancelled</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center space-x-2">
            <div className="h-4 w-4 bg-gray-500 rounded-full"></div>
            <span className="text-xs text-gray-500">Unknown</span>
          </div>
        );
    }
  };

  const getStatusMessage = (status: string) => {
    switch (status) {
      case "pending":
        return "Order Pending";
      case "preparing":
        return "Preparing Your Order";
      case "ready":
        return "Ready for Pickup/Delivery";
      case "shipped":
        return "Order Shipped";
      case "delivered":
        return "Order Delivered";
      case "cancelled":
        return "Order Cancelled";
      default:
        return "Unknown Status";
    }
  };

  const getStatusDescription = (status: string) => {
    switch (status) {
      case "pending":
        return "Your order has been received and is waiting to be processed.";
      case "preparing":
        return "Our team is preparing your delicious treats with care.";
      case "ready":
        return "Your order is ready! You can pick it up or we'll deliver it soon.";
      case "shipped":
        return "Your order has been shipped and is on its way to you.";
      case "delivered":
        return "Your order has been successfully delivered. Enjoy your treats!";
      case "cancelled":
        return "This order has been cancelled. Please contact us if you have any questions.";
      default:
        return "We're processing your order status.";
    }
  };

  const checkOrderStatus = async (orderId: string) => {
    if (!orderId.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid Order ID",
        variant: "destructive",
      });
      return;
    }

    setIsCheckingStatus(true);
    try {
      // Fetch the order details including status and shipment number
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('id, customer_name, status, shipment_number, created_at, total')
        .eq('id', orderId)
        .single();

      if (orderError || !orderData) {
        toast({
          title: "Order Not Found",
          description: "No order found with this Order ID",
          variant: "destructive",
        });
        return;
      }

      // Set order status result
      setOrderStatusResult({
        orderId: orderData.id,
        customerName: orderData.customer_name,
        status: orderData.status,
        shipmentNumber: orderData.shipment_number,
        total: orderData.total,
        createdAt: orderData.created_at,
        timestamp: new Date().toISOString()
      });

      setShowStatusModal(true);
      setIsMobileMenuOpen(false);

      // Removed the toast notification for "Order Status Found"

    } catch (error) {
      console.error('Order status check error:', error);
      toast({
        title: "Error",
        description: "Unable to fetch order details. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsCheckingStatus(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-amber-200 border-t-amber-600 mx-auto"></div>
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-amber-400 animate-ping"></div>
          </div>
          <p className="text-muted-foreground text-lg">Loading delicious treats...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 dark:from-amber-900 dark:via-yellow-900 dark:to-orange-900">
      {/* Mobile Navigation Header */}
      <header className="bg-[#FEED95] backdrop-blur-sm border-b border-amber-200 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Left side - Empty for balance */}
            <div className="w-10"></div>
            
            {/* Centered Logo */}
            <div className="flex-1 flex justify-center">
              <img 
                src="/lovable-uploads/621d91fb-0a7a-4b83-b539-e0ecd76fb97d.png" 
                alt="Priyum Bakehouse Logo" 
                className="h-16 w-auto"
              />
            </div>

            {/* Right side - Menu Button */}
            <div className="w-10 flex justify-end">
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="sm:hidden">
                    <Menu className="h-6 w-6 text-amber-800" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[300px] bg-amber-50/95 border-amber-200">
                  <SheetHeader>
                    <SheetTitle className="text-amber-800">Menu</SheetTitle>
                  </SheetHeader>
                  <div className="mt-8 space-y-6">
                    {/* Category Navigation */}
                    <div>
                      <h3 className="text-sm font-semibold text-amber-700 mb-3">Categories</h3>
                      <div className="space-y-2">
                        {categories.map((category) => (
                          <button
                            key={category}
                            onClick={() => {
                              setSelectedCategory(category);
                              setIsMobileMenuOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                              selectedCategory === category
                                ? 'bg-amber-200 text-amber-800'
                                : 'text-amber-700 hover:bg-amber-100'
                            }`}
                          >
                            {category}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Contact Info */}
                    <div>
                      <h3 className="text-sm font-semibold text-amber-700 mb-3">Contact Us</h3>
                      <div className="space-y-3">
                        <a
                          href="tel:+91 9677349169"
                          className="flex items-center space-x-3 text-amber-700 hover:text-amber-600 transition-colors"
                        >
                          <Phone className="h-4 w-4" />
                          <span>+91 9677349169</span>
                        </a>
                        <a
                          href="mailto:priyum.orders@gmail.com"
                          className="flex items-center space-x-3 text-amber-700 hover:text-amber-600 transition-colors"
                        >
                          <Mail className="h-4 w-4" />
                          <span>priyum.orders@gmail.com</span>
                        </a>
                        <a
                          href="https://www.instagram.com/priyum_bakery?igsh=MW5oZHdvOTM3bnRwcw=="
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center space-x-3 text-amber-700 hover:text-amber-600 transition-colors"
                        >
                          <Instagram className="h-4 w-4" />
                          <span>@priyum_bakery</span>
                        </a>
                      </div>
                    </div>

                    {/* Check Order Status */}
                    <div>
                      <h3 className="text-sm font-semibold text-amber-700 mb-3">Check Order Status</h3>
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Input
                            placeholder="Enter Order ID"
                            value={orderIdToCheck}
                            onChange={(e) => setOrderIdToCheck(e.target.value)}
                            className="text-sm"
                          />
                          <Button
                            onClick={() => checkOrderStatus(orderIdToCheck)}
                            disabled={isCheckingStatus || !orderIdToCheck.trim()}
                            className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white"
                            size="sm"
                          >
                            {isCheckingStatus ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                                Checking...
                              </>
                            ) : (
                              <>
                                <Clock className="h-4 w-4 mr-2" />
                                Check Status
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      {/* Scrolling Banner */}
      <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white overflow-hidden">
        <div className="scrolling-banner-wrapper">
          <div className="scrolling-banner-track">
            <div className="scrolling-banner-item">
              🎉 Flat 10% off on your first order with us.
            </div>
            <div className="scrolling-banner-separator">|</div>
            <div className="scrolling-banner-item">
              🚚 Shipping available all across India
            </div>
            <div className="scrolling-banner-separator">|</div>
            <div className="scrolling-banner-item">
              💵 Shipping charges as applicable
            </div>
            <div className="scrolling-banner-separator">|</div>
            <div className="scrolling-banner-item">
              🎉 Flat 10% off on your first order with us.
            </div>
            <div className="scrolling-banner-separator">|</div>
            <div className="scrolling-banner-item">
              🚚 Shipping available all across India
            </div>
            <div className="scrolling-banner-separator">|</div>
            <div className="scrolling-banner-item">
              💵 Shipping charges as applicable
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 pb-8 pt-8">
        {/* Mobile Category Switcher */}
        <div className="sm:hidden mb-6">
          <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`flex-shrink-0 px-6 py-3 rounded-full font-medium transition-all duration-200 ${
                  selectedCategory === category
                    ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg'
                    : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Desktop Tabs */}
        <div className="hidden sm:block">
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
            <TabsList className="flex w-full justify-center mb-8 bg-amber-100/70 backdrop-blur-sm p-2 rounded-xl shadow-sm gap-2">
            {categories.map((category) => (
              <TabsTrigger 
                key={category} 
                value={category}
                className="flex-1 min-w-0 px-6 py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-600 data-[state=active]:to-orange-600 data-[state=active]:text-white rounded-lg font-medium transition-all duration-200 text-sm sm:text-base"
              >
                {category}
              </TabsTrigger>
            ))}
          </TabsList>
          </Tabs>
        </div>
        
        {/* Product Grid */}
        {(() => {
          const categoryProducts = groupedProducts[selectedCategory] || [];
          
          if (categoryProducts.length === 0) {
            return (
                  <div className="text-center py-16">
                <div className="bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-amber-900/20 dark:to-yellow-900/20 rounded-2xl p-8 sm:p-12 max-w-lg mx-auto shadow-lg backdrop-blur-sm border border-amber-200/50">
                  <div className="text-6xl sm:text-8xl mb-6 animate-bounce">
                    {searchQuery ? "🔍" : "🔜"}
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-bold text-amber-800 mb-4">
                    {searchQuery ? "No Results Found" : "Coming Soon"}
                  </h3>
                  <p className="text-base sm:text-lg text-amber-700">
                    {searchQuery 
                      ? `No products found matching "${searchQuery}"`
                      : `Delicious ${selectedCategory.toLowerCase()} are on their way!`
                    }
                      </p>
                    </div>
                  </div>
            );
          }

          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
              {categoryProducts.map((product) => {
                const ProductCard = (
                      <Card 
                    className="group overflow-hidden hover:shadow-xl transition-all duration-300 bg-amber-50/80 backdrop-blur-sm border-amber-200/50 hover:scale-105 cursor-pointer touch-manipulation"
                      >
                        {product.image && (
                      <div className="overflow-hidden relative">
                            <img
                              src={product.image}
                              alt={product.name}
                          className="w-full h-auto object-contain group-hover:scale-110 transition-transform duration-300"
                          loading="lazy"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          </div>
                        )}
                    <CardContent className="p-4 sm:p-6">
                      <h3 className="font-bold text-lg sm:text-xl mb-2 text-foreground group-hover:text-primary transition-colors line-clamp-2">
                            {product.name}
                          </h3>
                          {product.description && (
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2 leading-relaxed">
                              {product.description}
                            </p>
                          )}
                          
                          <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Badge variant="secondary" className="text-base sm:text-lg font-bold px-3 py-1 bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-sm">
                                {formatPrice(product.price, product.base_weight || undefined, product.weight_unit || undefined)}
                              </Badge>
                              {product.weight_options && Array.isArray(product.weight_options) && product.weight_options.length > 0 && (
                            <Badge variant="outline" className="text-xs border-amber-300 text-amber-600 bg-amber-50">
                              +{product.weight_options.length} sizes
                            </Badge>
                              )}
                            </div>
                            
                        <div className="flex items-center justify-center text-xs text-amber-600">
                          <div className="flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span>Fresh Daily</span>
                          </div>
                        </div>
                          </div>
                        </CardContent>
                      </Card>
                );

                // Use ProductQuickView for mobile, regular modal for desktop
                return (
                  <div key={product.id}>
                    {/* Mobile: ProductQuickView */}
                    <div className="sm:hidden">
                      <ProductQuickView product={product} contactInfo={contactInfo}>
                        {ProductCard}
                      </ProductQuickView>
                    </div>
                    
                    {/* Desktop: Regular modal */}
                    <div className="hidden sm:block" onClick={() => handleProductClick(product)}>
                      {ProductCard}
                    </div>
                  </div>
            );
          })}
            </div>
          );
        })()}

        {/* Product Detail Modal - Desktop Only */}
        <Dialog open={isProductModalOpen} onOpenChange={setIsProductModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-amber-50/95 backdrop-blur-sm border-amber-200 p-0">
            <DialogHeader className="p-6 pb-0">
              <DialogTitle className="text-xl sm:text-2xl font-bold text-amber-800">
                {selectedProduct?.name}
              </DialogTitle>
            </DialogHeader>
            
            {selectedProduct && (
              <div className="p-6 pt-4">
                {/* Mobile Image Carousel */}
                <div className="sm:hidden mb-6">
                  <Carousel className="w-full">
                    <CarouselContent>
                      <CarouselItem>
                        {selectedProduct.image ? (
                          <div className="overflow-hidden rounded-xl border-2 border-amber-200">
                            <img
                              src={selectedProduct.image}
                              alt={selectedProduct.name}
                              className="w-full h-auto object-contain"
                            />
                          </div>
                        ) : (
                          <div className="aspect-square bg-amber-100 rounded-xl border-2 border-amber-200 flex items-center justify-center">
                            <p className="text-amber-600">No image available</p>
                          </div>
                        )}
                      </CarouselItem>
                    </CarouselContent>
                  </Carousel>
                </div>

                <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
                  {/* Desktop Product Image */}
                  <div className="hidden sm:block space-y-4">
                  {selectedProduct.image ? (
                      <div className="overflow-hidden rounded-xl border-2 border-amber-200">
                      <img
                        src={selectedProduct.image}
                        alt={selectedProduct.name}
                          className="w-full h-auto object-contain"
                      />
                    </div>
                  ) : (
                    <div className="aspect-square bg-amber-100 rounded-xl border-2 border-amber-200 flex items-center justify-center">
                      <p className="text-amber-600">No image available</p>
                    </div>
                  )}
                </div>

                {/* Product Details */}
                <div className="space-y-6">
                  {selectedProduct.description && (
                    <div>
                      <h3 className="text-lg font-semibold text-amber-800 mb-2">Description</h3>
                      <p className="text-amber-700 leading-relaxed">
                        {selectedProduct.description}
                      </p>
                    </div>
                  )}

                  <div>
                    <h3 className="text-lg font-semibold text-amber-800 mb-3">Pricing</h3>
                    
                    {/* Base Price */}
                    <div className="bg-amber-100/70 rounded-lg p-4 mb-4 border border-amber-200">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-amber-800">
                          Base Price {selectedProduct.base_weight && selectedProduct.weight_unit && 
                            `(${selectedProduct.base_weight}${selectedProduct.weight_unit})`}
                        </span>
                        <Badge className="bg-gradient-to-r from-amber-600 to-orange-600 text-white text-lg px-3 py-1">
                          ₹{selectedProduct.price}
                        </Badge>
                      </div>
                      {/* Cookie Count Information */}
                      {getCookieCountInfo(selectedProduct) && (
                        <div className="mt-2 text-center">
                          <span className="text-sm text-amber-700 font-medium bg-amber-50 px-3 py-1 rounded-full">
                            {getCookieCountInfo(selectedProduct)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Weight Options */}
                    {selectedProduct.weight_options && 
                     Array.isArray(selectedProduct.weight_options) && 
                     selectedProduct.weight_options.length > 0 && (
                      <div>
                        <h4 className="font-medium text-amber-800 mb-3">Available Sizes</h4>
                        <div className="space-y-2">
                          {selectedProduct.weight_options.map((option: any, index: number) => (
                            <div 
                              key={index} 
                              className="bg-white/70 rounded-lg p-3 border border-amber-200 flex justify-between items-center hover:bg-amber-50/70 transition-colors"
                            >
                              <span className="text-amber-800 font-medium">
                                {option.weight}{option.unit}
                              </span>
                              <Badge variant="outline" className="border-amber-300 text-amber-700 bg-amber-50">
                                ₹{option.price}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                    {/* Product Features */}
                    <div className="flex items-center justify-center text-amber-600">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4" />
                        <span className="text-sm">Fresh Daily</span>
                      </div>
                    </div>

                  {/* Contact for Orders */}
                  <div className="bg-gradient-to-r from-amber-100 to-yellow-100 rounded-lg p-4 border border-amber-200">
                    <h4 className="font-semibold text-amber-800 mb-2">Place Your Order</h4>
                      <p className="text-sm text-amber-700 mb-4">
                      Contact us directly to place your order for this delicious treat!
                    </p>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <Button
                          asChild
                          size="lg"
                          className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white flex-1"
                        >
                          <a href="https://wa.me/919677349169" target="_blank" rel="noopener noreferrer">
                            <Phone className="h-4 w-4 mr-2" />
                            WhatsApp Now
                          </a>
                        </Button>
                        <Button
                          asChild
                          variant="outline"
                          size="lg"
                          className="border-amber-300 text-amber-700 hover:bg-amber-50 flex-1"
                        >
                          <a href="mailto:priyum.orders@gmail.com">
                            <Mail className="h-4 w-4 mr-2" />
                            Email Us
                          </a>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Order Status Modal */}
        <Dialog open={showStatusModal} onOpenChange={setShowStatusModal}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-amber-50/95 backdrop-blur-sm border-amber-200 transition-all duration-300 ease-in-out transform scale-100 opacity-100 animate-modal-entrance">
            <DialogHeader className="transition-all duration-300 ease-in-out">
              <DialogTitle className="text-xl font-bold text-amber-800 flex items-center transition-all duration-300 ease-in-out">
                <Clock className="h-5 w-5 mr-2 transition-transform duration-300 ease-in-out" />
                Order Status
              </DialogTitle>
            </DialogHeader>
            
            {orderStatusResult && (
              <div className="space-y-6 transition-all duration-500 ease-in-out animate-fade-in">
                {/* Order Details */}
                <div className="bg-white/70 rounded-lg p-4 border border-amber-200 transition-all duration-300 ease-in-out hover:shadow-md transform hover:scale-[1.02]">
                  <h3 className="font-semibold text-amber-800 mb-3 transition-all duration-300 ease-in-out">Order Information</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm transition-all duration-300 ease-in-out">
                    <div className="transition-all duration-300 ease-in-out hover:bg-amber-50/50 p-2 rounded">
                      <span className="text-amber-600 font-medium">Order ID:</span>
                      <p className="text-amber-800">{orderStatusResult.orderId}</p>
                    </div>
                    <div className="transition-all duration-300 ease-in-out hover:bg-amber-50/50 p-2 rounded">
                      <span className="text-amber-600 font-medium">Customer:</span>
                      <p className="text-amber-800">{orderStatusResult.customerName}</p>
                    </div>
                    <div className="transition-all duration-300 ease-in-out hover:bg-amber-50/50 p-2 rounded">
                      <span className="text-amber-600 font-medium">Status:</span>
                      <div className="flex items-center space-x-2">
                        <p className="text-amber-800">{formatStatus(orderStatusResult.status)}</p>
                        {getStatusAnimation(orderStatusResult.status)}
                      </div>
                    </div>
                    <div className="transition-all duration-300 ease-in-out hover:bg-amber-50/50 p-2 rounded">
                      <span className="text-amber-600 font-medium">Total:</span>
                      <p className="text-amber-800">₹{orderStatusResult.total}</p>
                    </div>
                    <div className="transition-all duration-300 ease-in-out hover:bg-amber-50/50 p-2 rounded">
                      <span className="text-amber-600 font-medium">Created At:</span>
                      <p className="text-amber-800">{formatDate(orderStatusResult.createdAt)}</p>
                    </div>
                    <div className="transition-all duration-300 ease-in-out hover:bg-amber-50/50 p-2 rounded">
                      <span className="text-amber-600 font-medium">Checked At:</span>
                      <p className="text-amber-800">{formatDate(orderStatusResult.timestamp)}</p>
                    </div>
                  </div>
                </div>

                {/* Conditional Content based on Status */}
                {orderStatusResult.status === "shipped" && orderStatusResult.shipmentNumber ? (
                  // Show shipment tracking for shipped orders with shipment number
                  <>
                    <div className="bg-white/70 rounded-lg p-4 border border-amber-200 transition-all duration-300 ease-in-out hover:shadow-md transform hover:scale-[1.02]">
                      <h3 className="font-semibold text-amber-800 mb-3 flex items-center transition-all duration-300 ease-in-out">
                        <MapPin className="h-5 w-5 mr-2 transition-transform duration-300 ease-in-out" />
                        Shipment Tracking
                      </h3>
                      <div className="bg-gray-50 rounded p-3 border transition-all duration-300 ease-in-out">
                        <p className="text-sm text-gray-600 mb-2 transition-all duration-300 ease-in-out">
                          <strong>Note:</strong> To get detailed tracking information, 
                          please visit the <a href="https://www.dtdc.in/trace.asp" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline transition-all duration-300 ease-in-out">DTDC tracking page</a> directly.
                        </p>
                        <div className="text-sm text-gray-700 transition-all duration-300 ease-in-out">
                          <p><strong>Shipment Number:</strong> {orderStatusResult.shipmentNumber}</p>
                          <p><strong>Status:</strong> Ready for tracking on DTDC website</p>
                        </div>
                      </div>
                    </div>

                    {/* Direct DTDC Link */}
                    <div className="bg-gradient-to-r from-amber-100 to-yellow-100 rounded-lg p-4 border border-amber-200 transition-all duration-300 ease-in-out hover:shadow-md transform hover:scale-[1.02]">
                      <h4 className="font-semibold text-amber-800 mb-2 transition-all duration-300 ease-in-out">Get Detailed Tracking</h4>
                      <p className="text-sm text-amber-700 mb-3 transition-all duration-300 ease-in-out">
                        For complete tracking details, visit the official DTDC tracking page.
                      </p>
                      <Button
                        asChild
                        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white transition-all duration-300 ease-in-out transform hover:scale-[1.02]"
                      >
                        <a 
                          href={`https://www.dtdc.in/trace.asp?awb=${orderStatusResult.shipmentNumber}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                        >
                          <MapPin className="h-4 w-4 mr-2 transition-transform duration-300 ease-in-out" />
                          View on DTDC Website
                        </a>
                      </Button>
                    </div>
                  </>
                ) : (
                  // Show status-specific information for other statuses
                  <div className="bg-white/70 rounded-lg p-4 border border-amber-200 transition-all duration-300 ease-in-out hover:shadow-md transform hover:scale-[1.02]">
                    <h3 className="font-semibold text-amber-800 mb-3 transition-all duration-300 ease-in-out">Current Status</h3>
                    <div className="bg-gray-50 rounded p-3 border transition-all duration-300 ease-in-out">
                      <div className="flex items-center space-x-3 mb-3 transition-all duration-300 ease-in-out">
                        {getStatusAnimation(orderStatusResult.status)}
                        <span className="text-lg font-medium text-amber-800 transition-all duration-300 ease-in-out">
                          {formatStatus(getStatusMessage(orderStatusResult.status))}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 transition-all duration-300 ease-in-out">
                        {getStatusDescription(orderStatusResult.status)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>

      {/* Footer */}
      <footer className="bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-gray-800 dark:to-gray-900 border-t border-amber-200 mt-16 shadow-inner">
        <div className="container mx-auto px-4 py-8 sm:py-12">
          <div className="text-center space-y-6">
            <div className="flex items-center justify-center gap-2">
              <h3 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-amber-700 to-orange-700 bg-clip-text text-transparent">For Orders</h3>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8">
              <a
                href="https://wa.me/919677349169"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-amber-800 hover:text-amber-600 transition-all duration-200 p-3 rounded-lg hover:bg-amber-50/70 backdrop-blur-sm"
              >
                <Phone className="h-5 w-5 sm:h-6 sm:w-6" />
                <span className="font-semibold text-base sm:text-lg">+91 9677349169</span>
              </a>
              
              <a
                href="mailto:priyum.orders@gmail.com"
                className="flex items-center gap-3 text-amber-800 hover:text-amber-600 transition-all duration-200 p-3 rounded-lg hover:bg-amber-50/70 backdrop-blur-sm"
              >
                <Mail className="h-5 w-5 sm:h-6 sm:w-6" />
                <span className="font-semibold text-base sm:text-lg">priyum.orders@gmail.com</span>
              </a>
              
              <a
                href="https://www.instagram.com/priyum_bakery?igsh=MW5oZHdvOTM3bnRwcw=="
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-amber-800 hover:text-amber-600 transition-all duration-200 p-3 rounded-lg hover:bg-amber-50/70 backdrop-blur-sm"
              >
                <Instagram className="h-5 w-5 sm:h-6 sm:w-6" />
                <span className="font-semibold text-base sm:text-lg">@priyum_bakery</span>
              </a>
            </div>
            
            <div className="pt-6 border-t border-amber-300/50">
              <p className="text-amber-700 text-sm sm:text-base">
                © 2025 {"PRIYUM CAKES & BAKES"}. Made with ❤️
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;