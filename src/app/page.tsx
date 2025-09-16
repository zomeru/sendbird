"use client";

import { SessionProvider } from "next-auth/react";
import SendbirdProvider from "./components/SendbirdProvider";
import MessagingApp from "./components/MessagingApp";

export default function Home() {
  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <SessionProvider>
        <SendbirdProvider>
          <MessagingApp />
        </SendbirdProvider>
      </SessionProvider>
    </div>
  );
}
