/**
 * <image-carousel> — carrousel d'images auto-défilant, réutilisable.
 *
 * Utilisation minimale (rien d'autre à copier-coller) :
 *
 *   <script src="image-carousel.js" defer></script>
 *   <image-carousel images="url1.jpg, url2.jpg, url3.jpg"></image-carousel>
 *
 * Attributs disponibles (tous optionnels sauf "images") :
 *   images          liste d'URLs séparées par des virgules (obligatoire)
 *   interval        délai entre 2 images en millisecondes (défaut : 8000)
 *   height          hauteur du carrousel, ex "420px" (défaut : "420px")
 *   fit             comment gérer les images qui ne remplissent pas le cadre
 *                     "blur"    (défaut) image entière visible + fond flouté agrandi, plus de bandes noires
 *                     "cover"   image recadrée pour remplir tout le cadre (peut couper les bords)
 *                     "contain" comportement d'origine, bandes noires sur les côtés
 *   pause-on-hover  présent = pause au survol de la souris (défaut : absent = pas de pause)
 *   arrows          présent = affiche les flèches précédent/suivant
 *   dots            présent = affiche les puces de navigation
 *   title           titre affiché en surimpression (optionnel)
 *   subtitle        sous-titre affiché en surimpression (optionnel)
 */
(function () {
	var STYLE_ID = "image-carousel-styles";
	if (!document.getElementById(STYLE_ID)) {
		var style = document.createElement("style");
		style.id = STYLE_ID;
		style.textContent = [
			"image-carousel{display:block;position:relative;overflow:hidden;background:#000;}",
			".ic-track{display:flex;height:100%;transition:transform .6s ease-in-out;}",
			".ic-slide{flex-shrink:0;height:100%;position:relative;overflow:hidden;",
			"display:flex;align-items:center;justify-content:center;}",

			/* Fond flouté (mode "blur") : agrandi et flouté pour remplir tout le cadre */
			".ic-slide-bg{position:absolute;inset:0;background-size:cover;background-position:center;",
			"filter:blur(25px) brightness(.65);transform:scale(1.15);z-index:0;}",

			".ic-slide img{position:relative;z-index:1;display:block;margin:0 auto;}",
			/* mode par défaut / "contain" : image entière, hauteur fixe, largeur auto */
			".ic-slide.fit-contain img,.ic-slide.fit-blur img{height:100%;width:auto;max-width:100%;}",
			/* mode "cover" : l'image remplit tout le cadre, quitte à être recadrée */
			".ic-slide.fit-cover img{height:100%;width:100%;object-fit:cover;}",

			".ic-overlay{position:absolute;bottom:0;left:0;right:0;z-index:4;",
			"background:linear-gradient(transparent, rgba(10,28,55,.82));padding:4em 2em 1.6em;text-align:center;color:#fff;}",
			".ic-overlay h1{font-size:2.6em;font-weight:600;margin:0 0 .2em;color:white;}",
			".ic-overlay p{font-size:.8em;margin:0;color:rgba(255,255,255,.75);letter-spacing:.06em;}",
			".ic-arrow{position:absolute;top:50%;transform:translateY(-50%);z-index:5;",
			"background:rgba(0,0,0,.35);border:none;color:#fff;width:38px;height:38px;border-radius:50%;",
			"cursor:pointer;font-size:1.1em;line-height:1;}",
			".ic-arrow:hover{background:rgba(0,0,0,.55);}",
			".ic-arrow.prev{left:12px;}",
			".ic-arrow.next{right:12px;}",
			".ic-dots{position:absolute;bottom:10px;left:0;right:0;z-index:5;",
			"display:flex;justify-content:center;gap:6px;}",
			".ic-dots button{width:9px;height:9px;border-radius:50%;border:none;",
			"background:rgba(255,255,255,.5);cursor:pointer;padding:0;}",
			".ic-dots button.active{background:#fff;}"
		].join("");
		document.head.appendChild(style);
	}

	function ImageCarousel() {
		return Reflect.construct(HTMLElement, [], ImageCarousel);
	}
	ImageCarousel.prototype = Object.create(HTMLElement.prototype);
	ImageCarousel.prototype.constructor = ImageCarousel;

	ImageCarousel.prototype.connectedCallback = function () {
		if (this._built) return;
		this._built = true;

		var imagesAttr = this.getAttribute("images") || "";
		var images = imagesAttr
			.split(",")
			.map(function (s) { return s.trim(); })
			.filter(Boolean);

		if (!images.length) {
			console.warn('<image-carousel> : aucune image fournie via l\'attribut "images".');
			return;
		}

		var interval = parseInt(this.getAttribute("interval"), 10) || 8000;
		var height = this.getAttribute("height") || "420px";
		var fit = this.getAttribute("fit") || "blur";
		if (["blur", "cover", "contain"].indexOf(fit) === -1) fit = "blur";
		var pauseOnHover = this.hasAttribute("pause-on-hover");
		var showArrows = this.hasAttribute("arrows");
		var showDots = this.hasAttribute("dots");
		var title = this.getAttribute("title");
		var subtitle = this.getAttribute("subtitle");

		this.style.height = height;
		this._count = images.length;
		this._interval = interval;
		this.index = 0;

		var track = document.createElement("div");
		track.className = "ic-track";
		track.style.width = images.length * 100 + "%";

		images.forEach(function (src) {
			var slide = document.createElement("div");
			slide.className = "ic-slide fit-" + fit;
			slide.style.width = 100 / images.length + "%";

			if (fit === "blur") {
				var bg = document.createElement("div");
				bg.className = "ic-slide-bg";
				bg.style.backgroundImage = "url('" + src + "')";
				slide.appendChild(bg);
			}

			var img = document.createElement("img");
			img.src = src;
			img.alt = "";
			slide.appendChild(img);
			track.appendChild(slide);
		});
		this.appendChild(track);
		this._track = track;

		if (title || subtitle) {
			var overlay = document.createElement("div");
			overlay.className = "ic-overlay";
			overlay.innerHTML =
				(title ? "<h1>" + title + "</h1>" : "") +
				(subtitle ? "<p>" + subtitle + "</p>" : "");
			this.appendChild(overlay);
		}

		if (showArrows) {
			var self = this;
			var prev = document.createElement("button");
			prev.type = "button";
			prev.className = "ic-arrow prev";
			prev.innerHTML = "&#10094;";
			prev.setAttribute("aria-label", "Image précédente");
			prev.addEventListener("click", function () { self.go(self.index - 1); });

			var next = document.createElement("button");
			next.type = "button";
			next.className = "ic-arrow next";
			next.innerHTML = "&#10095;";
			next.setAttribute("aria-label", "Image suivante");
			next.addEventListener("click", function () { self.go(self.index + 1); });

			this.appendChild(prev);
			this.appendChild(next);
		}

		if (showDots) {
			var dots = document.createElement("div");
			dots.className = "ic-dots";
			var self2 = this;
			images.forEach(function (_, i) {
				var dot = document.createElement("button");
				dot.type = "button";
				dot.setAttribute("aria-label", "Aller à l'image " + (i + 1));
				if (i === 0) dot.className = "active";
				dot.addEventListener("click", function () { self2.go(i); });
				dots.appendChild(dot);
			});
			this.appendChild(dots);
			this._dots = dots;
		}

		if (pauseOnHover) {
			this.addEventListener("mouseenter", this.stop.bind(this));
			this.addEventListener("mouseleave", this.play.bind(this));
		}

		this.play();
	};

	ImageCarousel.prototype.go = function (i) {
		this.index = ((i % this._count) + this._count) % this._count;
		this._track.style.transform =
			"translateX(-" + (this.index * (100 / this._count)) + "%)";
		if (this._dots) {
			Array.prototype.forEach.call(this._dots.children, function (d, idx) {
				d.classList.toggle("active", idx === this.index);
			}.bind(this));
		}
	};

	ImageCarousel.prototype.play = function () {
		this.stop();
		var self = this;
		this._timer = setInterval(function () { self.go(self.index + 1); }, this._interval);
	};

	ImageCarousel.prototype.stop = function () {
		if (this._timer) clearInterval(this._timer);
	};

	ImageCarousel.prototype.disconnectedCallback = function () {
		this.stop();
	};

	customElements.define("image-carousel", ImageCarousel);
})();
