import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";
import { type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-full text-sm font-medium transition duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgba(7,9,11,0.9)] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "border border-white/12 bg-white/10 text-[var(--foreground)] hover:bg-white/14",
        ghost: "text-[var(--foreground-muted)] hover:bg-white/7 hover:text-[var(--foreground)]",
        outline:
          "border border-white/12 bg-transparent text-[var(--foreground)] hover:bg-white/8",
        industrial:
          "border border-[rgba(167,116,78,0.32)] bg-[rgba(167,116,78,0.14)] text-[var(--foreground)] hover:bg-[rgba(167,116,78,0.22)]",
        bio: "border border-[rgba(132,160,121,0.28)] bg-[rgba(112,132,105,0.14)] text-[var(--foreground)] hover:bg-[rgba(112,132,105,0.22)]",
      },
      size: {
        default: "px-5 py-3",
        sm: "px-4 py-2.5 text-xs",
        lg: "px-6 py-3.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    children: ReactNode;
  };

export function Button({
  asChild,
  className,
  variant,
  size,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp className={cn(buttonVariants({ variant, size, className }))} {...props}>
      {children}
    </Comp>
  );
}
