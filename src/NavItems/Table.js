import React from "react";
import MyTable from "../MyTable";
const Table = () => {
  return (
    <div>
      <MyTable nColumns={100} nRows={65} />
      <MyTable nColumns={15} nRows={90} />
      <MyTable nColumns={100} nRows={5} />
    </div>
  );
};
export default Table;
