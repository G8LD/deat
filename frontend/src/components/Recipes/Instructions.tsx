import type { InstructionStep } from "@/client"
import { Title } from "@/components/Title"
import { Item, ItemContent, ItemMedia } from "@/components/ui/item"

interface InstructionsProps {
  instructions: Array<InstructionStep>
}

export function Instructions({ instructions }: InstructionsProps) {
  if (!instructions || instructions.length === 0) return null

  return (
    <div>
      <Title variant="section" className="mb-2">
        Instructions
      </Title>
      <div className="flex flex-col gap-3">
        {instructions.map((instruction) => (
          <Item
            key={instruction.number}
            variant="muted"
            className="flex-nowrap items-start gap-4 p-4"
          >
            <ItemMedia>
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                {instruction.number}
              </span>
            </ItemMedia>
            <ItemContent>
              <p className="text-sm sm:text-base leading-relaxed text-foreground">{instruction.step}</p>
            </ItemContent>
          </Item>
        ))}
      </div>
    </div>
  )
}
