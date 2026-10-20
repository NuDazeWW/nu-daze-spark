import * as React from "react";

import { cn } from "@/lib/utils";
import { accentFromClassName, type Accent } from "@/lib/cardAccents";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  accent?: Accent;
  emphasis?: "subtle" | "standard" | "featured";
  interactive?: boolean;
  surface?: "dark" | "light";
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, accent, emphasis, interactive, surface, ...props }, ref) => {
    const attributes = props as Record<string, unknown>;
    const tone = accent ?? (attributes["data-accent"] as Accent | undefined) ?? accentFromClassName(className) ?? "neutral";
    return (
      <div
        {...props}
        ref={ref}
        data-accent={tone}
        data-emphasis={emphasis ?? attributes["data-emphasis"] ?? "standard"}
        data-interactive={interactive ?? attributes["data-interactive"]}
        data-sm-card-surface={surface}
        className={cn("sm-card sm-lit rounded-xl border bg-card text-card-foreground", className)}
      />
    );
  },
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
  ),
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("text-lg font-semibold leading-tight", className)} {...props} />
  ),
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
  ),
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />,
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
  ),
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
