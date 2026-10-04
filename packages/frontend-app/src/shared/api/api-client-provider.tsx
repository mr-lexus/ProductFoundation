import { createContext, useContext } from "react";
import type { ApiClient } from "./create-api-client";

const ApiClientContext = createContext<ApiClient | undefined>(undefined);
export const ApiClientProvider = ApiClientContext.Provider;

export function useApiClient(): ApiClient {
  const client = useContext(ApiClientContext);
  if (client === undefined) {
    throw new Error("The frontend API client must be provided at bootstrap.");
  }
  return client;
}
