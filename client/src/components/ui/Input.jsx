/**
 * Input — Sonora's base text input.
 *
 * Props:
 *   label     — visible label (optional but recommended for accessibility)
 *   id        — required when label is provided (binds label → input)
 *   type      — input type (default: 'text')
 *   className — additional classes merged onto the <input>
 *   ...rest   — forwarded to <input>
 */
export default function Input({
  label,
  id,
  type = 'text',
  placeholder = '',
  className = '',
  ...rest
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={id}
          className="text-xs font-sans font-medium text-muted uppercase tracking-wider"
        >
          {label}
        </label>
      )}
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        className={[
          'w-full bg-charcoal border border-border rounded-md',
          'px-3 py-2.5 text-base sm:text-sm text-cream font-sans',
          'placeholder:text-muted/50',
          'transition-colors duration-150',
          'hover:border-muted/30',
          'focus:outline-none focus:border-gold/60',
          className,
        ].join(' ')}
        {...rest}
      />
    </div>
  )
}
