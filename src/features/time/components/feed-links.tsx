"use client";

import { useState, useTransition } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Button, List, ListItem, Select, SelectItem, TextField } from "@windmorph/react";
import { Alert } from "@windmorph/react-pro";
import { Icon } from "@/components/ui/icon";
import { ItemMenu } from "@/components/ui/item-menu";
import { useRunAction } from "@/features/structure/use-run-action";
import { useWorkspace } from "@/features/workspaces/workspace-context";
import { useSnackbar } from "@/lib/snackbar";
import { createFeed, revokeFeed } from "../time-off-actions";
import type { FeedLink } from "../time-off-queries";

type Scope = FeedLink["scope"];

/** Private calendar feed links: create one (shown once), see when each was used, remove them. */
export function FeedLinks({ feeds }: { feeds: FeedLink[] }) {
  const t = useTranslations("timeOff.feed");
  const te = useTranslations("errors");
  const format = useFormatter();
  const snackbar = useSnackbar();
  const { workspace } = useWorkspace();
  const [run] = useRunAction();
  const [scope, setScope] = useState<Scope>("me");
  const [url, setUrl] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function create() {
    startTransition(async () => {
      const result = await createFeed(workspace.id, scope);
      if (result.ok) setUrl(result.url);
      else void snackbar.showSnackbar(te(result.error), { replace: true });
    });
  }

  return (
    <section aria-labelledby="feed-title" className="flex flex-col gap-3">
      <h2 id="feed-title" className="text-title-large text-on-surface">
        {t("title")}
      </h2>
      <p className="text-body-medium text-on-surface-variant max-w-2xl">{t("intro")}</p>
      <div className="flex flex-wrap items-end gap-3">
        <Select
          className="w-56"
          label={t("scope")}
          value={scope}
          onChange={(key) => key != null && setScope(key as Scope)}
        >
          {(["me", "team", "workspace"] as const).map((s) => (
            <SelectItem key={s}>{t(`scopes.${s}`)}</SelectItem>
          ))}
        </Select>
        <Button
          variant="tonal"
          pending={pending}
          leadingIcon={<Icon name="link" />}
          onPress={create}
        >
          {t("create")}
        </Button>
      </div>
      {url && (
        <Alert severity="info">
          <div className="flex flex-col gap-2">
            <span>{t("created")}</span>
            <div className="flex flex-wrap items-center gap-2">
              <TextField className="min-w-0 flex-1" aria-label={t("title")} value={url} readOnly />
              <Button
                variant="text"
                leadingIcon={<Icon name="content_copy" />}
                onPress={async () => {
                  await navigator.clipboard.writeText(url);
                  void snackbar.showSnackbar(t("copied"), { replace: true });
                }}
              >
                {t("copy")}
              </Button>
            </div>
          </div>
        </Alert>
      )}
      {feeds.length > 0 && (
        <List aria-label={t("links")}>
          {feeds.map((f) => (
            <ListItem
              key={f.id}
              textValue={t(`scopes.${f.scope}`)}
              leading={<Icon name="event_note" />}
              supportingText={
                f.lastUsedAt
                  ? t("lastUsed", {
                      date: format.dateTime(new Date(f.lastUsedAt), {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }),
                    })
                  : t("neverUsed")
              }
              trailing={
                <ItemMenu
                  label={t("revoke")}
                  actions={[{ key: "revoke", label: t("revoke"), icon: "link_off" }]}
                  onAction={() => run(() => revokeFeed(f.id), t("revoked"))}
                />
              }
            >
              {t(`scopes.${f.scope}`)}
            </ListItem>
          ))}
        </List>
      )}
    </section>
  );
}
