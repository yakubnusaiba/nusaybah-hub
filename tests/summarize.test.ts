import { test } from "node:test";
import assert from "node:assert/strict";
import { generateSummary } from "../src/lib/summarize.server.ts";
import { summaryInputSchema } from "../src/lib/summarize.ts";

test("validates input boundaries and summary length", () => {
  for (const value of [
    null,
    {},
    { text: "small", length: "short" },
    { text: "x".repeat(30001), length: "long" },
    { text: "A sufficiently long text to summarize.", length: "invalid" },
  ]) {
    assert.equal(summaryInputSchema.safeParse(value).success, false);
  }
  assert.equal(
    summaryInputSchema.parse({
      text: "  A sufficiently long text to summarize.  ",
      length: "medium",
    }).text,
    "A sufficiently long text to summarize.",
  );
});

test("gateway integration handles success, invalid results and provider failures", async (t) => {
  const originalKey = process.env["LOVABLE_API_KEY"];
  t.after(() => {
    if (originalKey === undefined) delete process.env["LOVABLE_API_KEY"];
    else process.env["LOVABLE_API_KEY"] = originalKey;
  });
  process.env["LOVABLE_API_KEY"] = "test-key";
  const input = {
    text: "The supplier will deliver five boxes on Friday.",
    length: "short" as const,
  };
  const result = { summary: "Delivery is Friday.", keyPoints: ["Five boxes"] };
  const mock = t.mock.method(globalThis, "fetch", async (_url: unknown, options: RequestInit) => {
    assert.equal((options.headers as Record<string, string>)["Authorization"], "Bearer test-key");
    const body = JSON.parse(options.body as string);
    assert.equal(body.messages[1].content, input.text);
    assert.match(body.messages[0].content, /1-2 sentences/);
    assert.ok(options.signal);
    return Response.json({
      choices: [{ message: { content: "```json\n" + JSON.stringify(result) + "\n```" } }],
    });
  });
  assert.deepEqual(await generateSummary(input), result);
  for (const content of [
    "not JSON",
    "null",
    "{}",
    '{"summary":"","keyPoints":[]}',
    '{"summary":"Fine","keyPoints":[42]}',
  ]) {
    mock.mock.mockImplementation(async () =>
      Response.json({ choices: [{ message: { content } }] }),
    );
    await assert.rejects(generateSummary(input), /incomplete summary/);
  }
  for (const [status, message] of [
    [429, /busy/],
    [402, /credits/],
    [401, /configuration/],
    [500, /failed/],
  ] as const) {
    mock.mock.mockImplementation(async () => new Response(null, { status }));
    await assert.rejects(generateSummary(input), message);
  }
  mock.mock.mockImplementation(async () => {
    throw new DOMException("timeout", "TimeoutError");
  });
  await assert.rejects(generateSummary(input), /too long/);
  mock.mock.mockImplementation(async () => {
    throw new TypeError("network");
  });
  await assert.rejects(generateSummary(input), /Could not reach/);
  delete process.env["LOVABLE_API_KEY"];
  await assert.rejects(generateSummary(input), /not configured/);
});
