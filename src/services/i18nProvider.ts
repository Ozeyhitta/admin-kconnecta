import vietnameseMessages from "../utils/i18n/vi";
import polyglotI18nProvider from "ra-i18n-polyglot";

export const i18nProvider = polyglotI18nProvider(
  () => vietnameseMessages,
  "vi",
  [{ locale: "vi", name: "Tiếng Việt" }],
  { allowMissing: true },
);
