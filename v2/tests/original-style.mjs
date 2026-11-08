// Most V2 specs cover the Original (blue/orange glass) design, which is no longer
// the default. This fixture keeps them on Original: any saved preferences
// without an explicit style, including the ones specs seed themselves, read as
// style "original". Botanical is covered in botanical.spec.mjs.
import { test as base, expect } from "@playwright/test";

export const test = base.extend({
  context: async ({ context }, use) => {
    await context.addInitScript(() => {
      const KEY = "jr-v2-preferences";
      const defaults = {
        theme: "system",
        calm: false,
        atmosphere: true,
        intro: true,
        background: "auto",
      };
      const pin = (value) => {
        try {
          const prefs = JSON.parse(value);
          if (prefs && typeof prefs === "object" && !("style" in prefs))
            return JSON.stringify({ ...prefs, style: "original" });
        } catch {}
        return value;
      };
      const { getItem, setItem } = Storage.prototype;
      // For specs that seed only when nothing is saved yet.
      window.__savedPreferences = () => getItem.call(localStorage, KEY);
      Storage.prototype.setItem = function (key, value) {
        return setItem.call(this, key, key === KEY ? pin(String(value)) : value);
      };
      Storage.prototype.getItem = function (key) {
        const value = getItem.call(this, key);
        if (key !== KEY || this !== window.localStorage) return value;
        return value == null
          ? JSON.stringify({ ...defaults, style: "original" })
          : pin(value);
      };
    });
    await use(context);
  },
});
export { expect };
