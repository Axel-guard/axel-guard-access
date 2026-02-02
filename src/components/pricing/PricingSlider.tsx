import { useState, useEffect, useCallback } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PricingPlan {
  id: string;
  title: string;
  description: string;
  price: string;
  period: string;
  features: string[];
  cta: string;
  popular?: boolean;
  color?: string;
}

const pricingPlans: PricingPlan[] = [
  {
    id: "starter",
    title: "Starter Pack",
    description: "Perfect for small businesses",
    price: "₹4,999",
    period: "one-time",
    features: ["5 GPS Devices", "Basic Dashboard", "Email Support"],
    cta: "Get Started",
    color: "from-blue-500 to-cyan-400",
  },
  {
    id: "professional",
    title: "Professional",
    description: "For growing businesses",
    price: "₹14,999",
    period: "one-time",
    features: ["20 GPS Devices", "Advanced Analytics", "Priority Support"],
    cta: "Choose Pro",
    popular: true,
    color: "from-primary to-purple-500",
  },
  {
    id: "enterprise",
    title: "Enterprise",
    description: "Large-scale operations",
    price: "₹49,999",
    period: "one-time",
    features: ["100 GPS Devices", "Custom Dashboard", "24/7 Support"],
    cta: "Contact Sales",
    color: "from-orange-500 to-red-400",
  },
  {
    id: "bulk-deal",
    title: "Bulk Deal",
    description: "Orders above 50 units",
    price: "Custom",
    period: "quote",
    features: ["Volume Discounts", "Dedicated Manager", "Custom Integration"],
    cta: "Get Quote",
    color: "from-green-500 to-emerald-400",
  },
  {
    id: "rental",
    title: "Rental Plan",
    description: "Flexible monthly rental",
    price: "₹499",
    period: "/month",
    features: ["No Upfront Cost", "Free Replacement", "Cancel Anytime"],
    cta: "Start Rental",
    color: "from-pink-500 to-rose-400",
  },
];

export const PricingSlider = () => {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: "center",
    slidesToScroll: 1,
  });
  
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);
  const [isHovered, setIsHovered] = useState(false);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const scrollTo = useCallback((index: number) => emblaApi?.scrollTo(index), [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    
    setScrollSnaps(emblaApi.scrollSnapList());
    emblaApi.on("select", onSelect);
    onSelect();
    
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onSelect]);

  // Auto-play functionality
  useEffect(() => {
    if (!emblaApi || isHovered) return;
    
    const interval = setInterval(() => {
      emblaApi.scrollNext();
    }, 4000);
    
    return () => clearInterval(interval);
  }, [emblaApi, isHovered]);

  return (
    <div className="bg-gradient-to-t from-background via-background to-transparent pt-4 pb-2">
      <div className="flex items-center justify-between mb-3 px-1">
        <div>
          <h2 className="text-lg font-bold text-foreground">Special Offers & Plans</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={scrollPrev}
            className="h-8 w-8 rounded-full shadow-sm"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={scrollNext}
            className="h-8 w-8 rounded-full shadow-sm"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div
        className="overflow-hidden"
        ref={emblaRef}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="flex gap-3">
          {pricingPlans.map((plan) => (
            <div
              key={plan.id}
              className="flex-[0_0_85%] min-w-0 sm:flex-[0_0_45%] lg:flex-[0_0_30%] xl:flex-[0_0_22%]"
            >
              <Card className={cn(
                "relative h-full overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 shadow-md",
                plan.popular && "ring-2 ring-primary shadow-primary/20"
              )}>
                {plan.popular && (
                  <div className="absolute top-0 right-0">
                    <Badge className="rounded-none rounded-bl-lg bg-primary text-primary-foreground text-xs px-2 py-0.5">
                      Popular
                    </Badge>
                  </div>
                )}
                <div className={cn("h-1.5 bg-gradient-to-r", plan.color)} />
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-base">{plan.title}</CardTitle>
                  <p className="text-xs text-muted-foreground line-clamp-1">{plan.description}</p>
                </CardHeader>
                <CardContent className="py-0 px-4 space-y-2">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-foreground">{plan.price}</span>
                    <span className="text-xs text-muted-foreground">{plan.period}</span>
                  </div>
                  <ul className="space-y-1">
                    {plan.features.slice(0, 3).map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-1.5 text-xs">
                        <div className={cn("h-1 w-1 rounded-full bg-gradient-to-r flex-shrink-0", plan.color)} />
                        <span className="truncate">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter className="p-3">
                  <Button 
                    size="sm"
                    className={cn(
                      "w-full bg-gradient-to-r text-white transition-opacity hover:opacity-90 h-8 text-xs",
                      plan.color
                    )}
                  >
                    {plan.cta}
                  </Button>
                </CardFooter>
              </Card>
            </div>
          ))}
        </div>
      </div>

      {/* Dot Indicators */}
      <div className="flex items-center justify-center gap-1.5 mt-3">
        {scrollSnaps.map((_, index) => (
          <button
            key={index}
            onClick={() => scrollTo(index)}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300",
              selectedIndex === index
                ? "w-5 bg-primary"
                : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"
            )}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};
