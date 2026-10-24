import type { InstructionStep } from "@/client"
import { Title } from "@/components/Title"

interface InstructionsProps {
  instructions: Array<InstructionStep>
}

export function Instructions({ instructions }: InstructionsProps) {
  if (!instructions || instructions.length === 0) return null

  return (
    <div>
      <Title variant="section" className="mb-3">
        Instructions
      </Title>
      <div className="flex flex-col gap-3">
        {instructions.map((instruction) => (
          <div
            key={instruction.number}
            className="flex gap-4 p-4 rounded-xl border border-border/70 bg-card items-start"
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
              {instruction.number}
            </span>
            <p className="text-sm sm:text-base leading-relaxed text-foreground pt-0.5">{instruction.step}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
