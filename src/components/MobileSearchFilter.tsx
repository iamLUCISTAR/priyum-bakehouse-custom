import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Search, Filter, X, Star, Clock, MapPin } from "lucide-react";

interface MobileSearchFilterProps {
  onSearch: (query: string) => void;
  onFilterChange: (filters: FilterOptions) => void;
  categories: string[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

interface FilterOptions {
  priceRange: string;
  sortBy: string;
  availability: string;
}

const MobileSearchFilter = ({
  onSearch,
  onFilterChange,
  categories,
  selectedCategory,
  onCategoryChange
}: MobileSearchFilterProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    priceRange: "all",
    sortBy: "name",
    availability: "all"
  });

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    onSearch(query);
  };

  const handleFilterChange = (newFilters: Partial<FilterOptions>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    onFilterChange(updatedFilters);
  };

  const clearFilters = () => {
    const defaultFilters = {
      priceRange: "all",
      sortBy: "name",
      availability: "all"
    };
    setFilters(defaultFilters);
    onFilterChange(defaultFilters);
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-amber-600" />
        <Input
          type="text"
          placeholder="Search products..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-10 pr-4 py-3 bg-amber-50/80 border-amber-200 focus:border-amber-400 focus:ring-amber-400"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6"
            onClick={() => handleSearch("")}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Category Pills */}
      <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => onCategoryChange(category)}
            className={`flex-shrink-0 px-4 py-2 rounded-full font-medium transition-all duration-200 ${
              selectedCategory === category
                ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg'
                : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Filter Button */}
      <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" className="w-full border-amber-200 text-amber-700 hover:bg-amber-50">
            <Filter className="h-4 w-4 mr-2" />
            Filters & Sort
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[80vh] bg-amber-50/95 border-amber-200">
          <SheetHeader>
            <SheetTitle className="text-xl font-bold text-amber-800">Filters & Sort</SheetTitle>
          </SheetHeader>
          
          <div className="mt-6 space-y-6 overflow-y-auto h-full pb-20">
            {/* Price Range */}
            <div>
              <h3 className="text-lg font-semibold text-amber-800 mb-3">Price Range</h3>
              <div className="space-y-2">
                {[
                  { value: "all", label: "All Prices" },
                  { value: "0-100", label: "Under ₹100" },
                  { value: "100-200", label: "₹100 - ₹200" },
                  { value: "200-500", label: "₹200 - ₹500" },
                  { value: "500+", label: "Above ₹500" }
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleFilterChange({ priceRange: option.value })}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                      filters.priceRange === option.value
                        ? 'bg-amber-200 text-amber-800'
                        : 'bg-white/70 text-amber-700 hover:bg-amber-100'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort By */}
            <div>
              <h3 className="text-lg font-semibold text-amber-800 mb-3">Sort By</h3>
              <div className="space-y-2">
                {[
                  { value: "name", label: "Name (A-Z)" },
                  { value: "name-desc", label: "Name (Z-A)" },
                  { value: "price", label: "Price (Low to High)" },
                  { value: "price-desc", label: "Price (High to Low)" },
                  { value: "popular", label: "Most Popular" }
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleFilterChange({ sortBy: option.value })}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                      filters.sortBy === option.value
                        ? 'bg-amber-200 text-amber-800'
                        : 'bg-white/70 text-amber-700 hover:bg-amber-100'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Availability */}
            <div>
              <h3 className="text-lg font-semibold text-amber-800 mb-3">Availability</h3>
              <div className="space-y-2">
                {[
                  { value: "all", label: "All Items", icon: null },
                  { value: "available", label: "Available Now", icon: Clock },
                  { value: "preorder", label: "Pre-order", icon: Star }
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleFilterChange({ availability: option.value })}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center space-x-3 ${
                      filters.availability === option.value
                        ? 'bg-amber-200 text-amber-800'
                        : 'bg-white/70 text-amber-700 hover:bg-amber-100'
                    }`}
                  >
                    {option.icon && <option.icon className="h-4 w-4" />}
                    <span>{option.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Features */}
            <div>
              <h3 className="text-lg font-semibold text-amber-800 mb-3">Quick Features</h3>
              <div className="grid grid-cols-2 gap-3">
                <Badge variant="outline" className="border-amber-300 text-amber-700 bg-amber-50 py-2 px-3">
                  <Clock className="h-3 w-3 mr-1" />
                  Fresh Daily
                </Badge>
                <Badge variant="outline" className="border-amber-300 text-amber-700 bg-amber-50 py-2 px-3">
                  <MapPin className="h-3 w-3 mr-1" />
                  Local Bakery
                </Badge>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-4">
              <Button
                variant="outline"
                onClick={clearFilters}
                className="flex-1 border-amber-300 text-amber-700 hover:bg-amber-50"
              >
                Clear All
              </Button>
              <Button
                onClick={() => setIsFilterOpen(false)}
                className="flex-1 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white"
              >
                Apply Filters
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default MobileSearchFilter; 