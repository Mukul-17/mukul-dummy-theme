/* =========================================================
   MODRN theme — storefront JS
   Products & collections render via Liquid; this handles all
   interaction: hero slider, anatomy, fabric lens, counters,
   reviews, reveals, chrome, cart drawer, sheets, search.
   ========================================================= */
(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const R = window.routes || { cart_add: "/cart/add.js", cart: "/cart.js", cart_change: "/cart/change.js", search: "/search" };
  const money = (cents) => "₹" + (cents / 100).toLocaleString("en-IN");
  const haptic = () => { if (navigator.vibrate) navigator.vibrate(8); };

  /* ---------------- toast ---------------- */
  let toastTimer;
  function toast(msg, ok) {
    const t = $("#toast");
    if (!t) return;
    t.innerHTML = (ok ? '<span class="toast__icon">✓</span>' : "") + "<span>" + msg + "</span>";
    t.classList.add("is-show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("is-show"), 2200);
  }

  /* ---------------- scroll reveals ---------------- */
  function initReveals() {
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    $$(".reveal, .reveal-fade, .mask").forEach((el) => io.observe(el));
  }

  /* ---------------- counters ---------------- */
  function initCounters() {
    const io = new IntersectionObserver((es) => {
      es.forEach((en) => {
        if (!en.isIntersecting) return;
        const el = en.target, to = +el.getAttribute("data-to");
        let start = null; const dur = 1400;
        const step = (ts) => {
          if (!start) start = ts;
          const p = Math.min((ts - start) / dur, 1);
          el.textContent = Math.round((1 - Math.pow(1 - p, 3)) * to);
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
        io.unobserve(el);
      });
    }, { threshold: 0.5 });
    $$("[data-counter]").forEach((el) => io.observe(el));
  }

  /* ---------------- shared rail dots ---------------- */
  function bindRailDots(scroller, dotsWrap) {
    if (!scroller || !dotsWrap) return;
    const dots = $$(".rail__dot", dotsWrap);
    if (!dots.length) return;
    let raf;
    scroller.addEventListener("scroll", () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = null;
        const children = Array.from(scroller.children);
        const center = scroller.scrollLeft + scroller.clientWidth / 2;
        let active = 0, best = Infinity;
        children.forEach((c, i) => {
          const mid = c.offsetLeft + c.offsetWidth / 2;
          const d = Math.abs(mid - center);
          if (d < best) { best = d; active = i; }
        });
        dots.forEach((d, i) => d.classList.toggle("is-active", i === active));
      });
    }, { passive: true });
  }

  /* ---------------- rail arrow / swipe hint ---------------- */
  function initRail(wrap) {
    const rail = $(".rail", wrap);
    const arrow = $(".rail-arrow", wrap);
    if (!rail) return;
    const maxScroll = () => rail.scrollWidth - rail.clientWidth;
    let raf;
    rail.addEventListener("scroll", () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = null;
        if (rail.scrollLeft > 8) wrap.classList.add("is-scrolled");
        wrap.classList.toggle("is-ended", rail.scrollLeft >= maxScroll() - 4);
      });
    }, { passive: true });
    if (arrow) arrow.addEventListener("click", () => {
      const card = rail.querySelector(".pcard");
      const gap = parseFloat(getComputedStyle(rail).columnGap || "14") || 14;
      const step = card ? card.offsetWidth + gap : rail.clientWidth * 0.72;
      const next = rail.scrollLeft + step;
      rail.scrollTo({ left: next >= maxScroll() - 4 ? maxScroll() : next, behavior: "smooth" });
      haptic();
    });
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const io = new IntersectionObserver((es, o) => {
      es.forEach((e) => {
        if (!e.isIntersecting || wrap.classList.contains("is-scrolled")) return;
        o.disconnect();
        setTimeout(() => {
          if (wrap.classList.contains("is-scrolled")) return;
          rail.scrollTo({ left: 34, behavior: "smooth" });
          setTimeout(() => { if (!wrap.classList.contains("is-scrolled")) rail.scrollTo({ left: 0, behavior: "smooth" }); }, 600);
        }, 650);
      });
    }, { threshold: 0.4 });
    io.observe(wrap);
  }

  /* ---------------- hero slider ---------------- */
  function initSlider() {
    const slider = $("#bnSlider");
    if (!slider) return;
    const slides = $$(".slide", slider);
    const segs = $$(".seg", slider);
    const vids = $$("video", slider);
    if (!slides.length) return;
    let i = 0, t0 = performance.now(), paused = false, elapsed = 0;
    let DUR = +slides[0].dataset.dur || 6500;

    function go(n) {
      i = (n + slides.length) % slides.length;
      slides.forEach((s, j) => s.classList.toggle("on", j === i));
      segs.forEach((sg, j) => { sg.classList.toggle("done", j < i); const bar = sg.querySelector("i"); if (bar) bar.style.width = "0%"; });
      DUR = +slides[i].dataset.dur || 6500;
      t0 = performance.now(); elapsed = 0;
      vids.forEach((v) => { v.closest(".slide").classList.contains("on") ? v.play().catch(() => {}) : v.pause(); });
    }

    const next = $("#bnNext"), prev = $("#bnPrev"), tapL = $("#bnTapL"), tapR = $("#bnTapR");
    if (next) next.addEventListener("click", () => { go(i + 1); haptic(); });
    if (prev) prev.addEventListener("click", () => { go(i - 1); haptic(); });
    if (tapR) tapR.addEventListener("click", () => go(i + 1));
    if (tapL) tapL.addEventListener("click", () => go(i - 1));

    // (auto-advance never pauses on hover or tap-hold — keeps running continuously)

    let visible = true;
    new IntersectionObserver((es) => { visible = es[0].isIntersecting; if (visible) t0 = performance.now() - elapsed; }, { threshold: 0.05 }).observe(slider);

    (function loop(t) {
      if (!paused && visible && segs[i]) {
        elapsed = t - t0;
        const bar = segs[i].querySelector("i");
        if (bar) bar.style.width = Math.min((elapsed / DUR) * 100, 100) + "%";
        if (elapsed >= DUR) go(i + 1);
      }
      requestAnimationFrame(loop);
    })(performance.now());

    let sx = null, sy = null;
    slider.addEventListener("touchstart", (e) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    slider.addEventListener("touchend", (e) => {
      if (sx === null) return;
      const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) go(i + (dx < 0 ? 1 : -1));
      sx = sy = null;
    }, { passive: true });

    go(0);
  }

  /* ---------------- anatomy ---------------- */
  function initAnatomy() {
    const sec = $("#anatomy");
    if (!sec) return;
    const pinwrap = $(".a-pinwrap", sec);
    const spots = $$(".hotspot", sec);
    const steps = $$(".astep", sec);
    const prog = $(".a-progress i", sec);
    const io = new IntersectionObserver((es, o) => {
      es.forEach((e) => { if (e.isIntersecting) { o.disconnect(); sec.classList.add("is-drawn"); } });
    }, { threshold: 0.15 });
    io.observe(pinwrap || sec);

    // Pinned scrollytelling: progress through the tall .a-pinwrap track maps to the
    // active point. Points/steps with index <= idx light up; reverse clears going up.
    let lastIdx = -2;
    const update = () => {
      if (!pinwrap) return;
      const r = pinwrap.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      const total = r.height - vh;
      const p = total > 0 ? Math.min(Math.max(-r.top / total, 0), 1) : 0;
      if (prog) prog.style.width = (p * 100) + "%";
      const idx = Math.min(Math.floor(p * spots.length), spots.length - 1);
      if (idx === lastIdx) return;
      lastIdx = idx;
      spots.forEach((s) => { const i = +s.dataset.i; const on = i <= idx; s.classList.toggle("on", on); s.classList.toggle("current", i === idx); });
      steps.forEach((s) => s.classList.toggle("is-active", +s.dataset.i <= idx));
    };
    let ticking = false;
    const onScroll = () => { if (ticking) return; ticking = true; requestAnimationFrame(() => { update(); ticking = false; }); };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    update();
  }

  /* ---------------- reusable Amazon-style lens zoom ----------------
     box=hover/tap target, img=source, lens=highlight rect, zoom=result panel,
     host=element that gets .is-zooming. touchOnly=true binds touch only. */
  function lensZoom(box, img, lens, zoom, host, touchOnly) {
    if (!box || !img || !lens || !zoom) return null;
    const Z = 2.4, BASE = 1;
    let active = false;
    const url = () => img.currentSrc || img.src;
    const setBg = () => { zoom.style.backgroundImage = `url('${url()}')`; };
    if (img.complete) setBg(); else img.addEventListener("load", setBg, { once: true });

    function placePanel(rect, mouse) {
      const vw = window.innerWidth, gap = 16;
      if (mouse && vw >= 900) {
        const roomRight = vw - rect.right - gap - 12;
        if (roomRight >= 260) {
          zoom.style.left = (rect.right + gap) + "px"; zoom.style.width = Math.min(roomRight, 460) + "px";
          zoom.style.top = rect.top + "px"; zoom.style.height = rect.height + "px"; return;
        }
      }
      zoom.style.left = rect.left + "px"; zoom.style.top = rect.top + "px";
      zoom.style.width = rect.width + "px"; zoom.style.height = rect.height + "px";
    }

    let R = null, PW = 0, PH = 0, CW = 0, CH = 0, HZ = 1, LW = 0, LH = 0, raf = 0, mx = 0, my = 0;
    function prime() {
      R = box.getBoundingClientRect();
      const zr = zoom.getBoundingClientRect();
      PW = zr.width; PH = zr.height;
      const nw = img.naturalWidth || R.width, nh = img.naturalHeight || R.height;
      const f = Math.max(R.width / nw, R.height / nh);
      CW = nw * f; CH = nh * f; HZ = BASE * Z; LW = PW / Z; LH = PH / Z;
      lens.style.width = LW + "px"; lens.style.height = LH + "px";
      zoom.style.backgroundSize = (CW * HZ) + "px " + (CH * HZ) + "px";
    }
    function move(cx, cy) {
      if (!R) return;
      const bx = Math.max(0, Math.min(cx - R.left, R.width));
      const by = Math.max(0, Math.min(cy - R.top, R.height));
      const lcx = Math.max(LW / 2, Math.min(bx, R.width - LW / 2));
      const lcy = Math.max(LH / 2, Math.min(by, R.height - LH / 2));
      lens.style.left = lcx + "px"; lens.style.top = lcy + "px";
      const covx = R.width / 2 + (lcx - R.width / 2) / BASE;
      const covy = R.height / 2 + (lcy - R.height / 2) / BASE;
      const scx = (CW - R.width) / 2 + covx;
      const scy = (CH - R.height) / 2 + covy;
      zoom.style.backgroundPosition = (PW / 2 - scx * HZ) + "px " + (PH / 2 - scy * HZ) + "px";
    }
    function queueMove(cx, cy) { mx = cx; my = cy; if (!raf) raf = requestAnimationFrame(() => { raf = 0; move(mx, my); }); }
    function start(e) { setBg(); placePanel(box.getBoundingClientRect(), e.pointerType === "mouse"); prime(); active = true; host.classList.add("is-zooming"); move(e.clientX, e.clientY); }
    function stop() { active = false; host.classList.remove("is-zooming"); if (raf) { cancelAnimationFrame(raf); raf = 0; } }

    if (!touchOnly) {
      box.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") start(e); });
      box.addEventListener("pointerover", (e) => { if (e.pointerType === "mouse" && !active) start(e); });
      box.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") stop(); });
    }
    box.addEventListener("pointerdown", (e) => { if (e.pointerType !== "mouse") { start(e); try { box.setPointerCapture(e.pointerId); } catch (_) {} } });
    box.addEventListener("pointermove", (e) => {
      if (!touchOnly && e.pointerType === "mouse" && !active) start(e);
      if (active) { if (e.cancelable) e.preventDefault(); queueMove(e.clientX, e.clientY); }
    }, { passive: false });
    box.addEventListener("pointerup", (e) => { if (e.pointerType !== "mouse") stop(); });
    box.addEventListener("pointercancel", stop);
    box.addEventListener("contextmenu", (e) => e.preventDefault());
    window.addEventListener("scroll", () => { if (active) stop(); }, { passive: true });
    return { setBg, stop };
  }

  /* ---------------- feel the fabric (Amazon-style zoom) ---------------- */
  function initFabric() {
    const box = $("#lensbox");
    if (!box) return;
    const lens = $("#lens"), img = $("#lensimg"), thumbs = $("#fab-thumbs"), feel = $("#fabric"), zoom = $("#lenszoom");
    if (!zoom) return;
    const z = lensZoom(box, img, lens, zoom, feel, false);

    if (thumbs) thumbs.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-src]"); if (!b) return;
      $$("button", thumbs).forEach((x) => x.classList.remove("is-active"));
      b.classList.add("is-active");
      img.src = b.dataset.src;
      if (z) img.addEventListener("load", z.setBg, { once: true });
      haptic();
    });

    const weigh = $("#weigh");
    if (weigh && feel) {
      const armIO = new IntersectionObserver((es, o) => { es.forEach((e) => { if (e.isIntersecting) { feel.classList.add("is-armed"); o.disconnect(); } }); }, { threshold: 0.35 });
      armIO.observe(weigh);
    }
  }

  /* ---------------- trust ---------------- */
  function initTrust() {
    const sec = $("#trust");
    if (!sec) return;
    const io = new IntersectionObserver((es, o) => {
      es.forEach((e) => {
        if (!e.isIntersecting) return;
        o.disconnect();
        sec.classList.add("is-armed");
        const v = $("#riskval"); if (!v) return;
        const start = performance.now() + 900, dur = 1800;
        const tick = (t) => {
          if (t < start) { requestAnimationFrame(tick); return; }
          const pr = Math.min((t - start) / dur, 1);
          v.textContent = Math.round(100 * (1 - pr) * (1 - pr)) + "%";
          if (pr < 1) requestAnimationFrame(tick); else v.textContent = "0%";
        };
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.3 });
    io.observe(sec);
  }

  /* ---------------- reviews autoplay ---------------- */
  function initReviewAuto() {
    const track = $("#reviews-track");
    if (!track) return;
    let idx = 0, paused = false;
    track.addEventListener("touchstart", () => (paused = true), { passive: true });
    setInterval(() => {
      if (paused || !track.children.length) return;
      idx = (idx + 1) % track.children.length;
      const child = track.children[idx];
      track.scrollTo({ left: child.offsetLeft - 16, behavior: "smooth" });
    }, 5000);
  }

  /* ---------------- chrome: progress, appbar, active tab ---------------- */
  function initChrome() {
    const progress = $("#scroll-progress");
    const appbar = $("#appbar");
    const tabs = $$(".tab[data-tab]");
    const ids = ["top", "drop", "collections"];
    let sections = [], docH = 0;
    const measure = () => {
      sections = ids.map((id) => { const el = $("#" + id); return el ? { id, top: el.offsetTop } : null; }).filter(Boolean);
      docH = document.documentElement.scrollHeight - window.innerHeight;
    };
    let raf, lastScrolled = null, lastPast = null, lastTab = null;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = null;
        const y = window.scrollY;
        if (progress) progress.style.transform = `scaleX(${docH > 0 ? Math.min(1, y / docH) : 0})`;
        const scrolled = y > 20;
        if (scrolled !== lastScrolled && appbar) { appbar.classList.toggle("is-scrolled", scrolled); lastScrolled = scrolled; }
        const past = y > 60;
        if (past !== lastPast) { document.body.classList.toggle("scrolled-past", past); lastPast = past; }
        const probe = y + window.innerHeight * 0.35;
        let current = "top";
        for (const s of sections) { if (s.top <= probe) current = s.id; }
        if (current !== lastTab) { tabs.forEach((t) => t.classList.toggle("is-active", t.getAttribute("data-tab") === current)); lastTab = current; }
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", () => { measure(); onScroll(); }, { passive: true });
    window.addEventListener("load", () => { measure(); onScroll(); });
    setTimeout(measure, 600); setTimeout(measure, 1800);
    measure(); onScroll();
  }

  /* ---------------- generic sheets (menu/search/cart) ---------------- */
  const openStack = [];
  function openSheet(id) {
    const root = $("#" + id); if (!root) return;
    root.hidden = false;
    document.body.classList.add("no-scroll");
    requestAnimationFrame(() => root.classList.add("is-open"));
    if (!openStack.includes(id)) openStack.push(id);
    if (id === "search-sheet") setTimeout(() => $("#search-input")?.focus(), 300);
  }
  function closeSheet(id) {
    const root = $("#" + id); if (!root) return;
    root.classList.remove("is-open");
    const k = openStack.indexOf(id); if (k >= 0) openStack.splice(k, 1);
    if (!openStack.length) document.body.classList.remove("no-scroll");
    setTimeout(() => {
      root.hidden = true;
      // reset any open drawer sub-panel so it reopens at the root next time
      root.querySelectorAll(".drawer__subview.is-current").forEach((v) => v.classList.remove("is-current"));
    }, 450);
  }

  /* ---------------- cart ---------------- */
  async function getCart() { return (await fetch(R.cart)).json(); }
  function setCount(n) { $$(".bag-count").forEach((b) => { b.textContent = n; b.hidden = n === 0; }); }

  function renderCart(cart) {
    setCount(cart.item_count);
    const label = $("#cart-count-label"); if (label) label.textContent = cart.item_count ? `(${cart.item_count})` : "";
    const items = $("#cart-items"), foot = $("#cart-foot");
    if (!items) return;
    if (cart.item_count === 0) {
      items.innerHTML = `<div class="cart__empty"><p>Your bag is empty.</p></div>`;
      if (foot) foot.hidden = true;
      return;
    }
    items.innerHTML = cart.items.map((it) => `
      <div class="cart__item" data-key="${it.key}" style="display:flex;gap:1rem;padding:1rem 0;border-bottom:1px solid var(--line);">
        <img src="${it.image ? it.image.replace(/(\.\w+)(\?|$)/, "_160x$1$2") : ""}" alt="" width="64" height="80" style="border-radius:10px;object-fit:cover;flex:0 0 64px;">
        <div style="flex:1;">
          <div class="pcard__name">${it.product_title}</div>
          <div class="pcard__sub">${it.variant_title || ""}</div>
          <div class="pcard__price" style="margin-top:0.3rem;"><b>${money(it.final_price)}</b></div>
          <div class="ps__qty" style="height:38px;margin-top:0.5rem;width:fit-content;">
            <button type="button" data-line-minus aria-label="Decrease">−</button><span>${it.quantity}</span><button type="button" data-line-plus aria-label="Increase">+</button>
          </div>
        </div>
        <button type="button" data-line-remove aria-label="Remove" style="color:var(--muted);align-self:flex-start;">✕</button>
      </div>`).join("");
    if (foot) { foot.hidden = false; $("#cart-subtotal").textContent = money(cart.total_price); }
  }

  async function changeLine(key, qty) {
    const cart = await (await fetch(R.cart_change, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ id: key, quantity: qty }) })).json();
    renderCart(cart);
  }
  async function addToCart(variantId, qty) {
    const res = await fetch(R.cart_add, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ items: [{ id: variantId, quantity: qty || 1 }] }) });
    if (!res.ok) { toast("Could not add — pick a size", false); return; }
    renderCart(await getCart());
    openSheet("cart-root");
    haptic();
  }

  /* ---------------- wishlist (localStorage) ---------------- */
  let wishlist = [];
  try { wishlist = JSON.parse(localStorage.getItem("modrn_wish") || "[]"); } catch (_) { wishlist = []; }
  function applyWish() { $$("[data-wish]").forEach((b) => b.classList.toggle("is-wished", wishlist.includes(b.getAttribute("data-wish")))); }

  /* ---------------- predictive search ---------------- */
  function initSearch() {
    const input = $("#search-input"), results = $("#search-results");
    if (!input || !results) return;
    let timer;
    const run = (q) => {
      q = q.trim();
      if (!q) { results.innerHTML = ""; return; }
      fetch(`${R.search}/suggest.json?q=${encodeURIComponent(q)}&resources[type]=product&resources[limit]=6`)
        .then((r) => r.json())
        .then((data) => {
          const items = (data.resources && data.resources.results && data.resources.results.products) || [];
          results.innerHTML = items.length
            ? items.map((p) => {
                const priceTxt = p.price != null ? p.price : "";
                return `<a class="sresult" href="${p.url}"><img src="${p.featured_image ? p.featured_image.url : (p.image || "")}" alt="${p.title}"><div><div class="sresult__name">${p.title}</div><div class="sresult__price">${priceTxt}</div></div></a>`;
              }).join("")
            : `<div class="sresult__none">No matches for "${q}"</div>`;
        }).catch(() => {});
    };
    input.addEventListener("input", (e) => { clearTimeout(timer); timer = setTimeout(() => run(e.target.value), 200); });
    $$(".chip").forEach((chip) => chip.addEventListener("click", () => { input.value = chip.getAttribute("data-search"); run(input.value); }));
  }

  /* ---------------- product page ---------------- */
  function initProduct() {
    const pform = $("#product-form");
    if (!pform) return;
    const idInput = $("#ps-variant-id"), priceEl = $("#ps-price"), compareEl = $("#ps-compare"), discEl = $("#ps-disc"), qtyEl = $("#ps-qty"), mainImg = $("#ps-main-img"), addBtn = $("#ps-add");

    // multi-option variant picker (colour + size etc.)
    let variants = [];
    const dataEl = $("#ps-variant-data");
    if (dataEl) { try { variants = JSON.parse(dataEl.textContent); } catch (_) {} }
    const selected = {};
    $$(".ps__size.is-active, .ps__swatch.is-active", pform).forEach((b) => { selected[b.dataset.position] = b.dataset.value; });
    const fmt = (cents) => "₹" + Math.round(cents / 100).toLocaleString("en-IN");
    const matchVariant = () => variants.find((vt) =>
      (selected["1"] == null || vt.option1 === selected["1"]) &&
      (selected["2"] == null || vt.option2 === selected["2"]) &&
      (selected["3"] == null || vt.option3 === selected["3"]));
    function update() {
      $$(".ps__chosen", pform).forEach((s) => { const p = s.dataset.chosen; if (selected[p]) s.textContent = selected[p]; });
      const vt = matchVariant();
      if (!vt) { if (addBtn) { addBtn.disabled = true; addBtn.textContent = "Unavailable"; } return; }
      idInput.value = vt.id;
      if (priceEl) priceEl.textContent = fmt(vt.price);
      if (vt.compare_at_price && vt.compare_at_price > vt.price) {
        if (compareEl) compareEl.textContent = fmt(vt.compare_at_price);
        if (discEl) discEl.innerHTML = '<span class="ps__disc-sign">−</span>' + Math.round((vt.compare_at_price - vt.price) * 100 / vt.compare_at_price) + "%";
      }
      if (addBtn) { addBtn.disabled = !vt.available; addBtn.textContent = vt.available ? "Add to bag" : "Sold out"; }
      if (vt.featured_image && vt.featured_image.src && pform.__swapImg) pform.__swapImg(vt.featured_image.src);
    }
    pform.addEventListener("click", (e) => {
      const btn = e.target.closest(".ps__size, .ps__swatch"); if (!btn) return;
      const pos = btn.dataset.position;
      $$(`.ps__size[data-position="${pos}"], .ps__swatch[data-position="${pos}"]`, pform).forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      selected[pos] = btn.dataset.value;
      haptic();
      update();
    });

    const getQty = () => parseInt(qtyEl.textContent, 10) || 1;
    $("#ps-minus")?.addEventListener("click", () => { qtyEl.textContent = Math.max(1, getQty() - 1); });
    $("#ps-plus")?.addEventListener("click", () => { qtyEl.textContent = getQty() + 1; });
    $("#ps-add")?.addEventListener("click", () => { if (!idInput.value) { toast("Please choose options", false); return; } addToCart(idInput.value, getQty()); });
    // hover / tap a section of the tee → magnify that section in place (mobile)
    const gallery = $("#ps-gallery");
    if (gallery && mainImg) {
      const zoomOn = (e) => {
        if (window.innerWidth >= 900) return;            // mobile only
        const r = gallery.getBoundingClientRect();
        const x = Math.max(0, Math.min((e.clientX - r.left) / r.width, 1)) * 100;
        const y = Math.max(0, Math.min((e.clientY - r.top) / r.height, 1)) * 100;
        mainImg.style.transformOrigin = x + "% " + y + "%";
        gallery.classList.add("is-zoom");
        if (e.cancelable && e.pointerType !== "mouse") e.preventDefault();
      };
      const zoomOff = () => gallery.classList.remove("is-zoom");
      // mouse: zoom while hovering, off when the cursor leaves
      gallery.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") zoomOn(e); });
      gallery.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") zoomOff(); });
      // touch: zoom on press, follow the finger (even outside the image) until lift
      gallery.addEventListener("pointerdown", (e) => { if (e.pointerType !== "mouse") { zoomOn(e); try { gallery.setPointerCapture(e.pointerId); } catch (_) {} } });
      gallery.addEventListener("pointermove", zoomOn, { passive: false });
      gallery.addEventListener("pointerup", zoomOff);
      gallery.addEventListener("pointercancel", zoomOff);
    }

    const swapImg = (src) => { if (mainImg && src) mainImg.src = src; };
    $$(".ps-thumb").forEach((t) => t.addEventListener("click", () => swapImg(t.dataset.full)));
    pform.__swapImg = swapImg;
  }

  /* ---------------- global click delegation ---------------- */
  document.addEventListener("click", (e) => {
    // open sheets
    if (e.target.closest("#menu-open")) { e.preventDefault(); openSheet("menu-sheet"); return; }
    const searchTrig = e.target.closest('#search-open, .tab[data-tab="search"], a[href$="/search"]');
    if (searchTrig) { e.preventDefault(); openSheet("search-sheet"); return; }
    const bag = e.target.closest('.appbar__bag, .tab--bag, a[href$="/cart"]');
    if (bag) { e.preventDefault(); getCart().then(renderCart).then(() => openSheet("cart-root")); return; }
    // drawer drill-down: open a sub-panel / go back
    const openSub = e.target.closest("[data-open-sub]");
    if (openSub) {
      e.preventDefault();
      const rootEl = openSub.closest(".sheet-root");
      const view = rootEl && rootEl.querySelector('.drawer__subview[data-view="' + openSub.getAttribute("data-open-sub") + '"]');
      if (view) view.classList.add("is-current");
      return;
    }
    const back = e.target.closest("[data-back]");
    if (back) { e.preventDefault(); const v = back.closest(".drawer__subview"); if (v) v.classList.remove("is-current"); return; }
    // close
    if (e.target.closest("[data-close]") || e.target.classList.contains("sheet__backdrop")) {
      if (e.target.closest("[data-cart-close]")) { closeSheet("cart-root"); return; }
      const root = e.target.closest(".sheet-root"); if (root) closeSheet(root.id); return;
    }
    // cart line controls
    const item = e.target.closest(".cart__item");
    if (item) {
      const key = item.dataset.key;
      const qEl = item.querySelector(".ps__qty span");
      const q = qEl ? parseInt(qEl.textContent, 10) : 1;
      if (e.target.closest("[data-line-plus]")) changeLine(key, q + 1);
      else if (e.target.closest("[data-line-minus]")) changeLine(key, Math.max(0, q - 1));
      else if (e.target.closest("[data-line-remove]")) changeLine(key, 0);
      return;
    }
    // wishlist
    const wb = e.target.closest("[data-wish]");
    if (wb) {
      e.preventDefault();
      const id = wb.getAttribute("data-wish");
      const k = wishlist.indexOf(id);
      if (k >= 0) { wishlist.splice(k, 1); wb.classList.remove("is-wished"); }
      else { wishlist.push(id); wb.classList.add("is-wished"); haptic(); toast("Saved to wishlist", true); }
      try { localStorage.setItem("modrn_wish", JSON.stringify(wishlist)); } catch (_) {}
      return;
    }
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && openStack.length) closeSheet(openStack[openStack.length - 1]); });

  /* ---------------- card image gallery (swipe/scroll, dots track) ---------------- */
  function initCardGallery() {
    $$(".pcard--multi").forEach((card) => {
      const track = card.querySelector(".pcard__track");
      const dots = $$(".pdot", card);
      if (!track) return;
      // dots follow the scroll position
      let sraf = 0;
      track.addEventListener("scroll", () => {
        if (sraf) return;
        sraf = requestAnimationFrame(() => {
          sraf = 0;
          const i = Math.round(track.scrollLeft / track.clientWidth);
          dots.forEach((d, k) => d.classList.toggle("is-on", k === i));
        });
      }, { passive: true });
      // desktop: click-drag to scroll (mouse); suppress the link click if dragged
      let down = false, sx = 0, sl = 0, moved = false;
      track.addEventListener("pointerdown", (e) => {
        if (e.pointerType !== "mouse") return;
        down = true; moved = false; sx = e.clientX; sl = track.scrollLeft;
        try { track.setPointerCapture(e.pointerId); } catch (_) {}
      });
      track.addEventListener("pointermove", (e) => {
        if (!down) return;
        const dx = e.clientX - sx;
        if (Math.abs(dx) > 3) { moved = true; track.classList.add("is-dragging"); }
        track.scrollLeft = sl - dx;
      });
      const up = (e) => { down = false; track.classList.remove("is-dragging"); try { track.releasePointerCapture(e.pointerId); } catch (_) {} };
      track.addEventListener("pointerup", up);
      track.addEventListener("pointercancel", up);
      track.addEventListener("click", (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); } }, true);
    });
  }

  /* ---------------- collection: load more (no page reload) ---------------- */
  function initLoadMore() {
    const grid = $("#collection-grid");
    const btn = $(".load-more");
    if (!grid || !btn) return;
    let busy = false;
    btn.addEventListener("click", async () => {
      const url = btn.dataset.next;
      if (!url || busy) return;
      busy = true; btn.disabled = true; btn.textContent = "Loading…";
      try {
        const res = await fetch(url, { headers: { "X-Requested-With": "fetch" } });
        const html = await res.text();
        const doc = new DOMParser().parseFromString(html, "text/html");
        const fresh = doc.querySelectorAll("#collection-grid > *");
        fresh.forEach((node) => grid.appendChild(document.importNode(node, true)));
        const nextBtn = doc.querySelector(".load-more");
        if (nextBtn && nextBtn.dataset.next) {
          btn.dataset.next = nextBtn.dataset.next;
          btn.disabled = false; btn.textContent = "More →";
        } else {
          btn.closest(".load-more-wrap")?.remove();
        }
        applyWish();
      } catch (_) {
        btn.disabled = false; btn.textContent = "More →";
      } finally {
        busy = false;
      }
    });
  }

  /* ---------------- category switcher (tee tags) ---------------- */
  function initCatSwitch() {
    const chips = $("#cat-chips"), grid = $("#cat-grid");
    if (!chips || !grid) return;
    const cards = $$(".pcard", grid);
    const headingEl = $("#cat-heading"), countEl = $("#cat-count");
    const apply = (cat, label) => {
      let n = 0;
      cards.forEach((c) => {
        const cats = " " + (c.dataset.cats || "") + " ";
        const show = cat === "__all" || cats.indexOf(" " + cat + " ") !== -1;
        c.hidden = !show;
        if (show) n++;
      });
      if (headingEl) headingEl.textContent = label;
      if (countEl) countEl.textContent = n + (n === 1 ? " piece" : " pieces");
    };
    const cssPx = (name, dflt) => { const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name)); return isNaN(v) ? dflt : v; };
    const feedHead = $(".feed-head", $("#collections")) || grid;
    const stickyEl = chips.closest(".chips");
    // jump to the start of the results (just under the pinned hanger)
    const scrollToResults = () => {
      const chipsH = stickyEl ? stickyEl.offsetHeight : 0;
      const off = cssPx("--appbar-h", 56) + cssPx("--announce-h", 38) + chipsH + 6;
      const y = feedHead.getBoundingClientRect().top + window.scrollY - off;
      window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
    };
    chips.addEventListener("click", (e) => {
      const b = e.target.closest(".chip");
      if (!b) return;
      $$(".chip", chips).forEach((x) => x.classList.remove("is-active"));
      b.classList.add("is-active");
      // center the tapped tee within the hanger horizontally
      const target = b.offsetLeft - (chips.clientWidth - b.offsetWidth) / 2;
      chips.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
      apply(b.dataset.cat, b.dataset.label || b.textContent.trim());
      scrollToResults();
      haptic();
    });
    const first = $(".chip.is-active", chips) || $(".chip", chips);
    if (first) apply(first.dataset.cat, first.dataset.label || first.textContent.trim());
  }

  /* ---------------- init ---------------- */
  document.addEventListener("DOMContentLoaded", () => {
    initReveals();
    initCounters();
    initSlider();
    initAnatomy();
    initFabric();
    initTrust();
    initReviewAuto();
    initChrome();
    initProduct();
    initSearch();
    initCatSwitch();
    initCardGallery();
    initLoadMore();
    $$(".rail-wrap").forEach(initRail);
    bindRailDots($("#drop-rail"), $(".rail__dots"));
    bindRailDots($("#reviews-track"), $("#review-dots"));
    applyWish();
    getCart().then((c) => setCount(c.item_count)).catch(() => {});
  });

  window.MODRN = { addToCart, openSheet, closeSheet };
})();
