import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { accentFromClassName, type Accent } from "@/lib/cardAccents";

const buttonVariants = cva(
  "sm-control sm-lit-btn inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-control font-display text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "sm-btn-primary bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "sm-btn-destructive bg-destructive text-destructive-foreground",
        ai: "sm-btn-ai bg-accent text-accent-foreground",
        success: "sm-btn-success bg-brand-success",
        warning: "sm-btn-warning bg-brand-warning",
        outline: "sm-btn-outline border border-input bg-background hover:bg-secondary hover:text-secondary-foreground",
        secondary: "sm-btn-secondary bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "sm-btn-ghost hover:bg-secondary hover:text-secondary-foreground",
        link: "sm-btn-link text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-4 py-2",
        sm: "h-11 px-3",
        lg: "h-11 px-8",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  accent?: Accent;
}

const VARIANT_ACCENT: Record<string, Accent> = {
  default: "cyan", ai: "violet", secondary: "violet", outline: "neutral", ghost: "neutral", link: "cyan", warning: "gold", success: "lime",
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size, asChild = false, accent, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    const attributes = props as Record<string, unknown>;
    const tone = accent ?? (attributes["data-accent"] as Accent | undefined) ?? accentFromClassName(className) ?? VARIANT_ACCENT[variant ?? "default"] ?? "neutral";
    return (
      <Comp
        {...props}
        ref={ref}
        data-accent={tone}
        data-sm-variant={variant ?? "default"}
        className={cn(buttonVariants({ variant, size, className }))}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
