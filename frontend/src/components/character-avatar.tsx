import { env } from '@/lib/env'
import { cn } from '@/lib/utils'

const sizes = {
  sm: 'size-10 text-sm',
  md: 'size-14 text-lg',
  lg: 'size-24 text-3xl',
} as const

type CharacterAvatarProps = {
  name: string
  src?: string | null
  size?: keyof typeof sizes
  alt?: string
  className?: string
}

function initials(name: string) {
  const letters = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')

  return letters || '?'
}

function resolveAvatarSrc(src: string) {
  return src.startsWith('/') ? `${env.apiBaseUrl}${src}` : src
}

export function CharacterAvatar({
  name,
  src,
  size = 'md',
  alt = name,
  className,
}: CharacterAvatarProps) {
  const classes = cn(
    'border-border bg-muted text-muted-foreground inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border',
    sizes[size],
    className,
  )

  if (src) {
    return (
      <span className={classes}>
        <img src={resolveAvatarSrc(src)} alt={alt} className="size-full object-cover" />
      </span>
    )
  }

  return (
    <span className={cn(classes, 'font-display')} aria-hidden="true">
      {initials(name)}
    </span>
  )
}
