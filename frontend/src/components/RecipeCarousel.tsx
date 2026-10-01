import { Link } from "@tanstack/react-router"
import { ArrowRight, ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { useRef } from "react"
import { Button } from "@/components/ui/button"
import { Title } from "./Title"
import { Card } from "./ui/card"

interface RecipCarouselProps {
  title: string
  titleLink?: string
  data: Array<any>
  card: React.ComponentType<{
    data: any
  }>
}

export default function RecipCarousel(props: RecipCarouselProps) {
  const section = useRef(null)
  const slider = useRef(null)

  function handleClick(direction: number) {
    slider.current.scrollLeft += direction * section.current.clientWidth
  }

  return (
    <div ref={section} className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <Title variant="section">
          {props.titleLink ? (
            <Link to={props.titleLink} className="flex items-center gap-1">
              {props.title} <ArrowRight />
            </Link>
          ) : (
            props.title
          )}
        </Title>

        <div className="flex">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Scroll left"
            onClick={() => handleClick(-1)}
          >
            <ChevronLeftIcon />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Scroll right"
            onClick={() => handleClick(1)}
          >
            <ChevronRightIcon />
          </Button>
        </div>
      </div>
      <div
        ref={slider}
        className="scrollbar-none overflow-y-auto overflow-x-scroll overscroll-x-contain whitespace-nowrap scroll-smooth flex gap-4"
      >
        {props.data.map((value) => (
          <props.card key={value.id} data={value} />
        ))}
        <Link to={props.titleLink}>
          <Card className="w-36 lg:w-48 aspect-2/3 h-full flex flex-row items-center justify-center">
            See all <ArrowRight />
          </Card>
        </Link>
      </div>
    </div>
  )
}
