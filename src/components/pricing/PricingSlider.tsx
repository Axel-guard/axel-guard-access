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
    description: "Perfect for small businesses starting their journey",
    price: "₹4,999",
    period: "one-time",
    features: ["5 GPS Devices", "Basic Dashboard", "Email Support", "1 Month Warranty"],
    cta: "Get Started",
    color: "from-blue-500 to-cyan-400",
  },
  {
    id: "professional",
    title: "Professional",
    description: "Ideal for growing businesses with moderate needs",
    price: "₹14,999",
    period: "one-time",
    features: ["20 GPS Devices", "Advanced Analytics", "Priority Support", "6 Month Warranty"],
    cta: "Choose Pro",
    popular: true,
    color: "from-primary to-purple-500",
  },
  {
    id: "enterprise",
    title: "Enterprise",
    description: "Complete solution for large-scale operations",
    price: "₹49,999",
    period: "one-time",
    features: ["100 GPS Devices", "Custom Dashboard", "24/7 Support", "1 Year Warranty"],
    cta: "Contact Sales",
    color: "from-orange-500 to-red-400",
  },
  {
    id: "bulk-deal",
    title: "Bulk Deal",
    description: "Special discounts for bulk orders above 50 units",
    price: "Custom",
    period: "quote",
    features: ["Volume Discounts", "Dedicated Manager", "Custom Integration", "Extended Warranty"],
    cta: "Get Quote",
    color: "from-green-500 to-emerald-400",
  },
  {
    id: "rental",
    title: "Rental Plan",
    description: "Flexible rental options for short-term needs",
    price: "₹499",
    period: "/device/month",
    features: ["No Upfront Cost", "Free Replacement", "Monthly Billing", "Cancel Anytime"],
    cta: "Start Rental",
    color: "from-pink-500 to-rose-400",
  },
];

export const PricingSlider = () => {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: "start",
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
    <div className="mt-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Special Offers & Plans</h2>
          <p className="text-sm text-muted-foreground">Explore our pricing packages and deals</p>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={scrollPrev}
            className="h-9 w-9 rounded-full"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={scrollNext}
            className="h-9 w-9 rounded-full"
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
        <div className="flex gap-4">
          {pricingPlans.map((plan) => (
            <div
              key={plan.id}
              className="flex-[0_0_100%] min-w-0 sm:flex-[0_0_calc(50%-8px)] lg:flex-[0_0_calc(33.333%-11px)]"
            >
              <Card className={cn(
                "relative h-full overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1",
                plan.popular && "ring-2 ring-primary"
              )}>
                {plan.popular && (
                  <div className="absolute top-0 right-0">
                    <Badge className="rounded-none rounded-bl-lg bg-primary text-primary-foreground">
                      Popular
                    </Badge>
                  </div>
                )}
                <div className={cn("h-2 bg-gradient-to-r", plan.color)} />
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{plan.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                    <span className="text-sm text-muted-foreground">{plan.period}</span>
                  </div>
                  <ul className="space-y-2">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm">
                        <div className={cn("h-1.5 w-1.5 rounded-full bg-gradient-to-r", plan.color)} />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button 
                    className={cn(
                      "w-full bg-gradient-to-r text-white transition-opacity hover:opacity-90",
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

      {/* Mobile Navigation Arrows */}
      <div className="flex sm:hidden items-center justify-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={scrollPrev}
          className="h-10 w-10 rounded-full"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={scrollNext}
          className="h-10 w-10 rounded-full"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Dot Indicators */}
      <div className="flex items-center justify-center gap-2">
        {scrollSnaps.map((_, index) => (
          <button
            key={index}
            onClick={() => scrollTo(index)}
            className={cn(
              "h-2 rounded-full transition-all duration-300",
              selectedIndex === index
                ? "w-6 bg-primary"
                : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
            )}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};
