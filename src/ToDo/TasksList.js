import React from "react";
import { useState, useEffect } from "react";

export default function TasksList({ allTasks, handleDelete, handleClick }) {

  console.log("Rendering TasksList with tasks:", allTasks);

  return (
    <ul className="TaksListITems">
      {allTasks.map(({ Title, Description, id }) => (
        <li className="toDoListItem" key={id} onClick={() => handleClick({title: Title, description: Description, id})}>
          <div className="listItem" >
            <div className="itemHeader">
              <h4>{Title}</h4>
              <button onClick={(e) => {
                e.stopPropagation();
                handleDelete(id);
              }}>X</button>
            </div>
            {!Description ? null : <p className="itemDescription">{Description}</p>}
          </div>
        </li>

      ))}
    </ul>
  );
}
