const zones = [
  { name: "Los Angeles (Beverly & La Cienega)", lat: 34.0722, lon: -118.3760, radius: 30 },
  { name: "San Francisco (Powell & Market)", lat: 37.7840, lon: -122.4075, radius: 30 },
  { name: "New York City (Columbus Circle)", lat: 40.7681, lon: -73.9819, radius: 8 }
];

let lastData = null;
let map = null, marker = null, zoneMarker = null, polyline = null;

function toRadians(deg) {
  return deg * (Math.PI / 180);
}

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 3958.8;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
            Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function geocodeAddress(address) {
  const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`);
  const data = await response.json();
  if (data.length === 0) return null;
  return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
}

async function processAddress() {
  const address = document.getElementById("address").value.trim();
  if (!address) return;

  const location = await geocodeAddress(address);
  if (!location) {
    document.getElementById("resultCard").innerHTML = "❌ Location not found.";
    document.getElementById("resultCard").style.display = "block";
    return;
  }

  let nearestZone = null;
  let minDistance = Infinity;

  for (const zone of zones) {
    const dist = haversineDistance(location.lat, location.lon, zone.lat, zone.lon);
    if (dist < minDistance) {
      minDistance = dist;
      nearestZone = { ...zone, distance: dist };
    }
  }

  const inside = nearestZone.distance <= nearestZone.radius;
  const status = inside ? "inside" : "outside";
  lastData = {
    location,
    zone: nearestZone,
    distance: nearestZone.distance.toFixed(2),
    status
  };

  document.getElementById("resultCard").innerHTML = 
    `📍 The location is <strong>${lastData.distance} </strong>miles <strong>${status}</strong> of 
    <strong><a href="#" onclick="showMap(); return false;">${nearestZone.name}</a></strong>. ${inside ? "No additional charges." : "Additional charges are applicable."}`;
  document.getElementById("resultCard").style.display = "block";
}

document.getElementById("address").addEventListener("keydown", function(event) {
  if (event.key === "Enter") processAddress();
});

document.getElementById("address").addEventListener("blur", processAddress);

function showMap() {
  if (!lastData) return;
  document.getElementById("stepsCard").style.display = "none";
  document.getElementById("mapCard").style.display = "block";

  if (!map) {
    map = L.map('map').setView([lastData.location.lat, lastData.location.lon], 10);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: 'Map data © OpenStreetMap contributors'
    }).addTo(map);
  } else {
    map.setView([lastData.location.lat, lastData.location.lon], 10);
    if (marker) map.removeLayer(marker);
    if (zoneMarker) map.removeLayer(zoneMarker);
    if (polyline) map.removeLayer(polyline);
  }

  marker = L.marker([lastData.location.lat, lastData.location.lon]).addTo(map).bindPopup("Delivery Location").openPopup();
  zoneMarker = L.marker([lastData.zone.lat, lastData.zone.lon]).addTo(map).bindPopup(lastData.zone.name);
  polyline = L.polyline([[lastData.location.lat, lastData.location.lon], [lastData.zone.lat, lastData.zone.lon]], { color: 'blue' }).addTo(map);
}

document.getElementById("viewStepsBtn")?.addEventListener("click", function () {
  if (!lastData) return;
  document.getElementById("mapCard").style.display = "none";
  document.getElementById("stepsCard").style.display = "block";
  document.getElementById("stepsCard").innerHTML = `
    <h4>📐 Step-by-Step Miles Calculation (Haversine Formula)</h4>
    <ol>
      <li>Convert latitude and longitude differences to radians.</li>
      <li>Apply: <code>a = sin²(Δlat/2) + cos(lat1) × cos(lat2) × sin²(Δlon/2)</code></li>
      <li>Apply: <code>c = 2 × atan2(√a, √(1−a))</code></li>
      <li>Distance = <strong>3958.8 × c</strong> (Earth’s radius in miles)</li>
    </ol>
    <p><strong>Result:</strong> ${lastData.distance} miles ${lastData.status} the <strong>${lastData.zone.name}</strong> zone.</p>
  `;
});
