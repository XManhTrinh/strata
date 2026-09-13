"use client";

import { useState, useRef, useEffect } from "react";
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
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-md border border-outline-variant bg-surface px-3 py-1.5 text-sm text-on-surface hover:bg-surface-variant transition-colors"
      >
        <svg className="h-4 w-4 text-on-surface-variant" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        <span>
          {totalSelectedTeams > 0 || totalSelectedPeople > 0
            ? `${totalSelectedTeams} teams, ${totalSelectedPeople} people`
            : "Filter"}
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-30 mt-1 w-72 rounded-lg border border-outline-variant bg-surface-container-low shadow-lg">
          <div className="flex items-center justify-between border-b border-outline-variant px-3 py-2">
            <span className="text-xs font-medium text-on-surface-variant uppercase tracking-wide">Filter by Team / Person</span>
            <div className="flex gap-2">
              <button type="button" onClick={handleSelectAll} className="text-xs text-primary hover:underline">Select All</button>
              <button type="button" onClick={handleClearAll} className="text-xs text-on-surface-variant hover:underline">Clear</button>
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto p-2">
            {orgUnits.map((orgUnit) => (
              <div key={orgUnit.id} className="mb-2">
                <label className="flex items-center gap-2 rounded px-2 py-1 hover:bg-surface-variant cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedOrgUnitIds.includes(orgUnit.id)}
                    onChange={() => toggleOrgUnit(orgUnit.id)}
                    className="h-3.5 w-3.5 rounded border-outline-variant text-primary focus:ring-primary"
                  />
                  <span className="text-sm font-medium text-on-surface">{orgUnit.name}</span>
                  <span className="text-xs text-on-surface-variant">({orgUnit.members.length})</span>
                </label>
                <div className="ml-6 space-y-0.5">
                  {orgUnit.members.map((member) => (
                    <label key={member.id} className="flex items-center gap-2 rounded px-2 py-0.5 hover:bg-surface-variant cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedUserIds.includes(member.id)}
                        onChange={() => toggleMember(member.id)}
                        className="h-3 w-3 rounded border-outline-variant text-primary focus:ring-primary"
                      />
                      <span className="text-xs text-on-surface">{member.name}</span>
                    </label>
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
