// static/js/theme.js

document.addEventListener("DOMContentLoaded", function () {
  const html = document.documentElement;
  const toggle = document.getElementById("theme-toggle");

  if (!toggle) return;

  toggle.addEventListener("click", () => {
    const currentTheme = html.getAttribute("data-theme");
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    html.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
  });
});
