"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Button,
  Menu,
  MenuGroup,
  MenuItem,
  MenuTrigger,
  Switch,
  TextField,
} from "@windmorph/react";
import { FormDialog } from "@/components/ui/form-dialog";
import { Icon } from "@/components/ui/icon";
import { useRunAction } from "@/features/structure/use-run-action";
import { useCan, useWorkspace } from "@/features/workspaces/workspace-context";
import { deleteTableView, saveTableView, setDefaultTableView, updateTableView } from "../actions";
import type { TableView } from "../types";

/**
 * Saved views for one table: open one (its URL), save the current layout as a new view, save
 * changes to the open one, choose a default, delete. Shared views need workspace.manage_settings.
 */
export function ViewsMenu({
  tableKey,
  views,
  currentId,
  dirty,
  state,
  query,
  hrefFor,
}: {
  tableKey: string;
  views: TableView[];
  currentId: string | null;
  /** The table differs from the open view. */
  dirty: boolean;
  /** The table's state now, as it would be saved. */
  state: unknown;
  /** The page's query now (without the view), to open a new view in place. */
  query: string;
  /** The URL that opens a view (or the plain table for null). */
  hrefFor: (view: TableView | null) => string;
}) {
  const t = useTranslations("views");
  const { workspace } = useWorkspace();
  const router = useRouter();
  const pathname = usePathname();
  const canShare = useCan("workspace.manage_settings");
  const [run] = useRunAction();
  const [saving, setSaving] = useState(false);
  const [shared, setShared] = useState(false);
  const [isDefault, setIsDefault] = useState(false);
  const current = views.find((v) => v.id === currentId) ?? null;
  const canChange = (v: TableView) => !v.shared || canShare;

  const label = current ? t(dirty ? "edited" : "current", { name: current.name }) : t("button");
  const group = (list: TableView[], title: string) =>
    list.length > 0 && (
      <MenuGroup title={title}>
        {list.map((v) => (
          <MenuItem
            key={`open:${v.id}`}
            textValue={v.name}
            leadingIcon={
              <Icon name={v.id === currentId ? "check" : v.isDefault ? "star" : "view_list"} />
            }
          >
            {v.name}
          </MenuItem>
        ))}
      </MenuGroup>
    );

  function onAction(key: string) {
    const [action, id] = key.split(":");
    const view = views.find((v) => v.id === id) ?? null;
    if (action === "open") router.push(hrefFor(view));
    if (action === "all") router.push(hrefFor(null));
    if (action === "save") {
      setShared(false);
      setIsDefault(false);
      setSaving(true);
    }
    if (!current) return;
    if (action === "update") run(() => updateTableView(current.id, state), t("updated"));
    if (action === "default")
      run(
        () => setDefaultTableView(current.id, !current.isDefault),
        t(current.isDefault ? "defaultCleared" : "defaultSet")
      );
    if (action === "delete") {
      run(() => deleteTableView(current.id), t("deleted"));
      router.push(hrefFor(null));
    }
  }

  return (
    <>
      <MenuTrigger>
        <Button variant="outlined" leadingIcon={<Icon name="view_list" />}>
          {label}
        </Button>
        <Menu aria-label={t("button")} onAction={(key) => onAction(String(key))}>
          <MenuGroup>
            <MenuItem key="all" leadingIcon={<Icon name={currentId ? "group" : "check"} />}>
              {t("allPeople")}
            </MenuItem>
          </MenuGroup>
          {group(
            views.filter((v) => !v.shared),
            t("mine")
          )}
          {group(
            views.filter((v) => v.shared),
            t("shared")
          )}
          <MenuGroup>
            {[
              <MenuItem key="save" leadingIcon={<Icon name="add" />}>
                {t("saveNew")}
              </MenuItem>,
              current && dirty && canChange(current) && (
                <MenuItem key="update" leadingIcon={<Icon name="save" />}>
                  {t("update", { name: current.name })}
                </MenuItem>
              ),
              current && canChange(current) && (
                <MenuItem
                  key="default"
                  leadingIcon={<Icon name={current.isDefault ? "star_border" : "star"} />}
                >
                  {current.isDefault
                    ? t("unsetDefault", { name: current.name })
                    : t(current.shared ? "makeSharedDefault" : "makeDefault", {
                        name: current.name,
                      })}
                </MenuItem>
              ),
              current && canChange(current) && (
                <MenuItem key="delete" leadingIcon={<Icon name="delete" />}>
                  {t("delete", { name: current.name })}
                </MenuItem>
              ),
            ].filter((item): item is React.JSX.Element => Boolean(item))}
          </MenuGroup>
        </Menu>
      </MenuTrigger>
      {saving && (
        <FormDialog
          title={t("dialogTitle")}
          submitLabel={t("save")}
          action={saveTableView.bind(null, workspace.id, tableKey, state, `${pathname}${query}`)}
          done={() => ""}
          onClose={() => setSaving(false)}
        >
          {(fieldError) => (
            <>
              <TextField
                className="w-full"
                name="name"
                label={t("name")}
                required
                invalid={Boolean(fieldError("name"))}
                errorMessage={fieldError("name")}
              />
              {canShare && (
                <Switch checked={shared} onCheckedChange={setShared}>
                  {t("share")}
                </Switch>
              )}
              <Switch checked={isDefault} onCheckedChange={setIsDefault}>
                {t("setDefault")}
              </Switch>
              <input type="hidden" name="shared" value={String(shared)} />
              <input type="hidden" name="isDefault" value={String(isDefault)} />
            </>
          )}
        </FormDialog>
      )}
    </>
  );
}
