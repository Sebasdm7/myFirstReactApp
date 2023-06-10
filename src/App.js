import logo from "./logo.svg";
import "./App.css";
import Table from "./NavItems/Table";
import Home from "./NavItems/Home";
import Contact from "./NavItems/Contact";
import Blog from "./NavItems/Blog";
import NavBar from "./NavBar";

function App() {
  return (
    <div>
      <NavBar />
      <div className='pages'>
        <Routes>
          <Route exact path='/' element={<Home />} />
          <Route path='/table' element={<Table />} />
          <Route path='/blog' element={<Blog />} />
          <Route path='/contact' element={<Contact />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
