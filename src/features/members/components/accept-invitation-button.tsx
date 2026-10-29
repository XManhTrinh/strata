"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@windmorph/react";
import { FormError } from "@/features/auth/components/form-error";
import type { ErrorKey } from "@/lib/form-state";
import { acceptInvitation } from "../actions";

export function AcceptInvitationButton({ token }: { token: string }) {
  const t = useTranslations("invite");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<ErrorKey>();

  return (
    <div className="flex flex-col gap-4">
      <FormError error={error} />
      <Button
        variant="filled"
        pending={pending}
        onPress={() =>
          startTransition(async () => {
            const result = await acceptInvitation(token);
            if (result.ok) router.push(`/w/${result.slug}`);
            else setError(result.error);
          })
        }
      >
        {t("accept")}
      </Button>
    </div>
  );
}
