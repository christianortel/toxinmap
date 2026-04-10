import type { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em]",
  {
    variants: {
      variant: {
        default: "border-white/10 bg-white/6 text-[var(--foreground-muted)]",
        industrial:
          "border-[rgba(167,116,78,0.3)] bg-[rgba(167,116,78,0.14)] text-[var(--foreground)]",
        bio: "border-[rgba(132,160,121,0.3)] bg-[rgba(112,132,105,0.16)] text-[var(--foreground)]",
        water:
          "border-[rgba(135,160,176,0.28)] bg-[rgba(135,160,176,0.14)] text-[var(--foreground)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>) {
  return <div className={cn(badgeVariants({ variant, className }))} {...props} />;
}
