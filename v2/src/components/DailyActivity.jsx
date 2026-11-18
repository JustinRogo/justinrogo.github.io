import { activityComparison } from "../../../Pages/Personal/Daily-Activity/comparison.js";
import { useResource } from "../hooks.js";
import { LoadState, SectionTitle } from "./UI.jsx";
import Icon from "./Icon.jsx";
import "./DailyActivity.css";

const activityPath = "/Pages/Personal/Daily-Activity/";
const dateLabel = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium", timeZone: "UTC",
});

function parseActivity(text) {
  const rows = JSON.parse(text);
  return activityComparison(new Map(rows.map(row => [Date.parse(row.date), row])));
}

export default function DailyActivity() {
  const resource = useResource(activityPath + "daily.json", parseActivity);
  return (
    <section className="about-activity" aria-labelledby="about-activity-title">
      <SectionTitle headingProps={{ id: "about-activity-title" }}>Daily activity</SectionTitle>
      <LoadState resource={resource} message="The activity figures couldn’t load.">
        {({ yesterday, metrics }) => (
          <>
            <p className="about-activity-caption">
              <time dateTime={new Date(yesterday).toISOString().slice(0, 10)}>{dateLabel.format(yesterday)}</time>
            </p>
            <dl className="about-activity-metrics">
              {metrics.map(({ key, title, ratio, percent, value, average }) => (
                <div key={key} data-metric={key}>
                  <dt>{title}</dt>
                  <dd className="about-activity-ring">
                    <svg viewBox="0 0 64 64" aria-hidden="true">
                      <circle cx="32" cy="32" r="28" className="about-activity-track" />
                      {ratio > 0 && <circle cx="32" cy="32" r="28" pathLength="100"
                        transform="rotate(-90 32 32)" strokeLinecap="round"
                        strokeDasharray={ratio < 1 ? `${ratio * 100} 100` : undefined} />}
                    </svg>
                    <span aria-hidden="true">{percent}</span>
                    <span className="sr-only">{ratio === undefined ? "Ratio unavailable" : `${percent} of rolling annual average`}</span>
                  </dd>
                  <dd className="about-activity-value">{value}</dd>
                  <dd>{average === undefined ? "No year average" : <>Year avg. <span className="about-activity-average">{average}</span></>}</dd>
                </div>
              ))}
            </dl>
          </>
        )}
      </LoadState>
      <a className="text-link" href={activityPath}>View activity history <Icon name="arrow" size={16} /></a>
    </section>
  );
}
