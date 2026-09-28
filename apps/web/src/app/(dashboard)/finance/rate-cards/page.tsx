"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  PageBar,
  Icon,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Typography,
  Tabs,
  TabList,
  Tab,
  TabContent,
} from "@vkieu/mui";
import { Button } from "@vkieu/mui/buttons";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useCompanyId } from "@/hooks/use-company";
import { pageTransitionVariants, defaultTransition } from "@/lib/motion";
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
  checked,
  onToggle,
  onEdit,
  onDelete,
}: {
  card: RateCard;
  index: number;
  checked: boolean;
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
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-surface-container text-[11px] font-medium text-surface-variant-foreground shrink-0">
            {index + 1}
          </span>
          <span className="font-medium text-surface-foreground truncate">{card.name}</span>
          {card.isDefault && <Chip variant="filter" selected>Default</Chip>}
        </div>
        {!card.isDefault && card.conditions.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 mt-1">
            {card.conditions.map((c, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 text-[11px] rounded bg-surface-container px-1.5 py-0.5 text-surface-variant-foreground"
              >
                <span className="font-medium text-surface-foreground">{c.column}</span>
                {OPERATOR_LABEL[c.operator]}
                <span className="font-medium text-surface-foreground">{c.value}</span>
              </span>
            ))}
          </div>
        )}
      </TableCell>

      {/* Per-quarter: working days + quarter total */}
      {quarters.map((q, i) => (
        <TableCell key={i} className="text-right whitespace-nowrap">
          <div className="text-[13px] text-surface-foreground">{fmtGBP(q.total)}</div>
          <div className="text-[11px] text-surface-variant-foreground">
            {q.days} day{q.days !== 1 ? "s" : ""}{q.dayRate ? ` · ${fmtGBP(q.dayRate)}/d` : ""}
          </div>
        </TableCell>
      ))}

      {/* Annual */}
      <TableCell className="text-right font-semibold whitespace-nowrap">
        {fmtGBP(annualCost(card))}
      </TableCell>

      {/* Actions */}
      <TableCell className="text-right w-16">
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => onEdit(card)}
            className="text-surface-variant-foreground hover:text-primary transition-colors"
            aria-label="Edit rate card"
          >
            <Icon name="edit" size={18} />
          </button>
          <button
            type="button"
            onClick={() => onDelete(card)}
            className="text-surface-variant-foreground hover:text-error transition-colors"
            aria-label="Delete rate card"
          >
            <Icon name="delete" size={18} />
          </button>
        </div>
      </TableCell>
    </TableRow>
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

  // Keep the active tab valid as sets change.
  useEffect(() => {
    if (tabs.length === 0) return;
    if (!tabs.some((t) => t.id === activeTab)) {
      setActiveTab(tabs[0].id);
    }
  }, [tabs, activeTab]);

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
        className="space-y-2 rounded-xl"
        style={color ? { borderLeft: `3px solid ${color}`, paddingLeft: 12 } : undefined}
      >
        <div className="flex items-center gap-2">
          <Checkbox
            checked={allOn}
            indeterminate={someOn}
            onCheckedChange={() => toggleGroup(groupCards)}
            aria-label={`Select all in ${title}`}
          />
          <span style={color ? { color } : undefined} className={color ? undefined : "text-surface-variant-foreground"}>
            <Icon name={group ? "folder" : "folder_off"} size={18} />
          </span>
          <Typography variant="title-small">{title}</Typography>
          <Typography variant="body-small" color="surface-variant-foreground">
            ({groupCards.length})
          </Typography>
          <div className="flex-1" />
          {group && (
            <>
              <Button variant="text" size="xs" onClick={() => openCreate(group.id)}>
                <Icon name="add" size={16} />
                Card
              </Button>
              <button
                type="button"
                onClick={() => openEditGroup(group)}
                className="text-surface-variant-foreground hover:text-primary transition-colors"
                aria-label="Edit group"
              >
                <Icon name="edit" size={16} />
              </button>
              <button
                type="button"
                onClick={() => handleDeleteGroup(group)}
                className="text-surface-variant-foreground hover:text-error transition-colors"
                aria-label="Delete group"
              >
                <Icon name="delete" size={16} />
              </button>
            </>
          )}
          {ids.length > 0 && (
            <Button variant="text" size="xs" onClick={() => handleApply(ids)} disabled={applyCards.isPending}>
              <Icon name="playlist_add_check" size={16} />
              Apply
            </Button>
          )}
        </div>

        {groupCards.length === 0 ? (
          <Typography variant="body-small" color="surface-variant-foreground" className="pl-7">
            No cards in this group yet.
          </Typography>
        ) : (
          <div className="overflow-x-auto border border-outline-variant rounded-lg">
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
                    checked={selected.has(card.id)}
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

  const activeTabModel = tabs.find((t) => t.id === activeTab) ?? tabs[0];

  return (
    <motion.div
      className="space-y-6"
      variants={pageTransitionVariants}
      initial="initial"
      animate="enter"
      exit="exit"
      transition={defaultTransition}
    >
      <PageBar className="justify-between">
        <div>
          <Typography variant="headline-medium">Rate Cards</Typography>
          <Typography variant="body-medium" color="surface-variant-foreground">
            Organize rate cards into tabs and groups, define condition-based rates, then
            apply to matching members.
          </Typography>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="text" onClick={handleSeedDemo} disabled={seedDemo.isPending}>
            <Icon name="bolt" size={18} />
            {seedDemo.isPending ? "Adding…" : "Quick demo cards"}
          </Button>
          <Button variant="tonal" onClick={openCreateSet}>
            <Icon name="add" size={18} />
            New tab
          </Button>
          <Button onClick={() => openCreate(null)}>
            <Icon name="add" size={18} />
            New rate card
          </Button>
        </div>
      </PageBar>

      {/* Toolbar: global select-all + apply */}
      {orderedCards.length > 0 && (
        <div className="flex items-center justify-between gap-3">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <Checkbox
              checked={allSelected}
              indeterminate={someSelected}
              onCheckedChange={toggleAll}
              aria-label="Select all rate cards"
            />
            <Typography variant="body-medium" color="surface-variant-foreground">
              {selected.size > 0 ? `${selected.size} selected` : "Select all"}
            </Typography>
          </label>
          <Button
            variant="tonal"
            onClick={() => handleApply(Array.from(selected))}
            disabled={selected.size === 0 || applyCards.isPending}
          >
            <Icon name="playlist_add_check" size={18} />
            {applyCards.isPending ? "Applying…" : "Apply to matching members"}
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : tabs.length === 0 ? (
        <Card variant="elevated">
          <CardContent className="flex flex-col items-center py-16 text-center">
            <Icon name="request_quote" size={40} className="text-surface-variant-foreground/30 mb-4" />
            <Typography variant="title-medium" className="mb-1">No rate cards yet</Typography>
            <Typography variant="body-medium" color="surface-variant-foreground" className="mb-4">
              Create a tab (e.g. &ldquo;Digital&rdquo;), add groups inside it, then create rate cards.
            </Typography>
            <div className="flex items-center gap-2">
              <Button variant="tonal" onClick={openCreateSet}>
                <Icon name="add" size={18} />
                New tab
              </Button>
              <Button onClick={() => openCreate(null)}>
                <Icon name="add" size={18} />
                New rate card
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeTabModel?.id ?? ""} onValueChange={setActiveTab} variant="primary" scrollable>
          <TabList>
            {tabs.map((t) => (
              <Tab key={t.id} value={t.id} label={t.name} />
            ))}
          </TabList>

          {tabs.map((t) => (
            <TabContent key={t.id} value={t.id} className="space-y-6">
              {/* Tab header actions */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {t.set?.color && (
                    <span
                      className="inline-block w-3 h-3 rounded-full"
                      style={{ backgroundColor: t.set.color }}
                      aria-hidden
                    />
                  )}
                  <Typography variant="title-medium">{t.name}</Typography>
                  {t.name.includes("(Demo)") && (
                    <Chip variant="assist">
                      <Icon name="bolt" size={14} />
                      Demo
                    </Chip>
                  )}
                  {t.set?.description && (
                    <Typography variant="body-small" color="surface-variant-foreground">
                      {t.set.description}
                    </Typography>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="text" size="xs" onClick={() => openCreateGroup(t.set?.id ?? null)}>
                    <Icon name="create_new_folder" size={16} />
                    Group
                  </Button>
                  {t.set && (
                    <>
                      <button
                        type="button"
                        onClick={() => openEditSet(t.set!)}
                        className="text-surface-variant-foreground hover:text-primary transition-colors"
                        aria-label="Rename tab"
                      >
                        <Icon name="edit" size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSet(t.set!)}
                        className="text-surface-variant-foreground hover:text-error transition-colors"
                        aria-label="Delete tab"
                      >
                        <Icon name="delete" size={16} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {t.buckets.length === 0 ? (
                <Typography variant="body-small" color="surface-variant-foreground">
                  No groups in this tab yet. Add a group to start creating rate cards.
                </Typography>
              ) : (
                t.buckets.map((b) => renderBucket(b))
              )}
            </TabContent>
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
