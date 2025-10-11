import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Phone, Mail, ShoppingBag, Clock, MapPin, Star, X, Tag } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Product = {
  id: string;
  name: string;
  mrp: number;
  selling_price: number;
  price?: number; // Fallback for old data
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

interface ProductQuickViewProps {
  product: Product;
  contactInfo: {
    phone?: string;
    email?: string;
  } | null;
  children: React.ReactNode;
  prefetchedTags?: Tag[];
  onAddToCart?: (product: Product) => void;
}

const ProductQuickView = ({ product, contactInfo, children, prefetchedTags, onAddToCart }: ProductQuickViewProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const productTags: Tag[] = prefetchedTags || [];

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

  // Tags are prefetched and passed in so they render immediately

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <div className="cursor-pointer">
          {children}
        </div>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[90vh] bg-amber-50/95 border-amber-200">
        <SheetHeader className="text-left">
          <SheetTitle className="text-xl font-bold text-amber-800">
            {product.name}
          </SheetTitle>
        </SheetHeader>
        
        <div className="mt-6 space-y-6 overflow-y-auto h-full pb-20">
          {/* Product Image Carousel */}
          {product.image && (
            <div className="relative">
              <Carousel className="w-full">
                <CarouselContent>
                  <CarouselItem>
                    <div className="overflow-hidden rounded-xl border-2 border-amber-200">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-auto object-contain"
                      />
                    </div>
                  </CarouselItem>
                </CarouselContent>
              </Carousel>
            </div>
          )}

          {/* Product Info */}
          <div className="space-y-4">
            {/* Description */}
            {product.description && (
              <div>
                <h3 className="text-lg font-semibold text-amber-800 mb-2">Description</h3>
                <p className="text-amber-700 leading-relaxed">
                  {product.description}
                </p>
              </div>
            )}

            {/* Additional Information */}
            {product.info && (
              <div>
                <h3 className="text-lg font-semibold text-amber-800 mb-2">Additional Information</h3>
                <p className="text-amber-700 leading-relaxed">
                  {product.info}
                </p>
              </div>
            )}

            {/* Tags */}
            {productTags.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-amber-800 mb-2 flex items-center">
                  <Tag className="w-4 h-4 mr-2" />
                  Tags
                </h3>
                <div className="flex flex-wrap gap-2">
                  {productTags.map((tag) => (
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
                </div>
              </div>
            )}

            {/* Pricing */}
            <div>
              <h3 className="text-lg font-semibold text-amber-800 mb-3">Pricing</h3>
              
              {/* Base Price */}
              <div className="bg-amber-100/70 rounded-lg p-4 mb-4 border border-amber-200">
                <div className="flex flex-col items-start">
                  <div className="flex flex-col items-start">
                    <Badge className="bg-gradient-to-r from-amber-600 to-orange-600 text-white text-lg px-3 py-1 shadow-sm mb-1">
                      {formatPrice(product.selling_price || product.price || 0, product.base_weight || undefined, product.weight_unit || undefined)}
                    </Badge>
                    {(product.mrp || product.price || 0) > (product.selling_price || product.price || 0) && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">
                          S.P.: <span className="line-through">₹{product.mrp || product.price}</span>
                        </span>
                        <span className="text-xs text-green-600 font-medium">
                          Save ₹{(product.mrp || product.price || 0) - (product.selling_price || product.price || 0)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                {/* Cookie Count Information */}
                {getCookieCountInfo(product) && (
                  <div className="mt-2 text-center">
                    <span className="text-sm text-amber-700 font-medium bg-amber-50 px-3 py-1 rounded-full">
                      {getCookieCountInfo(product)}
                    </span>
                  </div>
                )}
              </div>

              {/* Weight Options */}
              {product.weight_options && 
               Array.isArray(product.weight_options) && 
               product.weight_options.length > 0 && (
                <div>
                  <h4 className="font-medium text-amber-800 mb-3">Available Sizes</h4>
                  <div className="space-y-2">
                    {product.weight_options.map((option: any, index: number) => (
                      <div 
                        key={index} 
                        className="bg-white/70 rounded-lg p-3 border border-amber-200 flex justify-between items-center"
                      >
                        <span className="text-amber-800 font-medium">
                          {option.weight}{option.unit}
                        </span>
                        <div className="flex flex-col items-end">
                          <Badge variant="outline" className="border-amber-300 text-amber-700 bg-amber-50">
                            ₹{option.selling_price || option.price}
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
            {onAddToCart && (
              <div>
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full border-amber-300 text-amber-700 hover:bg-amber-50"
                  onClick={() => onAddToCart(product)}
                >
                  <ShoppingBag className="h-4 w-4 mr-2" />
                  Add to Cart
                </Button>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ProductQuickView; 