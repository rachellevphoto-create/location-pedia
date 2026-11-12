import { revalidatePath } from "next/cache";
import { routing } from "@/i18n/routing";

/**
 * Revalidate an app path in every language. Pages live under
 * app/[locale]/..., so their real paths are /he/... and /en/... (the default
 * locale's prefix is hidden by a rewrite). A bare revalidatePath("/discover")
 * matches neither.
 */
export function revalidateAllLocales(...paths: string[]) {
  for (const path of paths) {
    for (const locale of routing.locales) {
      revalidatePath(`/${locale}${path === "/" ? "" : path}`);
    }
  }
}
