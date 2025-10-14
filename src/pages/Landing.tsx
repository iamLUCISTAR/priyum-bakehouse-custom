import { useState, useEffect, useRef } from "react";
import { gsap } from "gsap";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Phone, Mail, Instagram, Heart, X, Menu, Star, ShoppingBag, Clock, MapPin, Tag, ShoppingCart, Trash2 } from "lucide-react";
import ProductQuickView from "@/components/ProductQuickView";
import MobileSearchFilter from "@/components/MobileSearchFilter";
// import type { Database } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
// Removed custom calendar popover; using native date input

type Product = {
  id: string;
  name: string;
  mrp: number;
  selling_price: number;
  description: string | null;
  image: string | null;
  category: string | null;
  base_weight: number | null;
  weight_unit: string | null;
  weight_options: any;
  info: string | null;
  stock: number | null;
  created_at: string;
  updated_at: string;
};

interface Tag {
  id: string;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
}

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
interface CartItem {
  id: string; // productId-variantKey
  name: string;
  price: number;
  quantity: number;
  image: string | null;
  selectedWeight?: number | null;
  selectedUnit?: string | null;
}

const Landing = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [contactInfo, setContactInfo] = useState<InvoiceSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFiltering, setIsFiltering] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productTagsMap, setProductTagsMap] = useState<Record<string, Tag[]>>({});
  const [selectedProductTags, setSelectedProductTags] = useState<Tag[]>([]);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("Cookies");
  const [searchQuery, setSearchQuery] = useState("");
  const [categories, setCategories] = useState<{ id: string; name: string; display_name: string }[]>([]);
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
  const switchingCategoryRef = useRef(false);
  const [previousCategory, setPreviousCategory] = useState("Cookies");
  const [isTransitioning, setIsTransitioning] = useState(false);

  // GSAP-based loader animation (complex but easy to implement)
  const loaderRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!loaderRef.current) return;
    const tl = gsap.timeline({ repeat: -1, defaults: { ease: "power2.inOut" } });
    const cookies = gsap.utils.toArray<HTMLElement>(".loader-cookie");
    const chips = gsap.utils.toArray<HTMLElement>(".loader-chip");
    
    // Set initial states
    gsap.set(cookies, { rotation: 0, scale: 1, y: 0 });
    gsap.set(chips, { opacity: 0, scale: 0 });
    
    // Cookie rotation and bounce
    tl.to(cookies, { 
      rotation: 360, 
      duration: 2, 
      ease: "none",
      stagger: 0.3 
    })
    .to(cookies, { 
      y: -8, 
      duration: 0.4, 
      yoyo: true, 
      repeat: 1, 
      stagger: 0.2 
    }, "<")
    .to(cookies, { 
      scale: 1.1, 
      duration: 0.3, 
      yoyo: true, 
      repeat: 1, 
      stagger: 0.1 
    }, "<")
    
    // Chocolate chips appearing and disappearing
    .to(chips, { 
      opacity: 1, 
      scale: 1, 
      duration: 0.5, 
      stagger: 0.2 
    }, 0.5)
    .to(chips, { 
      opacity: 0, 
      scale: 0, 
      duration: 0.3, 
      stagger: 0.1 
    }, ">-0.5");
    
    return () => { tl.kill(); };
  }, []);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSizeDialogOpen, setIsSizeDialogOpen] = useState(false);
  const [pendingProduct, setPendingProduct] = useState<Product | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  // using native date input for selection

  // Load cart from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem('pb_cart');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setCartItems(parsed);
        }
      }
    } catch (e) {
      console.error('Failed to parse saved cart:', e);
    }
  }, []);

  // Persist cart to localStorage on changes
  useEffect(() => {
    try {
      localStorage.setItem('pb_cart', JSON.stringify(cartItems));
    } catch (e) {
      console.error('Failed to save cart:', e);
    }
  }, [cartItems]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterAndSortProducts();
  }, [products, selectedCategory, searchQuery, filters, categories]);

  // Set initial category when categories are loaded
  useEffect(() => {
    if (categories.length > 0 && selectedCategory === "Cookies") {
      setSelectedCategory(categories[0].display_name);
    }
  }, [categories]);

  const handleCategoryChange = (category: string) => {
    if (category === selectedCategory || isTransitioning) return;
    
    setIsTransitioning(true);
    switchingCategoryRef.current = true;
    
    // Start the transition
    setTimeout(() => {
      setPreviousCategory(selectedCategory);
      setSelectedCategory(category);
      
      // End the transition after content has updated
      setTimeout(() => {
        setIsTransitioning(false);
        switchingCategoryRef.current = false;
      }, 150);
    }, 50);
  };

  const renderCategoryContent = (category: string) => {
    const categoryProducts = groupedProducts[category] || [];
    
    // Don't show "Coming Soon" if we're currently filtering, switching category, or still loading
    if (categoryProducts.length === 0 && !isFiltering && !loading && !switchingCategoryRef.current) {
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
                : `Delicious ${category.toLowerCase()} are on their way!`
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
              className={`group overflow-hidden hover:shadow-xl transition-all duration-300 backdrop-blur-sm hover:scale-105 cursor-pointer touch-manipulation ${
                product.id === 'diwali-gift-box-regular' || product.id === 'diwali-gift-box-eggless'
                  ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 hover:border-amber-400 shadow-lg'
                  : 'bg-amber-50/80 border-amber-200/50'
              }`}
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
                  {(product.id === 'diwali-gift-box-regular' || product.id === 'diwali-gift-box-eggless') && (
                    <div className="absolute top-2 right-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-2 py-1 rounded-full text-xs font-semibold shadow-lg">
                      🎁 Diwali Special
                    </div>
                  )}
                </div>
              )}
              <CardContent className="p-4 sm:p-6">
                <h3 className="font-bold text-lg sm:text-xl mb-2 text-foreground group-hover:text-primary transition-colors line-clamp-2">
                  {product.name}
                </h3>
                {product.description && (
                  <div className="text-sm text-muted-foreground mb-3 leading-relaxed">
                    {product.id === 'diwali-gift-box-regular' || product.id === 'diwali-gift-box-eggless' ? (
                      <div className="space-y-1">
                        <p className="font-medium text-amber-700">🎁 Diwali Special Gift Box</p>
                        <p className="text-xs text-gray-600">Perfect blend of traditional flavors & classic favorites</p>
                      </div>
                    ) : (
                      <p className="line-clamp-2">{product.description}</p>
                    )}
                  </div>
                )}

                {/* Database tags */}
                {productTagsMap[product.id] && productTagsMap[product.id].length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {productTagsMap[product.id].map(tag => (
                      <Badge
                        key={tag.id}
                        variant="outline"
                        className="text-[10px]"
                        style={{
                          borderColor: tag.color,
                          color: tag.color,
                          backgroundColor: `${tag.color}10`
                        }}
                      >
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Hardcoded tags from info field */}
                {product.info && (product.info.includes('⌛') || product.info.includes('🤩')) && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {product.info.split(',').map((tag, index) => (
                      <Badge
                        key={`info-${index}`}
                        variant="outline"
                        className="text-[10px] px-2 py-1"
                        style={{
                          borderColor: tag.includes('⌛') ? '#f59e0b' : '#ec4899',
                          color: tag.includes('⌛') ? '#f59e0b' : '#ec4899',
                          backgroundColor: tag.includes('⌛') ? '#fef3c7' : '#fce7f3'
                        }}
                      >
                        {tag.trim()}
                      </Badge>
                    ))}
                  </div>
                )}
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col items-start">
                      <div className="flex flex-col items-start">
                        <Badge variant="secondary" className="text-base sm:text-lg font-bold px-3 py-1 bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-sm mb-1">
                          {formatPrice(product.selling_price, product.base_weight || undefined, product.weight_unit || undefined)}
                        </Badge>
                        {product.mrp > product.selling_price && (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">
                              S.P.: <span className="line-through">₹{product.mrp}</span>
                            </span>
                            <span className="text-xs text-green-600 font-medium">
                              Save ₹{product.mrp - product.selling_price}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
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
                  <div className="mt-3 flex">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); addToCart(product); }}
                      className="w-full"
                    >
                      <ShoppingCart className="w-3 h-3 mr-2" /> Add to Cart
                    </Button>
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
                <ProductQuickView 
                  product={product} 
                  contactInfo={contactInfo} 
                  prefetchedTags={productTagsMap[product.id]}
                  onAddToCart={addToCart}
                >
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
  };

  const loadData = async () => {
    try {
      // Load categories first - only those that have products with site_display = true
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories' as any)
        .select(`
          id, 
          name, 
          display_name,
          products!category_id (
            id
          )
        `)
        .eq('products.site_display', true)
        .order('display_name', { ascending: true });
      
      if (categoriesError) {
        console.error('Error loading categories:', categoriesError);
      } else if (categoriesData) {
        // Filter out categories that don't have any visible products
        const categoriesWithProducts = (categoriesData as any)?.filter((category: any) => 
          category.products && category.products.length > 0
        ) || [];
        
        // Add hardcoded Festive Specials category
        const festiveCategory = {
          id: 'festive-specials',
          name: 'festive specials',
          display_name: 'Festive Specials'
        };
        
        setCategories([festiveCategory, ...categoriesWithProducts]);
      }
      
      // Load products
      const result: any = await (supabase as any)
        .from("products")
        .select("*")
        .eq('site_display', true)
        .order("category", { ascending: true });
      
      const productsData = result.data;
      const productsError = result.error;

      if (productsError) {
        console.error("Error loading products:", productsError);
      } else if (productsData) {
        // Test: Add a sample product with MRP > selling_price to verify display
        const testProduct = {
          id: 'test-1',
          name: 'Test Product with MRP',
          mrp: 500,
          selling_price: 350,
          description: 'Test product to verify MRP display',
          image: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=400',
          category: 'test',
          base_weight: 500,
          weight_unit: 'g',
          weight_options: null,
          info: null,
          stock: 10,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        // Add hardcoded Diwali Gift Box products
        const diwaliGiftBoxRegular = {
          id: 'diwali-gift-box-regular',
          name: 'Diwali Gift Box (Regular)',
          mrp: 599,
          selling_price: 499,
          description: `🎁 **Diwali Special Gift Box** - A perfect blend of traditional flavors and classic favorites!

**What's Inside:**
• **Festive Nankhatai** (10 pieces) - Traditional Indian shortbread cookies
• **Saffron Pistachio Cookies** (10 pieces) - Decadent saffron-infused treats  
• **Classic Fudge Brownies** (4 mini pieces) - Rich, chocolatey goodness
• **Classic Blondies** (4 mini pieces) - Buttery, caramel-like perfection

✨ Perfect for sharing happiness this Diwali - beautifully packaged and ready to spread joy!`,
          image: '/diwali_gif_box.jpg',
          category: 'festive specials',
          base_weight: null,
          weight_unit: null,
          weight_options: null,
          info: 'Limited Sale ⌛, Specials 🤩',
          stock: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const diwaliGiftBoxEggless = {
          id: 'diwali-gift-box-eggless',
          name: 'Diwali Gift Box (Eggless)',
          mrp: 649,
          selling_price: 549,
          description: `🎁 **Diwali Special Gift Box** - A perfect blend of traditional flavors and classic favorites!

**What's Inside:**
• **Festive Nankhatai** (10 pieces) - Traditional Indian shortbread cookies
• **Saffron Pistachio Cookies** (10 pieces) - Decadent saffron-infused treats  
• **Classic Fudge Brownies** (4 mini pieces) - Rich, chocolatey goodness
• **Classic Blondies** (4 mini pieces) - Buttery, caramel-like perfection

✨ Perfect for sharing happiness this Diwali - beautifully packaged and ready to spread joy!`,
          image: '/diwali_gif_box.jpg',
          category: 'festive specials',
          base_weight: null,
          weight_unit: null,
          weight_options: null,
          info: 'Limited Sale ⌛, Specials 🤩',
          stock: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        setProducts([testProduct, diwaliGiftBoxRegular, diwaliGiftBoxEggless, ...productsData as Product[]]);
        // After products load, fetch tags for these products
        try {
          const productIds = productsData.map(p => p.id);
          if (productIds.length > 0) {
            // Fetch all product_tag rows for these products
            const { data: ptRows, error: ptErr } = await supabase
              .from('product_tags')
              .select('product_id, tag_id')
              .in('product_id', productIds);

            if (ptErr) throw ptErr;

            const uniqueTagIds = Array.from(new Set((ptRows || []).map(r => r.tag_id)));
            let tagsById: Record<string, Tag> = {};
            if (uniqueTagIds.length > 0) {
              const { data: tagsRows, error: tagsErr } = await supabase
                .from('tags')
                .select('*')
                .in('id', uniqueTagIds);
              if (tagsErr) throw tagsErr;
              (tagsRows || []).forEach(t => { tagsById[t.id] = t as unknown as Tag; });
            }

            const map: Record<string, Tag[]> = {};
            (ptRows || []).forEach(r => {
              if (!map[r.product_id]) map[r.product_id] = [];
              const tag = tagsById[r.tag_id];
              if (tag) map[r.product_id].push(tag);
            });
            setProductTagsMap(map);
          } else {
            setProductTagsMap({});
          }
        } catch (e) {
          console.error('Error fetching product tags map:', e);
          setProductTagsMap({});
        }
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
    setIsFiltering(true);
    
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
        const price = product.selling_price;
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
          return (a.selling_price || 0) - (b.selling_price || 0);
        case "price-desc":
          return (b.selling_price || 0) - (a.selling_price || 0);
        case "popular":
          // For now, sort by name as popularity isn't tracked
          return (a.name || "").localeCompare(b.name || "");
        default:
          return 0;
      }
    });

    setFilteredProducts(filtered);
    setIsFiltering(false);
    switchingCategoryRef.current = false;
  };

  const groupedProducts = filteredProducts.reduce((acc, product) => {
    // Find the category display name from the categories array
    const categoryObj = categories.find(cat => 
      cat.name === product.category || 
      cat.id === (product as any).category_id
    );
    
    const normalizedCategory = categoryObj ? categoryObj.display_name : "Others";
    
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

  
  const fetchProductTags = async (productId: string) => {
    try {
      // Skip fetching tags for hardcoded products (Diwali Gift Box)
      if (productId === 'diwali-gift-box-regular' || productId === 'diwali-gift-box-eggless') {
        setSelectedProductTags([]);
        return;
      }
      
      // Fetch product tags for this specific product
      const { data: productTagData, error: productTagError } = await supabase
        .from('product_tags')
        .select('tag_id')
        .eq('product_id', productId);

      if (productTagError) throw productTagError;

      if (productTagData && productTagData.length > 0) {
        // Get the tag IDs
        const tagIds = productTagData.map(pt => pt.tag_id);
        
        // Fetch the actual tag details
        const { data: tagsData, error: tagsError } = await supabase
          .from('tags')
          .select('*')
          .in('id', tagIds)
          .order('name');

        if (tagsError) throw tagsError;
        
        setSelectedProductTags(tagsData || []);
      } else {
        setSelectedProductTags([]);
      }
    } catch (error) {
      console.error('Error fetching product tags:', error);
      setSelectedProductTags([]);
    }
  };
  
  const addToCart = (product: Product) => {
    // Check if it's a Diwali Gift Box product
    if (product.id === 'diwali-gift-box-regular' || product.id === 'diwali-gift-box-eggless') {
      // Add Diwali Gift Box directly to cart without selections
      const id = `${product.id}-diwali`;
      setCartItems(prev => {
        const existing = prev.find(ci => ci.id === id);
        let newCartItems;
        
        if (existing) {
          newCartItems = prev.map(ci => ci.id === id ? { ...ci, quantity: ci.quantity + 1 } : ci);
        } else {
          newCartItems = [...prev, {
            id,
            name: product.name,
            price: product.selling_price,
            quantity: 1,
            image: product.image || null
          }];
        }
        
        // Check and add festive bonus
        return checkAndAddFestiveBonus(newCartItems);
      });
      toast({ title: "Added to cart", description: `${product.name} added to cart.` });
    } else {
      // Open size selection dialog for regular products
      setPendingProduct(product);
      setIsSizeDialogOpen(true);
    }
  };

  const checkAndAddFestiveBonus = (newCartItems: CartItem[]) => {
    console.log('=== FESTIVE BONUS FUNCTION CALLED ===');
    console.log('Input cart items:', newCartItems);
    let updatedItems = [...newCartItems];

    // COOKIE BONUS: Free Triple Choco Bites for cookies > ₹599
    const cookieItems = updatedItems.filter(item => item.name.toLowerCase().includes('cookie'));
    const cookiesTotal = cookieItems.reduce((total, item) => total + (item.price * item.quantity), 0);
    const hasTripleChocolate = updatedItems.some(item => 
      item.name.toLowerCase().includes('triple choco bites')
    );

    if (cookiesTotal > 599 && !hasTripleChocolate) {
      // Find the specific "Triple Choco Bites" product by ID
      const tripleChocoProduct = products.find(p => 
        p.id === '4254909f-8eba-4b21-8841-b62a475c0d40' || 
        p.name.toLowerCase().includes('triple choco bites')
      );
      
      if (tripleChocoProduct) {
        const freeProduct: CartItem = {
          id: 'triple-choco-bites-free',
          name: `${tripleChocoProduct.name} (Free)`,
          price: 0,
          quantity: 1,
          image: tripleChocoProduct.image,
          selectedWeight: tripleChocoProduct.base_weight,
          selectedUnit: tripleChocoProduct.weight_unit
        };
        
        toast({ 
          title: "🎉 Cookie Bonus Added!", 
          description: `You've earned a free ${tripleChocoProduct.name} for your cookie order!` 
        });
        
        updatedItems = [...updatedItems, freeProduct];
      }
    } else if (cookiesTotal <= 599 && hasTripleChocolate) {
      // Remove free item if cookies total is no longer above 599
      updatedItems = updatedItems.filter(item => 
        !item.name.toLowerCase().includes('triple choco bites')
      );
      
      toast({ 
        title: "Cookie bonus removed", 
        description: "Cookie order value is below ₹599, free item removed." 
      });
    }

    // BROWNIE BONUS: Buy 2 Get 1 for brownies and blondies
    const brownieItems = updatedItems.filter(item => 
      (item.name.toLowerCase().includes('brownie') || 
       item.name.toLowerCase().includes('blondie')) && 
      !item.name.toLowerCase().includes('(free)')
    );
    
    console.log('=== BROWNIE BONUS CHECK ===');
    console.log('All cart items:', updatedItems.map(item => ({ 
      name: item.name, 
      hasBrownie: item.name.toLowerCase().includes('brownie'),
      hasBlondie: item.name.toLowerCase().includes('blondie')
    })));
    console.log('Brownie/Blondie items found:', brownieItems);

    // Remove existing brownie/blondie bonus items first
    updatedItems = updatedItems.filter(item => 
      !(item.name.toLowerCase().includes('brownie') || item.name.toLowerCase().includes('blondie')) || 
      !item.name.toLowerCase().includes('(free)')
    );

    // Calculate bonus for each brownie type individually
    brownieItems.forEach(brownieItem => {
      console.log('Processing brownie item:', brownieItem);
      
      // Find the original product to get its weight details
      const originalProduct = products.find(p => 
        p.name.toLowerCase().includes(brownieItem.name.toLowerCase().replace(' (regular)', '').replace(' (eggless)', '')) ||
        brownieItem.name.toLowerCase().includes(p.name.toLowerCase())
      );

      console.log('Original product found:', originalProduct);

      if (originalProduct) {
        // Calculate total weight purchased for this item
        let itemWeight = 0;
        
        if (brownieItem.selectedWeight && brownieItem.selectedUnit) {
          // Use selected weight from cart item
          itemWeight = brownieItem.selectedWeight * brownieItem.quantity;
          console.log('Using selected weight:', brownieItem.selectedWeight, 'x', brownieItem.quantity, '=', itemWeight);
        } else if (originalProduct.base_weight && originalProduct.weight_unit) {
          // Use base weight from product
          itemWeight = originalProduct.base_weight * brownieItem.quantity;
          console.log('Using base weight:', originalProduct.base_weight, 'x', brownieItem.quantity, '=', itemWeight);
        } else {
          // Fallback: assume 1 piece per quantity
          itemWeight = brownieItem.quantity;
          console.log('Using fallback weight:', brownieItem.quantity);
        }

        // Calculate bonus pieces for this specific product (1 free piece for every 2 purchased)
        const bonusPieces = Math.floor(itemWeight / 2);
        console.log('Item weight:', itemWeight, 'Bonus pieces for this product:', bonusPieces);
        
        if (bonusPieces > 0) {
          const bonusItem: CartItem = {
            id: `${brownieItem.id}-bonus-pieces`,
            name: `${brownieItem.name.replace(' (Regular)', '').replace(' (Eggless)', '').replace(/ \(\d+pieces?\)/, '')} (Free)`,
            price: 0,
            quantity: bonusPieces,
            image: originalProduct.image,
            selectedWeight: 1,
            selectedUnit: 'piece'
          };
          
          console.log('Adding bonus pieces for this product:', bonusItem);
          updatedItems = [...updatedItems, bonusItem];
        }
      } else {
        console.log('Original product not found, using fallback logic');
        // Fallback: Use cart quantity if product not found
        const bonusPieces = Math.floor(brownieItem.quantity / 2);
        
        if (bonusPieces > 0) {
          const bonusItem: CartItem = {
            id: `${brownieItem.id}-bonus-pieces`,
            name: `${brownieItem.name.replace(' (Regular)', '').replace(' (Eggless)', '').replace(/ \(\d+pieces?\)/, '')} (Free)`,
            price: 0,
            quantity: bonusPieces,
            image: brownieItem.image,
            selectedWeight: 1,
            selectedUnit: 'piece'
          };
          
          console.log('Adding fallback bonus pieces:', bonusItem);
          updatedItems = [...updatedItems, bonusItem];
        }
      }
    });

    // Show toast if brownie/blondie bonuses were added/removed
    const hasBrownieBonus = updatedItems.some(item => 
      (item.name.toLowerCase().includes('brownie') || item.name.toLowerCase().includes('blondie')) && 
      item.name.toLowerCase().includes('(free)')
    );
    
    if (hasBrownieBonus && brownieItems.length > 0) {
      const totalBonus = updatedItems
        .filter(item => (item.name.toLowerCase().includes('brownie') || item.name.toLowerCase().includes('blondie')) && item.name.toLowerCase().includes('(free)'))
        .reduce((sum, item) => sum + item.quantity, 0);
      
      if (totalBonus > 0) {
        toast({ 
          title: "🎉 Brownie/Blondie Bonus Added!", 
          description: `You've earned ${totalBonus} free brownie${totalBonus > 1 ? 's' : ''} with Buy 2 Get 1 offer!` 
        });
      }
    }
    
    return updatedItems;
  };

  const confirmAddToCart = (product: Product, weight: number | null, unit: string | null, price: number) => {
    const variantKey = weight && unit ? `${weight}${unit}` : 'base';
    const id = `${product.id}-${variantKey}`;
    const categoryLower = (product.category || '').toLowerCase();
    const isBrownie = categoryLower.includes('brownie');
    const isEggless = categoryLower.includes('eggless');
    const brownieTag = isBrownie ? (isEggless ? ' (Eggless)' : ' (Regular)') : '';
    const baseName = product.name ? `${product.name}${brownieTag}` : 'Product';
    const displayName = weight && unit ? `${baseName} (${weight}${unit})` : baseName;
    setCartItems(prev => {
      const existing = prev.find(ci => ci.id === id);
      let newCartItems;
      
      if (existing) {
        newCartItems = prev.map(ci => ci.id === id ? { ...ci, quantity: ci.quantity + 1 } : ci);
      } else {
        newCartItems = [...prev, {
          id,
          name: displayName,
          price: price || 0,
          quantity: 1,
          image: product.image || null,
          selectedWeight: weight,
          selectedUnit: unit,
        }];
      }
      
      // Check and add festive bonus
      return checkAndAddFestiveBonus(newCartItems);
    });
    toast({ title: "Added to cart", description: `${displayName} added to cart.` });
  };

  const updateCartQuantity = (id: string, quantity: number) => {
    setCartItems(prev => {
      const updatedItems = prev
        .map(ci => ci.id === id ? { ...ci, quantity: Math.max(1, quantity) } : ci)
        .filter(ci => ci.quantity > 0);
      
      // Check and add festive bonus after quantity update
      return checkAndAddFestiveBonus(updatedItems);
    });
  };

  const removeFromCart = (id: string) => {
    setCartItems(prev => {
      const updatedItems = prev.filter(ci => ci.id !== id);
      // Check and add festive bonus after removal
      return checkAndAddFestiveBonus(updatedItems);
    });
  };

  const clearCart = () => setCartItems([]);

  const cartSubtotal = cartItems.reduce((sum, ci) => sum + ci.price * ci.quantity, 0);

  const openCheckoutForm = () => {
    if (cartItems.length === 0) {
      toast({ title: "Cart is empty", description: "Please add items to cart before checkout.", variant: "destructive" });
      return;
    }
    // Swap the cart popup with the customer details popup
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  const placeOrderViaWhatsApp = () => {
    if (!customerName || !customerPhone || !customerAddress) {
      toast({ title: "Missing details", description: "Please enter name, phone and address.", variant: "destructive" });
      return;
    }
    const adminNumber = (contactInfo?.phone || "+91 9677349169").replace(/[^\d]/g, "");
    const lines: string[] = [];
    lines.push(`New Order Request`);
    lines.push("");
    lines.push(`Customer Details:`);
    lines.push(`- Name: ${customerName}`);
    lines.push(`- Phone: ${customerPhone}`);
    lines.push(`- Address: ${customerAddress}`);
    if (deliveryDate) lines.push(`- Expected Delivery: ${deliveryDate}`);
    lines.push("");
    lines.push(`Order Items:`);
    cartItems.forEach((item, idx) => {
      lines.push(`${idx + 1}. ${item.name} x ${item.quantity} = ₹${item.price * item.quantity}`);
      
    });
    lines.push("");
    lines.push(`Subtotal: ₹${cartSubtotal}`);
    lines.push(`(Subtotal does not include shipping charges or discounts)`);
    lines.push("");
    lines.push(`Please confirm availability and provide final invoice total.`);
    const text = encodeURIComponent(lines.join("\n"));
    const url = `https://wa.me/${adminNumber}?text=${text}`;
    window.open(url, "_blank");
    setIsCheckoutOpen(false);
    setIsCartOpen(false);
  };

  const handleProductClick = async (product: Product) => {
    setSelectedProduct(product);
    
    // Handle hardcoded Diwali products
    if (product.id === 'diwali-gift-box-regular' || product.id === 'diwali-gift-box-eggless') {
      setSelectedProductTags([]);
      setIsProductModalOpen(true);
      return;
    }
    
    // Prefer prefetched map for instant render; fallback to fetch if missing
    const tags = productTagsMap[product.id];
    if (tags && tags.length > 0) {
      setSelectedProductTags(tags);
    } else {
      await fetchProductTags(product.id);
    }
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

  const formatDescription = (description: string) => {
    const renderTextWithBold = (text: string) => {
      const parts = text.split(/(\*\*.*?\*\*)/g);
      return parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          const boldText = part.slice(2, -2);
          return (
            <strong key={index} className="text-amber-800 font-semibold">
              {boldText}
            </strong>
          );
        }
        return <span key={index}>{part}</span>;
      });
    };

    return description
      .split('\n')
      .map((line, index) => {
        const trimmedLine = line.trim();
        
        // Handle empty lines
        if (trimmedLine === '') {
          return <br key={index} />;
        }
        
        // Handle bullet points with enhanced styling
        if (trimmedLine.startsWith('•')) {
          const content = trimmedLine.substring(1).trim();
          return (
            <div key={index} className="flex items-start mb-3">
              <span className="text-amber-500 mr-3 mt-1 text-lg">•</span>
              <span className="text-amber-700 leading-relaxed">
                {renderTextWithBold(content)}
              </span>
            </div>
          );
        }
        
        // Handle emoji lines (title lines)
        if (trimmedLine.includes('🎁') || trimmedLine.includes('✨')) {
          return (
            <p key={index} className="mb-4 text-amber-800 font-semibold text-lg leading-relaxed">
              {renderTextWithBold(trimmedLine)}
            </p>
          );
        }
        
        // Handle "What's Inside:" header
        if (trimmedLine.includes("What's Inside:")) {
          return (
            <p key={index} className="mb-3 text-amber-800 font-semibold text-base">
              {renderTextWithBold(trimmedLine)}
            </p>
          );
        }
        
        // Default paragraph
        return (
          <p key={index} className="mb-3 text-amber-700 leading-relaxed">
            {renderTextWithBold(trimmedLine)}
          </p>
        );
      });
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
        <div className="text-center space-y-6">
          <div ref={loaderRef} className="mx-auto w-48 h-44 relative flex items-center justify-center">
            <div className="relative w-48 h-32">
              {/* Cookie 1 */}
              <div className="loader-cookie absolute top-4 left-8 w-12 h-12 bg-amber-200 rounded-full shadow-md">
                <div className="absolute top-2 left-2 w-2 h-2 bg-amber-800 rounded-full" />
                <div className="absolute top-6 right-3 w-1.5 h-1.5 bg-amber-800 rounded-full" />
                <div className="absolute bottom-3 left-4 w-1.5 h-1.5 bg-amber-800 rounded-full" />
                <div className="absolute bottom-2 right-2 w-2 h-2 bg-amber-800 rounded-full" />
              </div>
              {/* Cookie 2 */}
              <div className="loader-cookie absolute top-8 right-8 w-10 h-10 bg-amber-300 rounded-full shadow-md">
                <div className="absolute top-1 left-1 w-1.5 h-1.5 bg-amber-800 rounded-full" />
                <div className="absolute top-4 right-2 w-1 h-1 bg-amber-800 rounded-full" />
                <div className="absolute bottom-2 left-3 w-1.5 h-1.5 bg-amber-800 rounded-full" />
              </div>
              {/* Cookie 3 */}
              <div className="loader-cookie absolute bottom-4 left-1/2 -translate-x-1/2 w-14 h-14 bg-amber-100 rounded-full shadow-md">
                <div className="absolute top-3 left-3 w-2 h-2 bg-amber-800 rounded-full" />
                <div className="absolute top-6 right-4 w-1.5 h-1.5 bg-amber-800 rounded-full" />
                <div className="absolute bottom-4 left-5 w-1.5 h-1.5 bg-amber-800 rounded-full" />
                <div className="absolute bottom-3 right-3 w-2 h-2 bg-amber-800 rounded-full" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-amber-800 rounded-full" />
              </div>
              {/* Floating chocolate chips */}
              <div className="loader-chip absolute top-2 left-4 w-1 h-1 bg-amber-800 rounded-full" />
              <div className="loader-chip absolute top-6 right-6 w-1 h-1 bg-amber-800 rounded-full" />
              <div className="loader-chip absolute bottom-2 left-6 w-1 h-1 bg-amber-800 rounded-full" />
            </div>
          </div>
          <p className="text-amber-800 text-lg font-semibold">Whipping up something sweet...</p>
          <p className="text-muted-foreground text-sm">Hang tight while we preheat the oven</p>
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
                            key={category.id}
                            onClick={() => {
                              handleCategoryChange(category.display_name);
                              setIsMobileMenuOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                              selectedCategory === category.display_name
                                ? 'bg-amber-200 text-amber-800'
                                : 'text-amber-700 hover:bg-amber-100'
                            }`}
                          >
                            {category.display_name}
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
                          href="https://www.instagram.com/priyumbakery?igsh=MW5oZHdvOTM3bnRwcw=="
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center space-x-3 text-amber-700 hover:text-amber-600 transition-colors"
                        >
                          <Instagram className="h-4 w-4" />
                          <span>@priyumbakery</span>
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
            {/* <div className="scrolling-banner-item">
              🎉 Flat 10% off on your first order with us (min order ₹499).
            </div> */}
            <div className="scrolling-banner-separator">|</div>
            <div className="scrolling-banner-item">
              🚚 Shipping available all across India
            </div>
            <div className="scrolling-banner-separator">|</div>
            <div className="scrolling-banner-item">
              💵 Shipping charges as applicable
            </div>
            <div className="scrolling-banner-separator">|</div>
            {/* <div className="scrolling-banner-item">
              🎉 Flat 10% off on your first order with us (min order ₹499).
            </div>
            <div className="scrolling-banner-separator">|</div> */}
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
        {/* Floating Cart Button */}
        <div className="fixed bottom-6 right-6 z-50">
          <Button onClick={() => setIsCartOpen(true)} className="shadow-lg">
            <ShoppingCart className="w-4 h-4 mr-2" /> Cart ({cartItems.reduce((s, i) => s + i.quantity, 0)})
          </Button>
        </div>

        {/* Cart Sheet */}
        <Dialog open={isCartOpen} onOpenChange={setIsCartOpen}>
          <DialogContent className="w-[92vw] max-w-2xl h-[80vh] max-h-[600px] p-0 flex flex-col">
            <DialogHeader className="p-4 sm:p-6 pb-0 flex-shrink-0">
              <DialogTitle>Your Cart</DialogTitle>
            </DialogHeader>
            
            {/* Scrollable cart items area */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
              <div className="space-y-3">
                {cartItems.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">Your cart is empty</div>
                ) : (
                  cartItems.map(item => (
                    <div key={item.id} className="p-3 border rounded-lg">
                      {/* Mobile layout */}
                      <div className="flex flex-col gap-3 sm:hidden">
                        <div className="flex items-center gap-3">
                          {item.image ? (
                            <img src={item.image} alt={item.name} className="w-12 h-12 object-cover rounded" />
                          ) : (
                            <div className="w-12 h-12 bg-amber-100 rounded" />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="font-medium truncate">{item.name}</div>
                            <div className="text-sm text-muted-foreground">₹{item.price} each</div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateCartQuantity(item.id, item.quantity - 1)}>-</Button>
                            <div className="w-6 text-center text-sm">{item.quantity}</div>
                            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateCartQuantity(item.id, item.quantity + 1)}>+</Button>
                          </div>
                          <div className="font-medium">₹{item.price * item.quantity}</div>
                          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => removeFromCart(item.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>

                      {/* Desktop layout */}
                      <div className="hidden sm:grid sm:grid-cols-[48px,1fr,auto,auto,auto] sm:items-center sm:gap-4">
                        <div className="flex items-center justify-center">
                          {item.image ? (
                            <img src={item.image} alt={item.name} className="w-12 h-12 object-cover rounded" />
                          ) : (
                            <div className="w-12 h-12 bg-amber-100 rounded" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium truncate">{item.name}</div>
                          <div className="text-sm text-muted-foreground">₹{item.price} each</div>
                        </div>
                        <div className="flex items-center gap-2 justify-center">
                          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateCartQuantity(item.id, item.quantity - 1)}>-</Button>
                          <div className="w-6 text-center text-sm">{item.quantity}</div>
                          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateCartQuantity(item.id, item.quantity + 1)}>+</Button>
                        </div>
                        <div className="font-medium text-right">₹{item.price * item.quantity}</div>
                        <div className="flex justify-end">
                          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => removeFromCart(item.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            
            {/* Fixed footer with subtotal and buttons */}
            <div className="flex-shrink-0 border-t bg-background p-4 sm:p-6">
              {/* Subtotal note */}
              {cartItems.length > 0 && (
                <p className="mb-3 text-xs text-muted-foreground">
                  *The subtotal does not including shipping charges and discounts. The final total will be on your invoice after checkout!
                </p>
              )}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-lg font-bold">Subtotal: ₹{cartSubtotal}</div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button variant="outline" className="flex-1 sm:flex-none" onClick={clearCart}>Clear</Button>
                  <Button className="flex-1 sm:flex-none" onClick={openCheckoutForm}>Checkout</Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Checkout Form Modal (custom overlay, no dark blackout) */}
        {isCheckoutOpen && (
          <div className="fixed inset-0 z-[60]">
            <div className="absolute inset-0 bg-black/80" onClick={() => setIsCheckoutOpen(false)} />
            <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2 bg-background border rounded-lg shadow-xl p-4 sm:p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold">Enter your details</h3>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setIsCheckoutOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid gap-3">
                <div>
                  <Label htmlFor="custName">Name</Label>
                  <Input id="custName" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Your name" />
                </div>
                <div>
                  <Label htmlFor="custPhone">Phone</Label>
                  <Input id="custPhone" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="Your phone number" />
                </div>
                <div>
                  <Label htmlFor="custAddress">Address</Label>
                  <Textarea id="custAddress" value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} placeholder="Complete delivery address" rows={3} />
                </div>
                <div>
                  <Label htmlFor="custDate">Expected Delivery Date</Label>
                  <Input
                    id="custDate"
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                  />
                  <p className="mt-2 text-xs text-muted-foreground">
                    *We typically deliver orders within 3-4 days from the date of ordering. Delivery times may vary depending on your location.
                  </p>
                </div>
              </div>
              <div className="mt-4 flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setIsCheckoutOpen(false)}>Cancel</Button>
                <Button onClick={placeOrderViaWhatsApp}>Place Order</Button>
              </div>
            </div>
          </div>
        )}
        {/* Mobile Category Switcher */}
        <div className="sm:hidden mb-6">
          <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => handleCategoryChange(category.display_name)}
                className={`flex-shrink-0 px-6 py-3 rounded-full font-medium transition-all duration-200 ${
                  selectedCategory === category.display_name
                    ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg'
                    : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                }`}
              >
                {category.display_name}
              </button>
            ))}
          </div>
        </div>

        {/* Desktop Tabs */}
        <div className="hidden sm:block">
          <Tabs value={selectedCategory} onValueChange={handleCategoryChange} className="w-full">
            <TabsList className="flex w-full justify-center mb-8 bg-amber-100/70 backdrop-blur-sm p-2 rounded-xl shadow-sm gap-2">
            {categories.map((category) => (
              <TabsTrigger 
                key={category.id} 
                value={category.display_name}
                className="flex-1 min-w-0 px-6 py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-600 data-[state=active]:to-orange-600 data-[state=active]:text-white rounded-lg font-medium transition-all duration-200 text-sm sm:text-base"
              >
                {category.display_name}
              </TabsTrigger>
            ))}
          </TabsList>
          </Tabs>
        </div>
        
        {/* Product Grid with Crossfade */}
        <div className="relative min-h-[400px]">
          {/* Previous content (fading out) */}
          {isTransitioning && (
            <div className="absolute inset-0 opacity-0 transition-opacity duration-200 ease-in-out">
              {renderCategoryContent(previousCategory)}
            </div>
          )}
          
          {/* Current content (fading in) */}
          <div className={`transition-opacity duration-200 ease-in-out ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
            {renderCategoryContent(selectedCategory)}
          </div>
        </div>

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
                      <div className="text-amber-700 leading-relaxed">
                        {formatDescription(selectedProduct.description)}
                      </div>
                    </div>
                  )}

                  {/* Additional Information */}
                  {selectedProduct.info && !selectedProduct.info.includes('⌛') && !selectedProduct.info.includes('🤩') && (
                    <div>
                      <h3 className="text-lg font-semibold text-amber-800 mb-2">Additional Information</h3>
                      <p className="text-amber-700 leading-relaxed">
                        {selectedProduct.info}
                      </p>
                    </div>
                  )}

                  {/* Tags */}
                  {(selectedProductTags.length > 0 || (selectedProduct.info && (selectedProduct.info.includes('⌛') || selectedProduct.info.includes('🤩')))) && (
                    <div>
                      <h3 className="text-lg font-semibold text-amber-800 mb-2 flex items-center">
                        <Tag className="w-4 h-4 mr-2" />
                        Tags
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {/* Database tags */}
                        {selectedProductTags.map((tag) => (
                          <Badge 
                            key={tag.id}
                            variant="outline"
                            className="text-sm"
                            style={{ 
                              borderColor: tag.color, 
                              color: tag.color,
                              backgroundColor: `${tag.color}10`
                            }}
                          >
                            {tag.name}
                          </Badge>
                        ))}
                        {/* Hardcoded tags from info field */}
                        {selectedProduct.info && (selectedProduct.info.includes('⌛') || selectedProduct.info.includes('🤩')) && (
                          selectedProduct.info.split(',').map((tag, index) => (
                            <Badge 
                              key={`info-${index}`}
                              variant="outline"
                              className="text-sm px-3 py-1"
                              style={{ 
                                borderColor: tag.includes('⌛') ? '#f59e0b' : '#ec4899',
                                color: tag.includes('⌛') ? '#f59e0b' : '#ec4899',
                                backgroundColor: tag.includes('⌛') ? '#fef3c7' : '#fce7f3'
                              }}
                            >
                              {tag.trim()}
                            </Badge>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  <div>
                    <h3 className="text-lg font-semibold text-amber-800 mb-3">Pricing</h3>
                    
                    {/* Base Price */}
                    <div className="bg-amber-100/70 rounded-lg p-4 mb-4 border border-amber-200">
                      <div className="flex flex-col items-start">
                        <div className="flex flex-col items-start">
                          <Badge className="bg-gradient-to-r from-amber-600 to-orange-600 text-white text-lg px-3 py-1 shadow-sm mb-1">
                            {formatPrice(selectedProduct.selling_price, selectedProduct.base_weight || undefined, selectedProduct.weight_unit || undefined)}
                          </Badge>
                          {selectedProduct.mrp > selectedProduct.selling_price && (
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-500">
                                S.P.: <span className="line-through">₹{selectedProduct.mrp}</span>
                              </span>
                              <span className="text-xs text-green-600 font-medium">
                                Save ₹{selectedProduct.mrp - selectedProduct.selling_price}
                              </span>
                            </div>
                          )}
                        </div>
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
                              <div className="flex flex-col items-end">
                                <Badge variant="outline" className="border-amber-300 text-amber-700 bg-amber-50">
                                  ₹{option.selling_price}
                                </Badge>
                                {(option.mrp || option.price || 0) > (option.selling_price || option.price || 0) && (
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs text-gray-500">
                                      S.P.: <span className="line-through">₹{option.mrp || option.price}</span>
                                    </span>
                                    <span className="text-xs text-green-600 font-medium">
                                      Save ₹{(option.mrp || option.price || 0) - (option.selling_price || option.price || 0)}
                                    </span>
                                  </div>
                                )}
                              </div>
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

                  {/* Add to Cart Only */}
                  <div>
                    <Button
                      variant="outline"
                      size="lg"
                      className="w-full border-amber-300 text-amber-700 hover:bg-amber-50"
                      onClick={() => selectedProduct && addToCart(selectedProduct)}
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Add to Cart
                    </Button>
                  </div>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Order Status Modal */}
        {/* Size Selection Dialog for Add to Cart */}
        <Dialog open={isSizeDialogOpen} onOpenChange={setIsSizeDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Select Size & Add to Cart</DialogTitle>
            </DialogHeader>
            {pendingProduct && (
              <div className="grid gap-3 py-2">
                <div className="flex items-center space-x-3 mb-2">
                  {pendingProduct.image ? (
                    <img src={pendingProduct.image} alt={pendingProduct.name} className="w-12 h-12 object-cover rounded" />
                  ) : (
                    <div className="w-12 h-12 bg-amber-100 rounded" />
                  )}
                  <div>
                    <div className="font-medium">{pendingProduct.name}</div>
                    {pendingProduct.description && (
                      <div className="text-xs text-muted-foreground line-clamp-1">{pendingProduct.description}</div>
                    )}
                  </div>
                </div>

                <div 
                  className="p-3 border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => {
                    confirmAddToCart(pendingProduct, pendingProduct.base_weight || null, pendingProduct.weight_unit || null, pendingProduct.selling_price);
                    setIsSizeDialogOpen(false);
                  }}
                >
                        <div className="flex justify-between items-center">
                          <span className="font-medium">
                            {pendingProduct.base_weight || 0} {pendingProduct.weight_unit || ''} (Base)
                          </span>
                          <div className="flex flex-col items-end">
                            <span className="font-bold text-primary">₹{pendingProduct.selling_price}</span>
                            {pendingProduct.mrp > pendingProduct.selling_price && (
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-gray-500">
                                  S.P.: <span className="line-through">₹{pendingProduct.mrp}</span>
                                </span>
                                <span className="text-xs text-green-600 font-medium">
                                  Save ₹{pendingProduct.mrp - pendingProduct.selling_price}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                </div>

                {Array.isArray(pendingProduct.weight_options) && pendingProduct.weight_options.length > 0 && (
                  <div className="space-y-2">
                    {pendingProduct.weight_options.map((opt: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-3 border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors"
                        onClick={() => {
                          confirmAddToCart(pendingProduct, opt.weight, opt.unit, opt.selling_price);
                          setIsSizeDialogOpen(false);
                        }}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{opt.weight} {opt.unit}</span>
                          <div className="flex flex-col items-end">
                            <span className="font-bold text-primary">₹{opt.selling_price}</span>
                            {(opt.mrp || opt.price || 0) > (opt.selling_price || opt.price || 0) && (
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-gray-500">
                                  S.P.: <span className="line-through">₹{opt.mrp || opt.price}</span>
                                </span>
                                <span className="text-xs text-green-600 font-medium">
                                  Save ₹{(opt.mrp || opt.price || 0) - (opt.selling_price || opt.price || 0)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
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
              <h3 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-amber-700 to-orange-700 bg-clip-text text-transparent">For Bulk Orders</h3>
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
                href="https://www.instagram.com/priyumbakery?igsh=MW5oZHdvOTM3bnRwcw=="
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-amber-800 hover:text-amber-600 transition-all duration-200 p-3 rounded-lg hover:bg-amber-50/70 backdrop-blur-sm"
              >
                <Instagram className="h-5 w-5 sm:h-6 sm:w-6" />
                <span className="font-semibold text-base sm:text-lg">@priyumbakery</span>
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