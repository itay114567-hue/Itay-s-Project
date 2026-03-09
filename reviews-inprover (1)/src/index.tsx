import React from "react";
import ReactDOM from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import App from "./App";

const rootElement = document.getElementById("root")!;
const root = ReactDOM.createRoot(rootElement);

root.render(
  <GoogleOAuthProvider clientId="569970007824-vtll6ndvbkeiilpt7c4700bqmehufn1g.apps.googleusercontent.com">
    {" "}
    <App />
  </GoogleOAuthProvider>
);
