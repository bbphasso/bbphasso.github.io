// Block_currentpage.js
function Block_currentpage(options = {}) {
  const matchQuery = options.matchQuery ?? true;

  // Normalise un path (supprime slash final, sauf si c'est juste "/")
  const normalize = (s) => (s || "").replace(/\/+$/, "") || "/";

  const currentUrl = new URL(window.location.href);
  const currentKey =
    normalize(currentUrl.pathname) + (matchQuery ? currentUrl.search : "");

  /**
   * Applique le traitement "désactiver le lien courant" à tous les <a> trouvés
   * @param {string} selector - ex: "#sidebar a" ou "#header a"
   */
  function processLinks(selector) {
    document.querySelectorAll(selector).forEach((link) => {
      const rawHref = link.getAttribute("href");
      if (!rawHref) return;

      let linkUrl;
      try {
        linkUrl = new URL(rawHref, window.location.origin); // gère les liens relatifs
      } catch (e) {
        console.warn(`Lien invalide (${rawHref}) dans ${selector}`, e);
        return;
      }

      const linkKey =
        normalize(linkUrl.pathname) + (matchQuery ? linkUrl.search : "");

      if (linkKey === currentKey) {
        link.classList.add("active");
        link.removeAttribute("href"); // empêche le clic
        link.setAttribute("aria-current", "page"); // accessibilité
      }
    });
  }

  // Appliquer sur sidebar et header
  processLinks("#sidebar a");
  processLinks("#header a");
}
