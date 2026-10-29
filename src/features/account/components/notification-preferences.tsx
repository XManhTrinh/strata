"use client";

import { useOptimistic, useTransition } from "react";
import { useTranslations } from "next-intl";
import { List, ListItem, Select, SelectItem } from "@windmorph/react";
import { Alert } from "@windmorph/react-pro";
import { useSnackbar } from "@/lib/snackbar";
import type { Database } from "@/lib/supabase/database.types";
import { setEmailDelivery } from "../actions";

type Category = Database["public"]["Enums"]["notification_category"];
type Delivery = Database["public"]["Enums"]["email_delivery"];

const CATEGORIES: Category[] = ["invitation", "access", "time", "planning", "import", "system"];
const DELIVERIES: Delivery[] = ["instant", "daily", "none"];

export function NotificationPreferences({
  preferences,
}: {
  preferences: Partial<Record<Category, Delivery>>;
}) {
  const t = useTranslations("account.notifications");
  const te = useTranslations("errors");
  const snackbar = useSnackbar();
  const [, startTransition] = useTransition();
  const [current, setOptimistic] = useOptimistic(
    preferences,
    (state, change: { category: Category; delivery: Delivery }) => ({
      ...state,
      [change.category]: change.delivery,
    })
  );

  function change(category: Category, delivery: Delivery) {
    startTransition(async () => {
      setOptimistic({ category, delivery });
      const result = await setEmailDelivery(category, delivery);
      void snackbar.showSnackbar(result.ok ? t("saved") : te(result.error));
    });
  }

  return (
    <section aria-labelledby="notifications-title" className="flex max-w-2xl flex-col gap-4">
      <h2 id="notifications-title" className="text-headline-small text-on-surface">
        {t("title")}
      </h2>
      <p className="text-body-medium text-on-surface-variant">{t("intro")}</p>
      <Alert severity="info">{t("emailNotice")}</Alert>
      <List aria-label={t("title")}>
        {CATEGORIES.map((category) => (
          <ListItem
            key={category}
            textValue={t(`categories.${category}`)}
            trailing={
              <Select
                className="medium:w-56 w-44"
                aria-label={t("deliveryLabel", { category: t(`categories.${category}`) })}
                value={current[category] ?? "instant"}
                onChange={(key) => key != null && change(category, key as Delivery)}
              >
                {DELIVERIES.map((delivery) => (
                  <SelectItem key={delivery}>{t(`delivery.${delivery}`)}</SelectItem>
                ))}
              </Select>
            }
          >
            {t(`categories.${category}`)}
          </ListItem>
        ))}
      </List>
    </section>
  );
}
