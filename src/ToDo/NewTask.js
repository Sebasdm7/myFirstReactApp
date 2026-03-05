import React, { useState } from "react";
import { renderTaskMarkup } from "./renderTaskMarkup";

export default function NewTask({
  title,
  description,
  status,
  setTitle,
  setDescription,
  setStatus,
  statusOptions,
  handleSubmit,
  isSubmitting = false,
  dueDate,
  setDueDate,
  priority,
  setPriority,
  priorityOptions,
  recurrence,
  setRecurrence,
  recurrenceOptions,
  reminderOffsetMinutes,
  setReminderOffsetMinutes,
}) {
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  return (
    <form className="newTaskForm" onSubmit={handleSubmit}>
      <div className="formField">
        <label htmlFor="newTaskTitle">Task title</label>
        <input
          id="newTaskTitle"
          name="title"
          placeholder="Plan sprint retro..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoComplete="off"
        />
      </div>

      <div className="formField formField--grow">
        <label htmlFor="newTaskDescription">
          Description
          <div className="markdownEditorHeader">
           
            <div className="markdownToggle" role="group" aria-label="Description mode toggle">
              <button
                type="button"
                className={!isPreviewMode ? "is-active" : ""}
                onClick={() => setIsPreviewMode(false)}
              >
                Edit
              </button>
              <button
                type="button"
                className={isPreviewMode ? "is-active" : ""}
                onClick={() => setIsPreviewMode(true)}
              >
                Preview
              </button>
            </div>
          </div>
        </label>
        {!isPreviewMode ? (
          <textarea
            id="newTaskDescription"
            name="description"
            placeholder="Add more context or resources"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        ) : (
          <div className="markdownPreview">
            <span className="markdownPreviewLabel">Preview</span>
            <div
              className="markdownPreviewContent"
              dangerouslySetInnerHTML={{ __html: renderTaskMarkup(description || "") }}
            />
          </div>
        )}
      </div>

      <div className="formField formField--status">
        <label htmlFor="newTaskStatus">Status</label>
        <select
          id="newTaskStatus"
          name="status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="formField">
        <label htmlFor="newTaskDueDate">Due date</label>
        <input
          id="newTaskDueDate"
          type="datetime-local"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
      </div>

      <div className="formField formField--split">
        <div>
          <label htmlFor="newTaskPriority">Priority</label>
          <select
            id="newTaskPriority"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            {priorityOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="newTaskRecurrence">Recurrence</label>
          <select
            id="newTaskRecurrence"
            value={recurrence}
            onChange={(e) => setRecurrence(e.target.value)}
          >
            {recurrenceOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="formField">
        <label htmlFor="newTaskReminder">Reminder (minutes)</label>
        <input
          id="newTaskReminder"
          type="number"
          min="0"
          value={reminderOffsetMinutes}
          onChange={(e) => setReminderOffsetMinutes(Number(e.target.value))}
        />
      </div>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Adding..." : "Add Task"}
      </button>
    </form>
  );
}
