let clubs = [];
let capLookup = {};
let map;
let markers = [];
let group;

const searchBox = document.getElementById("searchBox");
const clubList = document.getElementById("clubList");
const resultsHeader = document.getElementById("resultsHeader");

function normaliseClubName(name) {
  return name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\b(surflifesaving|surf life saving|surf lifesaving|surf rescue|lifeguard service|volunteer lifeguard service|surf lifeguards|lifeguards|lifeguard|slsl|slsc|slsp|sls|lsc|ls|vls|crs|inc)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getCapImage(club) {
  const key = normaliseClubName(club.name);
  return capLookup[key] || "";
}

function websiteLink(url, text = "Club website", className = "primary-action") {
  if (!url) return "";
  const safeUrl = url.startsWith("http") ? url : `https://${url}`;
  return `<a class="${className}" href="${safeUrl}" target="_blank" rel="noopener">${text}</a>`;
}

function popupHtml(club) {
  const capImage = getCapImage(club);
  const capHtml = capImage
    ? `<img class="club-cap" src="${capImage}" alt="${club.name} club cap" loading="lazy" onerror="this.style.display='none'">`
    : "";

  const addressHtml = club.address ? `<p><strong>Address:</strong> ${club.address}</p>` : "";
  const phoneHtml = club.phone ? `<p><strong>Phone:</strong> ${club.phone}</p>` : "";
  const emailHtml = club.email ? `<p><strong>Email:</strong> <a href="mailto:${club.email}">${club.email}</a></p>` : "";
  const overviewHtml = club.overview ? `<p>${club.overview}</p>` : "";

  return `
    <div class="club-popup">
      <h3>${club.name}</h3>
      ${capHtml}
      ${overviewHtml}
      ${addressHtml}
      ${phoneHtml}
      ${emailHtml}
      <div class="popup-actions">
        ${websiteLink(club.website)}
        ${club.safeswim ? websiteLink(club.safeswim, "View on SafeSwim", "safeswim-action") : ""}
      </div>
    </div>
  `;
}

function filteredMarkers() {
  const term = searchBox.value.trim().toLowerCase();
  return markers
    .filter(item => item.club.name.toLowerCase().includes(term))
    .sort((a, b) => a.club.name.localeCompare(b.club.name));
}

function renderList() {
  const items = filteredMarkers();
  resultsHeader.textContent = `${items.length} club${items.length === 1 ? "" : "s"} shown`;

  clubList.innerHTML = items.map(item => {
    const website = item.club.website
      ? `${websiteLink(item.club.website, "Website", "")} · `
      : "";

    const safeswim = item.club.safeswim
      ? websiteLink(item.club.safeswim, "SafeSwim", "")
      : "";

    return `
      <li class="club-item" data-index="${item.index}">
        <strong>${item.club.name}</strong>
        ${website}${safeswim}
      </li>
    `;
  }).join("");
}

function updateVisibleMarkers() {
  const visible = new Set(filteredMarkers().map(item => item.index));

  markers.forEach(item => {
    if (visible.has(item.index)) {
      if (!map.hasLayer(item.marker)) item.marker.addTo(map);
    } else {
      if (map.hasLayer(item.marker)) map.removeLayer(item.marker);
    }
  });

  renderList();
}

function focusClub(index) {
  const item = markers.find(x => x.index === index);
  if (!item) return;
  map.setView([item.club.lat, item.club.lng], 14);
  item.marker.openPopup();
}

function initialiseMap() {
  map = L.map("map", {
    scrollWheelZoom: true
  }).setView([-41.0, 174.0], 6);

  L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
    attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
    maxZoom: 19
  }).addTo(map);

  const clubIcon = L.divIcon({
    className: "",
    html: "<div class='custom-marker'></div>",
    iconSize: [26, 26],
    iconAnchor: [13, 26],
    popupAnchor: [0, -26]
  });

  markers = clubs.map((club, index) => {
    const marker = L.marker([club.lat, club.lng], { icon: clubIcon })
      .addTo(map)
      .bindPopup(popupHtml(club));

    return { club, marker, index };
  });

  group = L.featureGroup(markers.map(item => item.marker));
  map.fitBounds(group.getBounds().pad(0.02));

  searchBox.addEventListener("input", updateVisibleMarkers);

  clubList.addEventListener("click", event => {
    const row = event.target.closest(".club-item");
    if (!row) return;

    // Don't hijack clicks on the Website or SafeSwim links.
    if (event.target.closest("a")) return;

    focusClub(Number(row.dataset.index));
  });

  document.getElementById("resetButton").addEventListener("click", () => {
    searchBox.value = "";
    updateVisibleMarkers();
    map.fitBounds(group.getBounds().pad(0.02));
  });

  renderList();

  setTimeout(() => map.invalidateSize(), 250);
  window.addEventListener("resize", () => map.invalidateSize());
}

function showError(message) {
  document.querySelector(".controls").insertAdjacentHTML(
    "afterend",
    `<div class="error-message">${message}</div>`
  );
}

Promise.all([
  fetch("./clubs.json").then(response => response.json()),
  fetch("./caps.json").then(response => response.json())
])
  .then(([clubsData, capsData]) => {
    clubs = clubsData;
    capLookup = capsData;
    initialiseMap();
  })
  .catch(error => {
    console.error(error);
    showError("The club finder data could not be loaded. Check that clubs.json and caps.json are in the same folder as index.html.");
  });
const clubFinder = document.getElementById("clubFinder");
const toggleMapButton = document.getElementById("toggleMapButton");

toggleMapButton.addEventListener("click", () => {
  clubFinder.classList.toggle("map-collapsed");

  const isCollapsed = clubFinder.classList.contains("map-collapsed");
  toggleMapButton.textContent = isCollapsed ? "Show map" : "Hide map";

  if (!isCollapsed && typeof map !== "undefined") {
    setTimeout(() => {
      map.invalidateSize();
    }, 100);
  }
});
