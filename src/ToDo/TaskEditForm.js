import React, { useEffect, useState } from "react";
import { renderTaskMarkup } from "./renderTaskMarkup";

const formatDateInputValue = (ms) => {
  if (!ms) return "";
  const date = new Date(ms);
  const pad = (n) => `${n}`.padStart(2, "0");
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const min = pad(date.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
};

export default function TaskEditForm({
  taskClicked,
  onFieldChange,
  onSave,
  isSaving,
  errorMessage,
  statusOptions,
  conflictMessage = "",
  priorityOptions,
  recurrenceOptions,
  formId = "task-edit-form",
}) {
  const disabled = !taskClicked?.id;
  const statusValue = taskClicked?.status ?? statusOptions[0].value;
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  useEffect(() => {
    if (disabled && isPreviewMode) {
      setIsPreviewMode(false);
    }
  }, [disabled, isPreviewMode]);

  return (
    <form
      id={formId}
      className="editTaskForm"
      onSubmit={(e) => {
        e.preventDefault();
        onSave();
      }}
    >
      {conflictMessage && (
        <p className="infoBanner infoBanner--warning" role="status">
          {conflictMessage}
        </p>
      )}
      <label className="formField">
        <span>Title</span>
        <input
          name="title"
          placeholder="Task title"
          value={taskClicked.title || ""}
          onChange={onFieldChange}
          disabled={disabled}
        />
      </label>

      <label className="formField">
        <span>
          Description
          <div className="markdownEditorHeader">
            <small className="hintInline">
              Supports Markdown (e.g., **bold**, _italic_, `code`, lists, and [links](https://example.com)).
            </small>
            <div className="markdownToggle" role="group" aria-label="Description mode toggle">
              <button
                type="button"
                className={!isPreviewMode ? "is-active" : ""}
                onClick={() => setIsPreviewMode(false)}
                disabled={disabled}
              >
                Edit
              </button>
              <button
                type="button"
                className={isPreviewMode ? "is-active" : ""}
                onClick={() => setIsPreviewMode(true)}
                disabled={disabled}
              >
                Preview
              </button>
            </div>
          </div>
        </span>
        {!isPreviewMode ? (
          <textarea
            name="description"
            placeholder="Add notes, links, or blockers"
            value={taskClicked.description || ""}
            onChange={onFieldChange}
            disabled={disabled}
          />
        ) : (
          <div className="markdownPreview">
            <span className="markdownPreviewLabel">Preview</span>
            <div
              className="markdownPreviewContent"
              dangerouslySetInnerHTML={{
                __html: renderTaskMarkup(taskClicked.description || ""),
              }}
            />
          </div>
        )}
      </label>

      <label className="formField">
        <span>Status</span>
        <select
          name="status"
          value={statusValue}
          onChange={onFieldChange}
          disabled={disabled}
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="formField">
        <span>Due date</span>
        <input
          type="datetime-local"
          name="dueDate"
          value={formatDateInputValue(taskClicked.dueDate)}
          onChange={onFieldChange}
          disabled={disabled}
        />
      </label>

      <div className="formField formField--split">
        <label>
          <span>Priority</span>
          <select
            name="priority"
            value={taskClicked.priority || "medium"}
            onChange={onFieldChange}
            disabled={disabled}
          >
            {priorityOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Recurrence</span>
          <select
            name="recurrence"
            value={taskClicked.recurrence || "none"}
            onChange={onFieldChange}
            disabled={disabled}
          >
            {recurrenceOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="formField">
        <span>Reminder (minutes)</span>
        <input
          type="number"
          min="0"
          name="reminderOffsetMinutes"
          value={taskClicked.reminderOffsetMinutes ?? 30}
          onChange={onFieldChange}
          disabled={disabled}
        />
      </label>

      {errorMessage && <p className="errorText">{errorMessage}</p>}
    </form>
  );
}
