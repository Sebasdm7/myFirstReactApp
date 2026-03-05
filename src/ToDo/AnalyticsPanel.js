import React, { useMemo } from "react";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export default function AnalyticsPanel({
  tasks = [],
  statusOptions = [],
  webhookUrl,
  onWebhookUrlChange,
}) {
  const now = Date.now();
  const stats = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((task) => task.Status === "done").length;
    const overdue = tasks.filter(
      (task) => task.dueDate && task.dueDate < now && task.Status !== "done"
    ).length;

    const completedLast7 = tasks.filter(
      (task) =>
        task.Status === "done" &&
        task.completedAt &&
        task.completedAt >= now - 7 * ONE_DAY_MS
    ).length;

    const statusBreakdown = statusOptions.map((option) => ({
      label: option.label,
      value: tasks.filter(
        (task) => (task.Status || statusOptions[0].value) === option.value
      ).length,
    }));

    const completionDurations = tasks
      .filter((task) => task.Status === "done" && task.completedAt)
      .map((task) => task.completedAt - (task.createdAt || now));
    const avgCompletion =
      completionDurations.reduce((sum, value) => sum + value, 0) /
        Math.max(1, completionDurations.length) || 0;

    return {
      total,
      done,
      overdue,
      completedLast7,
      statusBreakdown,
      avgCompletion,
    };
  }, [tasks, statusOptions, now]);

  const formatDuration = (ms) => {
    if (!ms) return "—";
    const days = Math.floor(ms / ONE_DAY_MS);
    const hours = Math.floor((ms % ONE_DAY_MS) / (60 * 60 * 1000));
    if (days > 0) {
      return `${days}d ${hours}h`;
    }
    return `${Math.max(1, hours)}h`;
  };

  return (
    <div className="analyticsGrid">
      <article className="analyticsCard">
        <h4>Total tasks</h4>
        <p className="analyticsMetric">{stats.total}</p>
      </article>
      <article className="analyticsCard">
        <h4>Completed</h4>
        <p className="analyticsMetric">{stats.done}</p>
        <small>{stats.completedLast7} in the last 7 days</small>
      </article>
      <article className="analyticsCard">
        <h4>Overdue</h4>
        <p className="analyticsMetric">{stats.overdue}</p>
      </article>
      <article className="analyticsCard">
        <h4>Avg completion time</h4>
        <p className="analyticsMetric">{formatDuration(stats.avgCompletion)}</p>
      </article>
      <article className="analyticsCard analyticsCard--wide">
        <h4>Status breakdown</h4>
        <ul className="analyticsStatusList">
          {stats.statusBreakdown.map((item) => (
            <li key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </li>
          ))}
        </ul>
      </article>
      <article className="analyticsCard analyticsCard--wide">
        <h4>Automation webhook</h4>
        <p className="hint">Post JSON to a custom URL when tasks finish.</p>
        <input
          type="url"
          placeholder="https://example.com/webhook"
          value={webhookUrl}
          onChange={(e) => onWebhookUrlChange(e.target.value)}
        />
      </article>
    </div>
  );
}
