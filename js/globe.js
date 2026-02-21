// 3D Visitor Globe using cobe (https://github.com/shuding/cobe)
import createGlobe from 'https://cdn.jsdelivr.net/npm/cobe@0.6.3/+esm';

// Country code → [lat, lng] lookup (~50 most common)
const COORDS = {
  US: [39.8, -98.5], IN: [20.6, 78.9], GB: [55.4, -3.4], DE: [51.2, 10.5],
  FR: [46.2, 2.2], CA: [56.1, -106.3], AU: [-25.3, 133.8], BR: [-14.2, -51.9],
  JP: [36.2, 138.3], CN: [35.9, 104.2], KR: [35.9, 127.8], IT: [41.9, 12.5],
  ES: [40.5, -3.7], NL: [52.1, 5.3], SE: [60.1, 18.6], CH: [46.8, 8.2],
  SG: [1.4, 103.8], HK: [22.3, 114.2], TW: [23.7, 121.0], IL: [31.0, 34.9],
  RU: [61.5, 105.3], MX: [23.6, -102.6], AR: [-38.4, -63.6], CO: [4.6, -74.1],
  CL: [-35.7, -71.5], ZA: [-30.6, 22.9], NG: [9.1, 8.7], EG: [26.8, 30.8],
  KE: [-0.02, 37.9], PK: [30.4, 69.3], BD: [23.7, 90.4], ID: [-0.8, 113.9],
  MY: [4.2, 101.9], TH: [15.9, 100.9], VN: [14.1, 108.3], PH: [12.9, 121.8],
  TR: [38.9, 35.2], PL: [51.9, 19.1], AT: [47.5, 14.6], CZ: [49.8, 15.5],
  DK: [56.3, 9.5], FI: [61.9, 25.7], NO: [60.5, 8.5], IE: [53.4, -8.2],
  PT: [39.4, -8.2], RO: [45.9, 25.0], GR: [39.1, 21.8], HU: [47.2, 19.5],
  UA: [48.4, 31.2], SA: [23.9, 45.1], AE: [23.4, 53.8], NZ: [-40.9, 174.9],
  BE: [50.5, 4.5]
};

// Animate a number counting up from 0 to target
function animateCount(el, target, duration) {
  if (target <= 0) return;
  var start = performance.now();
  function tick(now) {
    var t = Math.min((now - start) / duration, 1);
    var eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
    el.textContent = Math.round(target * eased).toLocaleString();
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

(async function () {
  var canvas = document.getElementById('globe-canvas');
  if (!canvas) return;

  // WebGL2 feature detection using a throwaway canvas
  var testCanvas = document.createElement('canvas');
  var gl = testCanvas.getContext('webgl2');
  if (!gl) {
    document.getElementById('visitors').style.display = 'none';
    return;
  }
  // Release the test context
  var ext = gl.getExtension('WEBGL_lose_context');
  if (ext) ext.loseContext();
  testCanvas = null;

  // Load visitor data from static JSON (for location markers)
  var markers = [];
  var totalVisitors = 0;
  var countryCount = 0;

  try {
    var res = await fetch('data/globe-data.json');
    var data = await res.json();
    totalVisitors = data.total_visitors || 0;

    if (data.locations && data.locations.length > 0) {
      var maxCount = Math.max.apply(null, data.locations.map(function (l) { return l.count; }));
      countryCount = data.locations.length;

      data.locations.forEach(function (loc) {
        var coord = COORDS[loc.country];
        if (coord) {
          markers.push({
            location: [coord[0], coord[1]],
            size: 0.04 + (loc.count / maxCount) * 0.12
          });
        }
      });
    }
  } catch (e) {
    // No data yet — globe renders without markers
  }

  // Try live visitor count from GoatCounter public counter API.
  // This endpoint works without authentication when "Allow adding visitor
  // counts on your website" is enabled in GoatCounter site settings.
  try {
    var liveRes = await fetch('https://rawalkhirodkar.goatcounter.com/counter/%2F.json');
    if (liveRes.ok) {
      var liveData = await liveRes.json();
      var liveCount = parseInt((liveData.count || '0').replace(/,/g, ''), 10);
      if (liveCount > totalVisitors) {
        totalVisitors = liveCount;
      }
    }
  } catch (e) {
    // Public counter not available — use static data
  }

  // Update stats display with animated count
  var statsEl = document.getElementById('globe-stats');
  if (statsEl && totalVisitors > 0) {
    var visitorSpan = document.createElement('span');
    visitorSpan.className = 'globe-stats-number';
    visitorSpan.textContent = '0';

    statsEl.appendChild(visitorSpan);

    if (countryCount > 0) {
      var countrySpan = document.createElement('span');
      countrySpan.className = 'globe-stats-number';
      countrySpan.textContent = '0';

      statsEl.append(' visitors from ', countrySpan, ' countries');
      animateCount(countrySpan, countryCount, 1200);
    } else {
      statsEl.append(' visitors');
    }

    animateCount(visitorSpan, totalVisitors, 1500);
  }

  // Responsive sizing
  function getSize() {
    var section = canvas.parentElement;
    return Math.min(500, section.clientWidth - 48);
  }

  var currentSize = getSize();
  var dpr = Math.min(window.devicePixelRatio, 2);
  canvas.width = currentSize * dpr;
  canvas.height = currentSize * dpr;
  canvas.style.width = currentSize + 'px';
  canvas.style.height = currentSize + 'px';

  var phi = 0;
  var autoRotateSpeed = 0.003;
  var pointerDown = false;
  var pointerLastX = 0;
  var dragDelta = 0;

  // Drag-to-rotate interaction
  canvas.addEventListener('pointerdown', function (e) {
    pointerDown = true;
    pointerLastX = e.clientX;
    canvas.setPointerCapture(e.pointerId);
  });

  canvas.addEventListener('pointermove', function (e) {
    if (!pointerDown) return;
    var dx = e.clientX - pointerLastX;
    pointerLastX = e.clientX;
    dragDelta += dx * 0.005;
  });

  canvas.addEventListener('pointerup', function (e) {
    pointerDown = false;
    canvas.releasePointerCapture(e.pointerId);
  });

  var globe = createGlobe(canvas, {
    devicePixelRatio: dpr,
    width: currentSize * dpr,
    height: currentSize * dpr,
    phi: 0,
    theta: 0.25,
    dark: 0,
    diffuse: 1.4,
    mapSamples: 16000,
    mapBrightness: 8,
    baseColor: [0.95, 0.97, 1.0],
    markerColor: [0.145, 0.388, 0.922],
    glowColor: [0.9, 0.93, 1.0],
    markers: markers,
    onRender: function (state) {
      phi += dragDelta + (pointerDown ? 0 : autoRotateSpeed);
      dragDelta = 0;
      state.phi = phi;
    }
  });

  // Pause when tab is hidden (battery optimization)
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      canvas.style.animationPlayState = 'paused';
    } else {
      canvas.style.animationPlayState = 'running';
    }
  });

  // Resize handler
  window.addEventListener('resize', function () {
    var newSize = getSize();
    if (newSize !== currentSize) {
      currentSize = newSize;
      canvas.width = currentSize * dpr;
      canvas.height = currentSize * dpr;
      canvas.style.width = currentSize + 'px';
      canvas.style.height = currentSize + 'px';
    }
  });
})();
