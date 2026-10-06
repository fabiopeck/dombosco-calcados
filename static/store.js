(function () {
  var WA_NUMBER = "5535988985651";

  function initHero() {
    var hero = document.querySelector(".hero");
    var track = document.querySelector(".hero-track");
    var slides = Array.prototype.slice.call(document.querySelectorAll(".hero-slide"));
    var dotsWrap = document.querySelector(".hero-dots");
    var prev = document.querySelector(".hero-arrow.prev");
    var next = document.querySelector(".hero-arrow.next");
    var progress = document.querySelector(".hero-progress span");
    // Video hero (or empty slideshow): skip carousel logic
    if (!hero || !track || !slides.length || !dotsWrap) return;

    var index = 0;
    var timer = null;
    var paused = false;
    var startX = 0;
    var deltaX = 0;
    var dragging = false;

    dotsWrap.innerHTML = "";
    slides.forEach(function (_, i) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.setAttribute("aria-label", "Banner " + (i + 1));
      if (i === 0) btn.classList.add("is-active");
      btn.addEventListener("click", function () {
        show(i);
      });
      dotsWrap.appendChild(btn);
    });
    var dots = Array.prototype.slice.call(dotsWrap.querySelectorAll("button"));

    function slideDuration(i) {
      var raw = slides[i] && slides[i].getAttribute("data-duration");
      var ms = parseInt(raw, 10);
      return ms > 0 ? ms : 6000;
    }

    function resetProgress() {
      if (!progress) return;
      progress.classList.remove("is-running");
      progress.style.animationDuration = slideDuration(index) + "ms";
      void progress.offsetWidth;
      if (!paused) progress.classList.add("is-running");
    }

    function show(n) {
      index = (n + slides.length) % slides.length;
      track.style.transform = "translate3d(" + -index * 100 + "%, 0, 0)";
      slides.forEach(function (slide, i) {
        slide.classList.toggle("is-active", i === index);
      });
      dots.forEach(function (dot, i) {
        dot.classList.toggle("is-active", i === index);
      });
      restart();
    }

    function restart() {
      clearTimeout(timer);
      resetProgress();
      if (paused) return;
      timer = setTimeout(function () {
        show(index + 1);
      }, slideDuration(index));
    }

    function pause() {
      paused = true;
      clearTimeout(timer);
      if (progress) progress.classList.remove("is-running");
    }

    function resume() {
      paused = false;
      restart();
    }

    if (prev) prev.addEventListener("click", function () { show(index - 1); });
    if (next) next.addEventListener("click", function () { show(index + 1); });

    hero.addEventListener("mouseenter", pause);
    hero.addEventListener("mouseleave", resume);
    hero.addEventListener("focusin", pause);
    hero.addEventListener("focusout", function (e) {
      if (!hero.contains(e.relatedTarget)) resume();
    });

    track.addEventListener("touchstart", function (e) {
      dragging = true;
      startX = e.touches[0].clientX;
      deltaX = 0;
      pause();
    }, { passive: true });

    track.addEventListener("touchmove", function (e) {
      if (!dragging) return;
      deltaX = e.touches[0].clientX - startX;
    }, { passive: true });

    track.addEventListener("touchend", function () {
      if (!dragging) return;
      dragging = false;
      if (Math.abs(deltaX) > 50) {
        show(index + (deltaX < 0 ? 1 : -1));
      } else {
        resume();
      }
    });

    show(0);
  }

  function initSizes() {
    document.querySelectorAll(".size-row button, .size-picks button").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var group = btn.parentElement;
        group.querySelectorAll("button").forEach(function (b) {
          b.classList.remove("is-active");
        });
        btn.classList.add("is-active");
      });
    });
  }

  function initTabs() {
    var tabs = document.querySelectorAll(".tabs button");
    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        tabs.forEach(function (t) {
          t.classList.remove("is-active");
        });
        tab.classList.add("is-active");
      });
    });
  }

  function initBag() {
    var WA_EMPTY =
      "Olá! Vim pelo site da Dom Bosco Calçados.";
    var STORAGE_KEY = "dombosco-cart-v1";
    var countEl = document.querySelector(".cart-count");
    var openBtn = document.getElementById("open-cart");
    var closeBtn = document.getElementById("close-cart");
    var overlay = document.getElementById("cart-overlay");
    var drawer = document.getElementById("cart-drawer");
    var itemsEl = document.getElementById("cart-items");
    var waFloat = document.getElementById("wa-float");
    var cartWaBtn = document.getElementById("cart-wa-btn");
    var items = [];

    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved) items = JSON.parse(saved) || [];
      if (!Array.isArray(items)) items = [];
    } catch (e) {
      items = [];
    }

    function selectedSize() {
      var active = document.querySelector(".size-row button.is-active");
      return active ? active.textContent.trim() : "";
    }

    function totalQty() {
      return items.reduce(function (sum, item) {
        return sum + (item.qty || 0);
      }, 0);
    }

    function persist() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      } catch (e) {}
    }

    function buildMessage() {
      if (!items.length) return WA_EMPTY;
      var lines = [
        "Olá! Gostaria de fazer um pedido pela Dom Bosco Calçados:",
        ""
      ];
      items.forEach(function (item, i) {
        var line = (i + 1) + ". " + item.name + " (qtd: " + item.qty;
        if (item.size) line += ", numeração: " + item.size;
        line += ")";
        lines.push(line);
      });
      lines.push("");
      lines.push("Podem me ajudar com disponibilidade, numeração e frete?");
      return lines.join("\n");
    }

    function waUrl() {
      return "https://wa.me/" + WA_NUMBER + "?text=" + encodeURIComponent(buildMessage());
    }

    function syncWhatsApp() {
      var href = waUrl();
      var qty = totalQty();
      if (waFloat) {
        waFloat.setAttribute("href", href);
        waFloat.setAttribute(
          "aria-label",
          qty
            ? "Enviar pedido de " + qty + " item(ns) no WhatsApp"
            : "WhatsApp da loja (35) 98898-5651"
        );
      }
      if (cartWaBtn) {
        cartWaBtn.setAttribute("href", href);
        cartWaBtn.classList.toggle("is-disabled", !qty);
        cartWaBtn.setAttribute("aria-disabled", qty ? "false" : "true");
        cartWaBtn.textContent = qty
          ? "Enviar pedido no WhatsApp (" + qty + ")"
          : "Adicione itens para enviar";
      }
    }

    function render() {
      var qty = totalQty();
      if (countEl) countEl.textContent = String(qty);

      if (itemsEl) {
        if (!items.length) {
          itemsEl.innerHTML =
            '<p class="cart-empty">Sua sacolinha está vazia. Escolha um produto e toque em Comprar.</p>';
        } else {
          itemsEl.innerHTML = items
            .map(function (item) {
              var sizeHtml = item.size
                ? '<span class="cart-item-size">Núm. ' + item.size + "</span>"
                : "";
              return (
                '<article class="cart-item" data-id="' +
                item.id +
                '">' +
                '<img class="cart-item-img" src="' +
                item.image +
                '" alt="">' +
                '<div class="cart-item-info">' +
                "<h3>" +
                item.name +
                "</h3>" +
                sizeHtml +
                '<div class="cart-item-actions">' +
                '<button type="button" class="cart-qty" data-act="dec" aria-label="Diminuir">−</button>' +
                '<span class="cart-qty-val">' +
                item.qty +
                "</span>" +
                '<button type="button" class="cart-qty" data-act="inc" aria-label="Aumentar">+</button>' +
                '<button type="button" class="cart-remove" data-act="rm">Remover</button>' +
                "</div></div></article>"
              );
            })
            .join("");
        }
      }

      syncWhatsApp();
      persist();
    }

    function openCart() {
      if (!drawer || !overlay) return;
      drawer.removeAttribute("hidden");
      overlay.removeAttribute("hidden");
      document.body.classList.add("cart-open");
      if (openBtn) openBtn.setAttribute("aria-expanded", "true");
      requestAnimationFrame(function () {
        drawer.classList.add("is-open");
        overlay.classList.add("is-open");
      });
    }

    function closeCart() {
      if (!drawer || !overlay) return;
      drawer.classList.remove("is-open");
      overlay.classList.remove("is-open");
      document.body.classList.remove("cart-open");
      if (openBtn) openBtn.setAttribute("aria-expanded", "false");
      setTimeout(function () {
        if (!drawer.classList.contains("is-open")) {
          drawer.setAttribute("hidden", "");
          overlay.setAttribute("hidden", "");
        }
      }, 280);
    }

    function productFromCard(card) {
      var title =
        (card.querySelector("h3") && card.querySelector("h3").textContent.trim()) ||
        "Produto Dom Bosco";
      var img = card.querySelector("img");
      var image = img ? img.getAttribute("src") : "/assets/logo-header.png";
      var size = selectedSize();
      var id = title.toLowerCase() + "|" + (size || "-") + "|" + image;
      return { id: id, name: title, image: image, size: size, qty: 1 };
    }

    document.querySelectorAll(".add-bag").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var card = btn.closest(".product");
        if (!card) return;
        var product = productFromCard(card);
        var existing = items.find(function (item) {
          return item.id === product.id;
        });
        if (existing) {
          existing.qty += 1;
        } else {
          items.push(product);
        }
        render();
        openCart();
        var prev = btn.textContent;
        btn.textContent = "Adicionado";
        setTimeout(function () {
          btn.textContent = prev || "Comprar";
        }, 1200);
      });
    });

    if (itemsEl) {
      itemsEl.addEventListener("click", function (e) {
        var btn = e.target.closest("[data-act]");
        if (!btn) return;
        var row = btn.closest(".cart-item");
        if (!row) return;
        var id = row.getAttribute("data-id");
        var item = items.find(function (it) {
          return it.id === id;
        });
        if (!item) return;
        var act = btn.getAttribute("data-act");
        if (act === "inc") item.qty += 1;
        if (act === "dec") item.qty -= 1;
        if (act === "rm" || item.qty <= 0) {
          items = items.filter(function (it) {
            return it.id !== id;
          });
        }
        render();
      });
    }

    if (openBtn) {
      openBtn.addEventListener("click", function (e) {
        e.preventDefault();
        openCart();
      });
    }
    if (closeBtn) closeBtn.addEventListener("click", closeCart);
    if (overlay) overlay.addEventListener("click", closeCart);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && document.body.classList.contains("cart-open")) {
        closeCart();
      }
    });

    if (cartWaBtn) {
      cartWaBtn.addEventListener("click", function (e) {
        if (!items.length) {
          e.preventDefault();
          return;
        }
      });
    }

    render();
  }

  function initRails() {
    document.querySelectorAll(".rail-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-rail");
        var dir = parseInt(btn.getAttribute("data-dir"), 10) || 1;
        var rail = document.getElementById(id);
        if (!rail) return;
        var amount = Math.max(rail.clientWidth * 0.8, 240);
        rail.scrollBy({ left: dir * amount, behavior: "smooth" });
      });
    });
  }

  function initCupom() {}

  function initMenu() {
    var toggle = document.querySelector(".menu-toggle");
    var nav = document.querySelector(".mobile-nav");
    if (!toggle || !nav) return;

    function closeMenu() {
      nav.setAttribute("hidden", "");
      toggle.setAttribute("aria-expanded", "false");
      document.body.classList.remove("nav-drawer-open");
    }

    function openMenu() {
      nav.removeAttribute("hidden");
      toggle.setAttribute("aria-expanded", "true");
      document.body.classList.add("nav-drawer-open");
    }

    toggle.addEventListener("click", function () {
      if (nav.hasAttribute("hidden")) openMenu();
      else closeMenu();
    });

    nav.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", closeMenu);
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeMenu();
    });

    document.addEventListener("click", function (e) {
      if (nav.hasAttribute("hidden")) return;
      if (e.target.closest(".mobile-nav") || e.target.closest(".menu-toggle")) return;
      closeMenu();
    });
  }

  function initNewsletter() {
    var form = document.querySelector(".newsletter");
    if (!form) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var input = form.querySelector('input[type="email"], input[name="email"], input');
      if (!input) return;
      var email = (input.value || "").trim();
      if (!email) {
        input.focus();
        return;
      }
      var msg =
        "Olá! Quero o cupom de desconto da primeira compra na Dom Bosco Calçados.\n" +
        "E-mail: " +
        email;
      var url = "https://wa.me/" + WA_NUMBER + "?text=" + encodeURIComponent(msg);
      window.open(url, "_blank", "noopener,noreferrer");
      input.value = "";
    });
  }

  function initStoresMap() {
    var el = document.getElementById("stores-map");
    if (!el || typeof L === "undefined") return;

    var stores = Array.prototype.slice.call(document.querySelectorAll(".store-item"));
    if (!stores.length) return;

    var map = L.map(el, { scrollWheelZoom: false });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    var markers = [];
    var bounds = [];

    function pinIcon(n) {
      return L.divIcon({
        className: "",
        html: '<div class="db-map-pin"><span>' + n + "</span></div>",
        iconSize: [28, 28],
        iconAnchor: [14, 28],
        popupAnchor: [0, -28],
      });
    }

    stores.forEach(function (btn, i) {
      var lat = parseFloat(btn.getAttribute("data-lat"));
      var lng = parseFloat(btn.getAttribute("data-lng"));
      var title = (btn.querySelector("strong") || {}).textContent || "Loja";
      var addr = (btn.querySelector("span") || {}).textContent || "";
      var marker = L.marker([lat, lng], { icon: pinIcon(i + 1) }).addTo(map);
      marker.bindPopup("<strong>" + title + "</strong><br>" + addr);
      markers.push(marker);
      bounds.push([lat, lng]);

      btn.addEventListener("click", function () {
        stores.forEach(function (b) {
          b.classList.remove("is-active");
        });
        btn.classList.add("is-active");
        map.setView([lat, lng], 17, { animate: true });
        marker.openPopup();
      });
    });

    if (bounds.length) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
    }

    function refreshMapSize() {
      map.invalidateSize({ animate: false });
    }

    setTimeout(refreshMapSize, 100);
    setTimeout(refreshMapSize, 400);
    window.addEventListener("resize", refreshMapSize);

    if (typeof IntersectionObserver !== "undefined") {
      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) refreshMapSize();
          });
        },
        { threshold: 0.1 }
      );
      io.observe(el);
    }
  }

  function initFloatVideo() {
    var box = document.getElementById("float-video");
    var close = document.querySelector(".float-video-close");
    if (!box || !close) return;
    close.addEventListener("click", function () {
      box.classList.add("is-hidden");
      stopFloatVideo();
    });

    var slides = Array.prototype.slice.call(
      box.querySelectorAll(".float-video-slides > img, .float-video-slides > video")
    );
    if (slides.length < 2) return;

    var index = 0;
    var timer = null;
    var IMAGE_MS = 6000;

    function stopFloatVideo() {
      slides.forEach(function (el) {
        if (el.tagName === "VIDEO") {
          el.pause();
          try { el.currentTime = 0; } catch (e) {}
        }
      });
    }

    function clearTimer() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    }

    function show(n) {
      if (box.classList.contains("is-hidden")) return;
      clearTimer();
      stopFloatVideo();
      slides[index].classList.remove("is-active");
      index = (n + slides.length) % slides.length;
      var current = slides[index];
      current.classList.add("is-active");

      if (current.tagName === "VIDEO") {
        current.muted = true;
        var playPromise = current.play();
        if (playPromise && typeof playPromise.catch === "function") {
          playPromise.catch(function () {
            // autoplay blocked: advance after image delay
            timer = setTimeout(function () { show(index + 1); }, IMAGE_MS);
          });
        }
        current.onended = function () {
          current.onended = null;
          show(index + 1);
        };
      } else {
        timer = setTimeout(function () {
          show(index + 1);
        }, IMAGE_MS);
      }
    }

    show(0);
  }

  function initCookies() {
    var bar = document.getElementById("cookie-bar");
    var toast = document.getElementById("cookie-toast");
    if (!bar) return;

    var key = "dombosco_cookies_ok";
    try {
      if (localStorage.getItem(key)) {
        bar.setAttribute("hidden", "");
        document.body.classList.remove("cookie-visible");
        return;
      }
    } catch (e) {}

    bar.removeAttribute("hidden");
    document.body.classList.add("cookie-visible");

    function saveChoice(choice) {
      try {
        localStorage.setItem(key, choice || "1");
      } catch (e) {}
      bar.setAttribute("hidden", "");
      document.body.classList.remove("cookie-visible");
      if (toast) {
        toast.removeAttribute("hidden");
        setTimeout(function () {
          toast.setAttribute("hidden", "");
        }, 2200);
      }
    }

    bar.querySelectorAll("[data-cookie-choice]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        saveChoice(btn.getAttribute("data-cookie-choice"));
      });
    });
  }

  initHero();
  initSizes();
  initTabs();
  initBag();
  initRails();
  initCupom();
  initMenu();
  initNewsletter();
  initStoresMap();
  initFloatVideo();
  initCookies();
})();
