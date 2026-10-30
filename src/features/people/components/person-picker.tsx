"use client";

import { useEffect, useRef, useState } from "react";
import { Autocomplete, AutocompleteItem } from "@windmorph/react";
import { useTranslations } from "next-intl";
import { useWorkspace } from "@/features/workspaces/workspace-context";
import { searchPeople } from "../actions";

type Option = { id: string; name: string; detail: string };

const SEARCH_DELAY_MS = 200;

/**
 * Chooses one person by typing their name; matches come from the server (only people the
 * caller may see), so it works for any size of workspace. Submits the member id under `name`.
 */
export function PersonPicker({
  name,
  label,
  defaultValue,
  exclude,
  errorMessage,
}: {
  name: string;
  label: string;
  defaultValue: { id: string; name: string } | null;
  /** A person who can't be chosen, such as the one being edited. */
  exclude?: string;
  errorMessage?: string;
}) {
  const { workspace } = useWorkspace();
  const tc = useTranslations("common");
  const [selected, setSelected] = useState(defaultValue);
  const [input, setInput] = useState(defaultValue?.name ?? "");
  const [items, setItems] = useState<Option[]>(
    defaultValue ? [{ ...defaultValue, detail: "" }] : []
  );
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  function onInputChange(text: string) {
    setInput(text);
    clearTimeout(timer.current);
    if (text === selected?.name) return;
    setLoading(true);
    timer.current = setTimeout(async () => {
      const found = await searchPeople(workspace.id, text);
      setItems(found.filter((p) => p.id !== exclude));
      setLoading(false);
    }, SEARCH_DELAY_MS);
  }

  return (
    <>
      <Autocomplete
        className="w-full"
        label={label}
        items={items}
        inputValue={input}
        onInputChange={onInputChange}
        value={selected?.id ?? null}
        onChange={(key) => {
          const person = items.find((p) => p.id === key) ?? null;
          setSelected(person && { id: person.id, name: person.name });
          if (person) setInput(person.name);
        }}
        loading={loading}
        clearable
        labels={{ clear: tc("clearField", { field: label }) }}
        filter={() => true}
        invalid={Boolean(errorMessage)}
        errorMessage={errorMessage}
      >
        {(person) => (
          <AutocompleteItem key={person.id} textValue={person.name} description={person.detail}>
            {person.name}
          </AutocompleteItem>
        )}
      </Autocomplete>
      <input type="hidden" name={name} value={input ? (selected?.id ?? "") : ""} />
    </>
  );
}
