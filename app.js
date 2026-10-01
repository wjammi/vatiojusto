(function () {
  var WA = "34663192105";
  var GENERIC = "Hola, quiero la revisión gratuita de mi factura de luz. Os adjunto una foto de la factura.";

  function waUrl(text) {
    return "https://wa.me/" + WA + "?text=" + encodeURIComponent(text);
  }

  // Plain WhatsApp buttons get a prefilled message too
  document.querySelectorAll(".js-wa").forEach(function (a) {
    a.href = waUrl(GENERIC);
    a.target = "_blank";
    a.rel = "noopener";
  });

  document.querySelectorAll(".js-lead").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var err = form.querySelector(".form-err");
      var empresa = (form.elements.empresa && form.elements.empresa.value || "").trim();
      var sector = form.elements.sector ? form.elements.sector.value : "";
      var consent = form.elements.consent && form.elements.consent.checked;

      if (!empresa) {
        err.textContent = "Escribe el nombre de tu negocio.";
        form.elements.empresa.focus();
        return;
      }
      if (!consent) {
        err.textContent = "Marca la casilla de privacidad para continuar.";
        form.elements.consent.focus();
        return;
      }
      err.textContent = "";

      var lines = [
        "Hola, quiero la revisión gratuita de mi factura de luz.",
        "Negocio: " + empresa
      ];
      if (sector) lines.push("Tipo de negocio: " + sector);
      lines.push("Os adjunto una foto de la factura.");

      window.open(waUrl(lines.join("\n")), "_blank", "noopener");
    });
  });
})();
