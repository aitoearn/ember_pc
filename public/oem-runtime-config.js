window.__EMBER_OEM_CLOUD__ = {
  enabled: true,
  baseUrl: "https://user.emberai.run",
  gatewayBaseUrl: "https://llm.emberai.run",
  hubProviderName: "Ember Hub",
  tenantId: "tenant-0001",
  loginPath: "/login",
  desktopClientId: "desktop-client",
  desktopOauthRedirectUrl: "ember://oauth/callback",
  desktopOauthNextPath: "/welcome",
  ...(window.__EMBER_OEM_CLOUD__ ?? {}),
};

/*
Replace this file during packaging when you need brand-specific runtime values.

Example:

window.__EMBER_OEM_CLOUD__ = {
  enabled: true,
  baseUrl: "https://emberhub.example.com",
  gatewayBaseUrl: "https://emberhub.example.com/gateway-api",
  hubProviderName: "Ember Hub",
  tenantId: "tenant-demo",
  loginPath: "/login",
  desktopClientId: "desktop-client",
  desktopOauthRedirectUrl: "ember://oauth/callback",
  desktopOauthNextPath: "/welcome",
};

window.__EMBER_SESSION_TOKEN__ = "session-token-from-login";
*/
