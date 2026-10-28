"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  TopAppBar,
  Card,
  Checkbox,
  AssistChip,
  Tabs,
  Tab,
  Button,
  Divider,
} from "@windmorph/react";
import { CardContent } from "@/components/ui/card-content";
import { Icon } from "@/components/ui/icon";
import { Skeleton, SkeletonGroup } from "@windmorph/react-pro";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useCompanyId } from "@/hooks/use-company";
import { useReducedMotionContext } from "@/components/accessibility/reduced-motion";
import {
  pageTransitionVariants,
  defaultTransition,
  resolveAnimationVariants,
} from "@/lib/motion";
import {
  useAvailableColumns,
  useRateCards,
  useCreateRateCard,
  useUpdateRateCard,
  useDeleteRateCard,
  useApplyRateCards,
  useRateCardGroups,
  useCreateRateCardGroup,
  useUpdateRateCardGroup,
  useDeleteRateCardGroup,
  useRateCardSets,
  useCreateRateCardSet,
  useUpdateRateCardSet,
  useDeleteRateCardSet,
  useSeedDemoRateCards,
  useSeedDemoConsumer,
  type RateCard,
  type RateCardGroup,
  type RateCardSet,
  type RateCardRuleOperator,
  type UpsertRateCardInput,
  type UpsertRateCardGroupInput,
  type UpsertRateCardSetInput,
} from "@/services";
import { RateCardDialog } from "@/components/rate-cards/rate-card-dialog";
import { RateCardGroupDialog } from "@/components/rate-cards/rate-card-group-dialog";
import { RateCardSetDialog } from "@/components/rate-cards/rate-card-set-dialog";

const OPERATOR_LABEL: Record<RateCardRuleOperator, string> = {
  EQUALS: "=",
  NOT_EQUALS: "≠",
  STARTS_WITH: "starts with",
  STARTS_WITH_ANY: "starts with any of",
  ENDS_WITH: "ends with",
  CONTAINS: "contains",
  IN: "in",
};

const UNGROUPED = "__ungrouped__";
const NO_SET = "__noset__";

function num(v: string | number | null): number {
  if (v === null || v === undefined || v === "") return 0;
  return Number(v);
}

function fmtGBP(n: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(n);
}

/** Per-quarter figures for a card. */
interface QuarterInfo {
  dayRate: number;
  days: number;
  /** Quarter total cost = dayRate × days × 3 months. */
  total: number;
}

function quarterInfo(dayRate: string | number | null, days: string | number | null): QuarterInfo {
  const dr = num(dayRate);
  const wd = num(days);
  return { dayRate: dr, days: wd, total: dr * wd * 3 };
}

function cardQuarters(card: RateCard): QuarterInfo[] {
  return [
    quarterInfo(card.q1DayRate, card.q1WorkingDays),
    quarterInfo(card.q2DayRate, card.q2WorkingDays),
    quarterInfo(card.q3DayRate, card.q3WorkingDays),
    quarterInfo(card.q4DayRate, card.q4WorkingDays),
  ];
}

/** Annual cost preview for a card: sum of each quarter's total. */
function annualCost(card: RateCard): number {
  return cardQuarters(card).reduce((sum, q) => sum + q.total, 0);
}

// ─── Card row ──────────────────────────────────────────────────────────────

function CardTableRow({
  card,
  index,
  selected: checked,
  onToggle,
  onEdit,
  onDelete,
}: {
  card: RateCard;
  index: number;
  selected: boolean;
  onToggle: (id: string) => void;
  onEdit: (card: RateCard) => void;
  onDelete: (card: RateCard) => void;
}) {
  const quarters = cardQuarters(card);
  return (
    <TableRow>
      <TableCell className="w-10">
        <Checkbox
          checked={checked}
          onCheckedChange={() => onToggle(card.id)}
          aria-label={`Select ${card.name}`}
        />
      </TableCell>

      {/* Name + conditions */}
      <TableCell>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center h-5 w-5 shrink-0 rounded-full bg-surface-container-high text-label-small text-on-surface-variant">
            {index + 1}
          </span>
          <span className="truncate text-body-medium font-medium text-on-surface">
            {card.name}
          </span>
          {card.isDefault && (
            <AssistChip leadingIcon={<Icon name="star" />}>Default</AssistChip>
          )}
        </div>
        {!card.isDefault && card.conditions.length > 0 && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            {card.conditions.map((c, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 rounded-full bg-surface-container-high px-2 py-0.5 text-label-small text-on-surface-variant"
              >
                <span className="font-medium text-on-surface">{c.column}</span>
                {OPERATOR_LABEL[c.operator]}
                <span className="font-medium text-on-surface">{c.value}</span>
              </span>
            ))}
          </div>
        )}
      </TableCell>

      {/* Per-quarter: working days + quarter total */}
      {quarters.map((q, i) => (
        <TableCell key={i} className="whitespace-nowrap text-right">
          <div className="text-body-small text-on-surface">{fmtGBP(q.total)}</div>
          <div className="text-label-small text-on-surface-variant">
            {q.days} day{q.days !== 1 ? "s" : ""}{q.dayRate ? ` · ${fmtGBP(q.dayRate)}/d` : ""}
          </div>
        </TableCell>
      ))}

      {/* Annual */}
      <TableCell className="whitespace-nowrap text-right font-brand font-semibold text-on-surface">
        {fmtGBP(annualCost(card))}
      </TableCell>

      {/* Actions */}
      <TableCell className="w-16 text-right">
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => onEdit(card)}
            className="text-on-surface-variant transition-colors hover:text-primary"
            aria-label="Edit rate card"
          >
            <Icon name="edit" size={18} />
          </button>
          <button
            type="button"
            onClick={() => onDelete(card)}
            className="text-on-surface-variant transition-colors hover:text-error"
            aria-label="Delete rate card"
          >
            <Icon name="delete" size={18} />
          </button>
        </div>
      </TableCell>
    </TableRow>
  );
}

// ─── Loading Skeleton ──────────────────────────────────────────────────────────

function RateCardsSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i} variant="elevated">
          <CardContent className="flex flex-col gap-3 p-6">
            <SkeletonGroup label="Loading rate cards">
              <div className="flex items-center gap-3">
                <Skeleton className="h-6 w-6" corner="full" />
                <Skeleton className="h-5 w-40" corner="extra-small" />
              </div>
              <Skeleton className="h-20 w-full" corner="medium" />
            </SkeletonGroup>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface Bucket {
  key: string;
  title: string;
  group: RateCardGroup | null;
  cards: RateCard[];
}

interface TabModel {
  id: string;
  name: string;
  set: RateCardSet | null;
  buckets: Bucket[];
}

export default function RateCardsPage() {
  const reduced = useReducedMotionContext();
  const toast = useToast();
  const companyId = useCompanyId();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<RateCard | null>(null);
  const [defaultGroupId, setDefaultGroupId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<RateCardGroup | null>(null);
  const [defaultSetId, setDefaultSetId] = useState<string | null>(null);

  const [tabDialogOpen, setTabDialogOpen] = useState(false);
  const [editingSet, setEditingSet] = useState<RateCardSet | null>(null);

  const [activeTab, setActiveTab] = useState<string>("");

  const { data: availableColumns = [] } = useAvailableColumns(companyId);
  const { data: cards = [], isLoading } = useRateCards(companyId);
  const { data: groups = [] } = useRateCardGroups(companyId);
  const { data: sets = [] } = useRateCardSets(companyId);

  const createCard = useCreateRateCard();
  const updateCard = useUpdateRateCard();
  const deleteCard = useDeleteRateCard();
  const applyCards = useApplyRateCards();
  const createGroup = useCreateRateCardGroup();
  const updateGroup = useUpdateRateCardGroup();
  const deleteGroup = useDeleteRateCardGroup();
  const createSet = useCreateRateCardSet();
  const updateSet = useUpdateRateCardSet();
  const deleteSet = useDeleteRateCardSet();
  const seedDemo = useSeedDemoRateCards();
  const seedDemoConsumer = useSeedDemoConsumer();

  const orderedCards = useMemo(
    () => [...cards].sort((a, b) => a.priority - b.priority),
    [cards],
  );

  // Cards bucketed by group id (preserving priority order within each bucket).
  const cardsByGroup = useMemo(() => {
    const map = new Map<string, RateCard[]>();
    for (const c of orderedCards) {
      const key = c.groupId ?? UNGROUPED;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    }
    return map;
  }, [orderedCards]);

  // Build the tab model: one tab per set, plus an "Other" tab for groups with
  // no set and any ungrouped cards.
  const tabs = useMemo(() => {
    const groupBucket = (g: RateCardGroup): Bucket => ({
      key: g.id,
      title: g.name,
      group: g,
      cards: cardsByGroup.get(g.id) ?? [],
    });

    const setTabs: TabModel[] = [...sets]
      .sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name))
      .map((s) => ({
        id: s.id,
        name: s.name,
        set: s,
        buckets: groups
          .filter((g) => g.setId === s.id)
          .sort((a, b) => a.name.localeCompare(b.name))
          .map(groupBucket),
      }));

    // Groups without a set + ungrouped cards live in a catch-all "Other" tab.
    const orphanGroups = groups
      .filter((g) => !g.setId)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(groupBucket);
    const ungrouped = cardsByGroup.get(UNGROUPED) ?? [];
    const otherBuckets: Bucket[] = [...orphanGroups];
    if (ungrouped.length > 0) {
      otherBuckets.push({ key: UNGROUPED, title: "Ungrouped", group: null, cards: ungrouped });
    }

    const result = [...setTabs];
    if (otherBuckets.length > 0) {
      result.push({ id: NO_SET, name: "Other", set: null, buckets: otherBuckets });
    }
    return result;
  }, [sets, groups, cardsByGroup]);

  // Keep the active tab valid as sets change — derived during render instead of
  // syncing via a setState-in-effect. Falls back to the first tab when the
  // current selection no longer exists (and is undefined when there are none).
  const effectiveTab = tabs.some((t) => t.id === activeTab) ? activeTab : tabs[0]?.id;

  const allSelected = orderedCards.length > 0 && orderedCards.every((c) => selected.has(c.id));
  const someSelected = selected.size > 0 && !allSelected;

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(orderedCards.map((c) => c.id)));
  };
  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleGroup = (groupCards: RateCard[]) => {
    const ids = groupCards.map((c) => c.id);
    const allOn = ids.length > 0 && ids.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (allOn) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  };

  // ── Card dialog ──
  const openCreate = (groupId: string | null = null) => {
    setEditingCard(null);
    setDefaultGroupId(groupId);
    setDialogOpen(true);
  };
  const openEdit = (card: RateCard) => {
    setEditingCard(card);
    setDefaultGroupId(null);
    setDialogOpen(true);
  };

  const handleSubmit = (input: UpsertRateCardInput) => {
    if (editingCard) {
      updateCard.mutate(
        { companyId, id: editingCard.id, ...input },
        {
          onSuccess: () => { toast.success("Rate card updated"); setDialogOpen(false); },
          onError: (err) => toast.error(err.message || "Failed to update rate card"),
        },
      );
    } else {
      createCard.mutate(
        { companyId, ...input },
        {
          onSuccess: () => { toast.success("Rate card created"); setDialogOpen(false); },
          onError: (err) => toast.error(err.message || "Failed to create rate card"),
        },
      );
    }
  };

  const handleDelete = (card: RateCard) => {
    deleteCard.mutate(
      { companyId, id: card.id },
      {
        onSuccess: () => {
          toast.success("Rate card deleted");
          setSelected((prev) => {
            const next = new Set(prev);
            next.delete(card.id);
            return next;
          });
        },
        onError: (err) => toast.error(err.message || "Failed to delete rate card"),
      },
    );
  };

  const handleApply = (cardIds: string[]) => {
    if (cardIds.length === 0) return;
    applyCards.mutate(
      { companyId, cardIds },
      {
        onSuccess: (result) => {
          toast.success(
            `Applied to ${result.matched} member${result.matched !== 1 ? "s" : ""}` +
              (result.unmatched > 0 ? ` · ${result.unmatched} unmatched` : ""),
          );
        },
        onError: (err) => toast.error(err.message || "Failed to apply rate cards"),
      },
    );
  };

  // ── Group dialog ──
  const openCreateGroup = (setId: string | null = null) => {
    setEditingGroup(null);
    setDefaultSetId(setId);
    setGroupDialogOpen(true);
  };
  const openEditGroup = (group: RateCardGroup) => {
    setEditingGroup(group);
    setDefaultSetId(null);
    setGroupDialogOpen(true);
  };
  const handleGroupSubmit = (input: UpsertRateCardGroupInput) => {
    if (editingGroup) {
      updateGroup.mutate(
        { companyId, id: editingGroup.id, ...input },
        {
          onSuccess: () => { toast.success("Group updated"); setGroupDialogOpen(false); },
          onError: (err) => toast.error(err.message || "Failed to update group"),
        },
      );
    } else {
      createGroup.mutate(
        { companyId, ...input },
        {
          onSuccess: () => { toast.success("Group created"); setGroupDialogOpen(false); },
          onError: (err) => toast.error(err.message || "Failed to create group"),
        },
      );
    }
  };
  const handleDeleteGroup = (group: RateCardGroup) => {
    deleteGroup.mutate(
      { companyId, id: group.id },
      {
        onSuccess: () => toast.success("Group deleted — its cards are now ungrouped"),
        onError: (err) => toast.error(err.message || "Failed to delete group"),
      },
    );
  };

  // ── Set (tab) dialog ──
  const openCreateSet = () => {
    setEditingSet(null);
    setTabDialogOpen(true);
  };
  const openEditSet = (set: RateCardSet) => {
    setEditingSet(set);
    setTabDialogOpen(true);
  };
  const handleSetSubmit = (input: UpsertRateCardSetInput) => {
    if (editingSet) {
      updateSet.mutate(
        { companyId, id: editingSet.id, ...input },
        {
          onSuccess: () => { toast.success("Tab updated"); setTabDialogOpen(false); },
          onError: (err) => toast.error(err.message || "Failed to update tab"),
        },
      );
    } else {
      createSet.mutate(
        { companyId, ...input },
        {
          onSuccess: (created) => {
            toast.success("Tab created");
            setTabDialogOpen(false);
            if (created?.id) setActiveTab(created.id);
          },
          onError: (err) => toast.error(err.message || "Failed to create tab"),
        },
      );
    }
  };
  const handleDeleteSet = (set: RateCardSet) => {
    deleteSet.mutate(
      { companyId, id: set.id },
      {
        onSuccess: () => toast.success("Tab deleted — its groups moved to Other"),
        onError: (err) => toast.error(err.message || "Failed to delete tab"),
      },
    );
  };

  const handleSeedDemo = () => {
    seedDemo.mutate(
      { companyId },
      {
        onSuccess: (res) => {
          toast.success(`Added ${res.cards} demo rate cards`);
          setActiveTab("");
        },
        onError: (err) => toast.error(err.message || "Failed to add demo cards"),
      },
    );
  };

  const handleSeedDemoConsumer = () => {
    seedDemoConsumer.mutate(
      { companyId },
      {
        onSuccess: (res) => {
          toast.success(`Added ${res.cards} Consumer demo cards`);
          setActiveTab("");
        },
        onError: (err) => toast.error(err.message || "Failed to add Consumer demo cards"),
      },
    );
  };

  // Continuous index across all cards for the numbered badge (priority order).
  const indexOf = (card: RateCard) => orderedCards.findIndex((c) => c.id === card.id);

  const renderBucket = (bucket: Bucket) => {
    const { key, title, group, cards: groupCards } = bucket;
    const ids = groupCards.map((c) => c.id);
    const allOn = ids.length > 0 && ids.every((id) => selected.has(id));
    const someOn = ids.some((id) => selected.has(id)) && !allOn;
    const color = group?.color ?? null;
    return (
      <div
        key={key}
        className="flex flex-col gap-3 rounded-xl"
        style={color ? { borderLeft: `3px solid ${color}`, paddingLeft: 12 } : undefined}
      >
        <div className="flex items-center gap-2">
          <Checkbox
            checked={allOn}
            indeterminate={someOn}
            onCheckedChange={() => toggleGroup(groupCards)}
            aria-label={`Select all in ${title}`}
          />
          <span
            style={color ? { color } : undefined}
            className={color ? undefined : "text-on-surface-variant"}
          >
            <Icon name={group ? "folder" : "folder_off"} size={18} />
          </span>
          <h2 className="text-title-small text-on-surface">{title}</h2>
          <span className="text-body-small text-on-surface-variant">
            {groupCards.length} card{groupCards.length !== 1 ? "s" : ""}
          </span>
          <div className="flex-1" />
          {group && (
            <>
              <Button variant="text" size="xs" onClick={() => openCreate(group.id)} leadingIcon={<Icon name="add" />}>
                Card
              </Button>
              <button
                type="button"
                onClick={() => openEditGroup(group)}
                className="text-on-surface-variant transition-colors hover:text-primary"
                aria-label="Edit group"
              >
                <Icon name="edit" size={16} />
              </button>
              <button
                type="button"
                onClick={() => handleDeleteGroup(group)}
                className="text-on-surface-variant transition-colors hover:text-error"
                aria-label="Delete group"
              >
                <Icon name="delete" size={16} />
              </button>
            </>
          )}
          {ids.length > 0 && (
            <Button variant="text" size="xs" onClick={() => handleApply(ids)} disabled={applyCards.isPending} leadingIcon={<Icon name="playlist_add_check" />}>
              Apply
            </Button>
          )}
        </div>

        {groupCards.length === 0 ? (
          <p className="pl-7 text-body-small text-on-surface-variant">
            No cards in this group yet.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-outline-variant">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead>Rate Card</TableHead>
                  <TableHead className="text-right">Q1</TableHead>
                  <TableHead className="text-right">Q2</TableHead>
                  <TableHead className="text-right">Q3</TableHead>
                  <TableHead className="text-right">Q4</TableHead>
                  <TableHead className="text-right">Annual</TableHead>
                  <TableHead className="w-16" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupCards.map((card) => (
                  <CardTableRow
                    key={card.id}
                    card={card}
                    index={indexOf(card)}
                    selected={selected.has(card.id)}
                    onToggle={toggleOne}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    );
  };

  const activeTabModel = tabs.find((t) => t.id === effectiveTab) ?? tabs[0];

  return (
    <motion.div
      className="flex flex-col gap-6"
      variants={resolveAnimationVariants(pageTransitionVariants, reduced)}
      initial="initial"
      animate="enter"
      exit="exit"
      transition={defaultTransition}
    >
      <TopAppBar
        className="justify-between"
        title={<h1 className="text-headline-medium">Rate Cards</h1>}
        subtitle="Organize rate cards into tabs and groups, define condition-based rates, then apply to matching members."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="text" onClick={handleSeedDemo} disabled={seedDemo.isPending} leadingIcon={<Icon name="bolt" />}>
              {seedDemo.isPending ? "Adding…" : "Quick Demo Digital"}
            </Button>
            <Button variant="text" onClick={handleSeedDemoConsumer} disabled={seedDemoConsumer.isPending} leadingIcon={<Icon name="bolt" />}>
              {seedDemoConsumer.isPending ? "Adding…" : "Quick Demo Consumer"}
            </Button>
            <Button variant="tonal" onClick={openCreateSet} leadingIcon={<Icon name="add" />}>
              New tab
            </Button>
            <Button variant="filled" onClick={() => openCreate(null)} leadingIcon={<Icon name="add" />}>
              New rate card
            </Button>
          </div>
        }
      />

      {/* Toolbar: global select-all + apply */}
      {orderedCards.length > 0 && (
        <section aria-label="Bulk actions">
          <Card variant="elevated">
            <CardContent className="flex items-center justify-between gap-3 p-4">
              <label className="flex cursor-pointer select-none items-center gap-2">
                <Checkbox
                  checked={allSelected}
                  indeterminate={someSelected}
                  onCheckedChange={toggleAll}
                  aria-label="Select all rate cards"
                />
                <span className="text-body-medium text-on-surface-variant">
                  {selected.size > 0 ? `${selected.size} selected` : "Select all"}
                </span>
              </label>
              <Button
                variant="tonal"
                onClick={() => handleApply(Array.from(selected))}
                disabled={selected.size === 0 || applyCards.isPending}
                leadingIcon={<Icon name="playlist_add_check" />}
              >
                {applyCards.isPending ? "Applying…" : "Apply to matching members"}
              </Button>
            </CardContent>
          </Card>
        </section>
      )}

      {isLoading ? (
        <RateCardsSkeleton />
      ) : tabs.length === 0 ? (
        <Card variant="elevated" className="mx-auto max-w-lg">
          <CardContent className="flex flex-col items-center px-8 py-12 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-surface-container-high">
              <Icon name="request_quote" size={24} className="text-on-surface-variant" />
            </div>
            <p className="mb-1 text-title-medium">No rate cards yet</p>
            <p className="mb-6 text-body-medium text-on-surface-variant">
              Create a tab (e.g. &ldquo;Digital&rdquo;), add groups inside it, then create rate cards.
            </p>
            <div className="flex items-center gap-2">
              <Button variant="tonal" onClick={openCreateSet} leadingIcon={<Icon name="add" />}>
                New tab
              </Button>
              <Button variant="filled" onClick={() => openCreate(null)} leadingIcon={<Icon name="add" />}>
                New rate card
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeTabModel?.id ?? ""} onChange={(k) => setActiveTab(k as string)} variant="primary" scrollable>
          {tabs.map((t) => (
            <Tab key={t.id} title={t.name}>
              <div className="flex flex-col gap-6 pt-4">
                {/* Tab header actions */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    {t.set?.color && (
                      <span
                        className="inline-block h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: t.set.color }}
                        aria-hidden
                      />
                    )}
                    <h2 className="text-title-medium text-on-surface">{t.name}</h2>
                    {t.name.includes("(Demo)") && (
                      <AssistChip leadingIcon={<Icon name="bolt" />}>
                        Demo
                      </AssistChip>
                    )}
                    {t.set?.description && (
                      <span className="truncate text-body-small text-on-surface-variant">
                        {t.set.description}
                      </span>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button variant="text" size="xs" onClick={() => openCreateGroup(t.set?.id ?? null)} leadingIcon={<Icon name="create_new_folder" />}>
                      Group
                    </Button>
                    {t.set && (
                      <>
                        <button
                          type="button"
                          onClick={() => openEditSet(t.set!)}
                          className="text-on-surface-variant transition-colors hover:text-primary"
                          aria-label="Rename tab"
                        >
                          <Icon name="edit" size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSet(t.set!)}
                          className="text-on-surface-variant transition-colors hover:text-error"
                          aria-label="Delete tab"
                        >
                          <Icon name="delete" size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <Divider />

                {t.buckets.length === 0 ? (
                  <div className="flex flex-col items-center px-8 py-12 text-center">
                    <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-surface-container-high">
                      <Icon name="folder_open" size={24} className="text-on-surface-variant" />
                    </div>
                    <p className="mb-1 text-title-medium">No groups in this tab yet</p>
                    <p className="text-body-medium text-on-surface-variant">
                      Add a group to start creating rate cards.
                    </p>
                  </div>
                ) : (
                  t.buckets.map((b) => renderBucket(b))
                )}
              </div>
            </Tab>
          ))}
        </Tabs>
      )}

      <RateCardDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        card={editingCard}
        availableColumns={availableColumns}
        groups={groups}
        defaultGroupId={defaultGroupId}
        nextPriority={cards.length}
        onSubmit={handleSubmit}
        isSubmitting={createCard.isPending || updateCard.isPending}
      />

      <RateCardGroupDialog
        open={groupDialogOpen}
        onOpenChange={setGroupDialogOpen}
        group={editingGroup}
        sets={sets}
        defaultSetId={defaultSetId}
        onSubmit={handleGroupSubmit}
        isSubmitting={createGroup.isPending || updateGroup.isPending}
      />

      <RateCardSetDialog
        open={tabDialogOpen}
        onOpenChange={setTabDialogOpen}
        set={editingSet}
        onSubmit={handleSetSubmit}
        isSubmitting={createSet.isPending || updateSet.isPending}
      />
    </motion.div>
  );
}
