import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-[7px] border bg-clip-padding text-sm font-medium whitespace-nowrap transition-colors outline-none select-none focus-visible:border-[var(--accent)] focus-visible:ring-3 focus-visible:ring-[var(--accent)]/25 disabled:pointer-events-none disabled:opacity-45 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "border-[#d9bd62]/70 bg-[linear-gradient(180deg,#f0d77a,#c9a84c)] text-[#09150f] shadow-[0_10px_28px_rgba(0,0,0,0.26)] hover:border-[#f2db84] hover:bg-[linear-gradient(180deg,#f5df8d,#d5b557)]",
        outline:
          "border-white/12 bg-white/[0.045] text-[var(--text-primary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-xl hover:border-[var(--accent)] hover:bg-white/[0.085] aria-expanded:border-[var(--accent)] aria-expanded:bg-white/[0.085]",
        secondary:
          "border-white/10 bg-white/[0.06] text-[var(--text-primary)] shadow-[0_10px_34px_rgba(0,0,0,0.16),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-xl hover:border-[var(--accent)] hover:bg-white/[0.095] aria-expanded:border-[var(--accent)] aria-expanded:bg-white/[0.095]",
        ghost:
          "border-transparent bg-transparent text-[var(--text-muted)] shadow-none hover:bg-white/[0.07] hover:text-[var(--text-primary)] aria-expanded:bg-white/[0.07] aria-expanded:text-[var(--text-primary)]",
        destructive:
          "border-red-400/30 bg-red-950/40 text-red-100 hover:bg-red-900/50 focus-visible:border-red-400/60 focus-visible:ring-red-400/20",
        link: "border-transparent bg-transparent text-[var(--accent)] shadow-none underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-9 gap-1.5 px-3 has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5",
        xs: "h-6 gap-1 px-2 text-xs in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1 px-3 text-[0.8rem] in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-11 gap-1.5 px-5 has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        icon: "size-8",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
