import React from "react";
import { useState} from "react";

function GalleryItem(props) {
    let url = props.url;
    const [URL, setURL] = useState(url);
    
    const handleClick = (ele) => {
      setURL(ele.target.value);
      props.setImage(URL);
      props.setClick();
      
      
    }
    
    return(
        <div className='rowImage' onClick={handleClick} value={url}>
          
          <img
            className='smallImage'
            src={url}
          />
        </div>
    );

}

export default GalleryItem;