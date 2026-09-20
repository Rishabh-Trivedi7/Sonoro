import { Link } from 'react-router-dom'
import { ROUTES } from '../constants'
import PageContainer from '../components/ui/PageContainer'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-obsidian text-cream flex flex-col">
      <PageContainer>
        <p className="text-xs font-sans tracking-widest text-muted uppercase mb-3">
          404
        </p>
        <h1 className="font-display text-3xl text-cream">Page not found</h1>
        <p className="mt-3 text-sm text-muted">
          This room doesn&apos;t exist.
        </p>
        <Link
          to={ROUTES.HOME}
          className="mt-6 inline-block text-sm text-gold transition-colors duration-150 hover:text-gold/75"
        >
          Return home →
        </Link>
      </PageContainer>
    </div>
  )
}
