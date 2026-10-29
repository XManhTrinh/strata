"use client";

import { type FormEvent, startTransition, useActionState } from "react";

/**
 * Like useActionState, but submits through onSubmit so React doesn't reset the form afterwards.
 * React 19 resets a form after an `action` completes, and React Aria fields answer that reset by
 * restoring their initial value, which would wipe what the user typed even when saving failed.
 */
export function useFormAction<State>(
  action: (previous: Awaited<State>, formData: FormData) => Promise<State>,
  initialState: Awaited<State>
) {
  const [state, dispatch, pending] = useActionState<State, FormData>(action, initialState);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => dispatch(formData));
  }

  return [state, onSubmit, pending] as const;
}
