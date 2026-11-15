import { NavLink } from "react-router-dom";
import { admin } from "./data.js";
export const Sidebar = () => {
  return (
    <div>
      {admin.map((item) => (
        <NavLink key={item.path} to={item.path}>
          {item.name}
        </NavLink>
      ))}
    </div>
  );
};

export default Sidebar;