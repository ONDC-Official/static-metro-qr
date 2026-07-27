(function () {
  "use strict";

  var DATA_URL = "/data/entities.json";

  var METRO_ICON =
    '<svg class="metro-icon-svg" fill="#000000" viewBox="0 -8 72 72" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    '<path d="M48.89,48.14h1.27a6,6,0,0,0,6-6v-36a6,6,0,0,0-6-6H21.84a6,6,0,0,0-6,6v36a6,6,0,0,0,6,6h1.27L14.55,55.8H20l2.74-2.45H49.31l2.74,2.45h5.4ZM48,44.45a3,3,0,1,1,3-3A2.95,2.95,0,0,1,48,44.45Zm-18.72-42H42.71a1.65,1.65,0,0,1,0,3.3H29.29a1.65,1.65,0,1,1,0-3.3ZM18.84,26.25V11.15a3,3,0,0,1,3-3H50.16a3,3,0,0,1,3,3v15.1a3,3,0,0,1-3,3H21.84A3,3,0,0,1,18.84,26.25ZM21,41.5a3,3,0,1,1,2.95,3A2.95,2.95,0,0,1,21,41.5Zm5.67,8.25,1.78-1.61H43.58l1.71,1.61Z"></path>' +
    "</svg>";

  function navbarHtml(productName) {
    return (
      '<nav class="ondc-navbar" aria-label="ONDC">' +
      '<div class="ondc-navbar-inner">' +
      '<a class="ondc-logo" href="https://ondc.org" target="_blank" rel="noopener noreferrer" ' +
      'aria-label="ONDC – Open Network for Digital Commerce">' +
      '<img src="/public/images/ondc-logo.svg" alt="ONDC" class="ondc-logo-img" height="34" />' +
      "</a>" +
      '<span class="ondc-navbar-product">' +
      escapeHtml(productName) +
      "</span>" +
      "</div>" +
      "</nav>"
    );
  }

  function footerHtml(extended) {
    return (
      '<footer class="app-footer">' +
      '<div class="app-footer-inner">' +
      '<span class="app-footer-brand">Powered by ONDC Network</span>' +
      "</div>" +
      "</footer>"
    );
  }

  var dataPromise = fetch(DATA_URL).then(function (res) {
    if (!res.ok) throw new Error("Failed to load " + DATA_URL);
    return res.json();
  });

  function getOS() {
    var ua = navigator.userAgent || navigator.vendor || window.opera || "";
    if (/android/i.test(ua)) return "Android";
    if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) return "iOS";
    return "Other";
  }

  var os = getOS();
  var GA_ID = document.body.getAttribute("data-ga-id");

  if (GA_ID) {
    window.dataLayer = window.dataLayer || [];
    function gtag() {
      window.dataLayer.push(arguments);
    }
    window.gtag = gtag;
    gtag("js", new Date());
    gtag("set", "user_properties", { platform_os: os });
    gtag("config", GA_ID);
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[c];
    });
  }

  function findBySlug(list, slug) {
    return (list || []).find(function (item) {
      return item.slug === slug;
    });
  }

  function logoLabel(label, logoUrl, darkLogo) {
    if (logoUrl) {
      var logoClass =
        "seller-logo seller-logo--lg" + (darkLogo ? " seller-logo--dark" : "");
      return (
        '<span class="seller-name">' +
        '<span class="' +
        logoClass +
        '"><img src="' +
        logoUrl +
        '" alt="" /></span>' +
        '<span class="seller-label">' +
        escapeHtml(label) +
        "</span></span>"
      );
    }
    return (
      '<span class="seller-name">' +
      '<span class="seller-dot"></span>' +
      '<span class="seller-label">' +
      escapeHtml(label) +
      "</span></span>"
    );
  }

  function renderStatus(container, title, body) {
    container.innerHTML =
      '<div class="status-wrap">' +
      (title ? '<p class="status-title">' + escapeHtml(title) + "</p>" : "") +
      '<p class="status-body">' +
      escapeHtml(body) +
      "</p>" +
      "</div>";
  }

  function renderCityList(container, groups) {
    container.innerHTML =
      '<ul class="seller-list">' +
      groups
        .map(function (group) {
          return (
            '<li class="seller-item"><a href="/' +
            group.slug +
            '/">' +
            logoLabel(group.name) +
            "</a></li>"
          );
        })
        .join("") +
      "</ul>";
  }

  function renderBuyerList(container, group) {
    var hasLogos = (group.buyers || []).some(function (b) {
      return !!b.logo;
    });
    var listClass = hasLogos ? "seller-list seller-list--logos" : "seller-list";

    var items = (group.buyers || [])
      .map(function (buyer) {
        var attrs =
          'href="' + buyer.url + '" target="_blank" rel="noopener noreferrer"';
        if (buyer.androidUrl) {
          attrs += ' data-android-url="' + escapeHtml(buyer.androidUrl) + '"';
        }
        if (buyer.iosUrl) {
          attrs += ' data-ios-url="' + escapeHtml(buyer.iosUrl) + '"';
        }
        return (
          '<li class="seller-item"><a ' +
          attrs +
          ">" +
          logoLabel(buyer.label, buyer.logo, buyer.darkLogo) +
          "</a></li>"
        );
      })
      .join("");

    container.innerHTML = '<ul class="' + listClass + '">' + items + "</ul>";

    if (!GA_ID) return;

    container.querySelectorAll(".seller-item a").forEach(function (link) {
      link.addEventListener("click", function (e) {
        var targetUrl = null;
        if (os === "Android" && link.dataset.androidUrl) {
          targetUrl = link.dataset.androidUrl;
        } else if (os === "iOS" && link.dataset.iosUrl) {
          targetUrl = link.dataset.iosUrl;
        }

        var label = link.querySelector(".seller-label");
        window.gtag("event", "buyer_app_click", {
          app_name: label ? label.textContent.trim() : "unknown",
          platform_os: os,
          destination_url: targetUrl || link.href,
        });

        if (targetUrl) {
          e.preventDefault();
          window.open(targetUrl, "_blank", "noopener,noreferrer");
        }
      });
    });
  }

  function applyHeaderLogo(logoUrl, altText) {
    var logoEl = document.getElementById("header-logo");
    if (!logoEl) return;
    if (logoUrl) {
      logoEl.classList.add("has-logo");
      logoEl.innerHTML =
        '<img class="metro-icon-svg" src="' +
        logoUrl +
        '" alt="' +
        escapeHtml(altText || "") +
        '" />';
    } else {
      logoEl.classList.remove("has-logo");
      logoEl.innerHTML = METRO_ICON;
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (GA_ID && typeof window.gtag === "function") {
      window.gtag("event", "platform_detected", { platform_os: os });
    }

    var body = document.body;
    var groupSlug = body.getAttribute("data-group");
    var container = document.getElementById("main-content");
    var titleEl = document.getElementById("page-title");
    var subtitleEl = document.getElementById("page-subtitle");

    dataPromise
      .then(function (data) {
        var site = data.site || {};
        var defaultProduct = site.productName || "Metro Ticketing";

        if (groupSlug) {
          var group = findBySlug(data.groups, groupSlug);
          if (!group) {
            return renderStatus(
              container,
              "Not found",
              "This city could not be found."
            );
          }

          var productName = group.productName || defaultProduct;
          var navSlot = document.getElementById("navbar-slot");
          if (navSlot) navSlot.outerHTML = navbarHtml(productName);
          var footerSlot = document.getElementById("footer-slot");
          if (footerSlot) {
            footerSlot.outerHTML = footerHtml(!!group.footerExtended);
          }

          if (titleEl) titleEl.textContent = group.title || group.name;
          if (subtitleEl && group.subtitle) {
            subtitleEl.textContent = group.subtitle;
          }
          document.title = "Metro Tickets — " + group.name;
          applyHeaderLogo(group.logo, group.logoAlt || group.name);
          renderBuyerList(container, group);
        } else {
          var navSlotRoot = document.getElementById("navbar-slot");
          if (navSlotRoot) navSlotRoot.outerHTML = navbarHtml("Discover Metro");
          var footerSlotRoot = document.getElementById("footer-slot");
          if (footerSlotRoot) footerSlotRoot.outerHTML = footerHtml(true);

          applyHeaderLogo(null, "");
          if (titleEl) titleEl.textContent = "Select Your City";
          document.title = "Discover Metro | ONDC";
          renderCityList(container, data.groups || []);
        }
      })
      .catch(function () {
        var navSlotErr = document.getElementById("navbar-slot");
        if (navSlotErr) navSlotErr.outerHTML = navbarHtml("Discover Metro");
        var footerSlotErr = document.getElementById("footer-slot");
        if (footerSlotErr) footerSlotErr.outerHTML = footerHtml(true);
        applyHeaderLogo(null, "");
        renderStatus(
          container,
          "Something went wrong",
          "We couldn't load this page.\nPlease check your connection and try again."
        );
      });
  });
})();
