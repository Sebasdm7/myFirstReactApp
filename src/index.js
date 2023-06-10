import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import MyTable from "./MyTable";

import Table from "./NavItems/Table";
import Home from "./NavItems/Home";
import Contact from "./NavItems/Contact";
import Blog from "./NavItems/Blog";
import NavBar from "./NavBar";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <h1>My First React App</h1>

    <Router>
      <NavBar />

      <div className='pages'>
        <Routes>
          <Route path='/' element={<Home />} />
          <Route path='/table' element={<Table />} />
          <Route path='/blog' element={<Blog />} />
          <Route path='/contact' element={<Contact />} />
        </Routes>
      </div>
    </Router>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
