import React from "react";
import { useState } from "react";
import "../Contact.css";

function Contact() {
  const password = "test";
  const [authorized, setAuthorized] = useState(false);



  function handleSubmit(e) {
    const enteredPassword = e.target.querySelector(
      'input[type="password"]'
    ).value;


    const auth = enteredPassword == password;
    setAuthorized(auth);
  }






  let login = (
    <form action='#' onSubmit={handleSubmit}>
      <input type='text' placeholder='Nombre' />
      <input type='password' placeholder='Password' />
      <input type='submit' />
    </form>
  );




  let contactInfo = (
    <ul>
      <li>client@example.com</li>
      <li>555.555.5555</li>
    </ul>
  );



  return (
    <div id='authorization'>
      {authorized ? <h1>Contact</h1> : <h1>Enter the Password</h1>}
      {authorized ? contactInfo : login}
    </div>
  );
}

export default Contact;
