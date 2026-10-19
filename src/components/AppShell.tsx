"use client";

import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { DataCacheProvider } from "@/context/DataCacheContext";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <DataCacheProvider>
      <div className="flex min-h-screen bg-surface">
        <Sidebar />
        <div className="flex min-h-screen flex-1 flex-col overflow-hidden">
          {children}
        </div>
      </div>
    </DataCacheProvider>
  );
}
