# ADR: Render Pharmacy Directions Natively In The Embedded Map

Type: project
Status: proposed
Classification: architecture

## Problem

The POC's direction decision currently hands the patient off to Google Maps: [PRD FR-29](../../../PRD.md) says directions hand off to the phone's maps app, PRD journey 5.1 step 6 repeats it, and [`docs/poc/data-contract.md` §7.8](../../../poc/data-contract.md) returns a `directions_url` built from the pharmacy coordinates. That breaks the map-first loop at the final step: the patient leaves the app, the selected pharmacy and basket context disappear, and the POC's acceptance run depends on an external app rather than on the POC itself.

The POC already embeds MapLibre GL JS and has a device origin from the results screen's geolocation request. A route preview can stay inside that map. The decision question is whether directions remain an external handoff or become an in-app route rendering, and how the app obtains route geometry without putting a routing credential or an unbounded external dependency in the browser.

The POC is a seeded-data demo, not a navigation product. It needs an indicative road route to the selected pharmacy, not turn-by-turn guidance, live traffic, rerouting, or voice instructions.

## Proposal

If accepted, we will render the route to the selected pharmacy in the embedded MapLibre map and remove the Google Maps handoff from the POC directions surface.

- A `GET /api/directions` endpoint accepts a `pharmacy_id` and the device origin, validates both, resolves the pharmacy coordinates, and returns a GeoJSON `LineString`, `distance_m`, `duration_s`, `provider`, and `generated_at`.
- The client draws the route as a MapLibre line layer, fits the map to the route, and shows the pharmacy name, distance, and estimated duration above the map. The result card and the pharmacy detail sheet expose the action as "Show route" rather than "Directions".
- The routing provider sits behind a server-only port and adapter. The POC adapter uses an OSRM-compatible service, with the base URL supplied by `ROUTING_BASE_URL` and defaulting to the public OSRM demo service. The provider choice is replaceable without changing the client contract.
- The endpoint is stateless: it holds the origin in memory for the request, stores nothing, and logs no coordinates. The UI discloses that location is used to calculate the route.
- A device origin is required. The Naga City center fallback used for result distances must not be used to fabricate a route; when location is unavailable the client asks the patient to enable it and draws no route.
- Routing is a preview. The POC must not offer turn-by-turn guidance, live re-routing, traffic-aware estimates, or a navigation session. The route line and the distance and duration are indicative and must say so.
- The Google Maps deep link and the `directions_url` field are removed from the pharmacy detail contract. No POC route action opens an external maps app.

The route provider may be unavailable; the endpoint returns a retryable error and the client keeps the pharmacy detail usable. An 8-second provider timeout maps to a timeout response, and a provider failure maps to an unavailable response.

## Alternatives considered

**Keep the Google Maps handoff.** The current decision gives real turn-by-turn navigation with no routing service to operate. It loses the in-app context, adds an app-switch in the core loop, makes the POC acceptance depend on another app, and gives the app no control over the route presentation. It is rejected for a map-first POC whose destination includes directions inside the demo.

**Draw a straight-line or geodesic connector.** This needs no routing provider and renders instantly, but it is not a road route and would mislead a patient about the path and travel distance. It is rejected for a directions feature; a straight-line distance may remain a separate display-only fact, never labelled as directions.

**Call a routing provider directly from the browser.** A client-side provider avoids a server endpoint but exposes the provider URL or credential, relies on provider CORS policy, and gives the app no place to enforce timeouts, validation, or no-logging. It is rejected in favour of the server-side port.

**Embed the Google Maps JavaScript API instead of MapLibre.** This would add a paid, keyed map vendor and a second map runtime to the POC. It conflicts with the stack decision that already embeds MapLibre and OpenFreeMap. It is rejected.

**Self-host a routing engine on the POC VPS.** This removes the external provider dependency but adds an OSM extract, preprocessing, memory and CPU pressure, and update work to a small demo VPS. It is deferred to the pilot, where routing quality and volume can justify the operations cost.

## Acceptance criteria

- A result card or detail sheet offers "Show route"; choosing it draws a road route from the device origin to the selected pharmacy in the embedded map and shows distance and estimated duration.
- No POC directions action opens Google Maps, and the pharmacy detail response no longer carries `directions_url`.
- The route is not drawn when the device origin is unavailable; the UI asks for location instead.
- A provider failure or timeout shows a retryable error and leaves the pharmacy detail and price list usable.
- The routing endpoint validates its input, resolves the pharmacy server-side, and stores or logs no origin coordinates.
- Unit tests cover query and provider-response validation; the browser acceptance test intercepts `/api/directions` and asserts the route state, distance, and duration; route contract tests cover missing origin, unknown pharmacy, and routing failures.
- [`docs/PRD.md`](../../../PRD.md) FR-29 and the POC data contract describe native route previews instead of a maps handoff.

## Risks

- The public OSRM demo is best-effort, may rate-limit, and has no availability guarantee. The configurable base URL, provider adapter, timeout, and error state bound the damage; the pilot must choose a supported provider or self-host before relying on directions.
- OSM road data can be incomplete or stale in Naga, and the estimate has no live traffic. The route is a preview, not a commitment, and the UI must say so.
- The device origin is sent to a third-party routing provider. The server proxy, no-logging rule, short timeout, and privacy disclosure limit the exposure; the pilot's DPIA and processor terms must cover the chosen provider.
- A long route geometry can cost bandwidth on a slow connection. The adapter requests a simplified overview and the response schema caps the coordinate count.
- Patients may read "route" as turn-by-turn navigation. The UI must call it a route preview and must not present manoeuvre instructions.
