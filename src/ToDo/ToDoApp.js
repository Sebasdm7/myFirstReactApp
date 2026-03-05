import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import NewTask from "./NewTask";
import TasksList from "./TasksList";
import TaskEditForm from "./TaskEditForm";
import TaskFilters from "./TaskFilters";
import ActivityLog from "./ActivityLog";
import {
  collection,
  serverTimestamp,
  deleteDoc,
  doc,
  updateDoc,
  setDoc,
} from "firebase/firestore";
import { db } from "../firebase";

import "./ToDoApp.css";
import { resolveUserId } from "./userIdentity";
import TaskKanban from "./TaskKanban";
import TaskTimeline from "./TaskTimeline";
import AnalyticsPanel from "./AnalyticsPanel";

const STATUS_OPTIONS = [
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "blocked", label: "Blocked" },
  { value: "done", label: "Done" },
];

const SECTION_CONFIG = [
  { id: "create", label: "Plan", description: "Filter & add tasks" },
  { id: "list", label: "Task List", description: "Browse & edit" },
  { id: "activity", label: "Activity", description: "Recent changes" },
  { id: "analytics", label: "Insights", description: "Progress & stats" },
];

const DESKTOP_BREAKPOINT = 1024;
const VIEW_MODES = [
  { value: "list", label: "List" },
  { value: "kanban", label: "Kanban" },
  { value: "timeline", label: "Timeline" },
];
const SORT_OPTIONS = [
  { value: "createdDesc", label: "Newest" },
  { value: "createdAsc", label: "Oldest" },
  { value: "dueAsc", label: "Soonest due" },
  { value: "dueDesc", label: "Farthest due" },
  { value: "priorityDesc", label: "Priority" },
];
const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];
const RECURRENCE_OPTIONS = [
  { value: "none", label: "One-time" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

const statusValues = STATUS_OPTIONS.map((option) => option.value);
const defaultStatus = STATUS_OPTIONS[0].value;
const TODO_APP_VERSION =
  process.env.REACT_APP_TODO_APP_VERSION ||
  process.env.REACT_APP_VERSION ||
  "0.2.0";
const TASK_EDIT_FORM_ID = "task-edit-form";
const ACTIVITY_CACHE_KEY = (userId) => `todoActivity:${userId || "anonymous"}`;
const WEBHOOK_CACHE_KEY = (userId) => `todoWebhook:${userId || "anonymous"}`;
const OFFLINE_QUEUE_KEY = (userId) => `todoOfflineQueue:${userId || "anonymous"}`;
const REMINDER_DELAY_MS = 1000 * 10;
const DUE_SOON_THRESHOLD_MS = 1000 * 60 * 60 * 24 * 3;
const DESKTOP_DEFAULT_HIDDEN_SECTIONS = ["activity", "analytics"];

const getTimestampValue = (timestamp) => {
  if (!timestamp) {
    return 0;
  }

  if (typeof timestamp.toMillis === "function") {
    return timestamp.toMillis();
  }

  if (typeof timestamp === "number") {
    return timestamp;
  }

  if (timestamp.seconds) {
    const nanos = timestamp.nanoseconds ?? 0;
    return timestamp.seconds * 1000 + nanos / 1e6;
  }

  if (timestamp instanceof Date) {
    return timestamp.getTime();
  }

  const parsed = Date.parse(timestamp);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const getIsDesktopLayout = () => {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }

  return window.matchMedia(`(min-width: ${DESKTOP_BREAKPOINT}px)`).matches;
};

const getInitialHiddenSections = () => {
  const defaults = new Set();
  if (getIsDesktopLayout()) {
    DESKTOP_DEFAULT_HIDDEN_SECTIONS.forEach((sectionId) => defaults.add(sectionId));
  }
  return defaults;
};

const getCreatedAtValue = (task = {}) => {
  const createdAt = task.createdAt;
  if (!createdAt) return 0;

  if (typeof createdAt.toMillis === "function") {
    return createdAt.toMillis();
  }

  if (typeof createdAt === "number") {
    return createdAt;
  }

  if (createdAt.seconds) {
    const nanos = createdAt.nanoseconds ?? 0;
    return createdAt.seconds * 1000 + nanos / 1e6;
  }

  if (createdAt instanceof Date) {
    return createdAt.getTime();
  }

  const parsed = Date.parse(createdAt);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const sortTasksByCreatedAtAsc = (tasks = []) =>
  [...tasks].sort((a, b) => getCreatedAtValue(a) - getCreatedAtValue(b));

const normalizeTask = (task = {}) => {
  const fallbackId =
    task.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const resolvedCreatedAt =
    getTimestampValue(task.createdAt) || Date.now();
  const resolvedUpdatedAt =
    getTimestampValue(task.updatedAt) || resolvedCreatedAt;
  const resolvedDueDate = getTimestampValue(task.dueDate) || null;
  const resolvedCompletedAt = getTimestampValue(task.completedAt) || null;

  return {
    Title: task.Title ?? "",
    Description: task.Description ?? "",
    Status: task.Status ?? defaultStatus,
    createdAt: resolvedCreatedAt,
    updatedAt: resolvedUpdatedAt,
    dueDate: resolvedDueDate,
    priority: task.priority ?? "medium",
    recurrence: task.recurrence ?? "none",
    reminderOffsetMinutes:
      typeof task.reminderOffsetMinutes === "number"
        ? task.reminderOffsetMinutes
        : 30,
    completedAt: resolvedCompletedAt,
    id: fallbackId,
  };
};

const dedupeTasksById = (tasks = []) => {
  const map = new Map();
  tasks.forEach((task) => {
    if (!task) {
      return;
    }
    const key = task.id ?? `${task.Title ?? "task"}-${task.createdAt ?? Date.now()}`;
    map.set(key, { ...map.get(key), ...task });
  });
  return Array.from(map.values());
};

const getNextDueDate = (currentDueDate, recurrence) => {
  const baseDate = currentDueDate ? new Date(currentDueDate) : new Date();
  switch (recurrence) {
    case "daily":
      baseDate.setDate(baseDate.getDate() + 1);
      break;
    case "weekly":
      baseDate.setDate(baseDate.getDate() + 7);
      break;
    case "monthly":
      baseDate.setMonth(baseDate.getMonth() + 1);
      break;
    default:
      return null;
  }
  return baseDate.getTime();
};

const parseDateInputValue = (value) => {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
};

export default function ToDoApp(props) {
  const {
    data,
    onRefresh,
    userId: incomingUserId,
    isSyncing: isRemoteSyncing,
  } = props ?? {};
  const [taskClicked, setTaskClicked] = useState({});
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [newTaskStatus, setNewTaskStatus] = useState(defaultStatus);
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState("medium");
  const [newTaskRecurrence, setNewTaskRecurrence] = useState("none");
  const [newTaskReminderOffset, setNewTaskReminderOffset] = useState(30);
  const [allTasks, setAllTasks] = useState([]);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");
  const [statusUpdateError, setStatusUpdateError] = useState("");
  const [userId] = useState(() => resolveUserId(incomingUserId));
  const [statusUpdateBusyId, setStatusUpdateBusyId] = useState(null);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [deletingTaskId, setDeletingTaskId] = useState(null);
  const [activityLog, setActivityLog] = useState([]);
  const [conflictMessage, setConflictMessage] = useState("");
  const [reminderStatus, setReminderStatus] = useState("");
  const notificationsSupported =
    typeof window !== "undefined" && "Notification" in window;
  const [notificationPermission, setNotificationPermission] = useState(() => {
    if (!notificationsSupported) {
      return "denied";
    }
    return Notification.permission;
  });
  const [viewMode, setViewMode] = useState("list");
  const [sortMode, setSortMode] = useState("createdDesc");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [activeStatusFilters, setActiveStatusFilters] = useState(
    () => new Set(statusValues)
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSection, setActiveSection] = useState("list");
  const incomingTasks = data?.tasks;
  const [isDesktopLayout, setIsDesktopLayout] = useState(getIsDesktopLayout);
  const tasksCollectionRef = useMemo(() => collection(db, "Tasks"), []);
  const getTaskDocRef = useCallback((taskId) => doc(db, "Tasks", taskId), []);
  const pendingEditsRef = useRef(new Map());
  const lastSyncedMapRef = useRef(new Map());
  const reminderTimeoutsRef = useRef([]);
  const createSectionRef = useRef(null);
  const offlineQueueRef = useRef([]);
  const isFlushingOfflineRef = useRef(false);
  const canScheduleReminders =
    notificationsSupported && notificationPermission === "granted";
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isInlineFiltersOpen, setIsInlineFiltersOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(() => !getIsDesktopLayout());
  const [isDisplayMenuOpen, setIsDisplayMenuOpen] = useState(false);
  const [hiddenSections, setHiddenSections] = useState(() => getInitialHiddenSections());
  const desktopHiddenSnapshotRef = useRef(new Set(getInitialHiddenSections()));
  const hiddenSectionsRef = useRef(hiddenSections);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const cacheKey = ACTIVITY_CACHE_KEY(userId);
    try {
      const cached = window.localStorage?.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          setActivityLog(parsed);
        }
      }
    } catch (error) {
      console.error("Error reading cached activity log:", error);
    }
  }, [userId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const cacheKey = ACTIVITY_CACHE_KEY(userId);
    try {
      window.localStorage?.setItem(
        cacheKey,
        JSON.stringify(activityLog.slice(0, 50))
      );
    } catch (error) {
      console.error("Error caching activity log:", error);
    }
  }, [activityLog, userId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const webhookKey = WEBHOOK_CACHE_KEY(userId);
    try {
      const stored = window.localStorage?.getItem(webhookKey);
      if (stored) {
        setWebhookUrl(stored);
      }
    } catch (error) {
      console.error("Error loading webhook URL:", error);
    }
  }, [userId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const webhookKey = WEBHOOK_CACHE_KEY(userId);
    try {
      if (webhookUrl) {
        window.localStorage?.setItem(webhookKey, webhookUrl);
      } else {
        window.localStorage?.removeItem(webhookKey);
      }
    } catch (error) {
      console.error("Error saving webhook URL:", error);
    }
  }, [webhookUrl, userId]);

  useEffect(
    () => () => {
      reminderTimeoutsRef.current.forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
      reminderTimeoutsRef.current = [];
    },
    []
  );

  const recordActivity = (entry) => {
    setActivityLog((prev) => {
      const timestamp = Date.now();
      const nextEntry = {
        id: `${timestamp}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp,
        ...entry,
      };
      return [nextEntry, ...prev].slice(0, 50);
    });
  };

  const markPendingEdit = (taskId) => {
    if (!taskId) {
      return;
    }
    pendingEditsRef.current.set(taskId, Date.now());
  };

  const persistOfflineQueue = useCallback(
    (queue) => {
      if (typeof window === "undefined") return;
      try {
        window.localStorage?.setItem(
          OFFLINE_QUEUE_KEY(userId),
          JSON.stringify(queue)
        );
      } catch (error) {
        console.error("Unable to persist offline queue:", error);
      }
    },
    [userId]
  );

  const enqueueOfflineOperation = useCallback(
    (operation) => {
      offlineQueueRef.current = [...offlineQueueRef.current, operation];
      persistOfflineQueue(offlineQueueRef.current);
    },
    [persistOfflineQueue]
  );

  const runOfflineOperation = useCallback(
    async (operation) => {
      const targetRef = getTaskDocRef(operation.docId);
      if (operation.type === "create") {
        await setDoc(targetRef, operation.data);
        return;
      }
      if (operation.type === "update") {
        await updateDoc(targetRef, operation.data);
        return;
      }
      if (operation.type === "delete") {
        await deleteDoc(targetRef);
      }
    },
    [getTaskDocRef]
  );

  const processOfflineQueue = useCallback(async () => {
    if (isFlushingOfflineRef.current) {
      return;
    }
    if (!navigator.onLine) {
      return;
    }
    isFlushingOfflineRef.current = true;
    while (offlineQueueRef.current.length) {
      const [nextOperation, ...rest] = offlineQueueRef.current;
      try {
        await runOfflineOperation(nextOperation);
        offlineQueueRef.current = rest;
        persistOfflineQueue(rest);
      } catch (error) {
        console.error("Unable to flush offline operation:", error);
        break;
      }
    }
    isFlushingOfflineRef.current = false;
  }, [persistOfflineQueue, runOfflineOperation]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    offlineQueueRef.current = [];
    const cachedQueueRaw = window.localStorage?.getItem(
      OFFLINE_QUEUE_KEY(userId)
    );
    if (cachedQueueRaw) {
      try {
        const parsed = JSON.parse(cachedQueueRaw);
        if (Array.isArray(parsed)) {
          offlineQueueRef.current = parsed;
        }
      } catch (error) {
        console.error("Error parsing offline queue:", error);
      }
    }
    processOfflineQueue();
    window.addEventListener("online", processOfflineQueue);
    return () => window.removeEventListener("online", processOfflineQueue);
  }, [processOfflineQueue, userId]);

  const performOrQueueOperation = useCallback(
    async (operation, executor) => {
      if (!navigator.onLine) {
        enqueueOfflineOperation(operation);
        return false;
      }
      try {
        await executor();
        return true;
      } catch (error) {
        if (!navigator.onLine) {
          enqueueOfflineOperation(operation);
          return false;
        }
        throw error;
      }
    },
    [enqueueOfflineOperation]
  );

  const taskClickedRef = useRef(taskClicked);
  useEffect(() => {
    taskClickedRef.current = taskClicked;
  }, [taskClicked]);

  useEffect(() => {
    if (!incomingTasks) {
      return;
    }

    const normalizedTasks = dedupeTasksById(
      sortTasksByCreatedAtAsc(incomingTasks.map((task) => normalizeTask(task)))
    );

    normalizedTasks.forEach((task) => {
      const updatedAtValue = task.updatedAt ?? task.createdAt ?? 0;
      const previousValue = lastSyncedMapRef.current.get(task.id);
      const hasServerChange =
        typeof previousValue === "number" && previousValue !== updatedAtValue;
      const isPending = pendingEditsRef.current.has(task.id);

      if (hasServerChange && isPending) {
        pendingEditsRef.current.delete(task.id);
      }

      if (hasServerChange && !isPending && taskClickedRef.current?.id === task.id) {
        setConflictMessage(
          "This task was updated on another device. Showing the latest version."
        );
        setTaskClicked({
          title: task.Title,
          description: task.Description,
          status: task.Status ?? defaultStatus,
          id: task.id,
          priority: task.priority ?? "medium",
          recurrence: task.recurrence ?? "none",
          reminderOffsetMinutes:
            typeof task.reminderOffsetMinutes === "number"
              ? task.reminderOffsetMinutes
              : 30,
          dueDate: task.dueDate ?? null,
        });
        setEditError("");
      }

      lastSyncedMapRef.current.set(task.id, updatedAtValue);
    });

    setAllTasks(normalizedTasks);
  }, [incomingTasks]);

  useEffect(() => {
    const updateViewportUnits = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty("--vh", `${vh}px`);
    };

    updateViewportUnits();
    window.addEventListener("resize", updateViewportUnits);
    window.addEventListener("orientationchange", updateViewportUnits);

    return () => {
      window.removeEventListener("resize", updateViewportUnits);
      window.removeEventListener("orientationchange", updateViewportUnits);
    };
  }, []);

  useEffect(() => {
    if (activeSection === "details" && !taskClicked?.id) {
      setActiveSection("list");
    }
  }, [taskClicked, activeSection]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return undefined;
    }

    const mediaQuery = window.matchMedia(`(min-width: ${DESKTOP_BREAKPOINT}px)`);

    const handleChange = (event) => {
      setIsDesktopLayout(event.matches);
    };

    handleChange(mediaQuery);

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  useEffect(() => {
    setIsFormOpen(!isDesktopLayout);
  }, [isDesktopLayout]);

  useEffect(() => {
    if (!isDesktopLayout && isDisplayMenuOpen) {
      setIsDisplayMenuOpen(false);
    }
  }, [isDesktopLayout, isDisplayMenuOpen]);

  useEffect(() => {
    hiddenSectionsRef.current = hiddenSections;
  }, [hiddenSections]);

  useEffect(() => {
    if (isDesktopLayout) {
      setHiddenSections((prev) => {
        if (prev.size) {
          return prev;
        }
        const snapshot = desktopHiddenSnapshotRef.current;
        if (snapshot?.size) {
          return new Set(snapshot);
        }
        return getInitialHiddenSections();
      });
      return;
    }
    desktopHiddenSnapshotRef.current = new Set(hiddenSectionsRef.current);
    setHiddenSections(new Set());
  }, [isDesktopLayout]);

  useEffect(() => {
    if (isDesktopLayout) {
      desktopHiddenSnapshotRef.current = new Set(hiddenSections);
    }
  }, [hiddenSections, isDesktopLayout]);

  useEffect(() => {
    if (!conflictMessage) {
      return undefined;
    }

    const timeout = window.setTimeout(() => setConflictMessage(""), 5000);
    return () => window.clearTimeout(timeout);
  }, [conflictMessage]);

  const showSection = useCallback((sectionId) => {
    setHiddenSections((prev) => {
      if (!prev.has(sectionId)) {
        return prev;
      }
      const next = new Set(prev);
      next.delete(sectionId);
      return next;
    });
  }, []);

  const handleSelectSection = useCallback(
    (sectionId) => {
      showSection(sectionId);
      setActiveSection(sectionId);
    },
    [showSection]
  );

  const handleToggleSectionVisibility = useCallback(
    (sectionId) => {
      if (sectionId === "list") return;
      setHiddenSections((prev) => {
        const next = new Set(prev);
        if (next.has(sectionId)) {
          next.delete(sectionId);
        } else {
          next.add(sectionId);
        }

        if (!isDesktopLayout && sectionId === activeSection && next.has(sectionId)) {
          setActiveSection("list");
        }

        return next;
      });
    },
    [activeSection, isDesktopLayout]
  );

  const handleShowAllSections = useCallback(() => {
    setHiddenSections(new Set());
  }, []);

  const handleFloatingCreate = useCallback(() => {
    setIsFormOpen(true);
    setIsFiltersOpen(false);
    setIsInlineFiltersOpen(false);
    showSection("create");
    handleSelectSection("create");
    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() => {
        createSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } else {
      createSectionRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
    }
  }, [handleSelectSection, showSection]);

  const handleClick = ({
    Title,
    Description,
    Status,
    id,
    dueDate,
    priority,
    recurrence,
    reminderOffsetMinutes,
  }) => {
    setTaskClicked({
      title: Title,
      description: Description,
      status: Status ?? defaultStatus,
      id,
      dueDate: dueDate ?? null,
      priority: priority ?? "medium",
      recurrence: recurrence ?? "none",
      reminderOffsetMinutes:
        typeof reminderOffsetMinutes === "number" ? reminderOffsetMinutes : 30,
    });
    showSection("details");
    if (!isDesktopLayout) {
      handleSelectSection("details");
    }
  };

  const handleTaskFieldChange = (event) => {
    const { name, value } = event.target;
    let nextValue = value;
    if (name === "dueDate") {
      nextValue = parseDateInputValue(value);
    } else if (name === "reminderOffsetMinutes") {
      nextValue = Number(value) || 0;
    }
    setTaskClicked((prev) => ({ ...prev, [name]: nextValue }));
  };

  const handleSaveTask = async () => {
    if (!taskClicked?.id) {
      setEditError("Pick a task to edit.");
      return;
    }

    const updatedTitle = taskClicked.title?.trim();
    const updatedDescription = taskClicked.description?.trim() ?? "";
    const updatedStatus = taskClicked.status || defaultStatus;
    const updatedPriority = taskClicked.priority || "medium";
    const updatedRecurrence = taskClicked.recurrence || "none";
    const updatedReminder =
      typeof taskClicked.reminderOffsetMinutes === "number"
        ? taskClicked.reminderOffsetMinutes
        : 30;
    const updatedDueDate = taskClicked.dueDate
      ? Number(taskClicked.dueDate)
      : null;

    if (!updatedTitle) {
      setEditError("Title cannot be empty.");
      return;
    }

    setEditError("");
    setIsSavingEdit(true);
    markPendingEdit(taskClicked.id);

    let didSave = false;
    try {
      const payload = {
        Title: updatedTitle,
        Description: updatedDescription,
        Status: updatedStatus,
        priority: updatedPriority,
        recurrence: updatedRecurrence,
        reminderOffsetMinutes: updatedReminder,
        updatedAt: serverTimestamp(),
        dueDate: updatedDueDate ? new Date(updatedDueDate) : null,
      };
      await performOrQueueOperation(
        { type: "update", docId: taskClicked.id, data: payload },
        () => updateDoc(getTaskDocRef(taskClicked.id), payload)
      );

      setAllTasks((prev) =>
        sortTasksByCreatedAtAsc(
          dedupeTasksById(
            prev.map((task) =>
              task.id === taskClicked.id
                ? {
                  ...task,
                  Title: updatedTitle,
                  Description: updatedDescription,
                  Status: updatedStatus,
                  priority: updatedPriority,
                  recurrence: updatedRecurrence,
                  reminderOffsetMinutes: updatedReminder,
                  dueDate: updatedDueDate,
                }
                : task
            )
          )
        )
      );
      didSave = true;
    } catch (err) {
      console.error("Error updating task:", err);
      setEditError("Unable to save changes. Try again.");
      return;
    } finally {
      setIsSavingEdit(false);
    }

    if (didSave) {
      setTaskClicked((prev) =>
        prev?.id
          ? {
            ...prev,
            title: updatedTitle,
            description: updatedDescription,
            status: updatedStatus,
            priority: updatedPriority,
            recurrence: updatedRecurrence,
            reminderOffsetMinutes: updatedReminder,
            dueDate: updatedDueDate,
          }
          : prev
      );
      recordActivity({
        action: "updated",
        taskId: taskClicked.id,
        taskTitle: updatedTitle,
        status: updatedStatus,
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    setIsCreatingTask(true);
    setReminderStatus("");

    try {
      const docRef = doc(tasksCollectionRef);
      const dueDateValue = parseDateInputValue(newTaskDueDate);
      const reminderMinutes = Number(newTaskReminderOffset) || 30;
      const payload = {
        Title: trimmedTitle,
        Description: description.trim(),
        Status: newTaskStatus,
        priority: newTaskPriority,
        recurrence: newTaskRecurrence,
        reminderOffsetMinutes: reminderMinutes,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        dueDate: dueDateValue ? new Date(dueDateValue) : null,
        completedAt: null,
        userId,
      };

      const now = Date.now();
      const newTask = normalizeTask({
        ...payload,
        createdAt: now,
        updatedAt: now,
        dueDate: dueDateValue,
        id: docRef.id,
      });

      markPendingEdit(docRef.id);
      await performOrQueueOperation(
        { type: "create", docId: docRef.id, data: payload },
        () => setDoc(docRef, payload)
      );

      recordActivity({
        action: "created",
        taskId: docRef.id,
        taskTitle: trimmedTitle,
        status: newTaskStatus,
      });

      setAllTasks((prev) =>
        sortTasksByCreatedAtAsc(dedupeTasksById([...prev, newTask]))
      );

      setTitle("");
      setDescription("");
      setNewTaskStatus(defaultStatus);
      setNewTaskDueDate("");
      setNewTaskPriority("medium");
      setNewTaskRecurrence("none");
      setNewTaskReminderOffset(30);
      setActiveSection("list");
    } catch (err) {
      console.error("Error adding task:", err);
    } finally {
      setIsCreatingTask(false);
    }
  };

  const handleDelete = async (taskIdToRemove) => {
    setDeletingTaskId(taskIdToRemove);
    setStatusUpdateError("");
    const taskForLog =
      allTasks.find((task) => task.id === taskIdToRemove) ||
      taskClickedRef.current;
    try {
      await performOrQueueOperation(
        { type: "delete", docId: taskIdToRemove },
        () => deleteDoc(getTaskDocRef(taskIdToRemove))
      );
      pendingEditsRef.current.delete(taskIdToRemove);
      setAllTasks((prev) => prev.filter((task) => task.id !== taskIdToRemove));

      if (taskClicked?.id === taskIdToRemove) {
        setTaskClicked({});
        setActiveSection("list");
      }

      recordActivity({
        action: "deleted",
        taskId: taskIdToRemove,
        taskTitle: taskForLog?.Title || taskForLog?.title || "Untitled task",
        status: taskForLog?.Status || taskForLog?.status || defaultStatus,
      });
    } catch (err) {
      console.error("Error deleting task:", err);
      setStatusUpdateError("Unable to delete task right now.");
    } finally {
      setDeletingTaskId(null);
    }
  };

  const handleQuickStatusChange = async (taskId, nextStatus) => {
    setStatusUpdateError("");
    setStatusUpdateBusyId(taskId);
    markPendingEdit(taskId);
    const taskForLog =
      allTasks.find((task) => task.id === taskId) || taskClickedRef.current;
    const isCompleting = nextStatus === "done";
    const completionTimestamp = isCompleting ? Date.now() : null;

    try {
      const payload = {
        Status: nextStatus,
        updatedAt: serverTimestamp(),
        completedAt: isCompleting ? serverTimestamp() : null,
      };
      await performOrQueueOperation(
        { type: "update", docId: taskId, data: payload },
        () => updateDoc(getTaskDocRef(taskId), payload)
      );

      setAllTasks((prev) =>
        sortTasksByCreatedAtAsc(
          dedupeTasksById(
            prev.map((task) =>
              task.id === taskId
                ? {
                  ...task,
                  Status: nextStatus,
                  completedAt: completionTimestamp,
                }
                : task
            )
          )
        )
      );

      setTaskClicked((prev) =>
        prev?.id === taskId
          ? { ...prev, status: nextStatus, completedAt: completionTimestamp }
          : prev
      );
      recordActivity({
        action: "status_changed",
        taskId,
        taskTitle: taskForLog?.Title || taskForLog?.title || "Untitled task",
        status: nextStatus,
      });
      if (isCompleting && webhookUrl) {
        triggerWebhook({
          event: "task_completed",
          taskId,
          title: taskForLog?.Title || taskForLog?.title || "Untitled task",
          status: nextStatus,
        });
      }
      if (
        isCompleting &&
        taskForLog?.recurrence &&
        taskForLog.recurrence !== "none"
      ) {
        await scheduleNextRecurringTask(taskForLog);
      }
    } catch (err) {
      console.error("Error updating task status:", err);
      setStatusUpdateError("Unable to update status at the moment.");
    } finally {
      setStatusUpdateBusyId(null);
    }
  };

  const handleToggleStatusFilter = (statusValue) => {
    setActiveStatusFilters((prev) => {
      const next = new Set(prev);
      if (next.has(statusValue)) {
        next.delete(statusValue);
      } else {
        next.add(statusValue);
      }

      if (next.size === 0) {
        return new Set(statusValues);
      }

      return next;
    });
  };

  const handleResetFilters = () => {
    setActiveStatusFilters(new Set(statusValues));
    setSearchQuery("");
  };

  const handleJumpToCreate = () => {
    handleSelectSection("create");
  };

  const handleEnableReminders = async () => {
    if (!notificationsSupported) {
      setReminderStatus("Notifications are not supported in this browser.");
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      setReminderStatus(
        permission === "granted"
          ? "Reminders enabled."
          : "Notifications were blocked."
      );
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      setReminderStatus("Unable to update notification permissions.");
    }
  };

  const handleRequestReminder = (taskData) => {
    if (!notificationsSupported) {
      setReminderStatus("Notifications are not supported in this browser.");
      return;
    }
    if (!canScheduleReminders) {
      setReminderStatus("Enable reminders to schedule notifications.");
      return;
    }

    const taskTitle = taskData?.Title || taskData?.title || "Untitled task";
    const offsetMinutes =
      typeof taskData?.reminderOffsetMinutes === "number"
        ? taskData.reminderOffsetMinutes
        : newTaskReminderOffset || 30;
    const scheduleMs =
      offsetMinutes > 0 ? offsetMinutes * 60 * 1000 : REMINDER_DELAY_MS;

    const timeoutId = window.setTimeout(() => {
      try {
        new Notification("Task reminder", {
          body: `${taskTitle} is still pending.`,
        });
      } catch (error) {
        console.error("Error showing notification:", error);
      }
    }, REMINDER_DELAY_MS);

    reminderTimeoutsRef.current.push(timeoutId);
    setReminderStatus(
      `Reminder scheduled for "${taskTitle}" in ${
        Math.max(1, Math.round((scheduleMs || REMINDER_DELAY_MS) / 1000))
      } seconds.`
    );
  };

  const triggerWebhook = async (payload) => {
    if (!webhookUrl) {
      return;
    }

    try {
      await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source: "todo-app",
          timestamp: new Date().toISOString(),
          ...payload,
        }),
      });
    } catch (error) {
      console.error("Error calling webhook:", error);
    }
  };

  const scheduleNextRecurringTask = async (task) => {
    const nextDueDate = getNextDueDate(task.dueDate, task.recurrence);
    if (!nextDueDate) {
      return;
    }
    const docRef = doc(tasksCollectionRef);
    const payload = {
      Title: task.Title,
      Description: task.Description,
      Status: defaultStatus,
      priority: task.priority ?? "medium",
      recurrence: task.recurrence,
      reminderOffsetMinutes:
        typeof task.reminderOffsetMinutes === "number"
          ? task.reminderOffsetMinutes
          : 30,
      dueDate: new Date(nextDueDate),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      completedAt: null,
      userId,
    };

    const normalized = normalizeTask({
      ...payload,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      dueDate: nextDueDate,
      id: docRef.id,
    });

    markPendingEdit(docRef.id);
    await performOrQueueOperation(
      { type: "create", docId: docRef.id, data: payload },
      () => setDoc(docRef, payload)
    );

    setAllTasks((prev) =>
      sortTasksByCreatedAtAsc(dedupeTasksById([...prev, normalized]))
    );
    recordActivity({
      action: "created",
      taskId: docRef.id,
      taskTitle: task.Title,
      status: defaultStatus,
    });
  };

  const filteredTasks = useMemo(() => {
    return allTasks.filter((task) => {
      const status = task.Status || defaultStatus;
      const matchesStatus = activeStatusFilters.has(status);
      const lowerSearch = searchQuery.trim().toLowerCase();

      if (!matchesStatus) return false;

      if (!lowerSearch) return true;

      const titleMatch = task.Title.toLowerCase().includes(lowerSearch);
      const descriptionMatch = task.Description.toLowerCase().includes(lowerSearch);
      return titleMatch || descriptionMatch;
    });
  }, [allTasks, activeStatusFilters, searchQuery]);

  const sortedTasks = useMemo(
    () => sortTasksForMode(filteredTasks, sortMode),
    [filteredTasks, sortMode]
  );

  const timelineTasks = useMemo(
    () => sortTasksForMode(filteredTasks, "dueAsc"),
    [filteredTasks]
  );

  const completedTasks = useMemo(
    () =>
      allTasks.filter(
        (task) => (task.Status || defaultStatus) === "done"
      ).length,
    [allTasks]
  );

  const dueSoonCount = useMemo(() => {
    const now = Date.now();
    return allTasks.filter((task) => {
      if (!task?.dueDate) return false;
      const status = task.Status || defaultStatus;
      if (status === "done") return false;
      const dueMs = Number(task.dueDate);
      if (!Number.isFinite(dueMs)) return false;
      return dueMs >= now && dueMs - now <= DUE_SOON_THRESHOLD_MS;
    }).length;
  }, [allTasks]);

  const totalTasks = allTasks.length;
  const hasAnyTasks = totalTasks > 0;
  const pendingOperationsCount =
    (isSavingEdit ? 1 : 0) +
    (isCreatingTask ? 1 : 0) +
    (statusUpdateBusyId ? 1 : 0) +
    (deletingTaskId ? 1 : 0);
  const syncLabel =
    pendingOperationsCount > 0
      ? "Saving changes..."
      : isRemoteSyncing
      ? "Syncing..."
      : "Up to date";
  const syncStateClass =
    pendingOperationsCount > 0
      ? "syncIndicator--pending"
      : isRemoteSyncing
      ? "syncIndicator--syncing"
      : "syncIndicator--idle";
  const activeNavSection = activeSection === "details" ? "list" : activeSection;
  const getTabId = (sectionId) => `tab-${sectionId}`;
  const getPanelLabelId = (sectionId) =>
    sectionId === "details" ? getTabId("list") : getTabId(sectionId);
  const shouldHideSection = (sectionId) => {
    if (hiddenSections.has(sectionId)) {
      return true;
    }
    if (!isDesktopLayout && activeSection !== sectionId) {
      return true;
    }
    return false;
  };
  const inlineFiltersPanelId = "inline-filters-panel";
  const shouldShowInlineFilters =
    !isDesktopLayout || hiddenSections.has("create");

  return (
    <div className="todoViewport">
      <main className="todoApp">
        <div className="todoAppMeta" aria-live="polite" aria-label="App status">
          <div className={`syncIndicator ${syncStateClass}`} role="status">
            <span className="syncIndicatorDot" />
            <span>{syncLabel}</span>
          </div>
          {notificationsSupported && (
            canScheduleReminders ? (
              <span className="notificationStatus">Reminders enabled</span>
            ) : (
              <button
                type="button"
                className="notificationButton"
                onClick={handleEnableReminders}
              >
                Enable reminders
              </button>
            )
          )}
          <span className="todoAppVersion">Version {TODO_APP_VERSION}</span>
        </div>

        <div className="todoAppBody">
          <div className="sectionNavBar">
            <nav className="sectionNav" role="tablist" aria-label="Task sections">
              {SECTION_CONFIG.map((section) => {
                const isActive = activeNavSection === section.id;
                const buttonId = getTabId(section.id);
                const panelId =
                  section.id === "list" && activeSection === "details"
                    ? "section-details"
                    : `section-${section.id}`;

                return (
                  <button
                    type="button"
                    id={buttonId}
                    key={section.id}
                    className={`sectionNavButton${isActive ? " is-active" : ""}${
                      hiddenSections.has(section.id) ? " is-hidden" : ""
                    }`}
                    onClick={() => handleSelectSection(section.id)}
                    role="tab"
                    aria-selected={isActive}
                    aria-controls={panelId}
                  >
                    <span>{section.label}</span>
                    <small>{section.description}</small>
                  </button>
                );
              })}
            </nav>
            <div className="sectionNavExtras">
              <div className="viewToggle" role="group" aria-label="View mode">
                {VIEW_MODES.map((mode) => (
                  <button
                    type="button"
                    key={mode.value}
                    className={`viewToggleButton${
                      viewMode === mode.value ? " is-active" : ""
                    }`}
                    onClick={() => setViewMode(mode.value)}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
              <label className="sortSelect">
                <span>Sort</span>
                <select
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value)}
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="layoutControls">
                <button
                  type="button"
                  className="layoutToggleButton"
                  onClick={() => setIsDisplayMenuOpen((prev) => !prev)}
                  aria-expanded={isDisplayMenuOpen}
                  aria-controls="layout-menu"
                  disabled={!isDesktopLayout}
                >
                  {isDisplayMenuOpen ? "Close layout" : "Customize layout"}
                </button>
                {isDisplayMenuOpen && (
                  <div
                    id="layout-menu"
                    className="layoutMenu"
                    role="dialog"
                    aria-label="Toggle sections"
                  >
                    <p className="layoutMenuTitle">Visible sections</p>
                    <ul className="layoutMenuList">
                      {SECTION_CONFIG.filter((section) => section.id !== "list").map(
                        (section) => {
                          const isHidden = hiddenSections.has(section.id);
                          return (
                            <li key={section.id}>
                              <label className="layoutMenuOption">
                                <input
                                  type="checkbox"
                                  checked={!isHidden}
                                  onChange={() =>
                                    handleToggleSectionVisibility(section.id)
                                  }
                                />
                                <span>{section.label}</span>
                              </label>
                            </li>
                          );
                        }
                      )}
                    </ul>
                    {hiddenSections.size > 0 && (
                      <button
                        type="button"
                        className="layoutResetButton"
                        onClick={handleShowAllSections}
                      >
                        Show all sections
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

      <div className="sectionsGrid">

        <section
          id="section-create"
          className={`sectionCard${activeSection === "create" ? " is-active" : ""}`}
          data-section="create"
          role="tabpanel"
          aria-labelledby={getTabId("create")}
          hidden={shouldHideSection("create")}
          ref={createSectionRef}
        >
         
          <div className="accordionGroup">
            <div className="accordionItem">
              <button
                type="button"
                className="accordionHeader"
                onClick={() => setIsFiltersOpen((prev) => !prev)}
                aria-expanded={isFiltersOpen}
              >
                <span>Filters</span>
                <span>{isFiltersOpen ? "−" : "+"}</span>
              </button>
              {isFiltersOpen && (
                <div className="accordionPanel">
                  <TaskFilters
                    statusOptions={STATUS_OPTIONS}
                    activeStatuses={activeStatusFilters}
                    onToggleStatus={handleToggleStatusFilter}
                    onResetFilters={handleResetFilters}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    onRefresh={onRefresh}
                  />
                </div>
              )}
            </div>
            <div className="accordionItem">
              <button
                type="button"
                className="accordionHeader"
                onClick={() => setIsFormOpen((prev) => !prev)}
                aria-expanded={isFormOpen}
              >
                <span>New task</span>
                <span>{isFormOpen ? "−" : "+"}</span>
              </button>
              {isFormOpen && (
                <div className="accordionPanel">
                  <NewTask
                    title={title}
                    description={description}
                    status={newTaskStatus}
                    setTitle={setTitle}
                    setDescription={setDescription}
                    setStatus={setNewTaskStatus}
                    statusOptions={STATUS_OPTIONS}
                    handleSubmit={handleSubmit}
                    isSubmitting={isCreatingTask}
                    dueDate={newTaskDueDate}
                    setDueDate={setNewTaskDueDate}
                    priority={newTaskPriority}
                    setPriority={setNewTaskPriority}
                    priorityOptions={PRIORITY_OPTIONS}
                    recurrence={newTaskRecurrence}
                    setRecurrence={setNewTaskRecurrence}
                    recurrenceOptions={RECURRENCE_OPTIONS}
                    reminderOffsetMinutes={newTaskReminderOffset}
                    setReminderOffsetMinutes={setNewTaskReminderOffset}
                  />
                </div>
              )}
            </div>
          </div>
        </section>

        <section
          id="section-list"
          className={`sectionCard${activeSection === "list" ? " is-active" : ""}`}
          data-section="list"
          role="tabpanel"
          aria-labelledby={getTabId("list")}
          hidden={shouldHideSection("list")}
        >
          

          <div className="listStatsBar" role="status" aria-live="polite">
            <div className="listStat">
              <span className="listStatValue">{totalTasks}</span>
              <span className="listStatLabel">Total tasks</span>
            </div>
            <div className="listStat">
              <span className="listStatValue">{dueSoonCount}</span>
              <span className="listStatLabel">Due soon</span>
            </div>
            <div className="listStat">
              <span className="listStatValue">{completedTasks}</span>
              <span className="listStatLabel">Done</span>
            </div>
            <div className="inlineFiltersToggle">
                <button
                  type="button"
                  className="inlineFiltersToggleButton"
                  onClick={() => setIsInlineFiltersOpen((prev) => !prev)}
                  aria-expanded={isInlineFiltersOpen}
                  aria-controls={inlineFiltersPanelId}
                >
                  {isInlineFiltersOpen ? "Hide filters" : "Show filters"}
                </button>
              </div>
          </div>

          {shouldShowInlineFilters && (
            <div className="inlineFilters">
             
              {isInlineFiltersOpen && (
                <div
                  id={inlineFiltersPanelId}
                  className="cardScrollArea cardScrollArea--filtersInline"
                >
                  <TaskFilters
                    statusOptions={STATUS_OPTIONS}
                    activeStatuses={activeStatusFilters}
                    onToggleStatus={handleToggleStatusFilter}
                    onResetFilters={handleResetFilters}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    onRefresh={onRefresh}
                  />
                </div>
              )}
            </div>
          )}

          <div className="cardScrollArea">
            {viewMode === "list" && (
              <TasksList
                tasks={sortedTasks}
                handleDelete={handleDelete}
                handleClick={handleClick}
                onStatusChange={handleQuickStatusChange}
                statusOptions={STATUS_OPTIONS}
                selectedTaskId={taskClicked?.id}
                statusUpdateBusyId={statusUpdateBusyId}
                hasAnyTasks={hasAnyTasks}
                onResetFilters={handleResetFilters}
                onCreateTask={handleJumpToCreate}
                deletingTaskId={deletingTaskId}
                onRequestReminder={handleRequestReminder}
                canScheduleReminders={canScheduleReminders}
              />
            )}
            {viewMode === "kanban" && (
              <TaskKanban
                tasks={sortedTasks}
                statusOptions={STATUS_OPTIONS}
                handleDelete={handleDelete}
                handleClick={handleClick}
                onStatusChange={handleQuickStatusChange}
                selectedTaskId={taskClicked?.id}
                statusUpdateBusyId={statusUpdateBusyId}
                deletingTaskId={deletingTaskId}
                onRequestReminder={handleRequestReminder}
                canScheduleReminders={canScheduleReminders}
              />
            )}
            {viewMode === "timeline" && (
              <TaskTimeline
                tasks={timelineTasks}
                handleClick={handleClick}
                statusOptions={STATUS_OPTIONS}
              />
            )}
            {statusUpdateError && (
              <p className="errorText compact" role="alert">
                {statusUpdateError}
              </p>
            )}
            {reminderStatus && (
              <p className="hint reminderStatus" role="status">
                {reminderStatus}
              </p>
            )}
          </div>
        </section>

        <section
          id="section-details"
          className={`sectionCard${activeSection === "details" ? " is-active" : ""}`}
          data-section="details"
          role="tabpanel"
          aria-labelledby={getPanelLabelId("details")}
          hidden={shouldHideSection("details")}
        >
          <header className="cardHeader cardHeader--details">
            <div className="cardHeaderSide cardHeaderSide--left">
              {!isDesktopLayout && (
                <button
                  type="button"
                  className="ghostButton"
                  onClick={() => handleSelectSection("list")}
                >
                  Back to List
                </button>
              )}
            </div>
            <div className="cardHeaderSide cardHeaderSide--right">
              <button
                type="submit"
                form={TASK_EDIT_FORM_ID}
                disabled={!taskClicked?.id || isSavingEdit}
              >
                {isSavingEdit ? "Saving..." : "Save changes"}
              </button>
            </div>
          </header>
          <div className="cardScrollArea">
            <TaskEditForm
              formId={TASK_EDIT_FORM_ID}
              taskClicked={taskClicked}
              onFieldChange={handleTaskFieldChange}
              onSave={handleSaveTask}
                isSaving={isSavingEdit}
                errorMessage={editError}
                statusOptions={STATUS_OPTIONS}
                conflictMessage={conflictMessage}
                priorityOptions={PRIORITY_OPTIONS}
                recurrenceOptions={RECURRENCE_OPTIONS}
              />
            </div>
          </section>
        <section
          id="section-activity"
          className={`sectionCard${activeSection === "activity" ? " is-active" : ""}`}
          data-section="activity"
          role="tabpanel"
          aria-labelledby={getTabId("activity")}
          hidden={shouldHideSection("activity")}
        >
          <header className="cardHeader">
            <div>
              <h3>Recent activity</h3>
              <p className="hintInline">Stored locally, showing the latest 50 actions.</p>
            </div>
          </header>
          <div className="cardScrollArea">
            <ActivityLog entries={activityLog} statusOptions={STATUS_OPTIONS} />
          </div>
        </section>
        <section
          id="section-analytics"
          className={`sectionCard${activeSection === "analytics" ? " is-active" : ""}`}
          data-section="analytics"
          role="tabpanel"
          aria-labelledby={getTabId("analytics")}
          hidden={shouldHideSection("analytics")}
        >
          <header className="cardHeader">
            <h3>Insights</h3>
          </header>
          <div className="cardScrollArea">
            <AnalyticsPanel
              tasks={allTasks}
              statusOptions={STATUS_OPTIONS}
              webhookUrl={webhookUrl}
              onWebhookUrlChange={setWebhookUrl}
            />
          </div>
        </section>
        </div>

        {!isDesktopLayout && (
          <nav className="mobileDock" role="navigation" aria-label="Sections">
            {SECTION_CONFIG.map((section) => {
              const isActive = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  type="button"
                  className={`mobileDockButton${isActive ? " is-active" : ""}`}
                  onClick={() => handleSelectSection(section.id)}
                  aria-pressed={isActive}
                >
                  <span>{section.label}</span>
                </button>
              );
            })}
          </nav>
        )}
        </div>

        {!isDesktopLayout && (
          <button
            type="button"
            className="floatingAddButton"
            onClick={handleFloatingCreate}
            aria-label="Add a new task"
          >
            + Task
          </button>
        )}

      </main>
    </div>
  );
}

export { getCreatedAtValue, sortTasksByCreatedAtAsc, normalizeTask };

function sortTasksForMode(tasks = [], mode = "createdDesc") {
  const priorityWeight = {
    critical: 3,
    high: 2,
    medium: 1,
    low: 0,
  };
  const clone = [...tasks];
  switch (mode) {
    case "createdAsc":
      return clone.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    case "dueAsc":
      return clone.sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return (a.createdAt || 0) - (b.createdAt || 0);
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate - b.dueDate;
      });
    case "dueDesc":
      return clone.sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return (b.createdAt || 0) - (a.createdAt || 0);
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return b.dueDate - a.dueDate;
      });
    case "priorityDesc":
      return clone.sort(
        (a, b) =>
          (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0)
      );
    case "createdDesc":
    default:
      return clone.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }
}
