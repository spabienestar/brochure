(function () {
  "use strict";

  var $ = function (sel, scope) { return (scope || document).querySelector(sel); };
  var $$ = function (sel, scope) { return Array.prototype.slice.call((scope || document).querySelectorAll(sel)); };
  var reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  function safe(fn, name) {
    try { fn(); } catch (e) { console.warn("[" + name + "]", e); }
  }

  /* ---------- Nav: solidificar al hacer scroll + menú móvil ---------- */
  function initNav() {
    var nav = $("[data-nav]");
    if (!nav) return;
    var onScroll = function () {
      nav.classList.toggle("is-solid", window.scrollY > 24);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    var burger = $("[data-burger]");
    var links = $("[data-nav-links]");
    if (burger && links) {
      burger.addEventListener("click", function () {
        var open = nav.classList.toggle("is-open");
        burger.setAttribute("aria-expanded", open ? "true" : "false");
        burger.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
      });
      links.addEventListener("click", function (e) {
        if (e.target.closest("a")) {
          nav.classList.remove("is-open");
          burger.setAttribute("aria-expanded", "false");
        }
      });
    }
  }

  /* ---------- Scroll suave con offset del nav ---------- */
  function initSmoothScroll() {
    document.addEventListener("click", function (e) {
      var a = e.target.closest('a[href^="#"]');
      if (!a) return;
      var id = a.getAttribute("href");
      if (!id || id === "#") return;
      var el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      var top = el.getBoundingClientRect().top + window.scrollY - 70;
      window.scrollTo({ top: top, behavior: reduced ? "auto" : "smooth" });
    });
  }

  /* ---------- Reveals con IntersectionObserver ---------- */
  function initReveals() {
    var targets = $$(".reveal");
    if (!targets.length) return;
    if (!("IntersectionObserver" in window)) {
      targets.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.01, rootMargin: "0px 0px -2% 0px" });
    targets.forEach(function (el) { io.observe(el); });

    /* Red de seguridad: a los 6 s, revelar lo que siga oculto */
    setTimeout(function () {
      $$(".reveal:not(.is-visible)").forEach(function (el) {
        el.classList.add("is-visible");
      });
    }, 6000);
  }

  /* ---------- Contadores animados ---------- */
  function initCountUp() {
    var els = $$("[data-count-to]");
    if (!els.length) return;
    var animate = function (el) {
      var target = parseInt(el.getAttribute("data-count-to"), 10) || 0;
      if (reduced) { el.textContent = target; return; }
      var start = null;
      var dur = 1600;
      var step = function (ts) {
        if (!start) start = ts;
        var p = Math.min((ts - start) / dur, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * eased);
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    if (!("IntersectionObserver" in window)) {
      els.forEach(function (el) { el.textContent = el.getAttribute("data-count-to"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animate(entry.target);
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.05 });
    els.forEach(function (el) { io.observe(el); });
    setTimeout(function () {
      els.forEach(function (el) {
        if (el.textContent === "0") el.textContent = el.getAttribute("data-count-to");
      });
    }, 6000);
  }

  /* ---------- Fotos por servicio: puntos en las portadas + visor en grande ---------- */
  function initGalerias() {
    var galerias = $$("[data-galeria]");
    if (!galerias.length) return;
    var fotosDe = function (g) { return $$("img", g); };
    var actual = function (g) { return g.clientWidth ? Math.round(g.scrollLeft / g.clientWidth) : 0; };

    galerias.forEach(function (g) {
      if (!g.classList.contains("galeria-portada") || fotosDe(g).length < 2) return;
      var puntos = document.createElement("div");
      puntos.className = "galeria-puntos";
      fotosDe(g).forEach(function (_, i, lista) {
        var b = document.createElement("button");
        b.type = "button";
        b.setAttribute("aria-label", "Ver foto " + (i + 1) + " de " + lista.length);
        b.addEventListener("click", function () {
          g.scrollTo({ left: i * g.clientWidth, behavior: reduced ? "auto" : "smooth" });
        });
        puntos.appendChild(b);
      });
      g.insertAdjacentElement("afterend", puntos);
      var marcar = function () {
        var i = actual(g);
        $$("button", puntos).forEach(function (b, j) { b.classList.toggle("activo", j === i); });
      };
      g.addEventListener("scroll", marcar, { passive: true });
      marcar();
    });

    var visor = document.createElement("div");
    visor.className = "visor";
    visor.hidden = true;
    visor.setAttribute("role", "dialog");
    visor.setAttribute("aria-modal", "true");
    visor.setAttribute("aria-label", "Fotos del servicio");
    visor.innerHTML =
      '<img alt="" />' +
      '<button class="visor-cerrar" type="button" aria-label="Cerrar">×</button>' +
      '<button class="visor-ant" type="button" aria-label="Foto anterior">‹</button>' +
      '<button class="visor-sig" type="button" aria-label="Foto siguiente">›</button>' +
      '<p class="visor-pie" aria-live="polite"></p>';
    document.body.appendChild(visor);
    var imagen = $("img", visor);
    var pie = $(".visor-pie", visor);
    var lista = [];
    var indice = 0;
    var previo = null;

    function mostrarFoto(i) {
      indice = (i + lista.length) % lista.length;
      var f = lista[indice];
      imagen.src = f.getAttribute("data-grande") || f.getAttribute("src");
      imagen.alt = f.alt;
      pie.textContent = f.alt + (lista.length > 1 ? " · " + (indice + 1) + " / " + lista.length : "");
    }
    function abrir(fotos, i) {
      lista = fotos;
      previo = document.activeElement;
      visor.toggleAttribute("data-una", fotos.length < 2);
      mostrarFoto(i);
      visor.hidden = false;
      document.documentElement.style.overflow = "hidden";
      $(".visor-cerrar", visor).focus();
    }
    function cerrar() {
      visor.hidden = true;
      imagen.removeAttribute("src");
      document.documentElement.style.overflow = "";
      if (previo && previo.focus) previo.focus();
    }

    galerias.forEach(function (g) {
      var abrirDesde = function (objetivo) {
        var fotos = fotosDe(g);
        if (!fotos.length) return;
        var i = g.classList.contains("galeria-portada") ? actual(g) : Math.max(0, fotos.indexOf(objetivo));
        abrir(fotos, i);
      };
      g.addEventListener("click", function (e) { abrirDesde(e.target.closest("img")); });
      g.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); abrirDesde(null); }
      });
    });
    $(".visor-cerrar", visor).addEventListener("click", cerrar);
    $(".visor-ant", visor).addEventListener("click", function () { mostrarFoto(indice - 1); });
    $(".visor-sig", visor).addEventListener("click", function () { mostrarFoto(indice + 1); });
    visor.addEventListener("click", function (e) { if (e.target === visor) cerrar(); });
    document.addEventListener("keydown", function (e) {
      if (visor.hidden) return;
      if (e.key === "Escape") cerrar();
      else if (e.key === "ArrowLeft") mostrarFoto(indice - 1);
      else if (e.key === "ArrowRight") mostrarFoto(indice + 1);
    });
    var inicioX = null;
    visor.addEventListener("touchstart", function (e) { inicioX = e.touches[0].clientX; }, { passive: true });
    visor.addEventListener("touchend", function (e) {
      if (inicioX === null || lista.length < 2) return;
      var dx = e.changedTouches[0].clientX - inicioX;
      if (Math.abs(dx) > 40) mostrarFoto(indice + (dx < 0 ? 1 : -1));
      inicioX = null;
    });
  }

  /* ---------- Año en el footer ---------- */
  function initYear() {
    var el = $("[data-year]");
    if (el) el.textContent = String(new Date().getFullYear());
  }

  /* ---------- Parallax sutil del hero (GSAP opcional) ---------- */
  function initHeroParallax() {
    if (!window.gsap || !window.ScrollTrigger || reduced) return;
    var img = $(".hero-figure img");
    if (!img) return;
    gsap.to(img, {
      yPercent: 8,
      ease: "none",
      scrollTrigger: {
        trigger: ".hero",
        start: "top top",
        end: "bottom top",
        scrub: 0.6
      }
    });
  }

  function boot() {
    document.documentElement.classList.remove("no-js");
    safe(initNav, "initNav");
    safe(initSmoothScroll, "initSmoothScroll");
    safe(initReveals, "initReveals");
    safe(initCountUp, "initCountUp");
    safe(initGalerias, "initGalerias");
    safe(initYear, "initYear");
    if (window.gsap && window.ScrollTrigger) {
      try { gsap.registerPlugin(ScrollTrigger); } catch (_) {}
      safe(initHeroParallax, "initHeroParallax");
    }
    document.documentElement.classList.add("is-ready");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
