import React from "react";

export default function NewTask({ title, description, setTitle, setDescription, handleSubmit }) {
  return (
    <form onSubmit={handleSubmit}>
      <input
        name='Title'
        placeholder='New task'
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <textarea
        name='Description'
        placeholder='Details...'
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <button type='submit'>Add Task</button>


    </form>
  );
}
