const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const ROLE_LABELS = {
  administrator: "Administrator",
  staff_user: "Staff User",
  view_only: "View Only User",
};
let currentDate = new Date();
let currentWeek = sundayOf(currentDate);
let scheduleView = "week";
let data = null;
let activeProfileId = null;
let currentUser = null;
const SUPABASE_CONFIG = window.FRONT_DESK_SUPABASE || null;
const supabaseClient = SUPABASE_CONFIG && window.supabase?.createClient
  ? window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey)
  : null;
const usesSupabase = Boolean(supabaseClient);
const ADMIN_USERS_FUNCTION = "admin-users";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function localDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function isoDate(value) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function sundayOf(value) {
  const result = new Date(value.getFullYear(), value.getMonth(), value.getDate());
  result.setDate(result.getDate() - result.getDay());
  return result;
}

function firstOfMonth(value) {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

function lastOfMonth(value) {
  return new Date(value.getFullYear(), value.getMonth() + 1, 0);
}

function addDays(value, amount) {
  const result = new Date(value);
  result.setDate(result.getDate() + amount);
  return result;
}

function addMonths(value, amount) {
  const result = new Date(value.getFullYear(), value.getMonth() + amount, 1);
  const day = Math.min(value.getDate(), lastOfMonth(result).getDate());
  result.setDate(day);
  return result;
}

function formatTime(value) {
  if (!value) return "";
  const [hours, minutes] = value.split(":").map(Number);
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: minutes ? "2-digit" : undefined }).format(
    new Date(2000, 0, 1, hours, minutes)
  );
}

function formatDate(value) {
  return localDate(value).toLocaleDateString(undefined, {
    weekday: "short", month: "short", day: "numeric", year: "numeric"
  });
}

function roleLabel(role) {
  return ROLE_LABELS[role] || "Staff User";
}

function defaultPasswordForStaff(person) {
  const lastName = (person?.last_name || person?.name?.split(" ").pop() || "Staff").trim();
  return `${lastName.charAt(0).toUpperCase()}${lastName.slice(1)}123!`;
}

function hoursBetween(start, end) {
  const parts = value => value.split(":").map(Number);
  const [sh, sm] = parts(start);
  const [eh, em] = parts(end);
  return (eh * 60 + em - sh * 60 - sm) / 60;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

function timeValue(value) {
  return value ? String(value).slice(0, 5) : null;
}

function normalizeStaff(person) {
  if (!person) return person;
  const remoteDays = Array.isArray(person.remote_days)
    ? person.remote_days
    : JSON.parse(person.remote_days || "[]");
  return {
    ...person,
    remote_days: remoteDays,
    permissions: {
      can_edit_all: person.access_role === "administrator",
      can_edit_own: person.access_role === "administrator" || person.access_role === "staff_user",
    },
  };
}

function normalizeShift(shift) {
  return shift ? {
    ...shift,
    start_time: timeValue(shift.start_time),
    end_time: timeValue(shift.end_time),
  } : shift;
}

function normalizeLeave(entry) {
  return entry ? {
    ...entry,
    start_time: timeValue(entry.start_time),
    end_time: timeValue(entry.end_time),
  } : entry;
}

function normalizeSchedule(schedule) {
  return schedule ? {
    ...schedule,
    hours: typeof schedule.hours === "string" ? JSON.parse(schedule.hours) : (schedule.hours || {}),
  } : schedule;
}

function normalizeException(item) {
  return item ? {
    ...item,
    open_time: timeValue(item.open_time),
    close_time: timeValue(item.close_time),
  } : item;
}

function publicUserFromStaff(person) {
  return {
    id: person.id,
    staff_id: person.id,
    name: person.name,
    first_name: person.first_name,
    last_name: person.last_name,
    email: person.email,
    department: person.department,
    access_role: person.access_role,
    permissions: person.permissions,
  };
}

function parseBody(options) {
  return options.body ? JSON.parse(options.body) : {};
}

function supabaseError(error) {
  if (!error) return null;
  if (error.message?.includes("Failed to fetch")) {
    return new Error("Could not reach Supabase. Check the project URL and network connection.");
  }
  return new Error(error.message || "Supabase request failed");
}

async function checked(request) {
  const { data: result, error } = await request;
  if (error) throw supabaseError(error);
  return result;
}

async function getCurrentStaff() {
  const { data: sessionData, error: sessionError } = await supabaseClient.auth.getSession();
  if (sessionError) throw supabaseError(sessionError);
  const user = sessionData.session?.user;
  if (!user) {
    const error = new Error("Not signed in");
    error.status = 401;
    throw error;
  }
  const rows = await checked(
    supabaseClient.from("staff").select("*").eq("auth_user_id", user.id).limit(1)
  );
  if (rows.length) return normalizeStaff(rows[0]);
  const emailRows = await checked(
    supabaseClient.from("staff").select("*").eq("email", user.email).limit(1)
  );
  if (emailRows.length) {
    throw new Error("This Auth user is not linked to its staff profile yet. Set staff.auth_user_id for this email in Supabase.");
  }
  throw new Error("Signed in, but no staff profile exists for this Supabase Auth user.");
}

function rangeDates(start, end) {
  const dates = [];
  for (let cursor = localDate(start); cursor <= localDate(end); cursor = addDays(cursor, 1)) {
    dates.push(isoDate(cursor));
  }
  return dates;
}

function resolveHoursForDate(dayText, schedules, exceptions) {
  const exception = exceptions.find(item => item.exception_date === dayText);
  if (exception) {
    return {
      date: dayText,
      closed: Boolean(exception.closed),
      open: exception.open_time,
      close: exception.close_time,
      label: exception.label,
      source: "exception",
    };
  }
  const dayKey = DAYS[localDate(dayText).getDay()];
  const schedule = schedules.find(item =>
    (!item.start_date || item.start_date <= dayText) &&
    (!item.end_date || item.end_date >= dayText)
  );
  if (!schedule) {
    return { date: dayText, closed: true, open: null, close: null, label: "No matching schedule", source: "none" };
  }
  const configured = schedule.hours?.[dayKey];
  if (configured?.open && configured?.close) {
    return {
      date: dayText,
      closed: false,
      open: timeValue(configured.open),
      close: timeValue(configured.close),
      label: schedule.name,
      source: "schedule",
    };
  }
  return { date: dayText, closed: true, open: null, close: null, label: schedule.name, source: "schedule" };
}

function timeMinutes(value) {
  const [hours, minutes] = timeValue(value).split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesTime(value) {
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

function validateTimeRange(start, end) {
  if (!start || !end) throw new Error("Start and end times are required");
  const startMinutes = timeMinutes(start);
  const endMinutes = timeMinutes(end);
  if (startMinutes >= endMinutes) throw new Error("End time must be later than start time");
  if (startMinutes % 15 || endMinutes % 15) throw new Error("Times must use 15-minute increments");
}

function availabilityConflict(dataset, staffId, shiftDate, startTime, endTime, excludeShiftId = null) {
  const person = dataset.staff.find(item => item.id === staffId);
  if (!person) return "Staff member not found";
  if (person.remote_days.includes(DAYS[localDate(shiftDate).getDay()])) {
    return `Remote on ${localDate(shiftDate).toLocaleDateString(undefined, { weekday: "long" })}s`;
  }
  const start = timeMinutes(startTime);
  const end = timeMinutes(endTime);
  for (const entry of dataset.leave) {
    if (entry.staff_id !== staffId || entry.start_date > shiftDate || entry.end_date < shiftDate) continue;
    if (entry.all_day) return "On all-day leave";
    if (start < timeMinutes(entry.end_time) && end > timeMinutes(entry.start_time)) {
      return `On leave ${entry.start_time}-${entry.end_time}`;
    }
  }
  const overlap = dataset.shifts.find(shift =>
    shift.staff_id === staffId &&
    shift.shift_date === shiftDate &&
    shift.id !== excludeShiftId &&
    shift.start_time < endTime &&
    shift.end_time > startTime
  );
  return overlap ? `Already on desk ${overlap.start_time}-${overlap.end_time}` : null;
}

async function loadSupabaseState(start, end) {
  const today = isoDate(new Date());
  const [
    staffRows,
    shiftRows,
    leaveRows,
    futureLeaveRows,
    scheduleRows,
    exceptionRows,
    requestRows,
  ] = await Promise.all([
    checked(supabaseClient.from("staff").select("*").order("last_name").order("first_name")),
    checked(supabaseClient.from("shifts").select("*").gte("shift_date", start).lte("shift_date", end).order("shift_date").order("start_time")),
    checked(supabaseClient.from("leave_entries").select("*").lte("start_date", end).gte("end_date", start).order("start_date")),
    checked(supabaseClient.from("leave_entries").select("*").gte("end_date", today).order("start_date").order("end_date")),
    checked(supabaseClient.from("hour_schedules").select("*").order("position").order("created_at")),
    checked(supabaseClient.from("exceptions").select("*").order("exception_date")),
    checked(supabaseClient.from("shift_requests").select("*").eq("status", "pending").order("created_at")),
  ]);
  const staff = staffRows.map(normalizeStaff);
  const shifts = shiftRows.map(normalizeShift);
  const leave = leaveRows.map(normalizeLeave);
  const futureLeave = futureLeaveRows.map(normalizeLeave);
  const schedules = scheduleRows.map(normalizeSchedule);
  const exceptions = exceptionRows.map(normalizeException);
  const requestShiftIds = [...new Set(requestRows.flatMap(item => [item.shift_id, item.target_shift_id].filter(Boolean)))];
  const requestShifts = requestShiftIds.length
    ? (await checked(supabaseClient.from("shifts").select("*").in("id", requestShiftIds))).map(normalizeShift)
    : [];
  const shiftMap = new Map([...shifts, ...requestShifts].map(shift => [shift.id, shift]));
  const shiftRequests = requestRows.map(item => ({
    ...item,
    shift: shiftMap.get(item.shift_id),
    target_shift: item.target_shift_id ? shiftMap.get(item.target_shift_id) : null,
  }));
  const resolved = rangeDates(start, end).map(day => resolveHoursForDate(day, schedules, exceptions));
  const weekStart = isoDate(sundayOf(localDate(start)));
  return {
    week_start: weekStart,
    week_end: isoDate(addDays(localDate(weekStart), 6)),
    range_start: start,
    range_end: end,
    staff,
    shifts,
    leave,
    future_leave: futureLeave,
    schedules,
    exceptions,
    shift_requests: shiftRequests,
    resolved_hours: resolved,
  };
}

async function supabaseStaffProfile(staffId) {
  const today = isoDate(new Date());
  const [person, shifts, leave] = await Promise.all([
    checked(supabaseClient.from("staff").select("*").eq("id", staffId).single()),
    checked(supabaseClient.from("shifts").select("*").eq("staff_id", staffId).gte("shift_date", today).order("shift_date").order("start_time")),
    checked(supabaseClient.from("leave_entries").select("*").eq("staff_id", staffId).gte("end_date", today).order("start_date")),
  ]);
  return {
    staff: normalizeStaff(person),
    shifts: shifts.map(normalizeShift),
    leave: leave.map(normalizeLeave),
  };
}

function tableForPath(pathname) {
  if (pathname.startsWith("/api/staff")) return "staff";
  if (pathname.startsWith("/api/shifts")) return "shifts";
  if (pathname.startsWith("/api/leave")) return "leave_entries";
  if (pathname.startsWith("/api/schedules")) return "hour_schedules";
  if (pathname.startsWith("/api/exceptions")) return "exceptions";
  return null;
}

async function upsertSupabase(pathname, payload, id = null) {
  const table = tableForPath(pathname);
  if (!table) throw new Error(`Unsupported Supabase endpoint: ${pathname}`);
  const item = { ...payload };
  if (table === "leave_entries" && item.all_day) {
    item.start_time = null;
    item.end_time = null;
  }
  if (table === "hour_schedules") {
    item.start_date = item.start_date || null;
    item.end_date = item.end_date || null;
  }
  if (table === "exceptions") {
    if (item.closed) {
      item.open_time = null;
      item.close_time = null;
    }
    const rows = await checked(supabaseClient.from(table).upsert(item, { onConflict: "exception_date" }).select());
    return rows[0];
  }
  if (table === "shifts") validateTimeRange(item.start_time, item.end_time);
  if (id) {
    const rows = await checked(supabaseClient.from(table).update(item).eq("id", id).select());
    return rows[0] || { id, ...item };
  }
  const rows = await checked(supabaseClient.from(table).insert(item).select());
  return rows[0];
}

async function createSupabaseShiftRequest(payload) {
  const sourceShift = await checked(supabaseClient.from("shifts").select("*").eq("id", payload.shift_id).single());
  if (sourceShift.staff_id !== payload.requester_id) {
    throw new Error("Only the assigned staff member can request a shift change");
  }
  const item = {
    shift_id: payload.shift_id,
    request_type: payload.request_type,
    requester_id: payload.requester_id,
    target_staff_id: null,
    target_shift_id: null,
  };
  if (payload.request_type === "swap") {
    if (!payload.target_shift_id) throw new Error("Select a shift for the swap request");
    const targetShift = await checked(supabaseClient.from("shifts").select("*").eq("id", payload.target_shift_id).single());
    if (targetShift.staff_id === payload.requester_id) {
      throw new Error("Select another staff member's shift for the swap request");
    }
    item.target_shift_id = targetShift.id;
    item.target_staff_id = targetShift.staff_id;
  }
  const rows = await checked(supabaseClient.from("shift_requests").insert(item).select());
  return rows[0];
}

async function respondSupabaseShiftRequest(requestId, payload) {
  if (payload.action === "decline") {
    return checked(supabaseClient.rpc("decline_shift_request", { p_request_id: requestId }));
  }
  try {
    return await checked(supabaseClient.rpc("accept_shift_request", {
      p_request_id: requestId,
      p_responder_id: payload.responder_id,
    }));
  } catch (error) {
    if (!String(error.message).includes("function")) throw error;
    return checked(supabaseClient.rpc("accept_shift_request", { p_request_id: requestId }));
  }
}

async function supabaseAutoFill(week) {
  const start = isoDate(sundayOf(localDate(week)));
  const end = isoDate(addDays(localDate(start), 6));
  const dataset = await loadSupabaseState(start, end);
  const totals = Object.fromEntries(dataset.staff.map(person => [person.id, 0]));
  dataset.shifts.forEach(shift => {
    totals[shift.staff_id] += timeMinutes(shift.end_time) - timeMinutes(shift.start_time);
  });
  const added = [];
  const uncovered = [];
  let skippedClosed = 0;
  for (const hours of dataset.resolved_hours) {
    if (hours.closed) {
      skippedClosed += 1;
      continue;
    }
    const dayShifts = dataset.shifts.filter(shift => shift.shift_date === hours.date).sort((a, b) => a.start_time.localeCompare(b.start_time));
    const gaps = [];
    let cursor = timeMinutes(hours.open);
    const close = timeMinutes(hours.close);
    dayShifts.forEach(shift => {
      const blockStart = timeMinutes(shift.start_time);
      const blockEnd = timeMinutes(shift.end_time);
      if (blockStart > cursor) gaps.push([cursor, Math.min(blockStart, close)]);
      cursor = Math.max(cursor, blockEnd);
    });
    if (cursor < close) gaps.push([cursor, close]);
    for (const [gapStart, gapEnd] of gaps) {
      for (let blockStart = gapStart; blockStart < gapEnd; blockStart += 120) {
        const blockEnd = Math.min(blockStart + 120, gapEnd);
        const startTime = minutesTime(blockStart);
        const endTime = minutesTime(blockEnd);
        const candidates = dataset.staff.filter(person =>
          !availabilityConflict(dataset, person.id, hours.date, startTime, endTime)
        );
        if (!candidates.length) {
          uncovered.push({ date: hours.date, start_time: startTime, end_time: endTime });
          continue;
        }
        const chosen = candidates.sort((a, b) => totals[a.id] - totals[b.id] || a.name.localeCompare(b.name))[0];
        const rows = await checked(supabaseClient.from("shifts").insert({
          staff_id: chosen.id,
          shift_date: hours.date,
          start_time: startTime,
          end_time: endTime,
        }).select());
        const shift = normalizeShift(rows[0]);
        dataset.shifts.push(shift);
        added.push(shift);
        totals[chosen.id] += blockEnd - blockStart;
      }
    }
  }
  return { added: added.length, uncovered, skipped_closed: skippedClosed };
}

async function supabaseCopyWeek(week) {
  const start = isoDate(sundayOf(localDate(week)));
  const end = isoDate(addDays(localDate(start), 6));
  const dataset = await loadSupabaseState(start, isoDate(addDays(localDate(start), 13)));
  const sourceShifts = dataset.shifts.filter(shift => shift.shift_date >= start && shift.shift_date <= end);
  const copied = [];
  const skipped = [];
  for (const shift of sourceShifts) {
    const targetDate = isoDate(addDays(localDate(shift.shift_date), 7));
    const hours = resolveHoursForDate(targetDate, dataset.schedules, dataset.exceptions);
    const reason = hours.closed
      ? `Library closed: ${hours.label}`
      : availabilityConflict(dataset, shift.staff_id, targetDate, shift.start_time, shift.end_time);
    if (reason) {
      skipped.push({ shift_id: shift.id, date: targetDate, reason });
      continue;
    }
    const rows = await checked(supabaseClient.from("shifts").insert({
      staff_id: shift.staff_id,
      shift_date: targetDate,
      start_time: shift.start_time,
      end_time: shift.end_time,
    }).select());
    const newShift = normalizeShift(rows[0]);
    dataset.shifts.push(newShift);
    copied.push(newShift);
  }
  return { copied: copied.length, skipped, week_start: isoDate(addDays(localDate(start), 7)) };
}

async function supabaseApi(path, options = {}) {
  const method = options.method || "GET";
  const url = new URL(path, window.location.origin);
  const payload = parseBody(options);
  const parts = url.pathname.split("/").filter(Boolean);

  if (url.pathname === "/api/login" && method === "POST") {
    const { error } = await supabaseClient.auth.signInWithPassword({
      email: payload.email,
      password: payload.password,
    });
    if (error) throw supabaseError(error);
    return { user: publicUserFromStaff(await getCurrentStaff()) };
  }
  if (url.pathname === "/api/logout" && method === "POST") {
    const { error } = await supabaseClient.auth.signOut();
    if (error) throw supabaseError(error);
    return { ok: true };
  }
  if (url.pathname === "/api/me" && method === "GET") {
    return publicUserFromStaff(await getCurrentStaff());
  }
  if (url.pathname === "/api/state" && method === "GET") {
    return loadSupabaseState(url.searchParams.get("start"), url.searchParams.get("end"));
  }
  if (parts[0] === "api" && parts[1] === "staff" && parts[3] === "profile" && method === "GET") {
    return supabaseStaffProfile(parts[2]);
  }
  if (url.pathname === "/api/shift-requests" && method === "POST") {
    return createSupabaseShiftRequest(payload);
  }
  if (parts[0] === "api" && parts[1] === "shift-requests" && parts[3] === "respond" && method === "POST") {
    return respondSupabaseShiftRequest(parts[2], payload);
  }
  if (url.pathname === "/api/auto-fill" && method === "POST") {
    return supabaseAutoFill(payload.week);
  }
  if (url.pathname === "/api/copy-week" && method === "POST") {
    return supabaseCopyWeek(payload.week);
  }
  if (method === "POST") {
    return upsertSupabase(url.pathname, payload);
  }
  if (method === "PUT" && parts.length === 3) {
    return upsertSupabase(url.pathname, payload, parts[2]);
  }
  if (method === "DELETE" && parts.length === 3) {
    const table = tableForPath(url.pathname);
    if (!table) throw new Error(`Unsupported Supabase endpoint: ${url.pathname}`);
    await checked(supabaseClient.from(table).delete().eq("id", parts[2]));
    return { ok: true };
  }
  throw new Error(`Unsupported Supabase endpoint: ${method} ${url.pathname}`);
}

async function invokeAdminUsers(payload) {
  if (!usesSupabase) {
    throw new Error("Login management requires Supabase mode");
  }
  const { data: result, error } = await supabaseClient.functions.invoke(ADMIN_USERS_FUNCTION, {
    body: payload,
  });
  if (error) throw supabaseError(error);
  if (result?.error) throw new Error(result.error);
  return result;
}

async function api(path, options = {}) {
  if (usesSupabase) {
    try {
      return await supabaseApi(path, options);
    } catch (error) {
      if (error.status === 401 || error.message === "Not signed in") showLogin();
      throw error;
    }
  }
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const payload = await response.json().catch(() => ({}));
  if (response.status === 401) showLogin();
  if (!response.ok) throw new Error(payload.error || `Request failed (${response.status})`);
  return payload;
}

function toast(message, error = false) {
  const element = $("#toast");
  element.textContent = message;
  element.classList.toggle("error", error);
  element.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => element.classList.remove("show"), 3500);
}

async function load() {
  try {
    if (!currentUser) return;
    const range = rangeForView();
    data = await api(`/api/state?start=${range.start}&end=${range.end}`);
    currentWeek = sundayOf(currentDate);
    render();
  } catch (error) {
    toast(error.message, true);
  }
}

function canEditAll() {
  return currentUser?.access_role === "administrator";
}

function canEditOwn() {
  return currentUser?.access_role === "staff_user" || canEditAll();
}

function showLogin() {
  currentUser = null;
  $("#loginScreen").classList.remove("hidden");
  $(".topbar").classList.add("hidden");
  $(".tabs").classList.add("hidden");
  $("main").classList.add("hidden");
}

function showApp() {
  $("#loginScreen").classList.add("hidden");
  $(".topbar").classList.remove("hidden");
  $(".tabs").classList.remove("hidden");
  $("main").classList.remove("hidden");
  $("#currentUserBadge").textContent = `${currentUser.name} - ${roleLabel(currentUser.access_role)}`;
}

function rangeForView() {
  if (scheduleView === "day") {
    const day = isoDate(currentDate);
    return { start: day, end: day };
  }
  if (scheduleView === "month") {
    const first = firstOfMonth(currentDate);
    const last = lastOfMonth(currentDate);
    return {
      start: isoDate(sundayOf(first)),
      end: isoDate(addDays(sundayOf(last), 6)),
    };
  }
  const start = sundayOf(currentDate);
  return { start: isoDate(start), end: isoDate(addDays(start, 6)) };
}

function render() {
  renderSchedule();
  renderTrades();
  renderStaff();
  renderRemoteDays();
  renderLeave();
  renderHourSchedules();
  renderExceptions();
  populateStaffSelects();
  applyPermissions();
  updateExportLinks();
}

function icsEscape(value) {
  return String(value ?? "").replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\n/g, "\\n");
}

function icsDateTime(day, time) {
  return day.replaceAll("-", "") + "T" + timeValue(time).replace(":", "") + "00";
}

function setCalendarDownload(link, filename, lines) {
  if (link.dataset.objectUrl) URL.revokeObjectURL(link.dataset.objectUrl);
  const blob = new Blob([lines.join("\r\n") + "\r\n"], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.dataset.objectUrl = url;
  link.download = filename;
}

function updateExportLinks() {
  const week = isoDate(currentWeek);
  if (!usesSupabase) {
    $("#deskExport").href = `/api/export/desk?week=${week}`;
    $("#leaveExport").href = `/api/export/leave?week=${week}`;
    return;
  }
  const weekEnd = isoDate(addDays(currentWeek, 6));
  const calendarStart = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Front Desk Planner//EN", "CALSCALE:GREGORIAN"];
  const deskLines = [...calendarStart];
  data.shifts
    .filter(shift => shift.shift_date >= week && shift.shift_date <= weekEnd)
    .forEach(shift => {
      const person = staffById(shift.staff_id);
      deskLines.push(
        "BEGIN:VEVENT",
        `UID:desk-${shift.id}@front-desk-planner`,
        `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z")}`,
        `DTSTART:${icsDateTime(shift.shift_date, shift.start_time)}`,
        `DTEND:${icsDateTime(shift.shift_date, shift.end_time)}`,
        `SUMMARY:${icsEscape(`Desk coverage - ${person?.name || "Unknown"}`)}`,
        "END:VEVENT"
      );
    });
  deskLines.push("END:VCALENDAR");
  setCalendarDownload($("#deskExport"), `desk-${week}.ics`, deskLines);

  const leaveLines = [...calendarStart];
  data.future_leave
    .filter(entry => entry.start_date <= weekEnd && entry.end_date >= week)
    .forEach(entry => {
      const person = staffById(entry.staff_id);
      leaveLines.push(
        "BEGIN:VEVENT",
        `UID:leave-${entry.id}@front-desk-planner`,
        `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z")}`,
        `SUMMARY:${icsEscape(`Leave - ${person?.name || "Unknown"}`)}`
      );
      if (entry.all_day) {
        leaveLines.push(
          `DTSTART;VALUE=DATE:${entry.start_date.replaceAll("-", "")}`,
          `DTEND;VALUE=DATE:${isoDate(addDays(localDate(entry.end_date), 1)).replaceAll("-", "")}`
        );
      } else {
        leaveLines.push(
          `DTSTART:${icsDateTime(entry.start_date, entry.start_time)}`,
          `DTEND:${icsDateTime(entry.end_date, entry.end_time)}`
        );
      }
      leaveLines.push("END:VEVENT");
    });
  leaveLines.push("END:VCALENDAR");
  setCalendarDownload($("#leaveExport"), `leave-${week}.ics`, leaveLines);
}

function applyPermissions() {
  const admin = canEditAll();
  const editor = canEditOwn();
  $("#autoFill").classList.toggle("hidden", !admin);
  $("#copyWeek").classList.toggle("hidden", !admin);
  $("#addStaff").classList.toggle("hidden", !admin);
  $("#addSchedule").classList.toggle("hidden", !admin);
  $("#addException").classList.toggle("hidden", !admin);
  $$(".add-shift, .delete-schedule, .delete-exception").forEach(element =>
    element.classList.toggle("hidden", !admin)
  );
  $("#addLeave").classList.toggle("hidden", !editor);
  $("#removeStaffProfile").classList.toggle("hidden", !admin);
  $("#editStaffProfile").classList.toggle("hidden", !admin && activeProfileId !== currentUser?.staff_id);
  $$(".delete-leave").forEach(button => {
    const entry = data.future_leave.find(item => item.id === button.closest("[data-leave]").dataset.leave);
    button.classList.toggle("hidden", !admin && entry?.staff_id !== currentUser?.staff_id);
  });
}

function staffById(id) {
  return data.staff.find(person => person.id === id);
}

function shiftById(id) {
  return data.shifts.find(shift => shift.id === id);
}

function pendingRequestForShift(shiftId) {
  return (data.shift_requests || []).find(request => request.shift_id === shiftId);
}

function leaveFor(personId, day) {
  return data.leave.filter(entry =>
    entry.staff_id === personId && entry.start_date <= day && entry.end_date >= day
  );
}

function renderWeekScheduleLegacy() {
  const end = addDays(currentWeek, 6);
  $("#weekLabel").textContent =
    `${currentWeek.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ` +
    `${end.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
  const grid = $("#weekGrid");
  grid.innerHTML = "";
  data.resolved_hours.forEach((hours, index) => {
    const day = localDate(hours.date);
    const shifts = data.shifts.filter(shift => shift.shift_date === hours.date);
    const remote = data.staff.filter(person => person.remote_days.includes(DAYS[index]));
    const away = data.staff.filter(person => leaveFor(person.id, hours.date).length);
    const card = document.createElement("article");
    card.className = `day-card ${index === 0 || index === 6 ? "weekend" : ""} ${hours.closed ? "closed" : ""}`;
    const badges = [
      ...remote.map(person => `<span class="badge">Remote: ${escapeHtml(person.name)}</span>`),
      ...away.map(person => `<span class="badge">Leave: ${escapeHtml(person.name)}</span>`),
    ].join("");
    card.innerHTML = `
      <div class="day-head">
        <div class="day-name">${day.toLocaleDateString(undefined, { weekday: "long" })}</div>
        <div class="day-number">${day.getDate()}</div>
        <div class="hours-label">${hours.closed
          ? `Closed · ${escapeHtml(hours.label)}`
          : `${formatTime(hours.open)}–${formatTime(hours.close)} · ${escapeHtml(hours.label)}`}</div>
        <div class="badges">${badges}</div>
      </div>
      <div class="day-body">
        ${shifts.map(shift => {
          const person = staffById(shift.staff_id);
          return `<button class="shift" data-shift="${shift.id}">
            <strong>${escapeHtml(person?.name || "Unknown")}</strong>
            <span>${formatTime(shift.start_time)}–${formatTime(shift.end_time)}</span>
          </button>`;
        }).join("")}
        ${hours.closed ? `<div class="closed-note">Manual shifts are allowed, but auto-fill skips this day.</div>` : ""}
        <button class="add-shift" data-date="${hours.date}">+ Add shift</button>
      </div>`;
    grid.append(card);
  });
  decorateShiftRequests(grid);
  $$(".add-shift", grid).forEach(button => button.addEventListener("click", () => openShift(null, button.dataset.date)));
  $$("[data-shift]", grid).forEach(button => button.addEventListener("click", () => {
    openShift(data.shifts.find(shift => shift.id === button.dataset.shift));
  }));
  renderHoursChart();
}

function renderScheduleHeader() {
  const rangeStart = localDate(data.range_start);
  const rangeEnd = localDate(data.range_end);
  if (scheduleView === "day") {
    $("#viewHint").textContent = "Visible day";
    $("#weekLabel").textContent = currentDate.toLocaleDateString(undefined, {
      weekday: "long", month: "short", day: "numeric", year: "numeric"
    });
  } else if (scheduleView === "month") {
    $("#viewHint").textContent = "Visible month";
    $("#weekLabel").textContent = currentDate.toLocaleDateString(undefined, {
      month: "long", year: "numeric"
    });
  } else {
    $("#viewHint").textContent = "Visible week";
    $("#weekLabel").textContent =
      `${rangeStart.toLocaleDateString(undefined, { month: "short", day: "numeric" })} - ` +
      `${rangeEnd.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
  }
  $$(".view-mode").forEach(button =>
    button.classList.toggle("active", button.dataset.view === scheduleView)
  );
}

function renderSchedule() {
  if (scheduleView === "week" && data.resolved_hours.length === 7) {
    renderWeekScheduleLegacy();
    renderScheduleHeader();
    $("#weekGrid").className = "week-grid week-view";
    return;
  }
  renderScheduleHeader();
  const grid = $("#weekGrid");
  grid.innerHTML = "";
  grid.className = `week-grid ${scheduleView}-view`;
  if (scheduleView === "month") {
    renderMonthSchedule(grid);
  } else {
    data.resolved_hours.forEach(hours => grid.append(renderDayCard(hours)));
  }
  bindScheduleGrid(grid);
  renderHoursChart();
}

function bindScheduleGrid(grid) {
  decorateShiftRequests(grid);
  $$(".add-shift", grid).forEach(button => button.addEventListener("click", () => openShift(null, button.dataset.date)));
  $$("[data-shift]", grid).forEach(button => button.addEventListener("click", () => {
    openShift(data.shifts.find(shift => shift.id === button.dataset.shift));
  }));
}

function decorateShiftRequests(root) {
  $$("[data-shift]", root).forEach(button => {
    const shift = shiftById(button.dataset.shift);
    if (shift?.staff_id === currentUser?.staff_id) {
      button.classList.add("current-user-shift");
    }
    const request = pendingRequestForShift(button.dataset.shift);
    if (!request) return;
    button.classList.add("request-pending");
    const status = request.request_type === "coverage" ? "Coverage needed" : "Swap pending";
    if (!$(".shift-status", button)) {
      button.insertAdjacentHTML("beforeend", `<span class="shift-status">${status}</span>`);
    }
  });
}

function renderDayCard(hours, options = {}) {
  const day = localDate(hours.date);
  const dayIndex = day.getDay();
  const shifts = data.shifts.filter(shift => shift.shift_date === hours.date);
  const remote = data.staff.filter(person => person.remote_days.includes(DAYS[dayIndex]));
  const away = data.staff.filter(person => leaveFor(person.id, hours.date).length);
  const card = document.createElement("article");
  card.className = `day-card ${dayIndex === 0 || dayIndex === 6 ? "weekend" : ""} ${hours.closed ? "closed" : ""} ${options.outsideMonth ? "outside-month" : ""}`;
  const badges = [
    ...remote.map(person => `<span class="badge">Remote: ${escapeHtml(person.name)}</span>`),
    ...away.map(person => `<span class="badge">Leave: ${escapeHtml(person.name)}</span>`),
  ].join("");
  card.innerHTML = `
    <div class="day-head">
      <div class="day-name">${day.toLocaleDateString(undefined, { weekday: scheduleView === "month" ? "short" : "long" })}</div>
      <div class="day-number">${day.getDate()}</div>
      <div class="hours-label">${hours.closed
        ? `Closed - ${escapeHtml(hours.label)}`
        : `${formatTime(hours.open)}-${formatTime(hours.close)} - ${escapeHtml(hours.label)}`}</div>
      <div class="badges">${badges}</div>
    </div>
    <div class="day-body">
      ${shifts.map(shift => {
        const person = staffById(shift.staff_id);
        return `<button class="shift" data-shift="${shift.id}">
          <strong>${escapeHtml(person?.name || "Unknown")}</strong>
          <span>${formatTime(shift.start_time)}-${formatTime(shift.end_time)}</span>
        </button>`;
      }).join("")}
      ${hours.closed && scheduleView !== "month" ? `<div class="closed-note">Manual shifts are allowed, but auto-fill skips this day.</div>` : ""}
      <button class="add-shift" data-date="${hours.date}">+ Add shift</button>
    </div>`;
  return card;
}

function renderMonthSchedule(grid) {
  DAY_LABELS.forEach(label => {
    const heading = document.createElement("div");
    heading.className = "month-weekday";
    heading.textContent = label;
    grid.append(heading);
  });
  const visibleMonth = currentDate.getMonth();
  data.resolved_hours.forEach(hours => {
    grid.append(renderDayCard(hours, { outsideMonth: localDate(hours.date).getMonth() !== visibleMonth }));
  });
}

function renderHoursChart() {
  const totals = data.staff.map(person => ({
    ...person,
    hours: data.shifts.filter(shift => shift.staff_id === person.id)
      .reduce((sum, shift) => sum + hoursBetween(shift.start_time, shift.end_time), 0),
  })).sort((a, b) => b.hours - a.hours || a.name.localeCompare(b.name));
  const max = Math.max(1, ...totals.map(item => item.hours));
  $("#hoursChart").innerHTML = totals.length ? totals.map(item => `
    <div class="bar-row">
      <div class="bar-label"><span>${escapeHtml(item.name)}</span><strong>${item.hours.toFixed(2).replace(/\.00$/, "")}h</strong></div>
      <div class="bar-track"><div class="bar" style="width:${item.hours / max * 100}%"></div></div>
    </div>`).join("") : `<p class="muted">Add staff to begin.</p>`;
  const total = totals.reduce((sum, item) => sum + item.hours, 0);
  const label = scheduleView === "day" ? "Day" : scheduleView === "month" ? "Month" : "Week";
  $("#hoursTotal").textContent = `${label} total: ${total.toFixed(2).replace(/\.00$/, "")} hours`;
}

function requestShift(request) {
  return request.shift || shiftById(request.shift_id) || {};
}

function requestTargetShift(request) {
  return request.target_shift || shiftById(request.target_shift_id) || {};
}

function renderTrades() {
  const list = $("#tradeList");
  const requests = data.shift_requests || [];
  if (!requests.length) {
    list.innerHTML = `<div class="empty">No pending shift trade or coverage requests.</div>`;
    return;
  }
  list.innerHTML = requests.map(request => {
    const shift = requestShift(request);
    const targetShift = requestTargetShift(request);
    const requester = staffById(request.requester_id);
    const target = staffById(request.target_staff_id);
    if (request.request_type === "swap") {
      const canRespond = canEditAll() || request.target_staff_id === currentUser?.staff_id;
      return `
        <article class="list-card request-card" data-request="${request.id}">
          <div class="list-card-head">
            <div>
              <p class="eyebrow">Swap request</p>
              <h3>${escapeHtml(requester?.name || "Unknown")} asks to swap with ${escapeHtml(target?.name || "Unknown")}</h3>
              <p>${escapeHtml(requester?.name || "Unknown")}: ${formatDate(shift.shift_date)} ${formatTime(shift.start_time)}-${formatTime(shift.end_time)}</p>
              ${targetShift.id ? `<p>${escapeHtml(target?.name || "Unknown")}: ${formatDate(targetShift.shift_date)} ${formatTime(targetShift.start_time)}-${formatTime(targetShift.end_time)}</p>` : ""}
            </div>
            <div class="request-actions ${canRespond ? "" : "hidden"}">
              <button class="accept-swap">Accept</button>
              <button class="danger decline-swap">Decline</button>
            </div>
          </div>
        </article>`;
    }
    return `
      <article class="list-card request-card" data-request="${request.id}">
        <div class="list-card-head">
          <div>
            <p class="eyebrow">Coverage needed</p>
            <h3>${escapeHtml(requester?.name || "Unknown")} needs coverage</h3>
            <p>${formatDate(shift.shift_date)} ${formatTime(shift.start_time)}-${formatTime(shift.end_time)}</p>
          </div>
        </div>
        <div class="coverage-take-row ${canEditOwn() && request.requester_id !== currentUser?.staff_id ? "" : "hidden"}">
          ${canEditAll()
            ? `<label>Take this shift as<select name="coverage_staff_id">
                <option value="">Choose staff...</option>
                ${data.staff
                  .filter(person => person.id !== request.requester_id)
                  .map(person => `<option value="${person.id}">${escapeHtml(person.name)}</option>`)
                  .join("")}
              </select></label>`
            : `<p class="muted">Take this shift as ${escapeHtml(currentUser?.name || "yourself")}.</p>`}
          <button class="take-coverage">Take shift</button>
        </div>
      </article>`;
  }).join("");
  $$(".accept-swap", list).forEach(button => button.addEventListener("click", async () => {
    const request = requests.find(item => item.id === button.closest("[data-request]").dataset.request);
    await respondToShiftRequest(request, "accept", request.target_staff_id, "Swap accepted");
  }));
  $$(".decline-swap", list).forEach(button => button.addEventListener("click", async () => {
    const request = requests.find(item => item.id === button.closest("[data-request]").dataset.request);
    await respondToShiftRequest(request, "decline", request.target_staff_id, "Swap declined");
  }));
  $$(".take-coverage", list).forEach(button => button.addEventListener("click", async () => {
    const card = button.closest("[data-request]");
    const request = requests.find(item => item.id === card.dataset.request);
    const responderId = canEditAll() ? $("select[name=coverage_staff_id]", card).value : currentUser.staff_id;
    if (!responderId) return toast("Choose who is taking this shift", true);
    await respondToShiftRequest(request, "accept", responderId, "Shift coverage accepted");
  }));
}

async function respondToShiftRequest(request, action, responderId, message) {
  try {
    await api(`/api/shift-requests/${request.id}/respond`, {
      method: "POST",
      body: JSON.stringify({ action, responder_id: responderId }),
    });
    toast(message);
    await load();
  } catch (error) { toast(error.message, true); }
}

function renderStaff() {
  const list = $("#staffList");
  list.classList.add("staff-directory");
  if (!data.staff.length) {
    list.innerHTML = `<div class="empty">No staff members yet.</div>`;
    return;
  }
  list.innerHTML = data.staff.map(person => `
    <article class="list-card staff-card" data-person="${person.id}" tabindex="0" role="button" aria-label="View ${escapeHtml(person.name)} profile">
      <div class="list-card-head">
        <div>
          <h3>${escapeHtml(person.name)}</h3>
          <div class="staff-meta">
            <span class="role-badge">${escapeHtml(roleLabel(person.access_role))}</span>
            <span>${escapeHtml(person.department || "Department not set")}</span>
            ${person.email
              ? `<a href="mailto:${escapeHtml(person.email)}">${escapeHtml(person.email)}</a>`
              : `<span>Email not set</span>`}
          </div>
        </div>
        <div class="list-actions">
          <button class="view-profile">View profile</button>
        </div>
      </div>
    </article>`).join("");
  $$(".staff-card", list).forEach(card => {
    card.addEventListener("click", event => {
      if (event.target.closest("button, a")) return;
      openStaffProfile(card.dataset.person);
    });
    card.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openStaffProfile(card.dataset.person);
      }
    });
  });
  $$(".view-profile", list).forEach(button => button.addEventListener("click", () =>
    openStaffProfile(button.closest("[data-person]").dataset.person)
  ));
}

function renderRemoteDays() {
  const list = $("#remoteList");
  if (!data.staff.length) {
    list.innerHTML = `<div class="empty">Add staff members before assigning remote days.</div>`;
    return;
  }
  list.innerHTML = data.staff.map(person => `
    <article class="list-card" data-person="${person.id}">
      <div class="list-card-head">
        <div>
          <h3>${escapeHtml(person.name)}</h3>
          <p class="muted">${escapeHtml(person.department || "Department not set")}</p>
        </div>
      </div>
      <div class="remote-editor">${DAYS.map((day, index) => `
        <label><input type="checkbox" value="${day}" ${person.remote_days.includes(day) ? "checked" : ""}>${DAY_LABELS[index]}</label>
      `).join("")}</div>
    </article>`).join("");
  $$(".remote-editor input", list).forEach(input => input.addEventListener("change", async () => {
    const card = input.closest("[data-person]");
    const person = staffById(card.dataset.person);
    const remote_days = $$("input:checked", card).map(item => item.value);
    try {
      await api(`/api/staff/${person.id}`, {
        method: "PUT",
        body: JSON.stringify({ remote_days }),
      });
      toast(`${person.name}'s remote days updated`);
      await load();
    } catch (error) { toast(error.message, true); }
  }));
}

function renderLeave() {
  const list = $("#leaveList");
  const entries = data.future_leave || [];
  if (!entries.length) {
    list.innerHTML = `<div class="empty">No current or upcoming leave entries.</div>`;
    return;
  }
  list.innerHTML = entries.map(entry => `
    <article class="list-card" data-leave="${entry.id}">
      <div class="list-card-head">
        <div>
          <h3>${escapeHtml(staffById(entry.staff_id)?.name || "Unknown")}</h3>
          <p>${formatDate(entry.start_date)}${entry.end_date !== entry.start_date ? ` through ${formatDate(entry.end_date)}` : ""}</p>
          <p class="muted">${entry.all_day ? "All day" : `${formatTime(entry.start_time)}–${formatTime(entry.end_time)}`}</p>
        </div>
        <button class="danger delete-leave">Delete</button>
      </div>
    </article>`).join("");
  $$(".delete-leave", list).forEach(button => button.addEventListener("click", () =>
    remove(`/api/leave/${button.closest("[data-leave]").dataset.leave}`, "Leave deleted")
  ));
}

function openStaffForm(person = null) {
  const form = $("#staffForm");
  form.reset();
  form.elements.id.value = person?.id || "";
  form.first_name.value = person?.first_name || "";
  form.last_name.value = person?.last_name || "";
  form.email.value = person?.email || "";
  form.department.value = person?.department || "";
  form.access_role.value = person?.access_role || "staff_user";
  form.access_role.closest("label").classList.toggle("hidden", !canEditAll());
  $("#staffFormTitle").textContent = person ? "Edit staff profile" : "Add staff member";
  $("#staffFormSubmit").textContent = person ? "Save changes" : "Add staff";
  $("#staffDialog").showModal();
}

async function openStaffProfile(staffId) {
  try {
    const profile = await api(`/api/staff/${staffId}/profile`);
    activeProfileId = staffId;
    const person = profile.staff;
    $("#profileName").textContent = person.name;
    $("#profileDetails").innerHTML = `
      <div><span>Department</span><strong>${escapeHtml(person.department)}</strong></div>
      <div><span>Email</span><a href="mailto:${escapeHtml(person.email)}">${escapeHtml(person.email)}</a></div>
      <div><span>Access role</span><strong>${escapeHtml(roleLabel(person.access_role))}</strong></div>
      <div><span>Edit scope</span><strong>${person.permissions?.can_edit_all ? "All content" : person.permissions?.can_edit_own ? "Own content only" : "View only"}</strong></div>`;
    $("#profileRemoteDays").innerHTML = person.remote_days.length
      ? person.remote_days.map(day => `<span>${DAY_LABELS[DAYS.indexOf(day)]}</span>`).join("")
      : `<span class="profile-empty-pill">No recurring remote days</span>`;
    $("#profileLoginAdmin").classList.toggle("hidden", !usesSupabase || !canEditAll());
    if (usesSupabase && canEditAll()) {
      $("#profileLoginPassword").value = defaultPasswordForStaff(person);
      $("#profileLoginStatus").textContent = person.auth_user_id
        ? `Login is linked for ${person.email}.`
        : `No login is linked yet for ${person.email}.`;
      $("#createStaffLogin").classList.toggle("hidden", Boolean(person.auth_user_id));
      $("#resetStaffPassword").classList.toggle("hidden", !person.auth_user_id);
    }
    $("#profileShifts").innerHTML = profile.shifts.length
      ? profile.shifts.map(shift => `
          <div class="profile-list-item">
            <strong>${formatDate(shift.shift_date)}</strong>
            <span>${formatTime(shift.start_time)}–${formatTime(shift.end_time)}</span>
          </div>`).join("")
      : `<p class="muted">No upcoming shifts.</p>`;
    $("#profileLeave").innerHTML = profile.leave.length
      ? profile.leave.map(entry => `
          <div class="profile-list-item">
            <strong>${formatDate(entry.start_date)}${entry.end_date !== entry.start_date ? ` – ${formatDate(entry.end_date)}` : ""}</strong>
            <span>${entry.all_day ? "All day" : `${formatTime(entry.start_time)}–${formatTime(entry.end_time)}`}</span>
          </div>`).join("")
      : `<p class="muted">No current or upcoming leave.</p>`;
    $("#staffProfileDialog").showModal();
  } catch (error) {
    toast(error.message, true);
  }
}

function renderHourSchedules() {
  const list = $("#scheduleList");
  list.innerHTML = data.schedules.length ? data.schedules.map((schedule, index) => `
    <article class="list-card" data-hours-schedule="${schedule.id}">
      <div class="list-card-head">
        <div>
          <h3>${escapeHtml(schedule.name)}</h3>
          <p class="muted">${schedule.start_date || "No start"} → ${schedule.end_date || "No end"} · Priority ${index + 1}</p>
        </div>
        <div class="list-actions"><button class="edit-schedule">Edit</button><button class="danger delete-schedule">Delete</button></div>
      </div>
      <p>${DAYS.map((day, dayIndex) => schedule.hours[day]
        ? `${DAY_LABELS[dayIndex]} ${formatTime(schedule.hours[day].open)}–${formatTime(schedule.hours[day].close)}`
        : `${DAY_LABELS[dayIndex]} closed`).join(" · ")}</p>
    </article>`).join("") : `<div class="empty">No hour schedules. The library resolves as closed.</div>`;
  $$(".edit-schedule", list).forEach(button => button.addEventListener("click", () => {
    const id = button.closest("[data-hours-schedule]").dataset.hoursSchedule;
    openSchedule(data.schedules.find(schedule => schedule.id === id));
  }));
  $$(".delete-schedule", list).forEach(button => button.addEventListener("click", () => {
    if (!confirm("Delete this hour schedule?")) return;
    remove(`/api/schedules/${button.closest("[data-hours-schedule]").dataset.hoursSchedule}`, "Schedule deleted");
  }));
}

function renderExceptions() {
  const list = $("#exceptionList");
  list.innerHTML = data.exceptions.length ? data.exceptions.map(item => `
    <article class="list-card" data-exception="${item.id}">
      <div class="list-card-head">
        <div>
          <h3>${escapeHtml(item.label)}</h3>
          <p>${item.exception_date} · ${item.closed ? "Closed" : `${formatTime(item.open_time)}–${formatTime(item.close_time)}`}</p>
        </div>
        <button class="danger delete-exception">Delete</button>
      </div>
    </article>`).join("") : `<div class="empty">No date exceptions.</div>`;
  $$(".delete-exception", list).forEach(button => button.addEventListener("click", () =>
    remove(`/api/exceptions/${button.closest("[data-exception]").dataset.exception}`, "Exception deleted")
  ));
}

function populateStaffSelects() {
  $$("select[name=staff_id]").forEach(select => {
    const selected = select.value;
    select.innerHTML = `<option value="">Choose staff…</option>` +
      data.staff.map(person => `<option value="${person.id}">${escapeHtml(person.name)}</option>`).join("");
    select.value = selected;
  });
}

function populateSwapTargetShiftSelect(shift) {
  const select = $("#shiftForm").swap_target_shift_id;
  if (!select) return;
  const ownerId = shift?.staff_id || "";
  const candidates = data.shifts
    .filter(item => item.id !== shift?.id && item.staff_id !== ownerId)
    .filter(item => !pendingRequestForShift(item.id))
    .sort((a, b) =>
      a.shift_date.localeCompare(b.shift_date) ||
      a.start_time.localeCompare(b.start_time) ||
      (staffById(a.staff_id)?.name || "").localeCompare(staffById(b.staff_id)?.name || "")
    );
  select.innerHTML = `<option value="">Choose a scheduled shift...</option>` +
    candidates
      .map(item => {
        const person = staffById(item.staff_id);
        return `<option value="${item.id}">${formatDate(item.shift_date)} ${formatTime(item.start_time)}-${formatTime(item.end_time)} - ${escapeHtml(person?.name || "Unknown")}</option>`;
      })
      .join("");
}

function openShift(shift = null, day = null) {
  if (!data.staff.length) return toast("Add a staff member first", true);
  const form = $("#shiftForm");
  form.reset();
  form.elements.id.value = shift?.id || "";
  form.shift_date.value = shift?.shift_date || day || isoDate(currentWeek);
  form.start_time.value = shift?.start_time || "09:00";
  form.end_time.value = shift?.end_time || "11:00";
  form.staff_id.value = shift?.staff_id || "";
  const ownsShift = Boolean(shift && shift.staff_id === currentUser?.staff_id);
  const canEditShift = canEditAll();
  const readOnlyShift = Boolean(shift && !canEditShift && !ownsShift);
  form.shift_date.disabled = readOnlyShift;
  form.start_time.disabled = readOnlyShift;
  form.end_time.disabled = readOnlyShift;
  form.staff_id.disabled = readOnlyShift;
  $("#shiftTitle").textContent = shift ? (readOnlyShift ? "Shift details" : "Edit shift") : "Add shift";
  $("#deleteShift").classList.toggle("hidden", !shift || !canEditShift);
  $("#shiftForm button[type=submit]").classList.toggle("hidden", !canEditShift);
  const canRequestChange = Boolean(shift && canEditOwn() && (canEditShift || ownsShift));
  $("#shiftRequestActions").classList.toggle("hidden", !canRequestChange);
  populateSwapTargetShiftSelect(shift);
  updateShiftWarning();
  $("#shiftDialog").showModal();
}

function updateShiftWarning() {
  const day = $("#shiftForm").shift_date.value;
  const hours = data.resolved_hours.find(item => item.date === day);
  const warning = $("#shiftHoursWarning");
  if (hours?.closed) {
    warning.textContent = `The library is closed on this date (${hours.label}). Manual scheduling is still allowed.`;
    warning.classList.remove("hidden");
  } else {
    warning.classList.add("hidden");
  }
}

function openSchedule(schedule = null) {
  const form = $("#scheduleForm");
  form.reset();
  form.elements.id.value = schedule?.id || "";
  form.name.value = schedule?.name || "";
  form.start_date.value = schedule?.start_date || "";
  form.end_date.value = schedule?.end_date || "";
  $("#scheduleTitle").textContent = schedule ? "Edit schedule" : "Add schedule";
  buildScheduleHours(schedule?.hours || {});
  $("#scheduleDialog").showModal();
}

function buildScheduleHours(hours) {
  $("#scheduleHours").innerHTML = DAYS.map((day, index) => {
    const configured = hours[day];
    return `<div class="schedule-hours-row" data-day="${day}">
      <strong>${DAY_LABELS[index]}</strong>
      <label class="check"><input type="checkbox" class="day-open" ${configured ? "checked" : ""}> Open</label>
      <label>From<input type="time" class="open-time" step="900" value="${configured?.open || "08:00"}"></label>
      <label>To<input type="time" class="close-time" step="900" value="${configured?.close || "17:00"}"></label>
    </div>`;
  }).join("");
}

async function remove(path, message) {
  try {
    await api(path, { method: "DELETE" });
    toast(message);
    await load();
  } catch (error) { toast(error.message, true); }
}

function bindEvents() {
  $("#loginForm").addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.target;
    try {
      const result = await api("/api/login", {
        method: "POST",
        body: JSON.stringify({
          email: form.email.value,
          password: form.password.value,
        }),
      });
      currentUser = result.user;
      form.reset();
      showApp();
      await load();
    } catch (error) { toast(error.message, true); }
  });
  $("#logoutButton").addEventListener("click", async () => {
    try {
      await api("/api/logout", { method: "POST" });
    } catch {
      // Clearing local state is still correct if the server session already expired.
    }
    showLogin();
  });
  $$(".tab").forEach(tab => tab.addEventListener("click", () => {
    $$(".tab").forEach(item => item.classList.toggle("active", item === tab));
    $$(".panel").forEach(panel => panel.classList.toggle("active", panel.id === tab.dataset.tab));
  }));
  $$(".close-dialog").forEach(button => button.addEventListener("click", () => button.closest("dialog").close()));
  $("#previousWeek").addEventListener("click", () => {
    currentDate = scheduleView === "month" ? addMonths(currentDate, -1) : addDays(currentDate, scheduleView === "day" ? -1 : -7);
    currentWeek = sundayOf(currentDate);
    load();
  });
  $("#nextWeek").addEventListener("click", () => {
    currentDate = scheduleView === "month" ? addMonths(currentDate, 1) : addDays(currentDate, scheduleView === "day" ? 1 : 7);
    currentWeek = sundayOf(currentDate);
    load();
  });
  $("#todayWeek").addEventListener("click", () => { currentDate = new Date(); currentWeek = sundayOf(currentDate); load(); });
  $$(".view-mode").forEach(button => button.addEventListener("click", () => {
    scheduleView = button.dataset.view;
    currentWeek = sundayOf(currentDate);
    load();
  }));
  $("#addStaff").addEventListener("click", () => openStaffForm());
  $("#editStaffProfile").addEventListener("click", () => {
    const person = staffById(activeProfileId);
    if (!person) return;
    $("#staffProfileDialog").close();
    openStaffForm(person);
  });
  $("#removeStaffProfile").addEventListener("click", async () => {
    const person = staffById(activeProfileId);
    if (!person) return;
    if (!confirm(`Remove ${person.name}? Existing shifts must be deleted first.`)) return;
    $("#staffProfileDialog").close();
    await remove(`/api/staff/${person.id}`, "Staff member removed");
  });
  $("#createStaffLogin").addEventListener("click", async () => {
    const person = staffById(activeProfileId);
    if (!person) return;
    const password = $("#profileLoginPassword").value;
    if (!password) return toast("Enter a temporary password", true);
    if (!confirm(`Create a login for ${person.email}?`)) return;
    try {
      await invokeAdminUsers({ action: "create-login", staffId: person.id, password });
      toast("Login created");
      await load();
      await openStaffProfile(person.id);
    } catch (error) { toast(error.message, true); }
  });
  $("#resetStaffPassword").addEventListener("click", async () => {
    const person = staffById(activeProfileId);
    if (!person) return;
    const password = $("#profileLoginPassword").value;
    if (!password) return toast("Enter a temporary password", true);
    if (!confirm(`Reset password for ${person.email}?`)) return;
    try {
      await invokeAdminUsers({ action: "reset-password", staffId: person.id, password });
      toast("Password reset");
      await load();
      await openStaffProfile(person.id);
    } catch (error) { toast(error.message, true); }
  });
  $("#addLeave").addEventListener("click", () => {
    if (!data.staff.length) return toast("Add a staff member first", true);
    const form = $("#leaveForm");
    form.reset();
    form.staff_id.value = canEditAll() ? "" : currentUser.staff_id;
    form.staff_id.closest("label").classList.toggle("hidden", !canEditAll());
    form.start_date.value = isoDate(new Date());
    form.end_date.value = isoDate(new Date());
    $("#leaveTimes").classList.add("hidden");
    $("#leaveDialog").showModal();
  });
  $("#addSchedule").addEventListener("click", () => openSchedule());
  $("#addException").addEventListener("click", () => {
    $("#exceptionForm").reset();
    $("#exceptionForm").exception_date.value = isoDate(currentWeek);
    $("#exceptionTimes").classList.add("hidden");
    $("#exceptionDialog").showModal();
  });
  $("#leaveForm").all_day.addEventListener("change", event => $("#leaveTimes").classList.toggle("hidden", event.target.checked));
  $("#exceptionForm").closed.addEventListener("change", event => $("#exceptionTimes").classList.toggle("hidden", event.target.checked));
  $("#shiftForm").shift_date.addEventListener("change", updateShiftWarning);

  $("#staffForm").addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.target;
    try {
      const staffId = form.elements.id.value;
      const payload = {
        first_name: form.first_name.value,
        last_name: form.last_name.value,
        email: form.email.value,
        department: form.department.value,
      };
      if (canEditAll()) payload.access_role = form.access_role.value;
      if (!staffId) payload.remote_days = [];
      await api(staffId ? `/api/staff/${staffId}` : "/api/staff", {
        method: staffId ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });
      $("#staffDialog").close();
      toast(staffId ? "Staff profile updated" : "Staff member added");
      await load();
      if (staffId) await openStaffProfile(staffId);
    } catch (error) { toast(error.message, true); }
  });

  $("#shiftForm").addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.target;
    const payload = {
      staff_id: form.staff_id.value,
      shift_date: form.shift_date.value,
      start_time: form.start_time.value,
      end_time: form.end_time.value,
    };
    try {
      await api(form.elements.id.value ? `/api/shifts/${form.elements.id.value}` : "/api/shifts", {
        method: form.elements.id.value ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });
      $("#shiftDialog").close();
      toast(form.elements.id.value ? "Shift updated" : "Shift added");
      await load();
    } catch (error) { toast(error.message, true); }
  });
  $("#deleteShift").addEventListener("click", async () => {
    const id = $("#shiftForm").elements.id.value;
    if (!id || !confirm("Delete this shift?")) return;
    $("#shiftDialog").close();
    await remove(`/api/shifts/${id}`, "Shift deleted");
  });
  $("#requestSwap").addEventListener("click", async () => {
    const form = $("#shiftForm");
    const shiftId = form.elements.id.value;
    const targetShiftId = form.swap_target_shift_id.value;
    if (!shiftId) return toast("Save the shift before requesting a swap", true);
    if (!targetShiftId) return toast("Choose a scheduled shift for the swap request", true);
    try {
      await api("/api/shift-requests", {
        method: "POST",
        body: JSON.stringify({
          shift_id: shiftId,
          request_type: "swap",
          requester_id: form.staff_id.value,
          target_shift_id: targetShiftId,
        }),
      });
      $("#shiftDialog").close();
      toast("Swap request sent");
      await load();
    } catch (error) { toast(error.message, true); }
  });
  $("#requestCoverage").addEventListener("click", async () => {
    const form = $("#shiftForm");
    const shiftId = form.elements.id.value;
    if (!shiftId) return toast("Save the shift before asking for coverage", true);
    try {
      await api("/api/shift-requests", {
        method: "POST",
        body: JSON.stringify({
          shift_id: shiftId,
          request_type: "coverage",
          requester_id: form.staff_id.value,
        }),
      });
      $("#shiftDialog").close();
      toast("Shift listed for coverage");
      await load();
    } catch (error) { toast(error.message, true); }
  });

  $("#leaveForm").addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.target;
    try {
      await api("/api/leave", {
        method: "POST",
        body: JSON.stringify({
          staff_id: form.staff_id.value,
          start_date: form.start_date.value,
          end_date: form.end_date.value,
          all_day: form.all_day.checked,
          start_time: form.start_time.value,
          end_time: form.end_time.value,
        }),
      });
      $("#leaveDialog").close();
      toast("Leave added");
      await load();
    } catch (error) { toast(error.message, true); }
  });

  $("#scheduleForm").addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.target;
    const hours = {};
    $$(".schedule-hours-row").forEach(row => {
      if ($(".day-open", row).checked) {
        hours[row.dataset.day] = {
          open: $(".open-time", row).value,
          close: $(".close-time", row).value,
        };
      }
    });
    const payload = {
      name: form.name.value,
      start_date: form.start_date.value,
      end_date: form.end_date.value,
      position: form.elements.id.value ? data.schedules.find(item => item.id === form.elements.id.value).position : data.schedules.length,
      hours,
    };
    try {
      await api(form.elements.id.value ? `/api/schedules/${form.elements.id.value}` : "/api/schedules", {
        method: form.elements.id.value ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });
      $("#scheduleDialog").close();
      toast("Hour schedule saved");
      await load();
    } catch (error) { toast(error.message, true); }
  });

  $("#exceptionForm").addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.target;
    try {
      await api("/api/exceptions", {
        method: "POST",
        body: JSON.stringify({
          exception_date: form.exception_date.value,
          label: form.label.value,
          closed: form.closed.checked,
          open_time: form.open_time.value,
          close_time: form.close_time.value,
        }),
      });
      $("#exceptionDialog").close();
      toast("Exception saved");
      await load();
    } catch (error) { toast(error.message, true); }
  });

  $("#autoFill").addEventListener("click", async () => {
    if (!data.staff.length) return toast("Add staff before running auto-fill", true);
    if (!confirm("Fill all uncovered open hours in this week?")) return;
    try {
      const result = await api("/api/auto-fill", {
        method: "POST",
        body: JSON.stringify({ week: isoDate(currentWeek) }),
      });
      toast(`Added ${result.added} shifts; ${result.uncovered.length} blocks remain uncovered`);
      await load();
    } catch (error) { toast(error.message, true); }
  });

  $("#copyWeek").addEventListener("click", async () => {
    if (!confirm("Copy this week's shifts forward seven days?")) return;
    try {
      const result = await api("/api/copy-week", {
        method: "POST",
        body: JSON.stringify({ week: isoDate(currentWeek) }),
      });
      currentWeek = localDate(result.week_start);
      toast(`Copied ${result.copied} shifts; skipped ${result.skipped.length}`);
      await load();
    } catch (error) { toast(error.message, true); }
  });
}

bindEvents();
showLogin();
api("/api/me")
  .then(user => {
    currentUser = user;
    showApp();
    return load();
  })
  .catch(() => showLogin());
