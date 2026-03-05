import React, { useState } from "react";

export default function TasksList({
  tasks,
  handleDelete,
  handleClick,
  onStatusChange,
  statusOptions,
  selectedTaskId,
  statusUpdateBusyId,
  hasAnyTasks,
  onResetFilters = () => {},
  onCreateTask = () => {},
  deletingTaskId = null,
  onRequestReminder = () => {},
  canScheduleReminders = false,
}) {
  const [expandedCardId, setExpandedCardId] = useState(null);

  const renderEmptyState = () => {
    const hasTasks = Boolean(hasAnyTasks);
    const heading = hasTasks
      ? "No tasks match the current filters."
      : "You have no tasks yet.";
    const hint = hasTasks
      ? "Adjust or reset the filters to see more tasks."
      : "Create your first task to get started.";
    const actionLabel = hasTasks ? "Reset Filters" : "Create a Task";
    const actionHandler = hasTasks ? onResetFilters : onCreateTask;

    return (
      <div className="tasksListEmpty" role="status" aria-live="polite">
        <p>{heading}</p>
        <p className="hint">{hint}</p>
        <button
          type="button"
          className="tasksListEmptyButton"
          onClick={actionHandler}
        >
          {actionLabel}
        </button>
      </div>
    );
  };

  if (!tasks?.length) {
    return renderEmptyState();
  }

  const getStatusLabel = (value) =>
    statusOptions.find((option) => option.value === value)?.label || "Unknown";

  const toggleCardActions = (taskId) => {
    setExpandedCardId((prev) => (prev === taskId ? null : taskId));
  };

  return (
    <ul className="tasksList" aria-live="polite">
      {tasks.map(
        ({
          Title,
          Description,
          Status,
          id,
          dueDate,
          priority,
          recurrence,
          reminderOffsetMinutes,
        }) => {
          const normalizedStatus = Status || statusOptions[0].value;
          const dueLabel = dueDate
            ? new Date(dueDate).toLocaleString()
            : "No due date";
          const isExpanded = expandedCardId === id;

          return (
            <li
              key={id}
              className={`taskCard${selectedTaskId === id ? " is-selected" : ""}`}
              onClick={() =>
                handleClick({
                  Title,
                  Description,
                  Status: normalizedStatus,
                  id,
                  dueDate,
                  priority,
                  recurrence,
                  reminderOffsetMinutes,
                })
              }
            >
              <div className="taskCardHeader">
                <div className="taskHeaderText">
                  <h4>{Title || "Untitled task"}</h4>
                  <div className="taskMetaBadges">
                    <p className={`statusBadge statusBadge--${normalizedStatus}`}>
                      {getStatusLabel(normalizedStatus)}
                    </p>
                    <span
                      className={`priorityBadge priorityBadge--${priority || "medium"}`}
                    >
                      {priority || "medium"}
                    </span>
                    {recurrence && recurrence !== "none" && (
                      <span className="recurrenceBadge">{recurrence}</span>
                    )}
                  </div>
                </div>
                <div className="taskHeaderActions">
                  <p className="taskDueLabel">{dueLabel}</p>
                  <button
                    type="button"
                    className="manageButton"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleCardActions(id);
                    }}
                  >
                    {isExpanded ? "Hide" : "Manage"}
                  </button>
                </div>
              </div>

              {Description && (
                <p className="taskCardDescription">{renderPlainTextSnippet(Description)}</p>
              )}

              {isExpanded && (
                <div className="taskCardFooter">
                  <label>
                    <span>Status</span>
                    <select
                      value={normalizedStatus}
                      onChange={(e) => {
                        e.stopPropagation();
                        onStatusChange(id, e.target.value);
                      }}
                      disabled={statusUpdateBusyId === id}
                    >
                      {statusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="taskFooterActions">
                    <button
                      type="button"
                      className="remindButton"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRequestReminder({
                          id,
                          Title,
                          Status: normalizedStatus,
                          reminderOffsetMinutes,
                        });
                      }}
                      disabled={!canScheduleReminders}
                    >
                      {canScheduleReminders ? "Remind me" : "Enable reminders"}
                    </button>
                    <button
                      type="button"
                      className="deleteTaskButton"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(id);
                      }}
                      aria-label={`Delete ${Title || "task"}`}
                      disabled={deletingTaskId === id}
                    >
                      {deletingTaskId === id ? "..." : "×"}
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        }
      )}
    </ul>
  );
}

const renderPlainTextSnippet = (value = "") => {
  if (!value) return null;
  const text = value.replace(/<[^>]+>/g, "");
  if (text.length <= 140) {
    return text;
  }
  return `${text.slice(0, 140)}...`;
};
