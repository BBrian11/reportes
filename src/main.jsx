import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./styles/dashboard.css";

// 👇 importa el Provider
import { OperadorAuthProvider } from "./context/OperadorAuthContext.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <OperadorAuthProvider>
      <App />
    </OperadorAuthProvider>
  </React.StrictMode>
);
