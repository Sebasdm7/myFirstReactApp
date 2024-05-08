import React from "react";
import GalleryItem from "../GalleryItem";
import { useState, useEffect } from "react";
import { type } from "@testing-library/user-event/dist/type";
import "../ImagesStyle.css";

function GalleryImages(props) {
  const [click, setClick] = useState(false);
  const [bigImage, setImage] = useState("");
  const data = props.data.data;
  const handleClick = () => {
    setClick(!click);
    console.log(bigImage);
    console.log(data);
  }



 
  return (
    <div>
      <div className={click ? "fullScreenImageBackground-active" : "fullScreenImageBackground"}>
        <div className='fullScreenImage' onClick={handleClick}>
          <img
            src={bigImage}
          />
        
        </div>
      </div>
    <div className="rowImages">
      {data.map((image) => (
        <GalleryItem key={image.name} url={image.download_url} setClick={handleClick} setImage={setImage}/>
      ))}


    </div>
    </div>
  );
}

export default GalleryImages;
