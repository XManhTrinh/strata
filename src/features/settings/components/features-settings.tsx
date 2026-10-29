"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  Switch,
} from "@windmorph/react";
import { useWorkspace } from "@/features/workspaces/workspace-context";
import { useSnackbar } from "@/lib/snackbar";
import { toggleFeature } from "../actions";

export type FeatureRow = { key: string; enabled: boolean; inPlan: boolean; requires: string[] };

type FeatureKey = "people" | "org_chart" | "time" | "planning" | "rate_cards";

export function FeaturesSettings({ features }: { features: FeatureRow[] }) {
  const t = useTranslations("settings.features");
  const te = useTranslations("errors");
  const { workspace } = useWorkspace();
  const snackbar = useSnackbar();
  const [, startTransition] = useTransition();
  const [confirming, setConfirming] = useState<{ key: string; dependants: string[] } | null>(null);
  const [enabled, setOptimistic] = useOptimistic(
    new Set(features.filter((f) => f.enabled).map((f) => f.key)),
    (current: Set<string>, change: { keys: string[]; on: boolean }) => {
      const next = new Set(current);
      for (const key of change.keys) {
        if (change.on) next.add(key);
        else next.delete(key);
      }
      return next;
    }
  );
  const name = (key: string) => t(`names.${key as FeatureKey}.name`);
  const list = (keys: string[]) => keys.map(name).join(", ");

  function apply(key: string, on: boolean, includeDependants = false, alsoAffected: string[] = []) {
    startTransition(async () => {
      setOptimistic({ keys: [key, ...alsoAffected], on });
      const result = await toggleFeature(workspace.id, key, on, includeDependants);
      if (result.ok) {
        void snackbar.showSnackbar(
          t(on ? "turnedOn" : "turnedOff", { features: list(result.changed) })
        );
      } else if ("dependants" in result) {
        setConfirming({ key, dependants: result.dependants });
      } else {
        void snackbar.showSnackbar(te(result.error));
      }
    });
  }

  return (
    <section aria-labelledby="features-title" className="flex max-w-2xl flex-col gap-4">
      <h2 id="features-title" className="text-headline-small text-on-surface">
        {t("title")}
      </h2>
      <p className="text-body-medium text-on-surface-variant">{t("intro")}</p>
      <List aria-label={t("title")}>
        {features.map((feature) => (
          <ListItem
            key={feature.key}
            textValue={name(feature.key)}
            supportingText={[
              t(`names.${feature.key as FeatureKey}.description`),
              feature.requires.length > 0 ? t("needs", { features: list(feature.requires) }) : null,
              feature.inPlan ? null : t("notInPlan"),
            ]
              .filter(Boolean)
              .join(" · ")}
            trailing={
              <Switch
                aria-label={name(feature.key)}
                checked={enabled.has(feature.key)}
                disabled={!feature.inPlan}
                onCheckedChange={(on) => apply(feature.key, on)}
              />
            }
          >
            {name(feature.key)}
          </ListItem>
        ))}
      </List>

      {confirming && (
        <Dialog open onOpenChange={(open) => !open && setConfirming(null)}>
          <DialogTitle>{t("confirmTitle", { feature: name(confirming.key) })}</DialogTitle>
          <DialogContent>
            {t("confirmBody", { features: list(confirming.dependants) })}
          </DialogContent>
          <DialogActions>
            <Button variant="text" onPress={() => setConfirming(null)}>
              {t("cancel")}
            </Button>
            <Button
              variant="text"
              onPress={() => {
                apply(confirming.key, false, true, confirming.dependants);
                setConfirming(null);
              }}
            >
              {t("confirm")}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </section>
  );
}
