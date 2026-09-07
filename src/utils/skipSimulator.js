/**
 * "Can I Skip?" / "Can I Sleep?" Simulation Engine
 * Calculates the exact mathematical impact on overall and subject-wise attendance
 * if a student skips a day, a specific class, or multiple classes.
 */

import {
  calculatePercentage,
  getSubjectStatus,
} from "./attendanceCalculations.js";
import {
  getClassesForDate,
  formatDate,
} from "./academicCalendarUtils.js";

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

/**
 * Simulates a Date Range Leave (X to Y).
 * Assumes student has completed all classes up to present, attends 100% of classes
 * between present and start of leave (X), and misses all classes within [X, Y].
 * Evaluates eligibility and reports exact affected subjects.
 *
 * @param {Object} params
 * @param {Array} params.subjects - Active subjects array
 * @param {string} params.startDate - Range start date (YYYY-MM-DD)
 * @param {string} params.endDate - Range end date (YYYY-MM-DD)
 * @param {string} params.todayDate - Present date (defaults to current date)
 * @param {Object} params.calendar - Active calendar configuration
 * @param {Object} params.timetable - Timetable routine
 * @param {number} params.threshold - Minimum required percentage (default 75)
 * @param {number} params.criticalThreshold - Critical percentage (default 65)
 * @returns {Object} Full impact simulation with subject breakdown and eligibility verdict
 */
export function simulateDateRangeLeave({
  subjects = [],
  startDate,
  endDate,
  todayDate = formatDate(new Date()),
  calendar = null,
  timetable = null,
  semesterEndDate = null,
  threshold = 75,
  criticalThreshold = 65,
}) {
  if (!startDate || !endDate) {
    return {
      verdict: "INVALID_RANGE",
      badge: "info",
      headline: "Select Date Range",
      description: "Please specify both Start Date (X) and End Date (Y) to run the leave simulation.",
      totalClassesInLeave: 0,
      ineligibleSubjects: [],
      criticalSubjects: [],
      subjects: [],
    };
  }

  const start = startDate <= endDate ? startDate : endDate;
  const end = startDate <= endDate ? endDate : startDate;

  // Resolve effective semester end date
  const examEndDates = Object.values(calendar?.examinations || {}).map((e) => e.endDate).filter(Boolean);
  const latestExam = examEndDates.sort().at(-1);
  let resolvedSemesterEnd = semesterEndDate || calendar?.endDate || latestExam;
  if (!resolvedSemesterEnd) {
    const base = new Date(`${todayDate}T00:00:00`);
    const calcEnd = new Date(base);
    calcEnd.setDate(calcEnd.getDate() + 90);
    resolvedSemesterEnd = formatDate(calcEnd);
  }

  // 1. Gather interim classes between todayDate and start (if start > todayDate)
  // Assumes student attends 100% of these classes prior to departure
  const interimAttendedByCode = {};
  let totalAttendedInterim = 0;
  const preLeaveDays = [];

  if (start > todayDate) {
    const cur = new Date(`${todayDate}T00:00:00`);
    const leaveStartD = new Date(`${start}T00:00:00`);

    // Advance 1 day past today (today's completed classes are already in subjects)
    cur.setDate(cur.getDate() + 1);

    while (cur < leaveStartD) {
      const dStr = formatDate(cur);
      const dayClasses = getClassesForDate(dStr, { calendar, timetable });
      if (dayClasses.length > 0) {
        preLeaveDays.push({ date: dStr, classes: dayClasses });
        for (const cls of dayClasses) {
          const code = cls.code || cls.subject;
          interimAttendedByCode[code] = (interimAttendedByCode[code] || 0) + 1;
          totalAttendedInterim += 1;
        }
      }
      cur.setDate(cur.getDate() + 1);
    }
  }

  // 2. Gather classes in leave range [start, end] (all missed: +0 attended, +1 conducted)
  const leaveDays = [];
  const missedClassesByCode = {};
  let totalClassesInLeave = 0;

  const curLeave = new Date(`${start}T00:00:00`);
  const leaveEndD = new Date(`${end}T00:00:00`);

  while (curLeave <= leaveEndD) {
    const dStr = formatDate(curLeave);
    const dayClasses = getClassesForDate(dStr, { calendar, timetable });
    leaveDays.push({
      date: dStr,
      classes: dayClasses,
      isInstructional: dayClasses.length > 0,
    });

    if (dayClasses.length > 0) {
      for (const cls of dayClasses) {
        const code = cls.code || cls.subject;
        missedClassesByCode[code] = (missedClassesByCode[code] || 0) + 1;
        totalClassesInLeave += 1;
      }
    }

    curLeave.setDate(curLeave.getDate() + 1);
  }

  // 3. Gather post-leave classes between end + 1 and semester end
  // User Requirement: Assumes student attends 100% of all remaining classes post the range date!
  const postLeaveAttendedByCode = {};
  let totalAttendedPostLeave = 0;
  const postLeaveDays = [];

  const curPost = new Date(`${end}T00:00:00`);
  curPost.setDate(curPost.getDate() + 1);
  const semesterEndD = new Date(`${resolvedSemesterEnd}T00:00:00`);

  while (curPost <= semesterEndD) {
    const dStr = formatDate(curPost);
    const dayClasses = getClassesForDate(dStr, { calendar, timetable });
    if (dayClasses.length > 0) {
      postLeaveDays.push({ date: dStr, classes: dayClasses });
      for (const cls of dayClasses) {
        const code = cls.code || cls.subject;
        postLeaveAttendedByCode[code] = (postLeaveAttendedByCode[code] || 0) + 1;
        totalAttendedPostLeave += 1;
      }
    }
    curPost.setDate(curPost.getDate() + 1);
  }

  // 4. Compute final semester attendance per subject assuming 100% post-leave attendance
  let totalAttendedCurrent = 0;
  let totalConductedCurrent = 0;
  let totalImmediateAttended = 0;
  let totalImmediateConducted = 0;
  let totalFinalSemesterAttended = 0;
  let totalFinalSemesterConducted = 0;

  const subjectResults = [];
  const ineligibleSubjects = [];
  const criticalSubjects = [];
  const recoverableSubjects = [];

  for (const sub of subjects) {
    const code = sub.code || sub.name;
    const currentAttended = Number(sub.attended) || 0;
    const currentConducted = Number(sub.conducted) || 0;
    const currentPct = calculatePercentage(currentAttended, currentConducted) ?? 100;

    const interimAttended = interimAttendedByCode[code] || 0;
    const missedInLeave = missedClassesByCode[code] || 0;
    const postLeaveAttended = postLeaveAttendedByCode[code] || 0;

    // A. Immediate status at Date Y (upon return from leave)
    const immediateAttended = currentAttended + interimAttended;
    const immediateConducted = currentConducted + interimAttended + missedInLeave;
    const immediatePct = calculatePercentage(immediateAttended, immediateConducted) ?? 100;
    const isImmediateEligible = immediatePct >= threshold;

    // B. Final Semester Status (assuming 100% attendance of all remaining classes post-range date)
    const finalSemesterAttended = immediateAttended + postLeaveAttended;
    const finalSemesterConducted = immediateConducted + postLeaveAttended;
    const finalSemesterPct = calculatePercentage(finalSemesterAttended, finalSemesterConducted) ?? 100;
    const isFinalEligible = finalSemesterPct >= threshold;
    const isFinalCritical = finalSemesterPct < criticalThreshold;
    const statusFinal = getSubjectStatus(finalSemesterPct, threshold, criticalThreshold);

    const netSemesterDrop = Number((currentPct - finalSemesterPct).toFixed(2));
    const canRecover = !isImmediateEligible && isFinalEligible;

    totalAttendedCurrent += currentAttended;
    totalConductedCurrent += currentConducted;
    totalImmediateAttended += immediateAttended;
    totalImmediateConducted += immediateConducted;
    totalFinalSemesterAttended += finalSemesterAttended;
    totalFinalSemesterConducted += finalSemesterConducted;

    if (!isFinalEligible) {
      ineligibleSubjects.push({
        id: sub.id,
        name: sub.name,
        code: sub.code,
        currentPct,
        immediatePct,
        finalSemesterPct,
        missedInLeave,
        postLeaveAttended,
        drop: netSemesterDrop,
        isCritical: isFinalCritical,
        statusFinal,
      });
    }

    if (isFinalCritical) {
      criticalSubjects.push(sub.name);
    }

    if (canRecover) {
      recoverableSubjects.push({
        name: sub.name,
        code: sub.code,
        immediatePct,
        finalSemesterPct,
      });
    }

    subjectResults.push({
      id: sub.id,
      name: sub.name,
      code: sub.code,
      currentAttended,
      currentConducted,
      currentPct,
      interimAttended,
      missedInLeave,
      postLeaveAttended,
      immediateAttended,
      immediateConducted,
      immediatePct,
      finalSemesterAttended,
      finalSemesterConducted,
      finalSemesterPct,
      drop: netSemesterDrop,
      statusFinal,
      isFinalEligible,
      isFinalCritical,
      canRecover,
    });
  }

  const overallCurrentPct = calculatePercentage(totalAttendedCurrent, totalConductedCurrent) ?? 0;
  const overallImmediatePct = calculatePercentage(totalImmediateAttended, totalImmediateConducted) ?? 0;
  const overallFinalSemesterPct = calculatePercentage(totalFinalSemesterAttended, totalFinalSemesterConducted) ?? 0;
  const isOverallFinalEligible = overallFinalSemesterPct >= threshold;

  // 5. Determine final semester eligibility verdict
  let verdict = "ELIGIBLE_SEMESTER";
  let badge = "success";
  let headline = "Fully Eligible by Semester End! 🎉";
  let description = `Even after missing all ${totalClassesInLeave} classes from ${start} to ${end}, attending 100% of all ${totalAttendedPostLeave} remaining classes post-leave guarantees you remain eligible (≥${threshold}%) in ALL subjects by semester end!`;

  if (criticalSubjects.length > 0) {
    verdict = "CRITICAL_SHORTAGE";
    badge = "danger";
    headline = "Debarment Risk! Critical Shortage at Semester End 🚨";
    description = `Even with 100% attendance in every remaining class post-leave, ${criticalSubjects.length} subject(s) CANNOT recover and will permanently fall below the critical ${criticalThreshold}% debarment limit: ${criticalSubjects.join(", ")}.`;
  } else if (ineligibleSubjects.length > 0 || !isOverallFinalEligible) {
    verdict = "UNRECOVERABLE_SHORTAGE";
    badge = "warning";
    headline = `Permanent Shortage in ${ineligibleSubjects.length} Subject(s) ⚠️`;
    const names = ineligibleSubjects.map((s) => `${s.name} (${s.finalSemesterPct.toFixed(1)}%)`).join(", ");
    description = `Even if you attend 100% of all classes after your leave, you cannot reach ${threshold}% in: ${names}.`;
  } else if (totalClassesInLeave === 0) {
    headline = "Zero classes missed in range! 🎉";
    description = `No instructional classes are scheduled between ${start} and ${end} (all days are holidays, weekends, or non-instructional). Your attendance will not drop at all!`;
  }

  return {
    startDate: start,
    endDate: end,
    semesterEndDate: resolvedSemesterEnd,
    totalLeaveDays: leaveDays.length,
    instructionalLeaveDays: leaveDays.filter((d) => d.isInstructional).length,
    totalClassesInLeave,
    totalAttendedInterim,
    totalAttendedPostLeave,
    overallCurrentPct,
    overallImmediatePct,
    overallFinalSemesterPct,
    overallDrop: Number((overallCurrentPct - overallFinalSemesterPct).toFixed(2)),
    isOverallFinalEligible,
    verdict,
    badge,
    headline,
    description,
    ineligibleSubjects,
    criticalSubjects,
    recoverableSubjects,
    subjects: subjectResults,
    leaveDays,
    preLeaveDays,
    postLeaveDays,
  };
}

