export const locationErrorMessage = (error: Pick<GeolocationPositionError, "code">) => {
  if (error.code === 1) return "Permissão de localização negada. Ative-a nas configurações do navegador para tentar novamente.";
  if (error.code === 2) return "Sua localização está indisponível no momento. Verifique o sinal do dispositivo e tente novamente.";
  return "Não foi possível obter sua localização a tempo. Tente novamente.";
};

export const geolocationPermissionState = async (permissions?: Pick<Permissions, "query">): Promise<PermissionState | null> => {
  if (!permissions) return null;
  try {
    return (await permissions.query({ name: "geolocation" })).state;
  } catch {
    // Some browsers do not expose geolocation through the Permissions API.
    return null;
  }
};

export const watchUserPosition = (
  geolocation: Geolocation,
  onPosition: PositionCallback,
  onError: PositionErrorCallback,
) => {
  const id = geolocation.watchPosition(onPosition, onError, {
    enableHighAccuracy: true,
    timeout: 15_000,
    maximumAge: 10_000,
  });
  return () => geolocation.clearWatch(id);
};
