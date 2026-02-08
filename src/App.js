import logo from "./logo.svg";
import "./App.css";
import { Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import Table from "./NavItems/Table";
import { db } from "./firebase";
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
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    const loadTasks = async () => {
      const snapshot = await getDocs(collection(db, "Tasks"));

      const tasksData = snapshot.docs.map(doc => ({
        id: doc.id,          // Firestore document ID
        ...doc.data()        // title, description, etc.
      }));

      setTasks(tasksData);
      console.log("Tasks loaded:", tasksData);
    };

    loadTasks();
  }, []);


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
