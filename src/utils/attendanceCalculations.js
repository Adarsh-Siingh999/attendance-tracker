import {
  ATTENDANCE_THRESHOLD,
  CRITICAL_THRESHOLD,
} from "../data/attendanceData";

export function calculatePercentage(attended, conducted) {
  if (conducted === 0) {
    return null;
  }

  return Number(((attended / conducted) * 100).toFixed(2));
}

export function calculateOverallAttendance(
  attended,
  conducted
) {
  return {
    attended,
    conducted,
    percentage: calculatePercentage(
      attended,
      conducted
    ),
  };
}

export function calculateSubjectAttendance(subject) {
  const pp = subject.components.PP;
  const pr = subject.components.PR;

  const attended =
    pp.attended + pr.attended;

  const conducted =
    pp.conducted + pr.conducted;

  return {
    ...subject,
    attended,
    conducted,
    percentage: calculatePercentage(
      attended,
      conducted
    ),
    pp,
    pr,
  };
}

export function getEligibility(percentage) {
  if (percentage === null) {
    return "No Classes";
  }

  return percentage >= ATTENDANCE_THRESHOLD
    ? "Eligible"
    : "Not Eligible";
}

export function getSubjectStatus(percentage) {
  if (percentage === null) {
    return "No Classes";
  }

  if (percentage >= ATTENDANCE_THRESHOLD) {
    return "Eligible";
  }

  if (percentage >= CRITICAL_THRESHOLD) {
    return "Precaution";
  }

  return "Critical";
}

export function calculateRequiredClasses(
  attended,
  conducted,
  target = ATTENDANCE_THRESHOLD
) {
  if (conducted === 0) {
    return 0;
  }

  if (
    (attended / conducted) * 100 >=
    target
  ) {
    return 0;
  }

  const required = Math.ceil(
    (target * conducted -
      100 * attended) /
      (100 - target)
  );

  return Math.max(required, 0);
}

export function calculateBestPossibleAttendance(
  attended,
  conducted,
  remainingClasses
) {
  const finalAttended =
    attended + remainingClasses;

  const finalConducted =
    conducted + remainingClasses;

  return {
    attended: finalAttended,
    conducted: finalConducted,
    percentage: calculatePercentage(
      finalAttended,
      finalConducted
    ),
  };
}

export function calculateAttendanceAfterAbsence(
  attended,
  conducted,
  remainingClasses,
  absences
) {
  const futureAttended =
    attended +
    (remainingClasses - absences);

  const futureConducted =
    conducted + remainingClasses;

  return {
    attended: futureAttended,
    conducted: futureConducted,
    absences,
    percentage: calculatePercentage(
      futureAttended,
      futureConducted
    ),
  };
}

export function calculateMaximumAllowedAbsences(
  attended,
  conducted,
  remainingClasses,
  target = ATTENDANCE_THRESHOLD
) {
  let maximumAbsences = 0;

  for (
    let absences = 0;
    absences <= remainingClasses;
    absences++
  ) {
    const result =
      calculateAttendanceAfterAbsence(
        attended,
        conducted,
        remainingClasses,
        absences
      );

    if (result.percentage >= target) {
      maximumAbsences = absences;
    } else {
      break;
    }
  }

  return maximumAbsences;
}

export function calculateRecoveryProjection(
  attended,
  conducted,
  remainingClasses,
  target = ATTENDANCE_THRESHOLD
) {
  const currentPercentage =
    calculatePercentage(
      attended,
      conducted
    );

  const requiredClasses =
    calculateRequiredClasses(
      attended,
      conducted,
      target
    );

  const canRecover =
    requiredClasses <=
    remainingClasses;

  const bestPossible =
    calculateBestPossibleAttendance(
      attended,
      conducted,
      remainingClasses
    );

  return {
    currentPercentage,
    requiredClasses,
    remainingClasses,
    canRecover,
    bestPossiblePercentage:
      bestPossible.percentage,
  };
}