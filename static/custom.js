(function () {
  function replaceBrand(root) {
    var walk = document.createTreeWalker(root || document.body, NodeFilter.SHOW_TEXT, null);
    var node;
    while ((node = walk.nextNode())) {
      var el = node.parentElement;
      if (!el || /SCRIPT|STYLE|NOSCRIPT|TEXTAREA/.test(el.tagName)) continue;
      var t = node.nodeValue;
      if (!t || t.toLowerCase().indexOf("bibi") === -1) continue;
      node.nodeValue = t
        .replace(/Calçados Bibi/gi, "Dom Bosco Calçados")
        .replace(/loja Bibi/gi, "loja Dom Bosco")
        .replace(/Meu 1[º°] Bibi/gi, "Meu 1º Dom Bosco")
        .replace(/Sobre a Bibi/gi, "Sobre a Dom Bosco")
        .replace(/é na Bibi/gi, "é na Dom Bosco")
        .replace(/\bBIBI\b/g, "DOM BOSCO")
        .replace(/\bBibi\b/g, "Dom Bosco")
        .replace(/\bbibi\b/g, "Dom Bosco");
    }
    document.querySelectorAll("img[alt*='Bibi'], img[alt*='bibi']").forEach(function (img) {
      img.alt = (img.alt || "").replace(/Bibi/gi, "Dom Bosco");
    });
    if (document.title && /bibi/i.test(document.title)) {
      document.title = document.title.replace(/Bibi/gi, "Dom Bosco");
    }
  }

  function startCarousel() {
    var slides = document.querySelectorAll("#db-hero-head .db-hero-photo");
    var dots = document.querySelectorAll("#db-hero-head .db-hero-dots button");
    if (!slides.length) return;
    var i = 0;
    function show(n) {
      i = (n + slides.length) % slides.length;
      slides.forEach(function (s, k) {
        s.classList.toggle("is-active", k === i);
      });
      dots.forEach(function (d, k) {
        d.classList.toggle("is-active", k === i);
      });
    }
    dots.forEach(function (d, k) {
      d.addEventListener("click", function () {
        show(k);
      });
    });
    if (window.__dbHeroTimer) clearInterval(window.__dbHeroTimer);
    window.__dbHeroTimer = setInterval(function () {
      show(i + 1);
    }, 6000);
  }

  function mount() {
    if (!document.body) return;
    if (!document.getElementById("db-hero-head")) {
      var wrap = document.createElement("div");
      wrap.id = "db-hero-head";
      wrap.innerHTML = document.getElementById("db-hero-template")
        ? ""
        : "";
      document.body.insertBefore(wrap, document.body.firstChild);
    }
    startCarousel();
    replaceBrand(document.body);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
  setTimeout(mount, 400);
  setTimeout(function () {
    replaceBrand(document.body);
  }, 1500);
  setTimeout(function () {
    replaceBrand(document.body);
  }, 4000);
})();
