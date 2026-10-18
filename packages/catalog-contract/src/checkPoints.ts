/**
 * Where the app compares an entered term with the expected one. Negative
 * points and the large ones at the end serve terms that are undefined on part
 * of the line (√x, ln(x − 5)). The compiler uses the same points to warn about
 * an expected term that is finite at too few of them.
 */
export const CHECK_POINTS: readonly number[] = [
  0.73, 1.37, -1.91, 2.44, -0.58, 3.1, -2.6, 0.29, -1.13, 5.83, 7.41, 9.27,
  12.6,
];
