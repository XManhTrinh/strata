"use client";

import { IconButton, Menu, MenuItem, MenuTrigger } from "@windmorph/react";
import { Icon } from "@/components/ui/icon";

export type ItemMenuAction = { key: string; label: string; icon: string };

/** The "more" menu on a row; actions that don't apply are left out by the caller. */
export function ItemMenu({
  label,
  actions,
  onAction,
}: {
  label: string;
  actions: (ItemMenuAction | false | null | undefined)[];
  onAction: (key: string) => void;
}) {
  const shown = actions.filter((a): a is ItemMenuAction => Boolean(a));
  return (
    <MenuTrigger>
      <IconButton variant="standard" aria-label={label} icon={<Icon name="more_vert" />} />
      <Menu aria-label={label} onAction={(key) => onAction(String(key))}>
        {shown.map((action) => (
          <MenuItem key={action.key} leadingIcon={<Icon name={action.icon} />}>
            {action.label}
          </MenuItem>
        ))}
      </Menu>
    </MenuTrigger>
  );
}
