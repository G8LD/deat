interface TitleProps {
  children: React.ReactNode
  variant?: "page" | "subPage" | "section"
  className?: string
}

export function Title({ children, variant = "page", className = "" }: TitleProps) {
  switch (variant) {
    case "page":
      return <h1 className={`text-5xl font-bold pb-4 ${className}`}>{children}</h1>
    case "subPage":
      return <h1 className={`text-4xl font-bold pb-2 ${className}`}>{children}</h1>
    case "section":
      return <h2 className={`text-2xl font-bold ${className}`}>{children}</h2>
  }
}
