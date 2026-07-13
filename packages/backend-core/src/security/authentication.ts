import type { RequestActor } from "./request-context.js";

export type AuthenticationCredential =
  | { readonly kind: "bearer"; readonly token: string }
  | { readonly kind: "session"; readonly sessionId: string };

export type AuthenticationResult =
  | { readonly authenticated: true; readonly actor: RequestActor }
  | { readonly authenticated: false; readonly reason: "invalid" | "expired" };

export interface AuthenticationPort {
  authenticate(
    credential: AuthenticationCredential,
    signal?: AbortSignal
  ): Promise<AuthenticationResult>;
}
