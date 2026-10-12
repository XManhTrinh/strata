"use client";

import { useState, useRef, useEffect } from "react";
import { Checkbox, Button } from "@vkieu/windmorph";
import { Icon } from "@/components/ui/icon";
import type { OrgUnit } from "../types/calendar.types";

interface FilterSelectorProps {
  orgUnits: OrgUnit[];
  selectedOrgUnitIds: string[];
  selectedUserIds: string[];
  onOrgUnitsChange: (ids: string[]) => void;
  onUserIdsChange: (ids: string[]) => void;
}

export function FilterSelector({
  orgUnits,
  selectedOrgUnitIds,
  selectedUserIds,
  onOrgUnitsChange,
  onUserIdsChange,
}: FilterSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const totalSelectedTeams = selectedOrgUnitIds.length;
  const totalSelectedPeople = selectedUserIds.length;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelectAll() {
    onOrgUnitsChange(orgUnits.map((ou) => ou.id));
    onUserIdsChange(orgUnits.flatMap((ou) => ou.members.map((m) => m.id)));
  }

  function handleClearAll() {
    onOrgUnitsChange([]);
    onUserIdsChange([]);
  }

  function toggleOrgUnit(orgUnitId: string) {
    const orgUnit = orgUnits.find((ou) => ou.id === orgUnitId);
    if (!orgUnit) return;

    const memberIds = orgUnit.members.map((m) => m.id);
    if (selectedOrgUnitIds.includes(orgUnitId)) {
      onOrgUnitsChange(selectedOrgUnitIds.filter((id) => id !== orgUnitId));
      onUserIdsChange(selectedUserIds.filter((id) => !memberIds.includes(id)));
    } else {
      onOrgUnitsChange([...selectedOrgUnitIds, orgUnitId]);
      onUserIdsChange([...new Set([...selectedUserIds, ...memberIds])]);
    }
  }

  function toggleMember(memberId: string) {
    if (selectedUserIds.includes(memberId)) {
      onUserIdsChange(selectedUserIds.filter((id) => id !== memberId));
    } else {
      onUserIdsChange([...selectedUserIds, memberId]);
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="outlined"
        size="xs"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Icon name="filter_list" size={18} />
        {totalSelectedTeams > 0 || totalSelectedPeople > 0
          ? `${totalSelectedTeams} teams, ${totalSelectedPeople} people`
          : "Filter"}
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-full z-30 mt-1 w-72 rounded-lg border border-outline-variant bg-surface-container-low shadow-lg">
          <div className="flex items-center justify-between border-b border-outline-variant px-3 py-2">
            <span className="text-label-small text-on-surface-variant uppercase tracking-wide">
              Filter by Team / Person
            </span>
            <div className="flex gap-2">
              <Button variant="text" size="xs" onClick={handleSelectAll}>Select All</Button>
              <Button variant="text" size="xs" onClick={handleClearAll}>Clear</Button>
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto p-2">
            {orgUnits.map((orgUnit) => (
              <div key={orgUnit.id} className="mb-2">
                <div className="flex items-center gap-2 rounded px-2 py-1 hover:bg-surface-variant cursor-pointer" onClick={() => toggleOrgUnit(orgUnit.id)}>
                  <Checkbox aria-label="Toggle"
 selected={selectedOrgUnitIds.includes(orgUnit.id)}
                    onSelectedChange={() => toggleOrgUnit(orgUnit.id)}
                  />
                  <span className="text-label-large">{orgUnit.name}</span>
                  <span className="text-body-small text-on-surface-variant">({orgUnit.members.length})</span>
                </div>
                <div className="ml-6 space-y-0.5">
                  {orgUnit.members.map((member) => (
                    <div key={member.id} className="flex items-center gap-2 rounded px-2 py-0.5 hover:bg-surface-variant cursor-pointer" onClick={() => toggleMember(member.id)}>
                      <Checkbox aria-label="Toggle"
 selected={selectedUserIds.includes(member.id)}
                        onSelectedChange={() => toggleMember(member.id)}
                      />
                      <span className="text-body-small">{member.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
