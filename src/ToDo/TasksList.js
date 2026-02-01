import React from "react";
import { useState, useEffect } from "react";

export default function TasksList({ allTasks, handleDelete, handleClick }) {

  return (
    <ul className="TaksListITems">
      {allTasks.map(({ title, description, id }) => (
        <li className="toDoListItem" key={id} onClick={() => handleClick({title, description, id})}>
          <div className="listItem" >
            <div className="itemHeader">
              <h4>{title}</h4>
              <button onClick={() => handleDelete(id)}>X</button>
            </div>
            {!description ? null : <p className="itemDescription">{description}</p>}
          </div>
        </li>

      ))}
    </ul>
  );
}
