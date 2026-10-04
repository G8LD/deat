interface TitleProps {
  children: React.ReactNode
  variant?: "page" | "section"
  className?: string
}

export function Title({ children, variant = "page", className = "" }: TitleProps) {
  switch (variant) {
    case "page":
      return <h1 className={`text-5xl font-bold pb-6 ${className}`}>{children}</h1>
    case "section":
      return <h2 className={`text-2xl font-bold ${className}`}>{children}</h2>
  }
}
