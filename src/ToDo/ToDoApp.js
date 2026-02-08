import React, { useState } from "react";
import NewTask from "./NewTask";
import TasksList from "./TasksList";
import TaskEditForm from "./TaskEditForm";
import { useEffect } from "react";
import { collection, addDoc, serverTimestamp, deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase";


import "./ToDoApp.css"
export default function ToDoApp(props) {

  const [taskClicked, setTaskClicked] = useState({});

  const handleClick = ({ title, description, id }) => {
    setTaskClicked({ title: title, description: description, id: id });
    console.log(taskClicked);
  }

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [allTasks, setAllTasks] = useState([]);

  useEffect(() => {
    if (props.data.tasks) {
      setAllTasks(props.data.tasks);
    }
  }, [props.data.tasks]);

  console.log("ToDoApp received tasks:", props.data.tasks);
  console.log("Initial tasks:", allTasks);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title.trim()) return;

    try {
      const docRef = await addDoc(collection(db, "Tasks"), {
        Title: title,
        Description: description,
        createdAt: serverTimestamp()
      });

      setAllTasks((prev) => [
        ...prev,
        {
          Title: title,
          Description: description,
          id: docRef.id
        }
      ]);

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
        <TaskEditForm id="TaskEditForm" taskClicked={taskClicked} />
      </div>
    </main>
  );
}
