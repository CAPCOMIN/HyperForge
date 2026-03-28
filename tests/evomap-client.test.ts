import { createEvoMapClient } from "@/lib/evomap/client";

describe("createEvoMapClient", () => {
  it("returns a mock client when requested", async () => {
    const client = createEvoMapClient("mock");
    const hello = await client.hello({ sender_id: "node_test" });

    expect(client.mode).toBe("mock");
    expect(hello.yourNodeId).toBe("node_test");
  });

  it("returns a live adapter without making network calls during construction", () => {
    const client = createEvoMapClient("live");
    expect(client.mode).toBe("live");
  });
});
