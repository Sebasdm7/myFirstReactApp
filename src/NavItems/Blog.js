import React from "react";
import ToDoApp from "../ToDo/ToDoApp";
function Blog(props) {
  return (
    <div>
      <ToDoApp data={props.data}/>

    </div>
  );
};
export default Blog;
