import {
  calculatePercentage,
  calculateBestPossibleAttendance,
  calculateAttendanceAfterAbsence,
  calculateMaximumAllowedAbsences,
  calculateRecoveryProjection,
} from "./attendanceCalculations";

console.log("=== ATTENDANCE CALCULATION TEST ===");

const attended = 3;
const conducted = 11;
const remainingClasses = 20;

console.log("Current:", JSON.stringify({
  attended,
  conducted,
  percentage: calculatePercentage(attended, conducted),
}));

const best = calculateBestPossibleAttendance(
  attended,
  conducted,
  remainingClasses
);

console.log(
  "Best Possible:",
  JSON.stringify(best)
);

console.log("What If Absence:");

for (let absences = 0; absences <= 5; absences++) {
  console.log(
    `${absences} absence(s):`,
    JSON.stringify(
      calculateAttendanceAfterAbsence(
        attended,
        conducted,
        remainingClasses,
        absences
      )
    )
  );
}

const maximumAbsences =
  calculateMaximumAllowedAbsences(
    attended,
    conducted,
    remainingClasses
  );

console.log(
  "Maximum Safe Absences:",
  maximumAbsences
);

const recovery =
  calculateRecoveryProjection(
    attended,
    conducted,
    remainingClasses
  );

console.log(
  "Recovery Projection:",
  JSON.stringify(recovery)
);

console.log("=== TEST COMPLETE ===");