"use client";

import type { ReactNode } from "react";
import {
  Button as AriaButton,
  Collection,
  type Key,
  Tree,
  TreeItem,
  TreeItemContent,
} from "react-aria-components";
import { Icon } from "@/components/ui/icon";

export type TreeViewNode = { id: string; children: TreeViewNode[] };

export type TreeViewProps<Node extends TreeViewNode> = {
  "aria-label": string;
  items: Node[];
  textValue: (node: Node) => string;
  /** The row after the expand button: label, supporting text, trailing actions. */
  children: (node: Node) => ReactNode;
  defaultExpandedKeys?: Iterable<Key>;
  expandedKeys?: Iterable<Key>;
  onExpandedChange?: (keys: Set<Key>) => void;
  /** Values the rows read besides the node; React Aria caches rows until these change. */
  dependencies?: unknown[];
};

/**
 * Material 3 tree on React Aria: arrow keys move and expand, rows hold their own actions. Strata
 * builds it until Windmorph has one (decision 8).
 */
export function TreeView<Node extends TreeViewNode>({
  items,
  textValue,
  children,
  dependencies = [],
  ...props
}: TreeViewProps<Node>) {
  function renderNode(node: Node): ReactNode {
    return (
      <TreeItem
        id={node.id}
        textValue={textValue(node)}
        className="text-body-large text-on-surface data-[hovered]:bg-on-surface/8 data-[focus-visible]:ring-secondary rounded-full outline-none data-[focus-visible]:ring-2 data-[focus-visible]:ring-inset"
        style={({ level }) => ({ paddingInlineStart: `${(level - 1) * 1.5}rem` })}
      >
        <TreeItemContent>
          {({ hasChildItems, isExpanded }) => (
            <div className="flex min-h-12 items-center gap-1 pe-2">
              {hasChildItems ? (
                <AriaButton
                  slot="chevron"
                  className="text-on-surface-variant flex size-10 shrink-0 items-center justify-center rounded-full"
                >
                  <Icon
                    name="chevron_right"
                    className={`transition-transform ${isExpanded ? "rotate-90" : ""}`}
                  />
                </AriaButton>
              ) : (
                <span className="size-10 shrink-0" />
              )}
              {children(node)}
            </div>
          )}
        </TreeItemContent>
        <Collection items={node.children as Node[]} dependencies={dependencies}>
          {renderNode}
        </Collection>
      </TreeItem>
    );
  }

  return (
    <Tree
      {...props}
      items={items}
      dependencies={dependencies}
      className="flex flex-col outline-none"
    >
      {renderNode}
    </Tree>
  );
}
