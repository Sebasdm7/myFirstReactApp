import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import "./NavBar.css";
import MenuLogo from "./imgs/honey.png";

function NavBar() {
  const [click, setClick] = useState(false);

  const handleClick = () => setClick(!click);
  return (
    <nav className='navbar'>
      <div className='nav-container'>
        <NavLink end to='/' className='nav-logo'>
          Webiste Name
          <i className='fas fa-code'></i>
        </NavLink>

        <ul className={click ? "nav-menu active" : "nav-menu"}>
          <li className='nav-item'>
            <NavLink
              end
              to='/'
              className={({ isActive }) =>
                `nav-links${isActive ? " active" : ""}`
              }
              onClick={handleClick}
            >
              Home
            </NavLink>
          </li>
          <li className='nav-item'>
            <NavLink
              to='/table'
              className={({ isActive }) =>
                `nav-links${isActive ? " active" : ""}`
              }
              onClick={handleClick}
            >
              Table
            </NavLink>
          </li>
          <li className='nav-item'>
            <NavLink
              to='/blog'
              className={({ isActive }) =>
                `nav-links${isActive ? " active" : ""}`
              }
              onClick={handleClick}
            >
              Blog
            </NavLink>
          </li>
          <li className='nav-item'>
            <NavLink
              to='/tasks'
              className={({ isActive }) =>
                `nav-links${isActive ? " active" : ""}`
              }
              onClick={handleClick}
            >
              To-Do
            </NavLink>
          </li>
          <li className='nav-item'>
            <NavLink
              to='/contact'
              className={({ isActive }) =>
                `nav-links${isActive ? " active" : ""}`
              }
              onClick={handleClick}
            >
              Contact Us
            </NavLink>
          </li>
        </ul>
        <div className='nav-icon' onClick={handleClick}>
          
          <img
            src={MenuLogo}
            alt='img logo'
          />
        </div>
      </div>
    </nav>
  );
}

export default NavBar;
