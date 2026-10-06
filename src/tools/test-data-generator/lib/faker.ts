import type { Faker } from "@faker-js/faker";
import type { LocaleId } from "../engine/locales";

/** Load one faker locale. Each is a separate chunk, so only the chosen locale's data is downloaded. */
export async function loadFaker(locale: LocaleId): Promise<Faker> {
  switch (locale) {
    case "en_IN":
      return (await import("@faker-js/faker/locale/en_IN")).faker;
    case "en_GB":
      return (await import("@faker-js/faker/locale/en_GB")).faker;
    case "de":
      return (await import("@faker-js/faker/locale/de")).faker;
    case "fr":
      return (await import("@faker-js/faker/locale/fr")).faker;
    case "es":
      return (await import("@faker-js/faker/locale/es")).faker;
    case "pt_BR":
      return (await import("@faker-js/faker/locale/pt_BR")).faker;
    case "ja":
      return (await import("@faker-js/faker/locale/ja")).faker;
    default:
      return (await import("@faker-js/faker/locale/en_US")).faker;
  }
}
