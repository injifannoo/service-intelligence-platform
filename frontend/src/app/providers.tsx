"use client";

import React, { createContext, useContext, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const QueryClientContext = createContext<QueryClient | undefined>(undefined);

export const useQueryClient = () => {
  const queryClient = useContext(QueryClientContext);
  if (!queryClient) {
    throw new Error("Query client not found");
  }
  return queryClient;
};

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
