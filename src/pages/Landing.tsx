import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Phone, Mail, Instagram, Heart, X } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Product = Database["public"]["Tables"]["products"]["Row"];

interface InvoiceSettings {
  phone: string;
  email: string;
  business_name: string;
}

const Landing = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [contactInfo, setContactInfo] = useState<InvoiceSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load products
      const { data: productsData } = await supabase
        .from("products")
        .select("*")
        .order("category", { ascending: true });

      if (productsData) {
        setProducts(productsData);
      }

      // Load contact info (get any invoice settings for contact display)
      const { data: settingsData } = await supabase
        .from("invoice_settings")
        .select("phone, email, business_name")
        .limit(1)
        .single();

      if (settingsData) {
        setContactInfo(settingsData);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const groupedProducts = products.reduce((acc, product) => {
    // Normalize category to match UI categories (capitalize first letter)
    const normalizedCategory = product.category 
      ? product.category.charAt(0).toUpperCase() + product.category.slice(1).toLowerCase()
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

  const categories = ["Cookies", "Brownies"];
  
  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setIsProductModalOpen(true);
  };

  const formatPrice = (price: number, weight?: number, unit?: string) => {
    if (weight && unit) {
      return `₹${price} (${weight}${unit})`;
    }
    return `₹${price}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 dark:from-amber-900 dark:via-yellow-900 dark:to-orange-900">
      {/* Header */}
      <header className="bg-amber-50/90 backdrop-blur-sm border-b border-amber-200 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center">
              <img 
                src="/lovable-uploads/621d91fb-0a7a-4b83-b539-e0ecd76fb97d.png" 
                alt="Priyum Bakehouse Logo" 
                className="h-24 w-auto"
              />
            </div>
            <p className="text-xl text-amber-800 font-medium">Fresh Baked Delights</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="Cookies" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8 bg-amber-100/70 backdrop-blur-sm p-1 rounded-xl shadow-sm">
            {categories.map((category) => (
              <TabsTrigger 
                key={category} 
                value={category}
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-600 data-[state=active]:to-orange-600 data-[state=active]:text-white rounded-lg font-medium transition-all duration-200"
              >
                {category}
              </TabsTrigger>
            ))}
          </TabsList>
          
          {categories.map((category) => {
            const categoryProducts = groupedProducts[category] || [];
            
            return (
              <TabsContent key={category} value={category} className="mt-6">
                {categoryProducts.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-amber-900/20 dark:to-yellow-900/20 rounded-2xl p-12 max-w-lg mx-auto shadow-lg backdrop-blur-sm border border-amber-200/50">
                      <div className="text-8xl mb-6 animate-bounce">🔜</div>
                      <h3 className="text-3xl font-bold text-amber-800 mb-4">Coming Soon</h3>
                      <p className="text-lg text-amber-700">
                        Delicious {category.toLowerCase()} are on their way!
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {categoryProducts.map((product) => (
                      <Card 
                        key={product.id} 
                        className="group overflow-hidden hover:shadow-xl transition-all duration-300 bg-amber-50/80 backdrop-blur-sm border-amber-200/50 hover:scale-105 cursor-pointer"
                        onClick={() => handleProductClick(product)}
                      >
                        {product.image && (
                          <div className="aspect-square overflow-hidden relative">
                            <img
                              src={product.image}
                              alt={product.name}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          </div>
                        )}
                        <CardContent className="p-6">
                          <h3 className="font-bold text-xl mb-3 text-foreground group-hover:text-primary transition-colors">
                            {product.name}
                          </h3>
                          {product.description && (
                            <p className="text-sm text-muted-foreground mb-4 line-clamp-2 leading-relaxed">
                              {product.description}
                            </p>
                          )}
                          
                          <div className="space-y-3">
                            <div className="relative group/price">
                              <Badge variant="secondary" className="text-lg font-bold px-3 py-1 bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-sm cursor-pointer">
                                {formatPrice(product.price, product.base_weight || undefined, product.weight_unit || undefined)}
                              </Badge>
                              
                              {product.weight_options && Array.isArray(product.weight_options) && product.weight_options.length > 0 && (
                                <div className="absolute top-full left-0 mt-2 p-3 bg-white rounded-lg shadow-lg border border-amber-200 opacity-0 group-hover/price:opacity-100 transition-opacity duration-200 z-10 min-w-max">
                                  <p className="text-xs text-amber-700 font-medium mb-2">Available Sizes:</p>
                                  <div className="space-y-1">
                                    {product.weight_options.map((option: any, index: number) => (
                                      <div key={index} className="text-sm text-amber-800">
                                        {option.weight}{option.unit} - ₹{option.price}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            {product.weight_options && Array.isArray(product.weight_options) && product.weight_options.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                <span className="text-xs text-amber-600 font-medium">More sizes available</span>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            );
          })}
        </Tabs>

        {/* Product Detail Modal */}
        <Dialog open={isProductModalOpen} onOpenChange={setIsProductModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-amber-50/95 backdrop-blur-sm border-amber-200">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-amber-800">
                {selectedProduct?.name}
              </DialogTitle>
            </DialogHeader>
            
            {selectedProduct && (
              <div className="grid md:grid-cols-2 gap-8 mt-6">
                {/* Product Image */}
                <div className="space-y-4">
                  {selectedProduct.image ? (
                    <div className="aspect-square overflow-hidden rounded-xl border-2 border-amber-200">
                      <img
                        src={selectedProduct.image}
                        alt={selectedProduct.name}
                        className="w-full h-full object-cover"
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

                  {/* Contact for Orders */}
                  <div className="bg-gradient-to-r from-amber-100 to-yellow-100 rounded-lg p-4 border border-amber-200">
                    <h4 className="font-semibold text-amber-800 mb-2">Place Your Order</h4>
                    <p className="text-sm text-amber-700 mb-3">
                      Contact us directly to place your order for this delicious treat!
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2">
                      {contactInfo?.phone && (
                        <Button
                          asChild
                          size="sm"
                          className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white"
                        >
                          <a href={`tel:${contactInfo.phone}`}>
                            <Phone className="h-4 w-4 mr-2" />
                            Call Now
                          </a>
                        </Button>
                      )}
                      {contactInfo?.email && (
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="border-amber-300 text-amber-700 hover:bg-amber-50"
                        >
                          <a href={`mailto:${contactInfo.email}`}>
                            <Mail className="h-4 w-4 mr-2" />
                            Email Us
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>

      {/* Footer */}
      <footer className="bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-gray-800 dark:to-gray-900 border-t border-amber-200 mt-16 shadow-inner">
        <div className="container mx-auto px-4 py-12">
          <div className="text-center space-y-6">
            <div className="flex items-center justify-center gap-2">
              <Heart className="h-6 w-6 text-amber-600" />
              <h3 className="text-3xl font-bold bg-gradient-to-r from-amber-700 to-orange-700 bg-clip-text text-transparent">For Orders</h3>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-8">
              {contactInfo?.phone && (
                <a
                  href={`tel:${contactInfo.phone}`}
                  className="flex items-center gap-3 text-amber-800 hover:text-amber-600 transition-all duration-200 p-3 rounded-lg hover:bg-amber-50/70 backdrop-blur-sm"
                >
                  <Phone className="h-6 w-6" />
                  <span className="font-semibold text-lg">{contactInfo.phone}</span>
                </a>
              )}
              
              {contactInfo?.email && (
                <a
                  href={`mailto:${contactInfo.email}`}
                  className="flex items-center gap-3 text-amber-800 hover:text-amber-600 transition-all duration-200 p-3 rounded-lg hover:bg-amber-50/70 backdrop-blur-sm"
                >
                  <Mail className="h-6 w-6" />
                  <span className="font-semibold text-lg">{contactInfo.email}</span>
                </a>
              )}
              
              <a
                href="https://www.instagram.com/priyum_bakery?igsh=MW5oZHdvOTM3bnRwcw=="
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-amber-800 hover:text-amber-600 transition-all duration-200 p-3 rounded-lg hover:bg-amber-50/70 backdrop-blur-sm"
              >
                <Instagram className="h-6 w-6" />
                <span className="font-semibold text-lg">@priyum_bakery</span>
              </a>
            </div>
            
            <div className="pt-6 border-t border-amber-300/50">
              <p className="text-amber-700 text-base">
                © 2025 {contactInfo?.business_name || "Priyum Bakehouse"}. Made with ❤️
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;