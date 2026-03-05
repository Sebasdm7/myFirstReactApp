import React, { useState } from "react";

export default function TaskKanban({
  tasks = [],
  statusOptions = [],
  handleClick,
  onStatusChange,
  handleDelete,
  selectedTaskId,
  statusUpdateBusyId,
  deletingTaskId,
  onRequestReminder,
  canScheduleReminders,
}) {
  const [expandedCardId, setExpandedCardId] = useState(null);
  const fallbackStatus = statusOptions[0]?.value || "todo";
  const grouped = statusOptions.map((option) => ({
    ...option,
    tasks: tasks.filter((task) => (task.Status || fallbackStatus) === option.value),
  }));

  const toggleCard = (taskId) => {
    setExpandedCardId((prev) => (prev === taskId ? null : taskId));
  };

  return (
    <div className="kanbanBoard">
      {grouped.map((group) => (
        <div className="kanbanColumn" key={group.value}>
          <header className="kanbanColumnHeader">
            <h4>{group.label}</h4>
            <span>{group.tasks.length}</span>
          </header>
          <div className="kanbanColumnBody">
            {group.tasks.map((task) => {
              const currentStatus = task.Status || fallbackStatus;
              const isExpanded = expandedCardId === task.id;
              return (
                <article
                  key={task.id}
                  className={`kanbanCard${
                    selectedTaskId === task.id ? " is-selected" : ""
                  }`}
                  onClick={() =>
                    handleClick({
                      Title: task.Title,
                      Description: task.Description,
                      Status: currentStatus,
                      id: task.id,
                      dueDate: task.dueDate,
                      priority: task.priority,
                      recurrence: task.recurrence,
                      reminderOffsetMinutes: task.reminderOffsetMinutes,
                    })
                  }
                >
                  <div className="kanbanCardHeader">
                    <p className="kanbanCardTitle">{task.Title || "Untitled task"}</p>
                    <button
                      type="button"
                      className="manageButton"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCard(task.id);
                      }}
                    >
                      {isExpanded ? "Hide" : "Manage"}
                    </button>
                  </div>
                  <p className="kanbanCardMeta">
                    Due: {task.dueDate ? new Date(task.dueDate).toLocaleString() : "No due date"}
                  </p>
                  <p className={`priorityBadge priorityBadge--${task.priority || "medium"}`}>
                    {task.priority || "medium"}
                  </p>
                  {isExpanded && (
                    <div className="kanbanCardActions">
                      <select
                        value={currentStatus}
                        onChange={(e) => {
                          e.stopPropagation();
                          onStatusChange(task.id, e.target.value);
                        }}
                        disabled={statusUpdateBusyId === task.id}
                      >
                        {statusOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <div className="taskFooterActions">
                        <button
                          type="button"
                          className="remindButton"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRequestReminder(task);
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
                            handleDelete(task.id);
                          }}
                          disabled={deletingTaskId === task.id}
                        >
                          {deletingTaskId === task.id ? "..." : "×"}
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
