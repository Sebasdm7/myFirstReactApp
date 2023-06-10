import React, { useState } from "react";
import MyTable from "../MyTable";
const Table = () => {

  const [tableXY, setTableXY] = useState({});
  

  const handleChange = ({target}) =>{
    const {name, value} = target;
    setTableXY((prev) => ({
      ...prev,
      [name]:value
    }));

  }

  

  return (
    <div>
      <div>
        <form id='tableForm' >
          <label className='tableLabel'> How many columns?</label>
          <span>
            <input
              className='tableInput'
              type='number'
              value={tableXY.nColumns}
              name='nColumns'
              placeholder='Enter the number of Columns'
              onChange={handleChange}
            ></input>
          </span>
          <label className='tableLabel'> How many rows?</label>
          <span>
            <input
              className='tableInput'
              type='number'
              value={tableXY.nRows}
              name='nRows'
              placeholder='Enter the number of Rows'
              onChange={handleChange}
            ></input>
          </span>
          
        </form>
      </div>
      <MyTable nColumns={tableXY.nColumns} nRows={tableXY.nRows} />
      
    </div>
  );
};
export default Table;
