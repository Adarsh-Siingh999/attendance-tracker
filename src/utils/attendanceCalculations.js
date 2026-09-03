/**
 * Centralized Attendance Calculation Engine
 * Pure mathematical functions for attendance percentage, thresholds,
 * required recovery classes, maximum allowed absences, and projections.
 */

export const DEFAULT_THRESHOLD = 75;
export const DEFAULT_CRITICAL = 65;

/**
 * Calculates percentage to 2 decimal places.
 * Returns null if conducted === 0.
 */
export function calculatePercentage(attended, conducted) {
  if (conducted === 0 || conducted === undefined || conducted === null) {
    return null;
  }
  if (attended <= 0) return 0;
  return Number(((attended / conducted) * 100).toFixed(2));
}

/**
 * Overall summary calculation.
 */
export function calculateOverallAttendance(attended, conducted) {
  const percentage = calculatePercentage(attended, conducted);
  return {
    attended: attended || 0,
    conducted: conducted || 0,
    percentage: percentage ?? 0,
  };
}

/**
 * Subject attendance breakdown aggregating components.
 */
export function calculateSubjectAttendance(subject) {
  if (!subject) {
    return { attended: 0, conducted: 0, percentage: null, components: {} };
  }

  let attended = 0;
  let conducted = 0;

  const components = subject.components || {};
  for (const comp of Object.values(components)) {
    attended += Number(comp.attended) || 0;
    conducted += Number(comp.conducted) || 0;
  }

  return {
    ...subject,
    attended,
    conducted,
    percentage: calculatePercentage(attended, conducted),
    components,
  };
}

/**
 * Returns user-friendly eligibility label based on dynamic threshold.
 */
export function getEligibility(percentage, threshold = DEFAULT_THRESHOLD) {
  if (percentage === null || percentage === undefined) {
    return "No Classes";
  }
  return percentage >= threshold ? "Eligible" : "Not Eligible";
}

/**
 * Categorizes attendance status: Eligible, Precaution, or Critical.
 */
export function getSubjectStatus(percentage, threshold = DEFAULT_THRESHOLD, critical = DEFAULT_CRITICAL) {
  if (percentage === null || percentage === undefined) {
    return "No Classes";
  }
  if (percentage >= threshold) {
    return "Eligible";
  }
  if (percentage >= critical) {
    return "Precaution";
  }
  return "Critical";
}

/**
 * Calculates the exact number of consecutive classes a user must attend to reach target %.
 * Formula: ceil((target * conducted - 100 * attended) / (100 - target))
 */
export function calculateRequiredClasses(attended, conducted, target = DEFAULT_THRESHOLD) {
  if (!conducted || conducted <= 0) return 0;
  if ((attended / conducted) * 100 >= target) return 0;
  if (target >= 100) {
    // Reaching 100% after missing any class is mathematically impossible
    return Infinity;
  }

  const required = Math.ceil((target * conducted - 100 * attended) / (100 - target));
  return Math.max(required, 0);
}

/**
 * Calculates maximum possible attendance if all remaining classes are attended.
 */
export function calculateBestPossibleAttendance(attended, conducted, remainingClasses) {
  const safeRemaining = Math.max(0, Number(remainingClasses) || 0);
  const finalAttended = (attended || 0) + safeRemaining;
  const finalConducted = (conducted || 0) + safeRemaining;

  return {
    attended: finalAttended,
    conducted: finalConducted,
    percentage: calculatePercentage(finalAttended, finalConducted) ?? 0,
  };
}

/**
 * Simulates attendance percentage if a given number of absences occur over the remaining classes.
 */
export function calculateAttendanceAfterAbsence(attended, conducted, remainingClasses, absences) {
  const safeRemaining = Math.max(0, Number(remainingClasses) || 0);
  const safeAbsences = Math.min(safeRemaining, Math.max(0, Number(absences) || 0));
  const futureAttended = (attended || 0) + (safeRemaining - safeAbsences);
  const futureConducted = (conducted || 0) + safeRemaining;

  return {
    attended: futureAttended,
    conducted: futureConducted,
    absences: safeAbsences,
    percentage: calculatePercentage(futureAttended, futureConducted) ?? 0,
  };
}

/**
 * Calculates the maximum number of upcoming classes that can be missed while staying >= target %.
 * If remainingClasses is 0 or omitted, returns immediate consecutive bunk allowance based on conducted classes.
 */
export function calculateMaximumAllowedAbsences(attended, conducted, remainingClasses, target = DEFAULT_THRESHOLD) {
  const safeRemaining = Math.max(0, Number(remainingClasses) || 0);
  const safeAttended = Math.max(0, Number(attended) || 0);
  const safeConducted = Math.max(0, Number(conducted) || 0);

  // If no remaining classes are scheduled or remainingClasses === 0:
  // Calculate immediate consecutive absences allowed right now based on conducted classes
  if (safeRemaining === 0) {
    if (safeConducted === 0) return 0;
    const currentPct = (safeAttended / safeConducted) * 100;
    if (currentPct < target) return 0;
    return Math.max(0, Math.floor(safeAttended / (target / 100) - safeConducted));
  }

  // When upcoming classes are scheduled (e.g. from timetable and academic calendar):
  // (attended + remaining - abs) / (conducted + remaining) >= target / 100
  let maxSafe = 0;
  for (let abs = 0; abs <= safeRemaining; abs++) {
    const projected = calculateAttendanceAfterAbsence(safeAttended, safeConducted, safeRemaining, abs);
    if (projected.percentage >= target) {
      maxSafe = abs;
    } else {
      break;
    }
  }

  return maxSafe;
}

/**
 * Calculates a comprehensive semester absence budget comparing past conducted classes,
 * future scheduled classes (from timetable and academic calendar), total classes, and
 * allowed absences.
 */
export function calculateSemesterAbsenceBudget(attended, conducted, remainingClasses, target = DEFAULT_THRESHOLD) {
  const safeAttended = Math.max(0, Number(attended) || 0);
  const safeConducted = Math.max(0, Number(conducted) || 0);
  const safeRemaining = Math.max(0, Number(remainingClasses) || 0);
  const totalClasses = safeConducted + safeRemaining;
  const missedSoFar = Math.max(0, safeConducted - safeAttended);

  // Max total absences allowed across the ENTIRE semester
  const maxTotalSemesterAbsences = totalClasses > 0
    ? Math.floor((1 - target / 100) * totalClasses)
    : 0;

  // Remaining safe skips out of the upcoming future classes
  const remainingSafeSkips = calculateMaximumAllowedAbsences(safeAttended, safeConducted, safeRemaining, target);

  // Immediate consecutive bunk allowance right now (without any future class attendance assumed)
  const immediateBunkMargin = safeConducted > 0 && (safeAttended / safeConducted) * 100 >= target
    ? Math.max(0, Math.floor(safeAttended / (target / 100) - safeConducted))
    : 0;

  const bestPossible = calculateBestPossibleAttendance(safeAttended, safeConducted, safeRemaining);
  const canRecover = bestPossible.percentage >= target;
  const requiredClasses = calculateRequiredClasses(safeAttended, safeConducted, target);

  return {
    totalClasses,
    conductedClasses: safeConducted,
    attendedClasses: safeAttended,
    missedSoFar,
    remainingClasses: safeRemaining,
    maxTotalSemesterAbsences,
    remainingSafeSkips,
    immediateBunkMargin,
    canRecover,
    bestPossiblePercentage: bestPossible.percentage,
    requiredClasses,
  };
}

/**
 * Comprehensive recovery projection report.
 */
export function calculateRecoveryProjection(attended, conducted, remainingClasses, target = DEFAULT_THRESHOLD) {
  const currentPercentage = calculatePercentage(attended, conducted);
  const requiredClasses = calculateRequiredClasses(attended, conducted, target);
  const bestPossible = calculateBestPossibleAttendance(attended, conducted, remainingClasses);
  const canRecover = bestPossible.percentage >= target;

  return {
    currentPercentage,
    requiredClasses,
    remainingClasses,
    canRecover,
    bestPossiblePercentage: bestPossible.percentage,
  };
}