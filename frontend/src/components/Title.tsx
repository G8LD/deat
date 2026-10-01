interface TitleProps {
  children: React.ReactNode
  variant?: "page" | "section"
  className?: string
}

export function Title({ children, variant = "page", className = "" }: TitleProps) {
  if (variant === "page")
    return <h1 className={`text-5xl font-bold pb-6 ${className}`}>{children}</h1>
  return <h2 className={`text-3xl font-bold ${className}`}>{children}</h2>
}
