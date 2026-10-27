/**
 * NIPOST Postcode Gateway — client-side lookup helper.
 *
 * Uses the official NIPOST Postcode API (docs.postcode.gov.ng):
 *   GET https://api.postcode.gov.ng/v1/lookup?code=SS-NN-DDD-AA-NN&level=1
 *   Header: X-API-Key
 *
 * The key below is a Publishable test key (nipost_pk_test_…) which NIPOST
 * designed to ship in client-side code. Publishable keys are capped at
 * lookup level 1 for this key's grant, so we always request level=1.
 *
 * Free reference endpoints decode the postcode segments into readable names:
 *   GET /v1/reference/states           → [{ code, name }]
 *   GET /v1/reference/lgas?state=FC    → [{ code, name }]
 */

const NIPOST_API_KEY = "nipost_pk_test_b1323e22b4bf8e4a353d15705b8f2e4181f266a5b9acdb3c";
const BASE_URL = "https://api.postcode.gov.ng";

// A Nigerian postcode is a 5-segment code:
// SS NN DDD AA NN — state(2 alpha) lga(2 num) district(3 alnum) area(2 alpha) unit(2 num)
// e.g. FC-01-A01-KP-27 (11 characters in total, per the official examples)
const SEGMENT_LENGTHS = [2, 2, 3, 2, 2];
const SEGMENTS_TOTAL = SEGMENT_LENGTHS.reduce((a, b) => a + b, 0);
const POSTCODE_RE = /^[A-Z]{2}\d{2}[A-Z0-9]{3}[A-Z]{2}\d{2}$/;

export type NipostLookupResult = {
  postcode: string;
  status: string;
  verified: boolean;
  stateCode: string;
  stateName: string | null;
  lgaCode: string;
  lgaName: string | null;
  districtCode: string;
  areaCode: string;
  unitCode: string;
};

export type NipostOutcome =
  | { ok: true; result: NipostLookupResult }
  | { ok: false; reason: "invalid_format" | "not_found" | "origin_blocked" | "api_error"; message: string };

/** Accepts "FC-01-A01-KP-27", "FC 01 A01 KP 27" or "FC01A01KP27" and returns the canonical hyphenated form. */
export function normalizePostcode(raw: string): string | null {
  const compact = (raw || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (compact.length !== SEGMENTS_TOTAL || !POSTCODE_RE.test(compact)) return null;
  const parts: string[] = [];
  let i = 0;
  for (const len of SEGMENT_LENGTHS) {
    parts.push(compact.slice(i, i + len));
    i += len;
  }
  return parts.join("-");
}

type NamedCode = { code: string; name?: string };

const statesCache = new Map<string, string>();
const lgaCache = new Map<string, string>(); // key: `${stateCode}:${lgaCode}`

async function fetchJson(path: string): Promise<unknown> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "X-API-Key": NIPOST_API_KEY },
  });
  if (!res.ok) throw Object.assign(new Error(`NIPOST ${res.status}`), { status: res.status });
  return res.json();
}

async function stateNameOf(code: string): Promise<string | null> {
  if (!statesCache.size) {
    try {
      const body = (await fetchJson("/v1/reference/states")) as { data?: { states?: NamedCode[] } };
      for (const s of body.data?.states ?? []) {
        if (s.name) statesCache.set(s.code, s.name);
      }
    } catch {
      return null;
    }
  }
  return statesCache.get(code) ?? null;
}

async function lgaNameOf(stateCode: string, lgaCode: string): Promise<string | null> {
  const key = `${stateCode}:${lgaCode}`;
  if (!statesCache.has(`__lgas_${stateCode}`)) {
    try {
      const body = (await fetchJson(`/v1/reference/lgas?state=${encodeURIComponent(stateCode)}`)) as {
        data?: { lgas?: NamedCode[] };
      };
      for (const l of body.data?.lgas ?? []) {
        if (l.name) lgaCache.set(`${stateCode}:${l.code}`, l.name);
      }
      statesCache.set(`__lgas_${stateCode}`, stateCode);
    } catch {
      return null;
    }
  }
  return lgaCache.get(key) ?? null;
}

/** Verifies a postcode against the NIPOST API and decodes its segments into State/LGA names. */
export async function lookupNipostPostcode(raw: string): Promise<NipostOutcome> {
  const postcode = normalizePostcode(raw);
  if (!postcode) {
    return {
      ok: false,
      reason: "invalid_format",
      message: "Invalid NIPOST Postcode — use the 12-character format, e.g. FC-01-A01-KP-27",
    };
  }

  let data: { postcode?: string; valid?: boolean; status?: string; verified?: boolean };
  try {
    const body = (await fetchJson(
      `/v1/lookup?code=${encodeURIComponent(postcode)}&level=1`,
    )) as { data?: typeof data };
    data = body.data ?? {};
  } catch (error) {
    const status = (error as { status?: number }).status;
    if (status === 403) {
      return {
        ok: false,
        reason: "origin_blocked",
        message:
          "This NIPOST key is not allowed from this website address yet. Add this site's address to the key's origin allowlist in the NIPOST dashboard.",
      };
    }
    return { ok: false, reason: "api_error", message: "Invalid NIPOST Postcode" };
  }

  if (!data.valid) {
    const notFound = (data.status || "").toLowerCase() === "not_found";
    return {
      ok: false,
      reason: "not_found",
      message: notFound ? "Postcode not found" : "Invalid NIPOST Postcode",
    };
  }

  const [stateCode = "", lgaCode = "", districtCode = "", areaCode = "", unitCode = ""] =
    postcode.split("-");
  const [stateName, lgaName] = await Promise.all([
    stateNameOf(stateCode),
    lgaNameOf(stateCode, lgaCode),
  ]);

  return {
    ok: true,
    result: {
      postcode,
      status: data.status || "active",
      verified: data.verified === true,
      stateCode,
      stateName,
      lgaCode,
      lgaName,
      districtCode,
      areaCode,
      unitCode,
    },
  };
}
