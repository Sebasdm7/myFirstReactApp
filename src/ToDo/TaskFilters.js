import React from "react";

export default function TaskFilters({
  statusOptions,
  activeStatuses,
  onToggleStatus,
  onResetFilters,
  searchQuery,
  onSearchChange,
  onRefresh,
}) {
  return (
    <section className="taskFilters">
      <div className="filterRow">
        <label htmlFor="taskSearch">Search</label>
        <input
          id="taskSearch"
          type="search"
          placeholder="Search title or description"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <div className="filterRow filterRow--status">
        <span>Status</span>
        <div className="statusChips">
          {statusOptions.map((option) => {
            const isActive = activeStatuses.has(option.value);
            return (
              <button
                key={option.value}
                type="button"
                className={`statusFilterChip${isActive ? " is-active" : ""}`}
                onClick={() => onToggleStatus(option.value)}
                aria-pressed={isActive}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        <div className="filterActions">
          <button type="button" className="resetFilters" onClick={onResetFilters}>
            Reset
          </button>
          {typeof onRefresh === "function" && (
            <button
              type="button"
              className="refreshFiltersButton"
              onClick={onRefresh}
            >
              Refresh
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
