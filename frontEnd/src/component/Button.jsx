import { Link } from "react-router-dom";

export const Button = ({ children, to, className = "",...props }) => {
  return (
    <Link
      to={to}
      className={`
         rounded-lg font-semibold
        transition-all duration-300 ease-in-out
        hover:scale-99 hover:shadow-lg hover:opacity-90
        active:scale-99
        ${className}
       
      `}
       {...props}
    >
      {children}
    </Link>
  );
};