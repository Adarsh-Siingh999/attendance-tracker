import { useApp } from "../context/AppContext.jsx";
import { Badge } from "../components/common/Badge.jsx";

export function ForecastPage() {
  const {
    overallForecast,
    subjectForecasts,
    threshold,
    criticalThreshold,
    classesRemaining,
  } = useApp();

  return (
    <div className="page-container forecast-page">
      <div className="page-header-actions">
        <div>
          <h2 className="section-heading">Attendance Projections & Recovery Roadmap</h2>
          <p className="section-desc">
            Mathematical projections based on your remaining timetable classes ({classesRemaining ?? 0} classes left in this semester).
          </p>
        </div>
      </div>

      {/* OVERALL FORECAST CARDS */}
      <div className="overview-grid mb-4">
        <div className="overview-card">
          <span className="card-label">Overall Best Possible</span>
          <strong className={`card-value ${overallForecast.canRecover ? "text-success" : "text-danger"}`}>
            {overallForecast.bestPossible.toFixed(2)}%
          </strong>
          <small className="card-subtext">If you attend every remaining class</small>
        </div>

        <div className="overview-card">
          <span className="card-label">Total Semester Classes</span>
          <strong className="card-value">{overallForecast.totalClasses ?? classesRemaining}</strong>
          <small className="card-subtext">
            {overallForecast.conductedClasses ?? 0} conducted + {classesRemaining} upcoming
          </small>
        </div>

        <div className="overview-card">
          <span className="card-label">Max Allowed Absences</span>
          <strong className="card-value">{overallForecast.maxAllowedAbsences} safe skips</strong>
          <small className="card-subtext">
            Budget: {overallForecast.maxTotalSemesterAbsences75 ?? 0} total ({overallForecast.missedSoFar ?? 0} used)
          </small>
        </div>

        <div className="overview-card">
          <span className="card-label">Required Consecutive Classes</span>
          <strong className="card-value">{overallForecast.requiredClasses}</strong>
          <small className="card-subtext">
            {overallForecast.canRecover
              ? `Requires ${overallForecast.requiredClasses} of ${classesRemaining} remaining`
              : "Recovery not possible"}
          </small>
        </div>
      </div>

      {/* SUBJECT FORECAST TABLE */}
      <div className="forecast-table-card">
        <div className="table-card-header">
          <div>
            <h3>Course-by-Course Projections</h3>
            <p className="table-desc">Calculated individually comparing past conducted classes with future timetable and academic calendar schedule.</p>
          </div>
        </div>

        <div className="table-responsive">
          <table className="impact-table">
            <thead>
              <tr>
                <th>Subject</th>
                <th>Current</th>
                <th>Total Classes</th>
                <th>Max Absences Budget</th>
                <th>Best Possible</th>
                <th>Required for {threshold}%</th>
                <th>Required for {criticalThreshold}%</th>
                <th>Recovery Feasibility</th>
              </tr>
            </thead>
            <tbody>
              {subjectForecasts.map((sub) => {
                const isShortage = sub.percentage !== null && sub.percentage < threshold;
                return (
                  <tr key={sub.id} className={isShortage ? "row-warning" : ""}>
                    <td>
                      <strong>{sub.name}</strong>
                      {sub.code && <div className="cell-subtext">{sub.code}</div>}
                    </td>
                    <td>
                      <strong className={sub.percentage < threshold ? "text-danger" : "text-success"}>
                        {sub.percentage !== null ? `${sub.percentage.toFixed(1)}%` : "—"}
                      </strong>
                      <div className="cell-subtext">{sub.attended}/{sub.conducted}</div>
                    </td>
                    <td>
                      <span className="future-badge">{sub.totalClasses ?? (sub.conducted + sub.futureClasses)} total</span>
                      <div className="cell-subtext">{sub.conducted} done + {sub.futureClasses} upcoming</div>
                    </td>
                    <td>
                      <strong className={sub.maximumAllowedAbsences > 0 ? "text-success" : "text-danger"}>
                        {sub.maximumAllowedAbsences} safe skips
                      </strong>
                      <div className="cell-subtext">
                        Budget: {sub.maxTotalSemesterAbsences75 ?? 0} total ({sub.missedSoFar ?? (sub.conducted - sub.attended)} used)
                      </div>
                    </td>
                    <td>
                      <strong className={sub.bestPossiblePercentage >= threshold ? "text-success" : "text-danger"}>
                        {sub.bestPossiblePercentage.toFixed(1)}%
                      </strong>
                    </td>
                    <td>
                      {sub.requiredClassesThreshold === 0 ? (
                        <span className="text-success">Already eligible (0)</span>
                      ) : (
                        <strong className="text-danger">{sub.requiredClassesThreshold} classes</strong>
                      )}
                    </td>
                    <td>
                      {sub.requiredClassesCritical === 0 ? (
                        <span className="text-success">Above 65% (0)</span>
                      ) : (
                        <strong className="text-warning">{sub.requiredClassesCritical} classes</strong>
                      )}
                    </td>
                    <td>
                      <Badge variant={sub.canRecover ? "success" : "danger"}>
                        {sub.canRecover ? "Can Recover" : "Unrecoverable"}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
