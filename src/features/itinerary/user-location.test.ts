import assert from "node:assert/strict";
import test from "node:test";
import { geolocationPermissionState, locationErrorMessage, watchUserPosition } from "./user-location.ts";

test("consulta a permissão antes da ativação automática", async () => {
  for (const state of ["granted", "prompt", "denied"] as const) {
    const permissions = { query: async () => ({ state }) } as unknown as Pick<Permissions, "query">;
    assert.equal(await geolocationPermissionState(permissions), state);
  }
  assert.equal(await geolocationPermissionState(), null);
  const unsupported = { query: async () => { throw new Error("unsupported"); } } as unknown as Pick<Permissions, "query">;
  assert.equal(await geolocationPermissionState(unsupported), null);
});

test("watchPosition só começa quando acionado, acompanha posições e é encerrado", () => {
  let onPosition: PositionCallback | undefined;
  let calls = 0;
  let cleared: number | undefined;
  const geolocation = {
    watchPosition(success: PositionCallback, _error: PositionErrorCallback, options: PositionOptions) {
      calls++;
      onPosition = success;
      assert.deepEqual(options, { enableHighAccuracy: true, timeout: 15_000, maximumAge: 10_000 });
      return 7;
    },
    clearWatch(id: number) { cleared = id; },
  } as Geolocation;
  const received: number[] = [];
  assert.equal(calls, 0);
  const stop = watchUserPosition(geolocation, (position) => received.push(position.coords.latitude), () => {});
  assert.equal(calls, 1);
  onPosition?.({ coords: { latitude: -27.5 } } as GeolocationPosition);
  onPosition?.({ coords: { latitude: -27.6 } } as GeolocationPosition);
  assert.deepEqual(received, [-27.5, -27.6]);
  stop();
  assert.equal(cleared, 7);
});

test("erros distinguem permissão, indisponibilidade e timeout", () => {
  assert.match(locationErrorMessage({ code: 1 }), /Permissão.*negada/);
  assert.match(locationErrorMessage({ code: 2 }), /indisponível/);
  assert.match(locationErrorMessage({ code: 3 }), /a tempo/);
});

test("erro do navegador é repassado ao chamador", () => {
  let onError: PositionErrorCallback | undefined;
  const geolocation = {
    watchPosition(_success: PositionCallback, error: PositionErrorCallback) { onError = error; return 1; },
    clearWatch() {},
  } as unknown as Geolocation;
  let message = "";
  watchUserPosition(geolocation, () => {}, (error) => { message = locationErrorMessage(error); });
  onError?.({ code: 1 } as GeolocationPositionError);
  assert.match(message, /Permissão.*negada/);
});
