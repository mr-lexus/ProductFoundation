type Environment = Record<string, string | undefined>;

export function exactHttpOrigin(value: string | undefined, name: string): URL {
  if (!value) throw new Error(`${name} is required.`);
  const url = new URL(value);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.origin !== value ||
    url.username ||
    url.password ||
    url.hostname.includes("*")
  ) {
    throw new Error(
      `${name} must be an exact HTTP(S) origin without credentials, wildcards, paths, query or fragment.`
    );
  }
  return url;
}

export function nativeApiOrigin(
  environment: Environment,
  platform: "mobile" | "desktop",
  development: boolean
): string {
  const url = exactHttpOrigin(environment.VITE_API_URL, "VITE_API_URL");
  const ci = Boolean(environment.CI && environment.CI !== "false");
  const insecure = environment.NATIVE_ALLOW_INSECURE_API === "true";
  if (insecure && (!development || ci))
    throw new Error("NATIVE_ALLOW_INSECURE_API is local-development-only.");
  if (url.protocol !== "https:" && (ci || !development || (platform === "mobile" && !insecure))) {
    throw new Error(
      "Native production and CI builds require HTTPS; mobile development HTTP requires NATIVE_ALLOW_INSECURE_API=true."
    );
  }
  return url.origin;
}

export function capacitorServer(environment: Environment) {
  const defaults = { hostname: "localhost", iosScheme: "capacitor", androidScheme: "https" };
  const development = environment.NODE_ENV === "development";
  const insecureApi = environment.NATIVE_ALLOW_INSECURE_API === "true";
  // The explicit local HTTP opt-in must reach Android's network configuration,
  // including development builds that load packaged assets rather than live reload.
  const cleartextApi =
    insecureApi && nativeApiOrigin(environment, "mobile", development).startsWith("http:");
  const enabled = environment.CAP_LIVE_RELOAD === "true";
  const value = environment.CAP_SERVER_URL;
  if (!enabled && value === undefined)
    return { ...defaults, ...(cleartextApi ? { cleartext: true } : {}) };
  if (!enabled || value === undefined)
    throw new Error("CAP_LIVE_RELOAD=true and CAP_SERVER_URL must be supplied together.");
  if (environment.NODE_ENV !== "development" || (environment.CI && environment.CI !== "false")) {
    throw new Error("Capacitor live reload is local-development-only; use cap:sync:dev.");
  }
  const url = exactHttpOrigin(value, "CAP_SERVER_URL");
  return {
    ...defaults,
    url: url.origin,
    cleartext: cleartextApi || url.protocol === "http:",
    allowNavigation: [url.hostname]
  };
}

export function tauriSecurity(apiOrigin: string, development: boolean) {
  exactHttpOrigin(apiOrigin, "VITE_API_URL");
  const csp = [
    "default-src 'self'",
    `connect-src 'self' ${apiOrigin} ipc: http://ipc.localhost`,
    "img-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    "script-src 'self'"
  ].join("; ");
  return {
    csp,
    ...(development
      ? {
          devCsp: csp.replace(
            "ipc: http://ipc.localhost",
            "ipc: http://ipc.localhost http://127.0.0.1:1422 ws://127.0.0.1:1422"
          )
        }
      : {})
  };
}
