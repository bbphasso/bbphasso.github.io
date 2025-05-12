// layout-loader.js

function loadLayout() {
    // Charger le header avant de lancer le script principal
    fetch('header.html')
      .then(response => response.text())
      .then(html => {
        // Injecter le contenu du header
        document.getElementById('header-container').innerHTML = html;
        // Charger la sidebar
        return fetch('sidebar.html');
      })
      .then(response => response.text())
      .then(html => {
        // Injecter le contenu de la sidebar
        document.getElementById('sidebar-container').innerHTML = html;
        // Charger le footer
        return fetch('footer.html');
      })
      .then(response => response.text())
      .then(html => {
        // Injecter le contenu de la sidebar
        document.getElementById('footer-container').innerHTML = html;
  
        // Charger le script principal après les fragments
        const script = document.createElement('script');
        script.src = 'assets/js/main.js';
        script.defer = true; // Script est exécuté après l'injection
        document.body.appendChild(script);
      })
      .catch(error =>
        console.error("Erreur lors du chargement des fragments (header, sidebar, footer) :", error)
      );
  }
  
  // Appelle automatiquement la fonction au chargement de la page
  document.addEventListener("DOMContentLoaded", loadLayout);
  