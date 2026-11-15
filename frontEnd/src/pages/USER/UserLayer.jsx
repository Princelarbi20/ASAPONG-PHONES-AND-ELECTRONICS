import React from "react";
import { Outlet } from "react-router-dom";
import { NavBar } from "../../component/NavBar.jsx";
export const UserLayer = () => {
  return (
    <div>
      <NavBar />
      <Outlet />
    </div>
  );
};

export default UserLayer;