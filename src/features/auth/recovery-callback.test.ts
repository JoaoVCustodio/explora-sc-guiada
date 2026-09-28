import assert from "node:assert/strict";
import test from "node:test";
import { hasRecoveryCallbackError } from "./recovery-callback.ts";

test("recognizes Supabase callback errors in query or fragment", () => {
  assert.equal(hasRecoveryCallbackError("https://explorasc.vercel.app/auth?mode=reset&error=access_denied"), true);
  assert.equal(hasRecoveryCallbackError("https://explorasc.vercel.app/auth?mode=reset#error_code=otp_expired"), true);
  assert.equal(hasRecoveryCallbackError("https://explorasc.vercel.app/auth?mode=reset#error_description=expired"), true);
});

test("keeps successful recovery callbacks available to the auth client", () => {
  assert.equal(hasRecoveryCallbackError("https://explorasc.vercel.app/auth?mode=reset#type=recovery&access_token=token"), false);
  assert.equal(hasRecoveryCallbackError("https://explorasc.vercel.app/auth?mode=reset&code=auth-code"), false);
});
