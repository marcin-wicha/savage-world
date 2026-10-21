import { Link } from 'react-router-dom'

export function HomeRoute() {
  return (
    <section className="max-w-2xl">
      <p className="text-sm font-semibold tracking-widest text-amber-400 uppercase">
        Savage Worlds Adventure Edition
      </p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight text-white sm:text-5xl">
        Build your next legend.
      </h1>
      <p className="mt-5 text-lg leading-8 text-slate-300">
        Create, validate, and advance Savage Worlds characters without losing track of the rules.
      </p>
      <Link
        to="/characters"
        className="mt-8 inline-flex rounded-md bg-amber-500 px-5 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-amber-400"
      >
        Start a character
      </Link>
    </section>
  )
}
