type AuthOperation = "signin" | "signup";

const knownCodes = new Set([
  "invalid_credentials", "email_not_confirmed", "user_already_exists",
  "email_exists", "weak_password", "email_address_invalid", "signup_disabled",
  "over_request_rate_limit", "over_email_send_rate_limit", "request_timeout",
]);

function authErrorDetails(error: unknown) {
  const value = error !== null && typeof error === "object"
    ? error as { code?: unknown; status?: unknown; name?: unknown }
    : {};
  return {
    code: typeof value.code === "string" && knownCodes.has(value.code) ? value.code : "unknown",
    status: typeof value.status === "number" && Number.isInteger(value.status)
      && value.status >= 0 && value.status <= 599 ? value.status : undefined,
    network: value.name === "AuthRetryableFetchError" || value.name === "TypeError",
  };
}

export function authErrorMessage(error: unknown, operation: AuthOperation): string {
  const { code, status, network } = authErrorDetails(error);
  if (network || status === 0 || code === "request_timeout") {
    return "Não foi possível conectar ao serviço. Verifique sua conexão e tente novamente.";
  }
  if (status === 429 || code === "over_request_rate_limit" || code === "over_email_send_rate_limit") {
    return "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.";
  }
  if (operation === "signin") {
    if (code === "invalid_credentials") return "E-mail ou senha incorretos. Confira os dados ou use a opção Esqueci minha senha.";
    if (code === "email_not_confirmed") return "Confirme seu e-mail antes de entrar. Procure a mensagem de confirmação na sua caixa de entrada ou no spam.";
    return "Não foi possível entrar agora. Tente novamente em instantes.";
  }
  if (code === "user_already_exists" || code === "email_exists") return "Este e-mail já possui uma conta. Entre ou use a opção Esqueci minha senha.";
  if (code === "weak_password") return "Escolha uma senha mais forte, com pelo menos 8 caracteres.";
  if (code === "email_address_invalid") return "Confira o endereço de e-mail informado.";
  if (code === "signup_disabled") return "O cadastro está indisponível no momento. Tente novamente mais tarde.";
  return "Não foi possível criar a conta. Confira os dados e tente novamente.";
}

export function reportAuthError(error: unknown, operation: AuthOperation): void {
  // Never log credentials, session tokens, email addresses or raw service messages.
  const { code, status, network } = authErrorDetails(error);
  console.warn("[ExploraSC] Falha na autenticação", { operation, code, status, network });
}
