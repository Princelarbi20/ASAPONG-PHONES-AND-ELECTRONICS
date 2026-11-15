import React from 'react';
import Logo from "./Logo";
import { Link } from "react-router-dom";
import { FaFacebookMessenger, FaInstagram, FaTwitter, FaLinkedin } from "react-icons/fa";

export const Footer = () => {

  const MailIcon = () => (
    <svg width="16" height="16" fill="none" className="shrink-0">
      <path d="M14.6654 4.66699L8.67136 8.48499C8.46796 8.60313 8.23692 8.66536 8.0017 8.66536C7.76647 8.66536 7.53544 8.60313 7.33203 8.48499L1.33203 4.66699" stroke="#90A1B9" strokeWidth="1.5"/>
    </svg>
  );

  const PhoneIcon = () => (
    <svg width="16" height="16" fill="none" className="shrink-0">
      <path d="M9.22003 11.045C7.36831 10.1362 5.86982 8.63959 4.9587 6.78901" stroke="#90A1B9" strokeWidth="1.5"/>
    </svg>
  );

  const FacebookIcon = () => <FaFacebookMessenger className="w-5 h-5 text-slate-600 group-hover:text-green-600 transition" />;
  const InstagramIcon = () => <FaInstagram className="w-5 h-5 text-slate-600 group-hover:text-green-600 transition" />;
  const TwitterIcon = () => <FaTwitter className="w-5 h-5 text-slate-600 group-hover:text-green-600 transition" />;
  const LinkedinIcon = () => <FaLinkedin className="w-5 h-5 text-slate-600 group-hover:text-green-600 transition" />;

  const linkSections = [
   
    {
      title: "WEBSITE",
      links: [
        { text: "Home", path: "/" },
        { text: "Privacy Policy", path: "/privacy" },
        { text: "Create Your Store", path: "/register-store" },
      ]
    },
    {
      title: "CONTACT",
      links: [
        { text: "+91 9872169632", path: "tel:+919872169632", icon: PhoneIcon },
        { text: "princelar20@gmail.com", path: "mailto:princelar20@gmail.com", icon: MailIcon },

      ]
    }
  ];

  const socialIcons = [
    { icon: FacebookIcon, link: "https://www.facebook.com" },
    { icon: InstagramIcon, link: "https://www.instagram.com" },
    { icon: TwitterIcon, link: "https://twitter.com" },
    { icon: LinkedinIcon, link: "https://www.linkedin.com" },
  ];

  return (
    <footer className="px-4 sm:flex sm:px-6 md:px-8 bg-red-300 border-t border-slate-100 md:justify-center md:text-center md:items-center">
      <div className="max-w-7xl mx-auto flex sm:justify-center sm:text-center sm">
        
        {/* MAIN LAYOUT CONTAINER */}
        <div className="flex flex-co2 lg:flex-row justify-between gap-10 py-12 border-b border-slate-200 text-slate-500 ">

          {/* LEFT SECTION (Brand & Description) */}
          <div className="flex flex-col items-center text-center lg:items-start lg:text-left space-y-5 lg:max-w-sm">
            
            {/* FIXED: Swapped out the outer <Link to="/"> for a clean structural block wrapper to prevent duplicate <a> compilation */}
            <div className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-700">
               <Logo />
            </div>

           

            {/* Social Media */}
            <div className="flex gap-3 pt-2">
              {socialIcons.map((item, i) => (
                <a
                  key={i}
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-center w-10 h-10 bg-slate-50 hover:bg-green-50 border border-slate-200 rounded-full shadow-sm hover:shadow transition-all duration-200"
                >
                  <item.icon />
                </a>
              ))}
            </div>

             <div className="py-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs sm:text-sm text-red-600">
               <p className='text-center flex'>© 2026 StarTech. All Rights Reserved.</p>
                 <div className="flex gap-4">
            <Link to="/" className="hover:underline">Terms</Link>
            <Link to="/" className="hover:underline">Privacy</Link>
          </div>
          </div>
          </div>

          {/* RIGHT SECTION (Navigation Grid) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-6 w-full lg:max-w-3xl pt-4 lg:pt-0">
            {linkSections.map((section, index) => (
              <div key={index} className="flex flex-col items-center text-center sm:items-start sm:text-left">
                <h3 className="text-xs font-bold uppercase tracking-wider text-red-600 mb-4">
                  {section.title}
                </h3>

                <ul className="space-y-3 text-sm">
                  {section.links.map((link, i) => (
                    <li key={i}>
                      {link.external || link.path.startsWith('mailto:') || link.path.startsWith('tel:') ? (
                        <a 
                          href={link.path}
                          target={link.external ? "_blank" : undefined}
                          rel={link.external ? "noopener noreferrer" : undefined}
                          className="flex items-center justify-center sm:justify-start gap-2.5 hover:text-green-600 transition group"
                        >
                          {link.icon && <link.icon />}
                          <span className="group-hover:underline break-all sm:break-normal">{link.text}</span>
                        </a>
                      ) : (
                        <Link 
                          to={link.path} 
                          className="flex items-center justify-center sm:justify-start gap-2.5 hover:text-green-600 transition"
                        >
                          {link.icon && <link.icon />}
                          <span className="hover:underline">{link.text}</span>
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

        </div>

        {/* BOTTOM COPYRIGHT */}
       

      </div>
    </footer>
  );
};

export default Footer;
