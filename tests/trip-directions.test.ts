import { describe, expect, it, vi } from "vitest"

import { requestDrivingRoute } from "../lib/trip/directions"
import type { RouteStop } from "../lib/trip/routes"

function createStops(count: number): RouteStop[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `stop-${index + 1}`,
    name: `Stop ${index + 1}`,
    coordinates: { lat: 26 + index / 100, lng: 127 + index / 100 },
  }))
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  })
}

describe("requestDrivingRoute", () => {
  it("requests and normalizes a Mapbox driving route", async () => {
    const controller = new AbortController()
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({
        code: "Ok",
        routes: [
          {
            distance: 1234.5,
            duration: 456.7,
            geometry: {
              type: "LineString",
              coordinates: [
                [127, 26],
                [127.01, 26.01],
              ],
            },
          },
        ],
      })
    )

    await expect(
      requestDrivingRoute(createStops(2), {
        accessToken: "pk.test-token",
        signal: controller.signal,
        fetchImpl,
      })
    ).resolves.toEqual({
      distanceMeters: 1234.5,
      durationSeconds: 456.7,
      geometry: {
        type: "LineString",
        coordinates: [
          [127, 26],
          [127.01, 26.01],
        ],
      },
    })

    const [requestUrl, requestInit] = fetchImpl.mock.calls[0]
    const url = new URL(String(requestUrl))
    expect(url.pathname).toBe(
      "/directions/v5/mapbox/driving/127,26;127.01,26.01"
    )
    expect(url.searchParams.get("geometries")).toBe("geojson")
    expect(url.searchParams.get("overview")).toBe("full")
    expect(url.searchParams.get("steps")).toBe("false")
    expect(url.searchParams.get("access_token")).toBe("pk.test-token")
    expect(requestInit?.signal).toBe(controller.signal)
  })

  it("aggregates requests over 25 coordinates and removes geometry overlap", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({
          code: "Ok",
          routes: [
            {
              distance: 100,
              duration: 10,
              geometry: {
                type: "LineString",
                coordinates: [
                  [127, 26],
                  [127.24, 26.24],
                ],
              },
            },
          ],
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          code: "Ok",
          routes: [
            {
              distance: 25,
              duration: 5,
              geometry: {
                type: "LineString",
                coordinates: [
                  [127.24, 26.24],
                  [127.25, 26.25],
                ],
              },
            },
          ],
        })
      )

    await expect(
      requestDrivingRoute(createStops(26), {
        accessToken: "pk.test-token",
        fetchImpl,
      })
    ).resolves.toEqual({
      distanceMeters: 125,
      durationSeconds: 15,
      geometry: {
        type: "LineString",
        coordinates: [
          [127, 26],
          [127.24, 26.24],
          [127.25, 26.25],
        ],
      },
    })

    expect(fetchImpl).toHaveBeenCalledTimes(2)
    expect(String(fetchImpl.mock.calls[0][0])).toContain("127.24,26.24")
    expect(String(fetchImpl.mock.calls[1][0])).toContain(
      "/127.24,26.24;127.25,26.25?"
    )
  })

  it.each([
    ["non-2xx", jsonResponse({ message: "denied" }, 401), /HTTP 401/],
    [
      "non-Ok code",
      jsonResponse({ code: "NoRoute", routes: [] }),
      /code NoRoute/,
    ],
    ["empty route", jsonResponse({ code: "Ok", routes: [] }), /no routes/],
    [
      "malformed geometry",
      jsonResponse({
        code: "Ok",
        routes: [
          {
            distance: 1,
            duration: 2,
            geometry: { type: "LineString", coordinates: [["bad", 26]] },
          },
        ],
      }),
      /malformed LineString coordinates/,
    ],
  ])("rejects a %s response", async (_name, response, expected) => {
    await expect(
      requestDrivingRoute(createStops(2), {
        accessToken: "pk.test-token",
        fetchImpl: vi.fn<typeof fetch>().mockResolvedValue(response),
      })
    ).rejects.toThrow(expected)
  })

  it("passes AbortError through unchanged", async () => {
    const abortError = new DOMException(
      "The operation was aborted",
      "AbortError"
    )
    const fetchImpl = vi.fn<typeof fetch>().mockRejectedValue(abortError)

    await expect(
      requestDrivingRoute(createStops(2), {
        accessToken: "pk.test-token",
        fetchImpl,
      })
    ).rejects.toBe(abortError)
  })
})
