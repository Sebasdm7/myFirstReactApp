import React from "react";
import ToDoApp from "../ToDo/ToDoApp";

function Tasks({ data, onRefresh, userId, isSyncing }) {
  return (
    <section className="tasksRoute">
      <ToDoApp data={data} onRefresh={onRefresh} userId={userId} isSyncing={isSyncing} />
    </section>
  );
}

export default Tasks;
