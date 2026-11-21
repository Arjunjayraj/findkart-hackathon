import { useState } from 'react';
import type { Product } from '../types/findkart.ts';
import { ProductImage } from './ProductImage.tsx';

interface ProductCardProps {
  product: Product;
  isWishlisted: boolean;
  showBrand?: boolean;
  showWishlistButton?: boolean;
  showRating?: boolean;
  onAddToCart: (product: Product) => void;
  onToggleWishlist: (productId: string) => void;
  onSelectProduct: (product: Product) => void;
}

export function ProductCard({
  product,
  isWishlisted,
  showBrand = false,
  showWishlistButton = true,
  showRating = true,
  onAddToCart,
  onToggleWishlist,
  onSelectProduct,
}: ProductCardProps) {
  const [justAdded, setJustAdded] = useState(false);

  const handleAdd = () => {
    onAddToCart(product);
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 950);
  };

  return (
    <article className="min-w-0 bg-light-surface-container-lowest rounded-xl border border-light-outline-variant/75 p-3 sm:p-3.5 flex flex-col justify-between gap-3 hover:border-light-primary/45 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 shadow-xs h-full">
      <div className="flex flex-col gap-2 min-w-0">
        {/* Studio Image Frame */}
        <div className="relative bg-[#F6F4EE] rounded-lg aspect-[4/3] p-2.5 flex items-center justify-center overflow-hidden">
          {product.discountPercent > 0 && (
            <span className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-md bg-terracotta text-white font-label text-[11px] font-semibold leading-tight tabular-nums">
              -{product.discountPercent}%
            </span>
          )}

          <button
            type="button"
            onClick={() => onSelectProduct(product)}
            className="w-full h-full flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-light-primary rounded"
            aria-label={`View details for ${product.name}`}
          >
            <ProductImage
              src={product.imageUrl}
              alt={product.imageAlt}
              className="w-full h-full object-contain transition-transform duration-200 hover:scale-[1.03]"
            />
          </button>

          {showWishlistButton && (
            <button
              type="button"
              onClick={() => onToggleWishlist(product.id)}
              aria-label={isWishlisted ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
              className={`absolute top-2 right-2 z-10 w-8 h-8 rounded-full bg-white/90 hover:bg-white shadow-xs flex items-center justify-center transition-colors cursor-pointer ${
                isWishlisted ? 'text-terracotta' : 'text-light-on-surface-variant hover:text-terracotta'
              }`}
            >
              <span
                className="material-symbols-outlined text-[17px]"
                style={isWishlisted ? { fontVariationSettings: "'FILL' 1" } : undefined}
                aria-hidden="true"
              >
                favorite
              </span>
            </button>
          )}
        </div>

        {showBrand && (
          <span className="font-label text-[10.5px] tracking-wider text-light-on-surface-variant uppercase truncate">
            {product.brand}
          </span>
        )}

        <button
          type="button"
          onClick={() => onSelectProduct(product)}
          className="text-left cursor-pointer hover:text-light-primary transition-colors min-w-0"
        >
          <h3 className="font-title text-[14px] leading-snug font-semibold text-light-on-surface line-clamp-2 break-words min-h-[2.45rem]">
            {product.name}
          </h3>
        </button>

        {showRating && (
          <div className="flex items-center gap-1 text-xs">
            <div className="flex items-center text-accent-yellow" aria-hidden="true">
              {[0, 1, 2, 3, 4].map((idx) => (
                <span
                  key={idx}
                  className="material-symbols-outlined text-[13px]"
                  style={{ fontVariationSettings: idx < Math.round(product.rating) ? "'FILL' 1" : "'FILL' 0" }}
                >
                  star
                </span>
              ))}
            </div>
            <span className="font-body text-[11.5px] text-light-on-surface-variant tabular-nums">
              ({product.reviewCount.toLocaleString('en-IN')})
            </span>
          </div>
        )}
      </div>

      {/* Price + Compact Dark Pine Quick-Add Cart Button */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-light-outline-variant/40">
        <div className="flex items-baseline gap-1.5 flex-wrap min-w-0">
          <span className="font-title text-[16px] font-bold text-light-on-surface tabular-nums">
            ₹{product.price.toLocaleString('en-IN')}
          </span>
          {product.originalPrice > product.price && (
            <span className="font-body text-[12px] text-light-on-surface-variant line-through tabular-nums">
              ₹{product.originalPrice.toLocaleString('en-IN')}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleAdd}
          aria-label={justAdded ? `${product.name} added to cart` : `Add ${product.name} to cart`}
          title={justAdded ? 'Added to Cart' : 'Add to Cart'}
          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-all duration-150 cursor-pointer ${
            justAdded
              ? 'bg-success text-on-success scale-95'
              : 'bg-light-primary text-light-on-primary hover:bg-light-primary-container'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
            {justAdded ? 'check' : 'add_shopping_cart'}
          </span>
        </button>
      </div>
    </article>
  );
}
