(function () {
  var WA = "34663192105";
  var GENERIC = "Hola, quiero la revisión gratuita de mi factura de luz.";
  var MAX_MB = 10;
  // Google Apps Script web app that stores the invoice and runs the automatic AI review.
  // Empty = fall back to the FormSubmit email form.
  var ENDPOINT = "https://script.google.com/macros/s/AKfycbyl9H8u9SeeabiNye8l0TLc0pHaycLpTwAsysjo-Y7f7NULt1FnC9Z2njJs7A1rHSfd/exec";

  function waUrl(text) {
    return "https://wa.me/" + WA + "?text=" + encodeURIComponent(text);
  }

  document.querySelectorAll(".js-wa").forEach(function (a) {
    a.href = waUrl(GENERIC);
    a.target = "_blank";
    a.rel = "noopener";
  });

  // CTA links to the form: flash it; only scroll if it isn't already on screen
  var card = document.getElementById("revision");
  function flashForm() {
    if (!card) return;
    var r = card.getBoundingClientRect();
    var vh = window.innerHeight || document.documentElement.clientHeight;
    var visible = r.top >= 60 && r.top < vh * 0.6;
    var go = function () {
      card.classList.remove("flash");
      void card.offsetWidth;
      card.classList.add("flash");
      var first = card.querySelector('input[name="empresa"]');
      if (first && window.matchMedia("(min-width: 761px)").matches) first.focus({ preventScroll: true });
    };
    if (visible) { go(); return; }
    var y = window.scrollY + r.top - 90;
    window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
    setTimeout(go, 450);
  }
  document.querySelectorAll('a[href="#revision"]').forEach(function (a) {
    a.addEventListener("click", function (e) { e.preventDefault(); flashForm(); });
  });

  // Upload box shows the chosen file name
  document.querySelectorAll(".drop input[type=file]").forEach(function (inp) {
    inp.addEventListener("change", function () {
      var box = inp.closest(".drop");
      var b = box.querySelector(".drop-txt b");
      var sm = box.querySelector(".drop-txt small");
      if (inp.files && inp.files[0]) {
        box.classList.add("has-file");
        b.textContent = inp.files[0].name;
        sm.textContent = "Listo. Toca para cambiarla";
      } else {
        box.classList.remove("has-file");
        b.textContent = "Sube una foto o PDF";
        sm.textContent = "Desde el móvil puedes hacer la foto directamente";
      }
    });
  });

  // Success popup
  var modal = document.getElementById("lead-ok");
  function openModal(name) {
    if (!modal) return;
    var msg = modal.querySelector(".js-ok-msg");
    msg.textContent = (name ? "Gracias, " + name + ". " : "") + "La revisamos y te enviamos tu informe por email en menos de 2 minutos.";
    modal.hidden = false;
    modal.querySelector(".js-ok-close").focus();
  }
  function closeModal() { if (modal) modal.hidden = true; }
  if (modal) {
    modal.querySelector(".js-ok-close").addEventListener("click", closeModal);
    modal.addEventListener("click", function (e) { if (e.target === modal) closeModal(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeModal(); });
  }

  var sink = document.querySelector('iframe[name="lead-sink"]');
  var pending = null;
  if (sink) {
    sink.addEventListener("load", function () {
      if (!pending) return;
      var p = pending; pending = null;
      clearTimeout(p.timer);
      finish(p);
    });
  }
  function finish(p) {
    p.btn.disabled = false;
    p.btn.innerHTML = p.label;
    p.form.reset();
    p.form.querySelectorAll(".drop input[type=file]").forEach(function (i) { i.dispatchEvent(new Event("change")); });
    openModal(p.name);
  }

  // clear the error message as soon as the visitor fixes something
  document.querySelectorAll(".js-lead").forEach(function (form) {
    ["input", "change"].forEach(function (ev) {
      form.addEventListener(ev, function () { var err = form.querySelector(".form-err"); if (err) err.textContent = ""; });
    });
  });

  // Read the file as base64; large photos are resized to keep the upload fast
  function prepareFile(file) {
    var asB64 = function (blob) {
      return new Promise(function (ok, ko) {
        var r = new FileReader();
        r.onload = function () { ok(String(r.result).split(",")[1]); };
        r.onerror = ko;
        r.readAsDataURL(blob);
      });
    };
    var raw = function () { return asB64(file).then(function (d) { return { name: file.name, type: file.type || "application/octet-stream", data: d }; }); };
    if (!/^image\//.test(file.type) || file.size < 1.5 * 1024 * 1024) return raw();
    return new Promise(function (ok) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var max = 2200, k = Math.min(1, max / Math.max(img.width, img.height));
        var c = document.createElement("canvas");
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        c.toBlob(function (b) {
          if (!b) return ok(raw());
          asB64(b).then(function (d) { ok({ name: file.name.replace(/\.[^.]+$/, "") + ".jpg", type: "image/jpeg", data: d }); }, function () { ok(raw()); });
        }, "image/jpeg", 0.85);
      };
      img.onerror = function () { URL.revokeObjectURL(url); ok(raw()); };
      img.src = url;
    });
  }

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  document.querySelectorAll(".js-lead").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      var err = form.querySelector(".form-err");
      var el = form.elements;
      var empresa = (el.empresa.value || "").trim();
      var email = (el.email.value || "").trim();
      var file = el.factura.files && el.factura.files[0];
      var fail = function (msg, field) { e.preventDefault(); err.textContent = msg; if (field) field.focus(); };

      if (!empresa) return fail("Escribe el nombre de tu negocio.", el.empresa);
      if (!EMAIL_RE.test(email)) return fail("Escribe un email válido para enviarte el informe.", el.email);
      if (!file) return fail("Sube una foto o PDF de tu factura.", el.factura);
      if (file.size > MAX_MB * 1024 * 1024) return fail("El archivo pesa demasiado (máx. " + MAX_MB + " MB). Prueba con una foto.", el.factura);
      if (!el.consent.checked) return fail("Marca la casilla de privacidad para continuar.", el.consent);
      err.textContent = "";

      var sector = el.sector ? el.sector.value : "";
      el._subject.value = "Nueva factura: " + empresa + (sector ? " (" + sector + ")" : "");
      el._replyto ? (el._replyto.value = email) : null;

      var btn = form.querySelector('button[type="submit"]');
      var label = btn.innerHTML;
      btn.disabled = true;
      btn.textContent = "Enviando…";
      // native POST into the hidden iframe (supports the file upload)
      pending = { form: form, btn: btn, label: label, name: empresa };
      pending.timer = setTimeout(function () { if (pending) { var p = pending; pending = null; finish(p); } }, 25000);
      if (!ENDPOINT) return; // FormSubmit: let the browser post the form into the hidden iframe

      e.preventDefault();
      var p = pending;
      clearTimeout(p.timer);
      prepareFile(file).then(function (f) {
        return fetch(ENDPOINT, {
          method: "POST", mode: "no-cors",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({ empresa: empresa, sector: sector, email: email, consent: true, file: f })
        });
      }).then(function () {
        if (pending === p) pending = null;
        finish(p);
      }).catch(function () {
        // backend unreachable: send through FormSubmit instead so the lead is never lost
        p.timer = setTimeout(function () { if (pending === p) { pending = null; finish(p); } }, 25000);
        form.submit();
      });
    });
  });
})();
