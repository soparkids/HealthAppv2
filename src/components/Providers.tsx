"use client";

import { SessionProvider } from "next-auth/react";
import OrgProvider from "@/components/providers/OrgProvider";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <OrgProvider>{children}</OrgProvider>
    </SessionProvider>
  );
}
