export function IconArt({ name, size = 44 }: { name: string; size?: number }) {
  return (
    <img
      src={`/art/icons/${name}.webp`}
      width={size}
      height={size}
      alt=""
      className="shrink-0 object-contain"
    />
  )
}

export function TemplateArt({ name, className = '' }: { name: string; className?: string }) {
  return (
    <span
      className={`template-art relative block aspect-square shrink-0 overflow-hidden rounded-xl bg-[#f0f0f2] ${className}`}
      aria-hidden="true"
    >
      {name === 'photo' ? (
        <span className="grid h-full place-items-center">
          <IconArt name="camera" size={48} />
        </span>
      ) : (
        <span
          className="absolute inset-[8%] bg-[#231f33] mask-center mask-no-repeat mask-contain"
          style={{ maskImage: `url(/art/t/${name}.png)` }}
        />
      )}
    </span>
  )
}
