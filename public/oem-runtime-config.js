window.__LIME_OEM_CLOUD__ = {
  enabled: true,
  baseUrl: "https://user.limeai.run",
  gatewayBaseUrl: "https://llm.limeai.run",
  hubProviderName: "Ember 云端",
  tenantId: "tenant-0001",
  loginPath: "https://console.ember.aiearn.me/auth?tab=login",
  desktopClientId: "desktop-client",
  desktopOauthRedirectUrl: "lime://oauth/callback",
  desktopOauthNextPath: "/welcome",
  ...(window.__LIME_OEM_CLOUD__ ?? {}),
};

/*
Replace this file during packaging when you need brand-specific runtime values.

Example:

window.__LIME_OEM_CLOUD__ = {
  enabled: true,
  baseUrl: "https://console.ember.aiearn.me",
  gatewayBaseUrl: "https://console.ember.aiearn.me/gateway-api",
  hubProviderName: "Ember 云端",
  tenantId: "tenant-demo",
  loginPath: "https://console.ember.aiearn.me/auth?tab=login",
  desktopClientId: "desktop-client",
  desktopOauthRedirectUrl: "lime://oauth/callback",
  desktopOauthNextPath: "/welcome",
};

window.__LIME_SESSION_TOKEN__ = "session-token-from-login";
*/
