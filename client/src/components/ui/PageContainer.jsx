/**
 * PageContainer — standard content wrapper for all route-level pages.
 *
 * Provides consistent max-width, horizontal padding, and vertical
 * breathing room. Responsive across mobile → desktop.
 */
export default function PageContainer({ children, className = '' }) {
  return (
    <div
      className={[
        'max-w-5xl mx-auto',
        'px-3.5 py-6 sm:px-8 sm:py-14',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  )
}
