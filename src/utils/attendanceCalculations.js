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
 */
export function calculateMaximumAllowedAbsences(attended, conducted, remainingClasses, target = DEFAULT_THRESHOLD) {
  const safeRemaining = Math.max(0, Number(remainingClasses) || 0);
  if (safeRemaining === 0) return 0;

  let maxSafe = 0;
  for (let abs = 0; abs <= safeRemaining; abs++) {
    const projected = calculateAttendanceAfterAbsence(attended, conducted, safeRemaining, abs);
    if (projected.percentage >= target) {
      maxSafe = abs;
    } else {
      break;
    }
  }

  return maxSafe;
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