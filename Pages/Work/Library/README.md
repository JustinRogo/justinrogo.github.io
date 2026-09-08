# Law Library Occupancy Heatmap

The Law Library Occupancy Heatmap is a static, installable web application for recording patron locations across five library floors and reviewing historical occupancy patterns. It is built as a single HTML file with plain CSS and JavaScript, plus a web app manifest and service worker for installation and offline use.

- Application: [`heatmap.html`](heatmap.html)
- Live page: <https://justinrogo.github.io/Pages/Work/Library/heatmap.html>
- Demo analytics: <https://justinrogo.github.io/Pages/Work/Library/heatmap.html?demo=1>

## Features

- Record one point for each patron on floor plans for floors 1–5.
- Track per-floor and total counts as points are added.
- Add an optional note to a count.
- Undo the last point, clear one floor with a seven-second undo option, or reset all floors.
- Zoom, pan, pinch, fit the floor plan, or view it at 100% image size.
- Adjust heat radius, intensity, opacity, and blur.
- Switch among dark, light, and OLED themes.
- Save an unfinished count in the browser, including while offline.
- Submit completed counts to a configured Microsoft Power Automate flow.
- Load historical JSON sessions individually, in a multi-file selection, or from a locally synced OneDrive folder.
- Filter historical sessions by date, time of day, and day of week.
- Review a single session, play sessions in sequence, or aggregate all filtered sessions.
- View session totals, day-and-hour averages, and floor distributions.
- Export filtered session totals as CSV.
- Install the application as a Progressive Web App (PWA).

## Directory contents

| Path | Purpose |
| --- | --- |
| [`heatmap.html`](heatmap.html) | Complete application UI, styles, count workflow, submission logic, import tools, playback, and analytics. |
| [`manifest.webmanifest`](manifest.webmanifest) | Installable-app name, colors, start URL, display mode, and icon declarations. |
| [`sw.js`](sw.js) | Application-shell and floor-plan caching for offline use. |
| [`icons/`](icons/) | SVG, 192 px, 512 px, and Apple touch icons. |
| [`../../../Maps/`](../../../Maps/) | Floor-plan images named `1F.png` through `5F.png`. |
| [`Timeline_LawLib.html`](Timeline_LawLib.html) | Separate Law Library centennial timeline; it is not part of the heatmap application. |

## Run locally

The application should be served over HTTP. Opening `heatmap.html` directly as a `file://` URL prevents normal service-worker and folder-access behavior.

From the repository root:

```bash
python -m http.server 8000
```

Open:

```text
http://localhost:8000/Pages/Work/Library/heatmap.html
```

To preview the analytics interface with generated sample sessions, add `?demo=1`:

```text
http://localhost:8000/Pages/Work/Library/heatmap.html?demo=1
```

Demo sessions exist only in memory and are not submitted. Stop the local server with <kbd>Ctrl</kbd>+<kbd>C</kbd>.

## Count workflow

1. Select a floor tab.
2. Tap or click once at each patron's location on the floor plan.
3. Use **Undo** to remove the most recent point or **Clear** to remove all points from the current floor.
4. Repeat the check on all five floors. A checked floor may correctly have a count of zero.
5. Add a note if an event, closure, or unusual condition needs context.
6. Select **Submit** while online.
7. Wait for the status to change to **Submitted** before beginning another count.

Each point is stored in the source floor plan's pixel coordinate system, so it remains aligned with the map when the canvas is resized or zoomed.

### Submission states

| Status | Meaning |
| --- | --- |
| `Ready` | There is no unsent count or note. |
| `Draft saved` | The current points or note are saved in this browser. |
| `Sending…` | A submission is in progress. |
| `Submitted` | The server accepted the submission and the local count was cleared. |
| `Offline · draft saved` | The draft remains on the device, but it has not been submitted. |
| `Send failed · draft saved` | The request failed and the local draft was retained. |

Offline drafts do **not** use background sync and are not submitted automatically. After reconnecting, reopen the application if necessary, confirm the restored count, and select **Submit** again.

## Analyze workflow

Open the menu and change **Workspace** from **Count** to **Analyze**. Historical sessions can be loaded in three ways:

- **Single JSON** loads one exported session file.
- **Multiple JSONs** loads a manual multi-file selection.
- **Load OneDrive folder…** reads all `.json` files in a locally synced folder.

On browsers that support the File System Access API, the selected folder handle is remembered in IndexedDB. The browser may still require a click on **Rescan** to grant read permission again. Other browsers use a directory-upload fallback.

After loading sessions, the application can:

- aggregate every filtered session into one heatmap;
- scrub through sessions or play them at 900 ms intervals;
- filter by date range, time range, and weekdays;
- show total, average, and peak counts;
- chart total and per-floor counts over time;
- calculate average occupancy by weekday and hour;
- show each floor's share of all loaded points; and
- export the filtered totals to CSV.

Loaded analysis sessions are kept only in memory. Reloading the page clears them, although a remembered folder can be rescanned.

## Session JSON format

The analyzer expects a top-level `floors` array. Files produced from the submission payload use the following shape; the example URL, dimensions, coordinates, and timestamps are illustrative:

```json
{
  "submitted_at": "2026-09-02T18:30:00.000Z",
  "note": "Optional context for this count",
  "floors": [
    {
      "id": "1F",
      "image_data_url": "https://example.org/Maps/1F.png",
      "image_size": { "w": 1800, "h": 1200 },
      "points": [
        { "x": 742.5, "y": 418.25, "t": 1788373800000 }
      ]
    },
    {
      "id": "2F",
      "image_data_url": "https://example.org/Maps/2F.png",
      "image_size": { "w": 1800, "h": 1200 },
      "points": []
    }
  ],
  "TotalCount": 1
}
```

The production payload contains entries for all five IDs: `1F`, `2F`, `3F`, `4F`, and `5F`.

| Field | Description |
| --- | --- |
| `submitted_at` | ISO 8601 submission time. The analyzer uses it for ordering and filtering. |
| `note` | Optional free-text context. |
| `floors[].id` | Floor identifier matched against one of the five configured floors. |
| `floors[].image_data_url` | Public reference to the corresponding floor-plan image. |
| `floors[].image_size` | Natural width and height of the floor-plan image in pixels. |
| `floors[].points` | Patron locations recorded as image-space `x` and `y` coordinates. |
| `floors[].points[].t` | Point creation time as Unix time in milliseconds. |
| `TotalCount` | Sum of all submitted points. Analytics recalculates totals from the point arrays. |

For reliable de-duplication, each file should have a unique `submitted_at` value. If it is absent, the analyzer uses the filename as the session key and the current time as the session timestamp.

### CSV export

The analytics export contains one row per filtered session with these columns:

```text
submitted_at,total,1F,2F,3F,4F,5F,note
```

The CSV contains totals, not individual point coordinates.

## Browser storage

The application uses browser-local storage for the following data:

| Storage | Key/database | Contents |
| --- | --- | --- |
| `localStorage` | `multi-floor-heatmap-embedded` | Current floor points, note, and last update time. |
| `localStorage` | `occupancy-heatmap-theme` | Selected dark, light, or OLED theme. |
| IndexedDB | `heatmap-fs` | Previously selected directory handle, when supported. |
| Cache Storage | `library-occupancy-heatmap-v1` | Application shell, icons, and floor plans. |

Clearing site data removes the saved draft, theme, remembered folder handle, and offline cache.

## Configuration

All application configuration currently lives in [`heatmap.html`](heatmap.html).

### Floor plans

The `EMBEDDED` object maps each floor ID to a repository-relative image under `Maps/`. The `IMAGE_DATA_URLS` object supplies the public image URLs included in submission payloads.

When replacing a floor plan:

1. Preserve the filenames `1F.png` through `5F.png`, or update both objects.
2. Remember that stored points use image pixel coordinates. Replacing a map with a differently aligned image can make historical points appear in the wrong locations.
3. Increment `CACHE_VERSION` in [`sw.js`](sw.js) so existing installations download the new image.
4. Test both count placement and historical-session rendering.

### Submission endpoint

`FLOW_URL` is the Microsoft Power Automate HTTP endpoint that receives the JSON payload. The application considers any successful HTTP response a completed submission and then clears the local draft.

Because this is a static client application, the endpoint URL and its signature are visible to every visitor. Treat the endpoint as public: validate the request body in the flow, restrict downstream permissions, monitor misuse, and rotate or replace the URL if it is exposed beyond its intended audience. If stronger access control is required, send submissions through an authenticated server-side endpoint rather than embedding credentials or durable secrets in the page.

### Analytics and app metadata

- The Google Analytics measurement ID is configured near the top of `heatmap.html`.
- PWA name, description, colors, start URL, and icons are configured in [`manifest.webmanifest`](manifest.webmanifest).
- The browser theme-color metadata is updated when the user changes themes.

## Offline behavior and PWA installation

The service worker pre-caches the page, manifest, icons, and five floor plans. Navigation uses a network-first strategy with the cached heatmap as its offline fallback. Same-origin application assets and files under `/Maps/` use a cache-first strategy.

Requirements and limitations:

- Service workers require HTTPS in production; `localhost` is allowed during development.
- The app must be loaded successfully online at least once before its files are available offline.
- Offline mode supports recording and retaining a local draft, but not submitting it.
- Historical files must already be available on the device to be loaded while offline.
- When cached assets change, increment `CACHE_VERSION` in `sw.js` before deployment.

Installation is offered by supported browsers when the site meets their PWA criteria. Browser wording varies; look for **Install app**, **Add to Home Screen**, or the install icon in the address bar.

## Privacy and data handling

An occupancy submission includes exact point coordinates, timestamps, the aggregate count, and any note entered by the user. The configured flow sends that data to an external Microsoft Power Automate endpoint. The page also loads Google Analytics.

- Do not enter names, contact information, or other personally identifying details in notes.
- Use the points to represent approximate occupancy, not to track identifiable individuals.
- Confirm that retention, access, and deletion rules for submitted files match the library's policies.
- Review the Google Analytics configuration and privacy notice before deploying the page to a new audience.

## Browser compatibility

The core interface uses standard browser features including Canvas, Pointer Events, local storage, and file inputs. Test against the browsers used by the intended audience because some capabilities vary:

- Directory handles and remembered folder access work best in Chromium-based browsers through the File System Access API.
- Other browsers may fall back to selecting a directory through a file input and will not retain a reusable handle.
- PWA installation options and offline-storage limits differ by browser and operating system.
- Power Automate submission requires network access and an endpoint that permits requests from the deployed origin.

## Deployment

There is no build step or package dependency. Deploy the HTML file and its supporting assets without changing their relative paths. The host must:

- serve the application over HTTPS;
- preserve the lowercase filename `heatmap.html`;
- serve `.webmanifest`, JavaScript, SVG, PNG, and JSON files with appropriate content types;
- keep the five floor plans available under `/Maps/`; and
- allow the service worker to be served from the same origin as the page.

GitHub Pages satisfies these static-hosting requirements.

## Maintenance checklist

Before deploying a change:

1. Load all five floor plans and place points on each one.
2. Test mouse, touch, zoom, pan, Undo, Clear, and Reset All Floors.
3. Reload the page and confirm that the current draft and note are restored.
4. Test a successful submission and a failed or offline submission without losing the draft.
5. Import a single session, multiple sessions, and a folder of JSON files.
6. Test date, time-of-day, and weekday filters.
7. Test playback, aggregate mode, analytics charts, and CSV export.
8. Test dark, light, and OLED themes at desktop, tablet, and phone sizes.
9. Test an offline reload after the service worker has cached the application.
10. If shell assets or floor plans changed, increment the service-worker cache version.
11. Keep this README synchronized with changes to the payload or browser-storage formats.
