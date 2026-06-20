import { describe, expect, it } from "vitest";

import {
  EMBER_AGENT_APP_BRIDGE_PROTOCOL,
  EMBER_AGENT_APP_BRIDGE_VERSION,
  createEmberCoreCapabilityAdapters,
  createLimeHostBridgeCapabilityInvoker,
} from ".";

describe("agent-app public SDK exports", () => {
  it("exposes the Host Bridge SDK client and core capability adapters from the public feature entry", () => {
    expect(createEmberCoreCapabilityAdapters).toEqual(expect.any(Function));
    expect(createLimeHostBridgeCapabilityInvoker).toEqual(expect.any(Function));
    expect(EMBER_AGENT_APP_BRIDGE_PROTOCOL).toBe("ember.agentApp.bridge");
    expect(EMBER_AGENT_APP_BRIDGE_VERSION).toBe(1);
  });
});
