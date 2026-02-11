import React, { useState } from "react";
import NewTask from "./NewTask";
import TasksList from "./TasksList";
import TaskEditForm from "./TaskEditForm";
import { useEffect } from "react";
import { collection, addDoc, serverTimestamp, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";


import "./ToDoApp.css"

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

export default function ToDoApp(props) {

  const [taskClicked, setTaskClicked] = useState({});

  const handleClick = ({ title, description, id }) => {
    setTaskClicked({ title: title, description: description, id: id });
    console.log(taskClicked);
  }

  const handleTaskFieldChange = (event) => {
    const { name, value } = event.target;
    setTaskClicked((prev) => ({ ...prev, [name]: value }));
  }

  const handleSaveTask = async () => {
    if (!taskClicked?.id) {
      setEditError("Pick a task to edit.");
      return;
    }

    const updatedTitle = taskClicked.title?.trim();
    if (!updatedTitle) {
      setEditError("Title cannot be empty.");
      return;
    }

    setEditError("");
    setIsSavingEdit(true);

    try {
      await updateDoc(doc(db, "Tasks", taskClicked.id), {
        Title: updatedTitle,
        Description: taskClicked.description || "",
      });

      setAllTasks((prev) =>
        prev.map((task) =>
          task.id === taskClicked.id
            ? { ...task, Title: updatedTitle, Description: taskClicked.description || "" }
            : task
        )
      );
    } catch (err) {
      console.error("Error updating task:", err);
      setEditError("Unable to save changes. Try again.");
    } finally {
      setIsSavingEdit(false);
    }
  }

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [allTasks, setAllTasks] = useState([]);
  const [summary, setSummary] = useState("");
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryError, setSummaryError] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");

  useEffect(() => {
    if (props.data.tasks) {
      setAllTasks(sortTasksByCreatedAtAsc(props.data.tasks));
    }
  }, [props.data.tasks]);

  console.log("ToDoApp received tasks:", props.data.tasks);
  console.log("Initial tasks:", allTasks);
  const openAiKey = process.env.REACT_APP_OPENAI_API_KEY;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title.trim()) return;

    try {
      const docRef = await addDoc(collection(db, "Tasks"), {
        Title: title,
        Description: description,
        createdAt: serverTimestamp()
      });

      setAllTasks((prev) =>
        sortTasksByCreatedAtAsc([
          ...prev,
          {
            Title: title,
            Description: description,
            id: docRef.id,
            createdAt: Date.now()
          }
        ])
      );

      // clear form
      setTitle("");
      setDescription("");
    } catch (err) {
      console.error("Error adding task:", err);
    }
  };

  const handleDelete = async (taskIdToRemove) => {
    try {
      await deleteDoc(doc(db, "Tasks", taskIdToRemove));
      setAllTasks((prev) => prev.filter((task) => task.id !== taskIdToRemove));
    } catch (err) {
      console.error("Error deleting task:", err);
    }
  };

  const handleSummarizeTasks = async () => {
    if (!allTasks.length) {
      setSummaryError("Add at least one task before requesting a summary.");
      return;
    }

    if (!openAiKey) {
      setSummaryError("Set REACT_APP_OPENAI_API_KEY before using the ChatGPT summary.");
      return;
    }

    setIsSummarizing(true);
    setSummaryError("");

    try {
      const tasksPrompt = allTasks
        .map((task, index) => {
          const title = task.Title || "Untitled task";
          const description = task.Description || "No description provided.";
          return `${index + 1}. ${title} — ${description}`;
        })
        .join("\n");

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openAiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "You summarize to-do lists into concise daily briefings."
            },
            {
              role: "user",
              content: `Summarize the following tasks and highlight urgent items:\n${tasksPrompt}`
            }
          ],
          temperature: 0.3
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI error: ${errorText}`);
      }

      const data = await response.json();
      const summaryText = data?.choices?.[0]?.message?.content?.trim();

      if (!summaryText) {
        throw new Error("ChatGPT did not return any content.");
      }

      setSummary(summaryText);
    } catch (err) {
      console.error("Error summarizing tasks:", err);
      setSummaryError(err.message || "Unable to summarize tasks right now.");
    } finally {
      setIsSummarizing(false);
    }
  };

  return (
    <main>
      <h2>Tasks</h2>
      <NewTask
        title={title}
        description={description}
        setTitle={setTitle}
        setDescription={setDescription}
        handleSubmit={handleSubmit}
      />
      <div className="todoPortal">
        <TasksList id="TasksList" allTasks={allTasks} handleDelete={handleDelete} handleClick={handleClick} />
        <TaskEditForm
          id="TaskEditForm"
          taskClicked={taskClicked}
          onFieldChange={handleTaskFieldChange}
          onSave={handleSaveTask}
          isSaving={isSavingEdit}
          errorMessage={editError}
        />
      </div>
      <section className="tasksSummarySection">
        <button type="button" onClick={handleSummarizeTasks} disabled={isSummarizing}>
          {isSummarizing ? "Summarizing..." : "Summarize Tasks with ChatGPT"}
        </button>
        {summaryError && <p className="errorText">{summaryError}</p>}
        {summary && (
          <article className="summaryCard">
            <h3>ChatGPT Summary</h3>
            <p>{summary}</p>
          </article>
        )}
      </section>
    </main>
  );
}
