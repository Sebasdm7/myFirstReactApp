import React from "react";
import { useState} from "react";

function GalleryItem(props) {
    let url = props.url;
    const [URL, setURL] = useState(url);
    
    const handleClick = (ele) => {
      setURL(ele.target.value);
      props.setImage(URL);
      props.setClick();
      console.log(`Click child ${ele.target.value}`);
    }
    
    return(
        <div className='rowImage' >
          
          <img
            className='smallImage'
            src={url}
            onClick={handleClick} value={url}
          />
        </div>
    );

}

export default GalleryItem;