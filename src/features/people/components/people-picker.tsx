"use client";

import { useEffect, useRef, useState } from "react";
import { Autocomplete, AutocompleteItem } from "@windmorph/react";
import { useWorkspace } from "@/features/workspaces/workspace-context";
import { searchPeople } from "../actions";

type Person = { id: string; name: string; detail?: string };

const SEARCH_DELAY_MS = 200;

/**
 * Chooses several people by typing their names (matches from the server, only people the caller
 * may see). Submits each member id under `name`.
 */
export function PeoplePicker({
  name,
  label,
  defaultValue,
  errorMessage,
}: {
  name: string;
  label: string;
  defaultValue: Person[];
  errorMessage?: string;
}) {
  const { workspace } = useWorkspace();
  const [chosen, setChosen] = useState<Person[]>(defaultValue);
  const [found, setFound] = useState<Person[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  // Chosen people stay in the list so their chips keep their names while searching.
  const items = [...chosen, ...found.filter((p) => !chosen.some((c) => c.id === p.id))];

  function onSearch(text: string) {
    setSearch(text);
    clearTimeout(timer.current);
    if (!text.trim()) return setFound([]);
    setLoading(true);
    timer.current = setTimeout(async () => {
      setFound(await searchPeople(workspace.id, text));
      setLoading(false);
    }, SEARCH_DELAY_MS);
  }

  return (
    <>
      <Autocomplete
        className="w-full"
        label={label}
        selectionMode="multiple"
        items={items}
        inputValue={search}
        onInputChange={onSearch}
        value={chosen.map((p) => p.id)}
        // Clearing the search after each pick: leftover text would clear the choice on blur.
        onChange={(keys) => {
          const ids = new Set(Array.from(keys as Iterable<string | number>, String));
          setChosen(items.filter((p) => ids.has(p.id)));
          setSearch("");
        }}
        loading={loading}
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
      {chosen.map((p) => (
        <input key={p.id} type="hidden" name={name} value={p.id} />
      ))}
    </>
  );
}
