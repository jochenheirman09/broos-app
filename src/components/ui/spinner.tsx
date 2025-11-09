"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

const spinnerVariants = cva("animate-spin", {
  variants: {
    size: {
      small: "h-4 w-4",
      medium: "h-6 w-6",
      large: "h-8 w-8",
    },
  },
  defaultVariants: {
    size: "medium",
  },
});

interface SpinnerProps
  extends React.HTMLAttributes<SVGSVGElement>,
    VariantProps<typeof spinnerVariants> {}

export const Spinner = ({ size, className, ...props }: SpinnerProps) => {
  return (
    <Loader2 className={cn(spinnerVariants({ size, className }))} {...props} />
  );
};
