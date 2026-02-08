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
  const [refreshIndex, setRefreshIndex] = useState(0);
  const triggerRefresh = () => setRefreshIndex((prev) => prev + 1);

  useEffect(() => {
    const fetchImages = async () => {
      try {
        const response = await fetch(
          "https://api.github.com/repos/Sebasdm7/sebasdm7.github.io/contents/WEBSITE/WebsitePhotos/img"
        );

        if (!response.ok) {
          throw new Error(`GitHub API responded with ${response.status}`);
        }

        const json = await response.json();

        if (!Array.isArray(json)) {
          throw new Error("Unexpected payload when fetching gallery images");
        }

        setData(json);
      } catch (error) {
        console.error("Error loading gallery images:", error);
        setData([]);
      }
    };

    fetchImages();
  }, [refreshIndex]);
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    const loadTasks = async () => {
      try {
        const snapshot = await getDocs(collection(db, "Tasks"));

        const tasksData = snapshot.docs.map(doc => ({
          id: doc.id,          // Firestore document ID
          ...doc.data()        // title, description, etc.
        }));

        setTasks(tasksData);
        console.log("Tasks loaded:", tasksData);
      } catch (error) {
        console.error("Error loading tasks:", error);
        setTasks([]);
      }
    };

    loadTasks();
  }, [refreshIndex]);

  return (
    <div>
      <NavBar />
      <div className="refreshBar">
        <button type="button" onClick={triggerRefresh}>Refresh</button>
      </div>
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
