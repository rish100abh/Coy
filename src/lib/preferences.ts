const GENDER_FILTERS: Record<string, string[]> = {
  WOMEN: ["WOMAN"],
  MEN: ["MAN"],
  NON_BINARY_AND_OTHER: ["NON_BINARY", "ANOTHER_IDENTITY"],
  PREFER_NOT_TO_SAY: ["UNDISCLOSED"],
};

const GENDER_PREFERENCES: Record<string, string[]> = {
  WOMAN: ["WOMEN"],
  MAN: ["MEN"],
  NON_BINARY: ["NON_BINARY_AND_OTHER"],
  ANOTHER_IDENTITY: ["NON_BINARY_AND_OTHER"],
  UNDISCLOSED: ["PREFER_NOT_TO_SAY"],
};

export function getPreferredGenders(preferences: string[]): string[] | undefined {
  if (preferences.includes("EVERYONE")) return undefined;
  return [...new Set(preferences.flatMap((preference) => GENDER_FILTERS[preference] ?? []))];
}

export function acceptsGender(preferences: string[], gender: string): boolean {
  return preferences.includes("EVERYONE")
    || (GENDER_PREFERENCES[gender] ?? []).some((preference) => preferences.includes(preference));
}
