import { useAuth } from "@clerk/clerk-expo";
import { useEffect } from "react";
import { setClerkTokenGetter } from "../api/authToken";

/** Registers Clerk session JWT getter for API calls (must render inside SignedIn + ClerkProvider). */
export function ClerkTokenBridge() {
  const { getToken } = useAuth();

  useEffect(() => {
    setClerkTokenGetter(() => getToken());
    return () => setClerkTokenGetter(null);
  }, [getToken]);

  return null;
}
