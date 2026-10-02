export const defaultNotificationPreferences = {
  joins: true,
  chat: true,
  roomInvites: true,
  sounds: true,
  reconnecting: true,
  respectFocus: true,
};

export function publicSettings(settings: any) {
  if (!settings) return null;
  const { id, spaceId, createdAt, updatedAt, ...rest } = settings;
  return { id, spaceId, ...rest, createdAt, updatedAt };
}

export function cleanNotificationPreferences(body: any) {
  return Object.fromEntries(
    Object.keys(defaultNotificationPreferences)
      .filter((key) => typeof body?.[key] === "boolean")
      .map((key) => [key, body[key]])
  );
}

export function publicNotificationPreferences(preferences: any) {
  if (!preferences) return defaultNotificationPreferences;
  const { id, spaceId, userId, createdAt, updatedAt, ...rest } = preferences;
  return { ...defaultNotificationPreferences, ...rest };
}
