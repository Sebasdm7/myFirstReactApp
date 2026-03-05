import React from "react";

export default function TaskTimeline({
  tasks = [],
  handleClick,
  statusOptions = [],
}) {
  return (
    <ol className="timeline">
      {tasks.map((task) => (
        <li key={task.id} className="timelineItem">
          <div className="timelineMarker" />
          <div className="timelineContent">
            <div className="timelineHeader">
              <h4>{task.Title || "Untitled task"}</h4>
              <p
                className={`statusBadge statusBadge--${
                  task.Status || statusOptions[0]?.value || "todo"
                }`}
              >
                {getStatusLabel(task.Status, statusOptions)}
              </p>
            </div>
            <p className="timelineDate">
              {task.dueDate
                ? new Date(task.dueDate).toLocaleString()
                : "No due date"}
            </p>
            {task.Description && (
              <p className="timelineDescription">
                {task.Description.slice(0, 140)}
                {task.Description.length > 140 ? "..." : ""}
              </p>
            )}
            <button
              type="button"
              className="ghostButton"
              onClick={() =>
                handleClick({
                  Title: task.Title,
                  Description: task.Description,
                  Status: task.Status,
                  id: task.id,
                  dueDate: task.dueDate,
                  priority: task.priority,
                  recurrence: task.recurrence,
                  reminderOffsetMinutes: task.reminderOffsetMinutes,
                })
              }
            >
              View details
            </button>
          </div>
        </li>
      ))}
    </ol>
  );
}

const getStatusLabel = (value, options = []) => {
  const fallback = options[0]?.label || "Status";
  return options.find((option) => option.value === value)?.label || fallback;
};
