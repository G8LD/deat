import type { InstructionStep } from "@/client"
import { Title } from "@/components/Title"

interface InstructionsProps {
  instructions: Array<InstructionStep>
}

export function Instructions({ instructions }: InstructionsProps) {
  return (
    <div>
      <Title variant="section" className="mb-2">
        Instructions
      </Title>
      <div className="flex flex-col gap-4">
        {instructions.map((instruction) => (
          <div key={instruction.step}>
            <h3 className="text-base font-bold">Step {instruction.number}</h3>
            <p>{instruction.step}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
