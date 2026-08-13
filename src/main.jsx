import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
<React.StrictMode>
<App />
</React.StrictMode>
);

// Service worker нужен, чтобы приложение ставилось на домашний экран
// и могло принимать пуш-уведомления. В разработке не регистрируем.
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
