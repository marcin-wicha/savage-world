import { Link } from 'react-router-dom'

export function NotFoundRoute() {
  return (
    <section>
      <h1 className="text-3xl font-bold tracking-tight text-white">Page not found</h1>
      <p className="mt-4 text-slate-300">The page you are looking for does not exist.</p>
      <Link
        to="/"
        className="mt-6 inline-flex text-sm font-semibold text-amber-400 hover:text-amber-300"
      >
        Return home
      </Link>
    </section>
  )
}
