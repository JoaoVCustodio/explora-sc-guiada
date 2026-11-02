import assert from "node:assert/strict";
import test from "node:test";
import { authErrorMessage, reportAuthError } from "./errors.ts";

test("login distingue credenciais inválidas, confirmação de e-mail, conexão e limite de tentativas", () => {
  assert.match(authErrorMessage({ code: "invalid_credentials", status: 400 }, "signin"), /E-mail ou senha incorretos/);
  assert.match(authErrorMessage({ code: "email_not_confirmed", status: 400 }, "signin"), /Confirme seu e-mail/);
  assert.match(authErrorMessage({ name: "AuthRetryableFetchError" }, "signin"), /conexão/);
  assert.match(authErrorMessage(new TypeError("Failed to fetch"), "signin"), /conexão/);
  assert.match(authErrorMessage({ status: 429 }, "signin"), /Muitas tentativas/);
  assert.doesNotMatch(authErrorMessage({ status: 503 }, "signin"), /senha incorret/);
});

test("cadastro apresenta orientação específica sem mostrar mensagens brutas do serviço", () => {
  assert.match(authErrorMessage({ code: "user_already_exists" }, "signup"), /já possui uma conta/);
  assert.match(authErrorMessage({ code: "weak_password" }, "signup"), /senha mais forte/);
  assert.match(authErrorMessage({ code: "email_address_invalid" }, "signup"), /endereço de e-mail/);
  for (const value of [null, "sensitive message", { message: "sensitive message" }]) {
    assert.doesNotMatch(authErrorMessage(value, "signup"), /sensitive message/);
  }
});

test("diagnóstico de autenticação não registra senha, e-mail, sessão ou mensagem bruta", () => {
  const original = console.warn;
  const calls: unknown[][] = [];
  console.warn = (...args: unknown[]) => { calls.push(args); };
  try {
    reportAuthError({ code: "invalid_credentials", status: 400, message: "private-message", password: "private-password", email: "private-email", session: "private-token" }, "signin");
    reportAuthError({ code: "private-token", name: "private-email", status: "private-message" }, "signup");
    const output = JSON.stringify(calls);
    assert.match(output, /invalid_credentials/);
    assert.match(output, /400/);
    assert.doesNotMatch(output, /private-/);
  } finally { console.warn = original; }
});
