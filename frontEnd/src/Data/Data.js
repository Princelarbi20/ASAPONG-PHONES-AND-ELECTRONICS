export const registerFormController = [
  {
    name: "userName",
    label: "User Name",
    placeholder: "Enter user name",
    componentType: "input",
    type: "text"
  },
  {
    name: "email",
    label: "Email",
    placeholder: "Enter your email",
    componentType: "input",
    type: "email"
  },
  {
    name: "password",
    label: "Password",
    placeholder: "Enter your password",
    componentType: "input",
    type: "password"
  },
  {
    // FIXED: Changed from "Number" to "phone" to match your state and DB schema keys
    name: "phone", 
    label: "Phone Number",
    placeholder: "Enter phone number",
    componentType: "input",
    type: "text" // Changing to text allows symbols like country prefixes (+233) smoothly
  },
]

export const loginFormController = [
  {
    name: "email",
    label: "Email",
    placeholder: "Enter your email",
    componentType: "input",
    type: "email"
  },
  {
    name: "password",
    label: "Password",
    placeholder: "Enter your password",
    componentType: "input",
    type: "password"
  },
]

export const AdvertData = [
  { id: 1, name: "📱 Smartphones" },
  { id: 2, name: "💻 Laptops" },
  { id: 3, name: "🖥️ Desktops" },
  { id: 4, name: "🎧 Headphones" },
  { id: 5, name: "📷 Cameras" },
  { id: 6, name: "⌚ Smartwatches" },
  { id: 7, name: "🎮 Gaming" },
  { id: 8, name: "🔋 Accessories" },
  { id: 10, name: "📲 Tablets" },
]