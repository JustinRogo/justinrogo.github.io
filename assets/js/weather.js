const timeEl = document.getElementById('liveTime');
const tempEl = document.getElementById('weatherTemp');
const detailEl = document.getElementById('weatherDetail');

function updateClock() {
  if (!timeEl) return;
  timeEl.textContent = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date());
}

const weatherLabels = new Map([
  [0, 'Clear'], [1, 'Mostly clear'], [2, 'Partly cloudy'], [3, 'Overcast'],
  [45, 'Fog'], [48, 'Rime fog'], [51, 'Light drizzle'], [53, 'Drizzle'],
  [55, 'Heavy drizzle'], [61, 'Light rain'], [63, 'Rain'], [65, 'Heavy rain'],
  [71, 'Light snow'], [73, 'Snow'], [75, 'Heavy snow'], [80, 'Rain showers'],
  [81, 'Rain showers'], [82, 'Heavy showers'], [95, 'Thunderstorms'], [96, 'Thunderstorms'], [99, 'Thunderstorms']
]);

async function loadWeather() {
  if (!tempEl || !detailEl) return;
  try {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.search = new URLSearchParams({
      latitude: '41.7658',
      longitude: '-72.6734',
      current: 'temperature_2m,apparent_temperature,weather_code',
      temperature_unit: 'fahrenheit',
      timezone: 'America/New_York'
    });
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Weather request failed (${response.status})`);
    const { current } = await response.json();
    const temperature = Math.round(current.temperature_2m);
    const feels = Math.round(current.apparent_temperature);
    tempEl.classList.remove('skeleton-line');
    tempEl.textContent = `${temperature}°F`;
    detailEl.textContent = `${weatherLabels.get(current.weather_code) || 'Current conditions'} · Feels ${feels}°`;
  } catch (error) {
    tempEl.classList.remove('skeleton-line');
    tempEl.textContent = 'Unavailable';
    detailEl.textContent = 'Weather could not be loaded';
  }
}

updateClock();
setInterval(updateClock, 30000);
loadWeather();
