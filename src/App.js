import logo from "./logo.svg";
import "./App.css";
import { Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";
import Table from "./NavItems/Table";
import Home from "./NavItems/Home";
import Contact from "./NavItems/Contact";
import Blog from "./NavItems/Blog";
import NavBar from "./NavBar";

function App() {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetch(
      "https://api.github.com/repos/Sebasdm7/sebasdm7.github.io/contents/WEBSITE/WebsitePhotos/img"
    )
      .then((response) => response.json())
      .then((json) => setData(json))
      .catch((error) => console.error(error));
  }, []);
  const [tasks, setTasks] = useState([
    { id: 1, title: "First Post", description: "This is the content of the first post." },
    { id: 2, title: "Second Post", description: "This is the content of the second post." },
    { id: 3, title: "Third Post", description: "This is the content of the third post." }
  ]);

  return (
    <div>
      <NavBar />
      <div className='pages'>
        <Routes>
          <Route exact path='/' element={<Home />}></Route>
          <Route path='/table' element={<Table data={{ data }} />}></Route>
          <Route path='/blog' element={<Blog data={{ tasks }} />}></Route>
          <Route path='/contact' element={<Contact />}></Route>
        </Routes>
      </div>
    </div>
  );
}

export default App;
