import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Phone, Mail, ShoppingBag, Clock, MapPin, Star, X } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Product = Database["public"]["Tables"]["products"]["Row"];

interface ProductQuickViewProps {
  product: Product;
  contactInfo: {
    phone?: string;
    email?: string;
  } | null;
  children: React.ReactNode;
}

const ProductQuickView = ({ product, contactInfo, children }: ProductQuickViewProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const formatPrice = (price: number, weight?: number, unit?: string) => {
    if (weight && unit) {
      return `₹${price} (${weight}${unit})`;
    }
    return `₹${price}`;
  };

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

            {/* Pricing */}
            <div>
              <h3 className="text-lg font-semibold text-amber-800 mb-3">Pricing</h3>
              
              {/* Base Price */}
              <div className="bg-amber-100/70 rounded-lg p-4 mb-4 border border-amber-200">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-amber-800">
                    Base Price {product.base_weight && product.weight_unit && 
                      `(${product.base_weight}${product.weight_unit})`}
                  </span>
                  <Badge className="bg-gradient-to-r from-amber-600 to-orange-600 text-white text-lg px-3 py-1">
                    ₹{product.price}
                  </Badge>
                </div>
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
              <div className="flex flex-col gap-3">
                <Button
                  asChild
                  size="lg"
                  className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white"
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
                  className="border-amber-300 text-amber-700 hover:bg-amber-50"
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
      </SheetContent>
    </Sheet>
  );
};

export default ProductQuickView; 