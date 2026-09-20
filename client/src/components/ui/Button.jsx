/**
 * Button — Sonora's base interactive control.
 *
 * Props:
 *   variant  — 'primary' | 'ghost' | 'outline'   (default: 'primary')
 *   size     — 'sm' | 'md' | 'lg'               (default: 'md')
 *   className — additional classes to merge
 *   ...rest   — forwarded to <button>
 */

const variants = {
  primary: [
    'bg-gold text-obsidian',
    'hover:bg-gold/85',
    'active:bg-gold/70',
  ].join(' '),

  ghost: [
    'bg-transparent text-cream',
    'hover:bg-elevated',
    'active:bg-charcoal',
  ].join(' '),

  outline: [
    'bg-transparent border border-border text-cream',
    'hover:border-muted/40 hover:text-gold',
    'active:bg-elevated',
  ].join(' '),
}

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-sm',
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...rest
}) {
  return (
    <button
      className={[
        'inline-flex items-center justify-center gap-2',
        'font-sans font-medium rounded-md',
        'transition-colors duration-150',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-2',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        variants[variant] ?? variants.primary,
        sizes[size] ?? sizes.md,
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </button>
  )
}
