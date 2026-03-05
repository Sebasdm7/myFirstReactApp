import "./App.css";
import { Routes, Route } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { collection, getDocs, onSnapshot, query, where } from "firebase/firestore";
import Table from "./NavItems/Table";
import { db } from "./firebase";
import Home from "./NavItems/Home";
import Contact from "./NavItems/Contact";
import Blog from "./NavItems/Blog";
import Tasks from "./NavItems/Tasks";
import NavBar from "./NavBar";
import { resolveUserId } from "./ToDo/userIdentity";

const getCreatedAtValue = (task = {}) => {
  const createdAt = task.createdAt;
  if (!createdAt) return 0;

  if (typeof createdAt.toMillis === "function") {
    return createdAt.toMillis();
  }

  if (typeof createdAt === "number") {
    return createdAt;
  }

  if (createdAt.seconds) {
    const nanos = createdAt.nanoseconds ?? 0;
    return createdAt.seconds * 1000 + nanos / 1e6;
  }

  if (createdAt instanceof Date) {
    return createdAt.getTime();
  }

  const parsed = Date.parse(createdAt);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const sortTasksByCreatedAtAsc = (tasks = []) =>
  [...tasks].sort((a, b) => getCreatedAtValue(a) - getCreatedAtValue(b));

const getTasksCacheKey = (userId) => `todoTasks:${userId || "anonymous"}`;
const dedupeTasksById = (tasks = []) => {
  const map = new Map();
  tasks.forEach((task) => {
    if (!task) return;
    const key = task.id ?? `${task.Title ?? "task"}-${task.createdAt ?? Date.now()}`;
    map.set(key, { ...map.get(key), ...task });
  });
  return Array.from(map.values());
};

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
  const [userId] = useState(() => resolveUserId());
  const [isSyncing, setIsSyncing] = useState(false);
  const legacyTasksLoadedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const cacheKey = getTasksCacheKey(userId);
    try {
      const cached = window.localStorage?.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          setTasks(dedupeTasksById(parsed));
        }
      }
    } catch (error) {
      console.error("Error reading cached tasks:", error);
    }
  }, [userId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const cacheKey = getTasksCacheKey(userId);
    try {
      const uniqueTasks = dedupeTasksById(tasks);
      window.localStorage?.setItem(cacheKey, JSON.stringify(uniqueTasks));
    } catch (error) {
      console.error("Error caching tasks:", error);
    }
  }, [tasks, userId]);

  useEffect(() => {
    if (!userId) {
      return undefined;
    }

    legacyTasksLoadedRef.current = false;
    const baseCollection = collection(db, "Tasks");
    const scopedQuery = query(baseCollection, where("userId", "==", userId));
    setIsSyncing(true);

    const unsubscribe = onSnapshot(
      scopedQuery,
      async (snapshot) => {
        setIsSyncing(false);
        let tasksData = snapshot.docs.map((docItem) => ({
          id: docItem.id,
          ...docItem.data(),
        }));

        if (!tasksData.length && !legacyTasksLoadedRef.current) {
          legacyTasksLoadedRef.current = true;
          try {
            const legacySnapshot = await getDocs(baseCollection);
            tasksData = legacySnapshot.docs
              .map((docItem) => ({
                id: docItem.id,
                ...docItem.data(),
              }))
              .filter((task) => !task.userId || task.userId === userId);
          } catch (legacyError) {
            console.error("Error loading legacy tasks:", legacyError);
          }
        }

        const uniqueTasks = dedupeTasksById(tasksData);
        setTasks(sortTasksByCreatedAtAsc(uniqueTasks));
      },
      (error) => {
        setIsSyncing(false);
        console.error("Error loading tasks:", error);
        setTasks([]);
      }
    );

    return () => unsubscribe();
  }, [refreshIndex, userId]);

  return (
    <div className="appShell">
      <header className="appHeader">
        <NavBar />
      </header>
      <div className="pages">
        <Routes>
          <Route exact path='/' element={<Home />}></Route>
          <Route path='/table' element={<Table data={{ data }} />}></Route>
          <Route path='/blog' element={<Blog />}></Route>
          <Route
            path='/tasks'
            element={
              <Tasks
                data={{ tasks }}
                onRefresh={triggerRefresh}
                userId={userId}
                isSyncing={isSyncing}
              />
            }
          ></Route>
          <Route path='/contact' element={<Contact />}></Route>
        </Routes>
      </div>
    </div>
  );
}

export default App;
