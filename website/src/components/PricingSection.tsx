"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { CheckCircle2, Star, X } from "lucide-react";
import Link from "next/link";
import { motion, type Transition } from "framer-motion";

type FREQUENCY = "monthly" | "yearly";
const frequencies: FREQUENCY[] = ["monthly", "yearly"];

interface Feature {
  text: string;
  tooltip?: string;
  included?: boolean; // false = show red X (feature not in plan)
}

interface Plan {
  name: string;
  info: string;
  price: {
    monthly: number | string;
    yearly: number | string;
  };
  features: Feature[];
  btn: {
    text: string;
    href: string;
    external?: boolean;
  };
  highlighted?: boolean;
}

const plans: Plan[] = [
  {
    name: "Free",
    info: "For individuals getting started",
    price: { monthly: 0, yearly: 0 },
    features: [
      { text: "5 summaries per month" },
      { text: "All document types", tooltip: "Terms, Privacy Policy, EULA, Refund policies and more" },
      { text: "Summary caching" },
      { text: "Unlimited with own API key", tooltip: "Bring your own OpenAI key for unlimited usage at cost price", included: false },
    ],
    btn: { text: "Get Started Free", href: "https://chromewebstore.google.com/detail/elkhddigpcopldfijeaedkehfacdegeh", external: true },
  },
  {
    name: "Pro",
    info: "For power users who need more",
    // Pro is billed annually. The monthly figure is the effective per-month
    // cost of the yearly plan (yearly / 12), shown for comparison only.
    price: { monthly: +(5.49 / 12).toFixed(2), yearly: 5.49 },
    features: [
      { text: "50 summaries per month" },
      { text: "All document types", tooltip: "Terms, Privacy Policy, EULA, Refund policies and more" },
      { text: "Summary caching" },
      { text: "Priority support" },
      { text: "Unlimited with own API key", tooltip: "Bring your own OpenAI key for unlimited usage at cost price" },
    ],
    btn: { text: "Upgrade to Pro", href: "https://chromewebstore.google.com/detail/elkhddigpcopldfijeaedkehfacdegeh", external: true },
    highlighted: true,
  },
  {
    name: "Enterprise",
    info: "For teams and organisations",
    price: { monthly: "Custom", yearly: "Custom" },
    features: [
      { text: "5,000+ summaries per month" },
      { text: "Team management" },
      { text: "SSO integration" },
      { text: "Dedicated support" },
      { text: "Custom deployment" },
    ],
    btn: { text: "Contact Sales", href: "/support" },
  },
];

export default function PricingSection() {
  const [frequency, setFrequency] = React.useState<FREQUENCY>("monthly");

  return (
    <TooltipProvider>
      <section id="pricing" className="py-20 px-6">
        <div className="flex w-full flex-col items-center justify-center space-y-8">
          {/* Header */}
          <div className="mx-auto max-w-xl space-y-3 text-center animate-on-scroll">
            <p className="text-sm font-medium uppercase tracking-widest text-blue-400">Pricing</p>
            <h2 className="text-3xl md:text-4xl font-light tracking-tight">
              Simple, Transparent Pricing
            </h2>
            <p className="text-muted-foreground text-sm md:text-base">
              Start free, upgrade when you need more
            </p>
          </div>

          {/* Frequency toggle */}
          <FrequencyToggle frequency={frequency} setFrequency={setFrequency} />

          {/* Cards */}
          <div className="mx-auto grid w-full max-w-4xl grid-cols-1 gap-4 md:grid-cols-3 animate-on-scroll">
            {plans.map((plan) => (
              <PricingCard key={plan.name} plan={plan} frequency={frequency} />
            ))}
          </div>
        </div>
      </section>
    </TooltipProvider>
  );
}

function FrequencyToggle({
  frequency,
  setFrequency,
}: {
  frequency: FREQUENCY;
  setFrequency: React.Dispatch<React.SetStateAction<FREQUENCY>>;
}) {
  return (
    <div className="bg-muted/30 mx-auto flex w-fit rounded-full border p-1">
      {frequencies.map((freq) => (
        <button
          key={freq}
          onClick={() => setFrequency(freq)}
          className="relative px-5 py-1.5 text-sm capitalize"
        >
          {/* Text sits above the animated pill */}
          <span
            className={cn(
              "relative z-10 font-medium transition-colors duration-200",
              frequency === freq ? "text-black" : "text-muted-foreground"
            )}
          >
            {freq}
          </span>
          {frequency === freq && (
            <motion.span
              layoutId="frequency-indicator"
              transition={{ type: "spring", duration: 0.4 } as Transition}
              className="absolute inset-0 z-0 rounded-full bg-white shadow-sm"
            />
          )}
        </button>
      ))}
    </div>
  );
}

function PricingCard({
  plan,
  frequency,
}: {
  plan: Plan;
  frequency: FREQUENCY;
}) {
  const price = plan.price[frequency];
  const isNumeric = typeof price === "number";
  const isFree = isNumeric && price === 0;
  const showDiscountBadge = plan.highlighted && !isFree;

  return (
    <div
      className={cn(
        "relative flex w-full flex-col rounded-lg border",
        plan.highlighted && "border-blue-500/60"
      )}
    >
      {plan.highlighted && <BorderTrail size={80} />}

      {/* Card header */}
      <div
        className={cn(
          "bg-muted/20 rounded-t-lg border-b p-5",
          plan.highlighted && "bg-muted/40"
        )}
      >
        {/* Badges */}
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5">
          {plan.highlighted && (
            <p className="bg-background flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium">
              <Star className="h-3 w-3 fill-current" />
              Popular
            </p>
          )}
          {showDiscountBadge && (
            <p className="bg-blue-600 text-white flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium">
              30% off
            </p>
          )}
        </div>

        <div className="text-base font-semibold">{plan.name}</div>
        <p className="text-muted-foreground text-sm">{plan.info}</p>

        <h3 className="mt-3 flex items-end gap-1">
          {isNumeric ? (
            <>
              <span className="text-3xl font-bold">
                {isFree ? "£0" : `£${Number(price).toFixed(2)}`}
              </span>
              <span className="text-muted-foreground text-sm pb-0.5">
                {isFree ? "forever" : frequency === "yearly" ? "/year" : "/month"}
              </span>
            </>
          ) : (
            <span className="text-3xl font-bold">{price}</span>
          )}
        </h3>
      </div>

      {/* Features */}
      <div
        className={cn(
          "text-muted-foreground flex-1 space-y-3.5 px-5 py-6 text-sm",
          plan.highlighted && "bg-muted/10"
        )}
      >
        {plan.features.map((feature, index) => (
          <div key={index} className="flex items-start gap-2.5">
            {feature.included === false ? (
              <X className="text-red-500 mt-0.5 h-4 w-4 flex-shrink-0" />
            ) : (
              <CheckCircle2 className="text-foreground mt-0.5 h-4 w-4 flex-shrink-0" />
            )}
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <p
                  className={cn(
                    "text-left",
                    feature.tooltip && "cursor-pointer border-b border-dashed border-muted-foreground/40",
                    feature.included === false && "text-muted-foreground/70"
                  )}
                >
                  {feature.text}
                </p>
              </TooltipTrigger>
              {feature.tooltip && (
                <TooltipContent>
                  <p>{feature.tooltip}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </div>
        ))}
        {plan.name === "Pro" && (
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="text-foreground mt-0.5 h-4 w-4 flex-shrink-0" />
            <p className="text-left">Billed annually</p>
          </div>
        )}
      </div>

      {/* CTA */}
      <div
        className={cn(
          "mt-auto w-full border-t p-3",
          plan.highlighted && "bg-muted/40"
        )}
      >
        <Button
          className="w-full rounded"
          variant={plan.highlighted ? "default" : "outline"}
          asChild
        >
          {plan.btn.external ? (
            <a href={plan.btn.href} target="_blank" rel="noopener noreferrer">
              {plan.btn.text}
            </a>
          ) : (
            <Link href={plan.btn.href}>{plan.btn.text}</Link>
          )}
        </Button>
      </div>
    </div>
  );
}

type BorderTrailProps = {
  className?: string;
  size?: number;
  transition?: Transition;
  delay?: number;
  style?: React.CSSProperties;
};

function BorderTrail({
  className,
  size = 60,
  transition,
  delay,
  style,
}: BorderTrailProps) {
  const BASE_TRANSITION: Transition = {
    repeat: Infinity,
    duration: 5,
    ease: "linear",
  };

  return (
    <div className="pointer-events-none absolute inset-0 rounded-[inherit] border border-transparent [mask-clip:padding-box,border-box] [mask-composite:intersect] [mask-image:linear-gradient(transparent,transparent),linear-gradient(#000,#000)]">
      <motion.div
        className={cn("absolute aspect-square bg-blue-400/70", className)}
        style={{
          width: size,
          offsetPath: `rect(0 auto auto 0 round ${size}px)`,
          ...style,
        }}
        animate={{ offsetDistance: ["0%", "100%"] }}
        transition={{ ...(transition ?? BASE_TRANSITION), delay }}
      />
    </div>
  );
}
