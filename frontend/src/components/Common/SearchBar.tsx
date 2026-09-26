import { Field } from "@/components/ui/field";
import { Search } from "lucide-react";
import { InputGroup, InputGroupAddon, InputGroupInput } from "../ui/input-group";

export function SearchBar() {
  return (
    <Field>
      <InputGroup>
        <InputGroupAddon align="inline-start">
          <Search />
        </InputGroupAddon>
        <InputGroupInput id="input-group-url" placeholder="Search for a recipe" />
      </InputGroup>
    </Field>
  );
}
