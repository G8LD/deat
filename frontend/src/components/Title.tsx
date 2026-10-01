interface TitleProps {
  title: string
  variant?: "page" | "section"
}

export function Title({ title, variant = "page" }: TitleProps) {
  if (variant === "page")
    return <h1 className="text-5xl font-bold pb-6">{title}</h1>
  return <h2 className="text-3xl font-bold">{title}</h2>
}
