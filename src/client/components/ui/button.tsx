import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0ea5e9] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        threed:
          "bg-[#0ea5e9] hover:bg-[#0284c7] text-white font-extrabold uppercase tracking-wider border-b-4 border-[#0369a1] active:translate-y-[2px] active:border-b-2 rounded-2xl transition-all duration-100 ease-in-out cursor-pointer",
        threedOutline:
          "bg-white hover:bg-slate-50 text-[#0ea5e9] font-extrabold uppercase tracking-wider border-2 border-slate-200 border-b-4 border-b-slate-300 active:translate-y-[2px] active:border-b-2 active:bg-slate-100 rounded-2xl transition-all duration-100 ease-in-out cursor-pointer",
        threedIcon:
          "bg-white hover:bg-sky-50 text-[#0ea5e9] border-2 border-slate-200 border-b-4 border-b-slate-300 active:translate-y-[2px] active:border-b-2 active:bg-slate-100 rounded-2xl transition-all duration-100 ease-in-out cursor-pointer",
        threedPrimaryIcon:
          "bg-[#0ea5e9] hover:bg-[#0284c7] text-white border-b-4 border-[#0369a1] active:translate-y-[2px] active:border-b-2 rounded-2xl transition-all duration-100 ease-in-out cursor-pointer",
      },
      size: {
        default: "h-10 px-4 py-2 rounded-2xl",
        sm: "h-10 px-4 rounded-2xl",
        lg: "h-12 px-8 rounded-2xl",
        icon: "h-10 w-10 rounded-2xl",
        iconLg: "h-11 w-11 rounded-2xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
