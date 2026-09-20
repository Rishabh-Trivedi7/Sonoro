/**
 * SectionHeading — typographic section title with optional subtitle.
 *
 * Props:
 *   children  — heading text
 *   subtitle  — optional muted line below the heading
 *   display   — if true, uses Playfair Display (editorial moments only)
 *               if false (default), uses Inter semibold
 */
export default function SectionHeading({ children, subtitle, display = false }) {
  return (
    <div className="mb-8">
      <h2
        className={[
          'text-2xl sm:text-3xl text-cream',
          display ? 'font-display' : 'font-sans font-semibold',
        ].join(' ')}
      >
        {children}
      </h2>
      {subtitle && (
        <p className="mt-1.5 text-sm text-muted font-sans">{subtitle}</p>
      )}
    </div>
  )
}
