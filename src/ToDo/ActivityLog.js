import React from "react";

const ACTION_COPY = {
  created: "Created",
  updated: "Edited",
  deleted: "Deleted",
  status_changed: "Status updated",
};

const formatTimestamp = (timestamp) => {
  if (!timestamp) {
    return "";
  }
  try {
    const date = new Date(timestamp);
    return date.toLocaleString();
  } catch (error) {
    return String(timestamp);
  }
};

export default function ActivityLog({ entries = [], statusOptions = [] }) {
  if (!entries.length) {
    return (
      <div className="activityLogEmpty">
        <p>No activity yet. Actions will appear here once you start updating tasks.</p>
      </div>
    );
  }

  const getStatusLabel = (value) =>
    statusOptions.find((option) => option.value === value)?.label || value;

  return (
    <ul className="activityLogList">
      {entries.map((entry) => {
        const actionLabel = ACTION_COPY[entry.action] || entry.action;
        const statusLabel = entry.status ? getStatusLabel(entry.status) : "";
        return (
          <li key={entry.id} className="activityLogItem">
            <div>
              <p className="activityLogAction">
                {actionLabel} "{entry.taskTitle || "Untitled task"}"
                {statusLabel ? ` (${statusLabel})` : ""}
              </p>
              <p className="activityLogMeta">{formatTimestamp(entry.timestamp)}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
