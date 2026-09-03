/**
 * "Can I Skip?" / "Can I Sleep?" Simulation Engine
 * Calculates the exact mathematical impact on overall and subject-wise attendance
 * if a student skips a day, a specific class, or multiple classes.
 */

import {
  calculatePercentage,
  getSubjectStatus,
} from "./attendanceCalculations.js";

/**
 * Simulates skipping a set of classes.
 *
 * @param {Object} params
 * @param {Array} params.subjects - Array of active subject objects with attended/conducted
 * @param {Array} params.classesToSkip - Array of class items scheduled to be skipped [{ code, subject, type }]
 * @param {number} params.threshold - Target attendance threshold (default 75)
 * @param {number} params.criticalThreshold - Critical threshold (default 65)
 * @returns {Object} Simulation results including verdict, affected subjects, and overall impact
 */
export function simulateSkipImpact({
  subjects,
  classesToSkip = [],
  threshold = 75,
  criticalThreshold = 65,
}) {
  if (!classesToSkip || classesToSkip.length === 0) {
    return {
      verdict: "NO_CLASSES",
      badge: "info",
      headline: "No classes scheduled",
      description: "There are no classes scheduled for the selected time, so attendance will not be affected.",
      affectedSubjects: [],
      overallBefore: null,
      overallAfter: null,
    };
  }

  // Count skipped classes per subject code
  const skippedByCode = {};
  for (const item of classesToSkip) {
    const code = item.code || item.subject;
    skippedByCode[code] = (skippedByCode[code] || 0) + 1;
  }

  let totalAttendedBefore = 0;
  let totalConductedBefore = 0;
  let totalAttendedAfter = 0;
  let totalConductedAfter = 0;

  const subjectImpacts = [];
  let hasCriticalDrop = false;
  let hasThresholdDrop = false;
  let alreadyCriticalSubjects = [];

  for (const sub of subjects) {
    const code = sub.code || sub.name;
    const skippedCount = skippedByCode[code] || 0;

    const attendedBefore = Number(sub.attended) || 0;
    const conductedBefore = Number(sub.conducted) || 0;
    const percentBefore = calculatePercentage(attendedBefore, conductedBefore) ?? 100;

    totalAttendedBefore += attendedBefore;
    totalConductedBefore += conductedBefore;

    // After skipping: conducted increases by skippedCount, attended stays the same
    const attendedAfter = attendedBefore;
    const conductedAfter = conductedBefore + skippedCount;
    const percentAfter = calculatePercentage(attendedAfter, conductedAfter) ?? 100;

    totalAttendedAfter += attendedAfter;
    totalConductedAfter += conductedAfter;

    if (skippedCount > 0) {
      const drop = Number((percentBefore - percentAfter).toFixed(2));
      const statusBefore = getSubjectStatus(percentBefore, threshold, criticalThreshold);
      const statusAfter = getSubjectStatus(percentAfter, threshold, criticalThreshold);

      const crossedThreshold = percentBefore >= threshold && percentAfter < threshold;
      const crossedCritical = percentBefore >= criticalThreshold && percentAfter < criticalThreshold;
      const isAlreadyCritical = percentBefore < criticalThreshold;

      if (crossedCritical || (isAlreadyCritical && drop > 0)) {
        hasCriticalDrop = true;
        alreadyCriticalSubjects.push(sub.name);
      } else if (crossedThreshold) {
        hasThresholdDrop = true;
      }

      subjectImpacts.push({
        id: sub.id,
        name: sub.name,
        code: sub.code,
        skippedClasses: skippedCount,
        percentBefore,
        percentAfter,
        drop,
        statusBefore,
        statusAfter,
        crossedThreshold,
        crossedCritical,
        isSevere: crossedCritical || isAlreadyCritical,
      });
    }
  }

  const overallPercentBefore = calculatePercentage(totalAttendedBefore, totalConductedBefore) ?? 0;
  const overallPercentAfter = calculatePercentage(totalAttendedAfter, totalConductedAfter) ?? 0;
  const overallDrop = Number((overallPercentBefore - overallPercentAfter).toFixed(2));

  // Determine final verdict
  let verdict = "SAFE";
  let badge = "success";
  let headline = "Safe to skip! 🎉";
  let description = "Skipping these classes will not push any subject below your eligibility criteria.";

  if (hasCriticalDrop) {
    verdict = "DANGER";
    badge = "danger";
    headline = "Do NOT skip! 🚨";
    description = `Skipping will severely harm attendance in: ${alreadyCriticalSubjects.join(", ")}. It falls into the critical zone (<${criticalThreshold}%).`;
  } else if (hasThresholdDrop || overallPercentAfter < threshold) {
    verdict = "CAUTION";
    badge = "warning";
    headline = "Proceed with caution ⚠️";
    description = `One or more subjects will drop below your ${threshold}% required eligibility threshold.`;
  }

  return {
    verdict,
    badge,
    headline,
    description,
    totalClassesSkipped: classesToSkip.length,
    overallBefore: overallPercentBefore,
    overallAfter: overallPercentAfter,
    overallDrop,
    affectedSubjects: subjectImpacts,
  };
}
