import React, { useState } from "react";
import NewTask from "./NewTask";
import TasksList from "./TasksList";
import TaskEditForm from "./TaskEditForm";
import "./ToDoApp.css"
export default function ToDoApp(props) {

  const [taskClicked, setTaskClicked] = useState({});

   const handleClick = ({title, description, id}) => {
    setTaskClicked({ title: title, description: description, id: id });
    console.log(taskClicked);
  }

  const [newTask, setNewTask] = useState({});
  const handleChange = ({ target }) => {
    const { name, value } = target;
    setNewTask((prev) => ({ ...prev, id: Date.now(), [name]: value }));
  };

  const [allTasks, setAllTasks] = useState(props.data.tasks || []);
  const handleSubmit = (event) => {
    event.preventDefault();
    if (!newTask.title) return;
    setAllTasks((prev) => [newTask, ...prev]);
    setNewTask({});
  };
  const handleDelete = (taskIdToRemove) => {
    setAllTasks((prev) => prev.filter((task) => task.id !== taskIdToRemove));
  };

  return (
    <main>
      <h2>Tasks</h2>
      <NewTask
        newTask={newTask}
        handleChange={handleChange}
        handleSubmit={handleSubmit}
      />
      <div className="todoPortal">
      <TasksList id="TasksList" allTasks={allTasks} handleDelete={handleDelete} handleClick={handleClick} />
      <TaskEditForm id="TaskEditForm" taskClicked={taskClicked}/>
      </div>
    </main>
  );
}
