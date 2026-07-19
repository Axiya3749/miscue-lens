export type TextDirection = "ltr" | "rtl";

export interface NativeLanguage {
  code: string;
  name: string;
  nativeName: string;
  direction: TextDirection;
}

export const SUPPORTED_NATIVE_LANGUAGES = [
  {
    code: "en",
    name: "English",
    nativeName: "English",
    direction: "ltr"
  },
  {
    code: "zh",
    name: "Chinese",
    nativeName: "中文",
    direction: "ltr"
  }
] as const satisfies readonly NativeLanguage[];

export type NativeLanguageCode =
  (typeof SUPPORTED_NATIVE_LANGUAGES)[number]["code"];

export function findNativeLanguage(
  code: string
): NativeLanguage | undefined {
  return SUPPORTED_NATIVE_LANGUAGES.find(language => language.code === code);
}

export function isSupportedNativeLanguage(
  code: string
): code is NativeLanguageCode {
  return Boolean(findNativeLanguage(code));
}
