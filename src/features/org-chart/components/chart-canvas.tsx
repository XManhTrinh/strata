"use client";

import "@xyflow/react/dist/style.css";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  Background,
  type Edge,
  type Node,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
} from "@xyflow/react";
import { IconButton, LinearProgressIndicator } from "@windmorph/react";
import { Icon } from "@/components/ui/icon";
import { useWorkspace } from "@/features/workspaces/workspace-context";
import { loadChart } from "../actions";
import { layoutTree } from "../layout";
import type { ChartPerson, ChartSlice } from "../types";
import { PersonNode, type PersonNodeData } from "./person-node";

const NODE_TYPES = { person: PersonNode };

/** Everyone under a person on the chart, so collapsing removes the whole branch. */
function descendants(people: Map<string, ChartPerson>, id: string): Set<string> {
  const found = new Set<string>();
  for (let grew = true; grew;) {
    grew = false;
    for (const p of people.values()) {
      if (p.managerId && (p.managerId === id || found.has(p.managerId)) && !found.has(p.id)) {
        found.add(p.id);
        grew = true;
      }
    }
  }
  return found;
}

function Canvas({
  slice,
  asOf,
  startId,
  onFocus,
}: {
  slice: ChartSlice;
  asOf: string;
  startId: string | null;
  onFocus: (person: ChartPerson) => void;
}) {
  const t = useTranslations("orgChart");
  const { workspace } = useWorkspace();
  const flow = useReactFlow();
  const [people, setPeople] = useState(() => new Map(slice.people.map((p) => [p.id, p])));
  const [nodes, setNodes] = useState<Node<PersonNodeData>[]>([]);
  const [pending, startTransition] = useTransition();

  const open = useMemo(() => {
    const ids = new Set<string>();
    for (const p of people.values()) if (p.managerId) ids.add(p.managerId);
    return ids;
  }, [people]);

  const edges: Edge[] = useMemo(
    () =>
      [...people.values()]
        .filter((p) => p.managerId && people.has(p.managerId))
        .map((p) => ({
          id: `${p.managerId}>${p.id}`,
          source: p.managerId!,
          target: p.id,
          type: "smoothstep",
          style: { stroke: "var(--md-sys-color-outline)" },
        })),
    [people]
  );

  function toggle(person: ChartPerson) {
    if (open.has(person.id)) {
      const gone = descendants(people, person.id);
      setPeople(new Map([...people].filter(([id]) => !gone.has(id))));
      return;
    }
    startTransition(async () => {
      const more = await loadChart(workspace.id, { rootId: person.id, asOf, depth: 1 });
      setPeople((current) => {
        const next = new Map(current);
        for (const p of more.people) if (p.depth > 0) next.set(p.id, p);
        return next;
      });
    });
  }

  // Lay out whenever people come or go; the worker keeps the page responsive.
  useEffect(() => {
    let cancelled = false;
    void layoutTree([...people.keys()], edges).then((positions) => {
      if (cancelled) return;
      setNodes(
        [...people.values()].map((person) => ({
          id: person.id,
          type: "person",
          position: positions.get(person.id) ?? { x: 0, y: 0 },
          draggable: false,
          data: {
            person,
            open: open.has(person.id),
            start: person.id === startId,
            profileHref: `/w/${workspace.slug}/people/${person.id}`,
            onToggle: toggle,
            onFocus,
          },
        }))
      );
    });
    return () => {
      cancelled = true;
    };
    // toggle and onFocus read current state through the people map.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [people, edges, open, startId]);

  // Centre on the start person once the first layout lands.
  const centred = useRef(false);
  useEffect(() => {
    if (centred.current || nodes.length === 0) return;
    const start = nodes.find((n) => n.id === startId);
    if (start) void flow.setCenter(start.position.x + 120, start.position.y + 120, { zoom: 0.9 });
    else void flow.fitView({ padding: 0.2 });
    centred.current = true;
  }, [nodes, startId, flow]);

  return (
    <div className="bg-surface-container-lowest relative h-full w-full overflow-hidden rounded-xl">
      {pending && (
        <LinearProgressIndicator
          aria-label={t("loading")}
          className="absolute inset-x-0 top-0 z-10"
        />
      )}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        nodesConnectable={false}
        nodesDraggable={false}
        minZoom={0.1}
        proOptions={{ hideAttribution: true }}
        aria-label={t("chartLabel")}
      >
        <Background color="var(--md-sys-color-outline-variant)" gap={24} />
      </ReactFlow>
      <div className="bg-surface-container absolute end-3 bottom-3 z-10 flex flex-col rounded-full p-1">
        <IconButton
          variant="standard"
          aria-label={t("zoomIn")}
          icon={<Icon name="add" />}
          onPress={() => void flow.zoomIn()}
        />
        <IconButton
          variant="standard"
          aria-label={t("zoomOut")}
          icon={<Icon name="remove" />}
          onPress={() => void flow.zoomOut()}
        />
        <IconButton
          variant="standard"
          aria-label={t("fit")}
          icon={<Icon name="fit_screen" />}
          onPress={() => void flow.fitView({ padding: 0.2 })}
        />
      </div>
    </div>
  );
}

/** The reporting chart on a canvas (tablet and desktop). */
export function ChartCanvas(props: {
  slice: ChartSlice;
  asOf: string;
  startId: string | null;
  onFocus: (person: ChartPerson) => void;
}) {
  return (
    <ReactFlowProvider>
      <Canvas {...props} />
    </ReactFlowProvider>
  );
}
