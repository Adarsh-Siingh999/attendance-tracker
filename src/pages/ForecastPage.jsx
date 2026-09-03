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
            Mathematical projections based on your remaining timetable classes ({classesRemaining} classes left in this semester).
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
          <span className="card-label">Required Consecutive Classes</span>
          <strong className="card-value">{overallForecast.requiredClasses}</strong>
          <small className="card-subtext">To reach {threshold}% eligibility threshold</small>
        </div>

        <div className="overview-card">
          <span className="card-label">Max Allowed Absences</span>
          <strong className="card-value">{overallForecast.maxAllowedAbsences}</strong>
          <small className="card-subtext">While maintaining &gt;= {threshold}%</small>
        </div>

        <div className="overview-card">
          <span className="card-label">Overall Recovery Feasibility</span>
          <strong className={`card-value ${overallForecast.canRecover ? "text-success" : "text-danger"}`}>
            {overallForecast.canRecover ? "Can Recover" : "Cannot Recover"}
          </strong>
          <small className="card-subtext">
            {overallForecast.canRecover
              ? `Requires ${overallForecast.requiredClasses} of ${classesRemaining} remaining`
              : "Not enough classes remaining"}
          </small>
        </div>
      </div>

      {/* SUBJECT FORECAST TABLE */}
      <div className="forecast-table-card">
        <div className="table-card-header">
          <div>
            <h3>Course-by-Course Projections</h3>
            <p className="table-desc">Calculated individually according to your weekly timetable frequency.</p>
          </div>
        </div>

        <div className="table-responsive">
          <table className="impact-table">
            <thead>
              <tr>
                <th>Subject</th>
                <th>Current</th>
                <th>Future Classes</th>
                <th>Best Possible</th>
                <th>Required for {threshold}%</th>
                <th>Required for {criticalThreshold}%</th>
                <th>Safe Absences ({threshold}%)</th>
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
                      <span className="future-badge">{sub.futureClasses} classes</span>
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
                      <strong className="text-primary">{sub.maximumAllowedAbsences}</strong>
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
