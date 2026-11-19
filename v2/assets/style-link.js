// Style short links (/r, /b, /o): save the style named by this script tag's
// data-style as the visitor's choice, then open the homepage at the same
// hash (so /r#/projects lands on Projects). The visitor can change styles in
// Settings afterwards; the plain address keeps whatever they choose.
(function () {
  var script = document.currentScript;
  var style = script && script.dataset.style;
  var styles = ["botanical", "original", "riso"];
  var KEY = "jr-v2-preferences";
  try {
    if (styles.indexOf(style) !== -1) {
      var saved = null;
      try {
        saved = JSON.parse(localStorage.getItem(KEY) || "null");
      } catch (error) {}
      // Start from the app's defaults so a first visit stores a complete,
      // valid preference record, then keep anything the visitor already set.
      var preferences = {
        theme: "system",
        calm: false,
        atmosphere: true,
        intro: true,
        background: "auto",
      };
      if (saved && typeof saved === "object")
        for (var name in saved) preferences[name] = saved[name];
      preferences.style = style;
      localStorage.setItem(KEY, JSON.stringify(preferences));
    }
  } catch (error) {
    // Storage blocked: the homepage still opens, in its default style.
  }
  location.replace("/" + location.hash);
})();
