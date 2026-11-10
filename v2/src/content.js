export const profile = {
  name: "Justin Rogowski",
  role: "Library Information Coordinator",
  organization: "UConn School of Law",
  intro:
    "Hi! I’m Justin. I build dashboards, organize information, and make tools for everyday work. I’m drawn to complicated, repetitive, or mildly annoying problems that could use a better process. Outside of work, I’m usually experimenting with code, starting another side project, or tending to an entirely reasonable number of houseplants.",
  bio: "I’ve worked in academic libraries for more than a decade. My current role spans technology, data, communications, administration, and knowledge management, along with the unexpected problems that resist tidy categories.",
  approach:
    "I want the systems I build to make information easier to find, remove unnecessary work, and be straightforward for people to use and maintain.",
  personal:
    "Outside of work, I’m usually experimenting with code, starting another side project, or tending to an entirely reasonable number of houseplants.",
};
export const contacts = [
  ["Email me", "mailto:justin.rogowski@uconn.edu", "mail"],
  [
    "Start a Teams chat",
    "https://teams.microsoft.com/l/chat/0/0?users=justin.rogowski@uconn.edu",
    "external",
  ],
  ["LinkedIn", "https://www.linkedin.com/in/justin-rogowski/", "external"],
  ["GitHub", "https://github.com/JustinRogo", "code"],
  ["Call Justin", "tel:+18605705109", "external"],
];
export const integrations = {
  calendar:
    "https://outlook.office365.com/calendar/published/3ca52ff81f8a440699723f09efe5d298@uconn.edu/66bd7da89640440591f449ae5ce4fcc514733372329545515702/calendar.html",
  booking:
    "https://outlook.office.com/bookwithme/user/3ca52ff81f8a440699723f09efe5d298%40uconn.edu?anonymous&ismsaljsauthenabled=true",
  events:
    "https://events.uconn.edu/live/rss/events/group/Law%20School/categories_campus/UConn%20Law/header/All%20Events",
  weather:
    "https://api.open-meteo.com/v1/forecast?latitude=41.76&longitude=-72.67&current=temperature_2m,apparent_temperature,weather_code&temperature_unit=fahrenheit&timezone=America%2FNew_York",
};
export const donationUrl =
  "https://giving.uconn.edu/campaigns/60852/donations/new?designation=LawLibraryEndowmentFund";
export const resources = [
  ["UConn Law Library", "https://library.law.uconn.edu/"],
  ["Library hours", "https://library.law.uconn.edu/about/hours-and-location/"],
  ["Reserve a study room", "https://library.law.uconn.edu/studyrooms/"],
  ["Interlibrary loan", "https://library.law.uconn.edu/resource-sharing/"],
  ["Research guides", "https://libguides.law.uconn.edu/"],
  [
    "CT General Statutes Explorer",
    "https://uconn-law-library.github.io/CGS/#/",
  ],
  [
    "IT Help Desk",
    "https://law.uconn.edu/student-life/student-services/#collapsepanel-3874-1-0-05",
  ],
  ["Confluence", "https://uconn.atlassian.net/wiki/x/IgHzNwY"],
  ["UConn Phonebook", "https://directory.uconn.edu/"],
  ["UCPEA", "https://ucpea.ct.aft.org/"],
  ["Support the Law Library", donationUrl],
];
export const experience = [
  [
    "Knowledge management",
    "Built a Confluence hub for staff documentation, training materials, meeting notes, project updates, and institutional knowledge.",
  ],
  [
    "Data & reporting",
    "Created Power BI dashboards for payroll, facilities, surveys, collections, scholarships, projects, and service feedback.",
  ],
  [
    "Workflow design",
    "Built Power Apps and Kuali Build tools that streamlined daily statistics, recurring staff tasks, and internal administrative workflows.",
  ],
  [
    "Web & communications",
    "Redesigned and maintained library webpages, digital resources, and communications, including work for the Law Library’s centennial.",
  ],
];
export const technologies = [
  "Power BI",
  "Confluence",
  "Jira",
  "Alma",
  "Primo Analytics",
  "Microsoft 365",
  "Power Apps",
  "Power Automate",
  "Copilot",
  "WordPress",
  "HTML / CSS / JavaScript",
  "Python",
  "GitHub",
  "Adobe Creative Cloud",
  "Canva",
];
export const groupOf = (project) =>
  project.path.includes("/For Fun/")
    ? "For Fun"
    : project.path.includes("/Library/")
      ? "Library"
      : "Work";
export const projectHref = (project) =>
  project.href ||
  `../${project.path.split("/").map(encodeURIComponent).join("/")}`;
export const featuredPaths = [
  "Pages/Work/cgs/index.html",
  "Pages/Work/Library/heatmap.html",
  "Pages/Updates/index.html",
  "Pages/For Fun/Tarot/index.html",
];
// V2 display names. data/pages.json is shared with V1 and stays unchanged.
export const projectTitles = {
  "Pages/Updates/index.html": "AI Corner Updates",
  "Pages/For Fun/Tarot/index.html": "Midnight Tarot",
};
export function catalogUrl(type, query) {
  if (type === "Research guides")
    return `https://libguides.law.uconn.edu/srch.php?${new URLSearchParams({ q: query })}`;
  const scopes = {
    "Books & more": "MyInst_and_CI",
    Journals: "EJOURNALS",
    Databases: "DATABASES",
    "Course reserves": "CourseReserves",
  };
  return `https://uconn-law.primo.exlibrisgroup.com/discovery/search?${new URLSearchParams({ vid: "01UCT_LAW:01UCT_LAW", tab: "Everything", search_scope: scopes[type], mode: "simple", query: `any,contains,${query.replace(/,/g, " ")}` })}`;
}
