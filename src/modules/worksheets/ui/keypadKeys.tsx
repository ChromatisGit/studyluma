import type { ReactNode } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Delete } from "lucide-react";
import type { KeyAction } from "./keyboard";
import { TEXT } from "./texts";

const A = TEXT.keypad.aria;
const LATER = TEXT.keypad.later;

export type KeypadPage = "123" | "abc" | "fx";

export type KeyDef = {
  id: string;
  label: ReactNode;
  aria?: string;
  className?: string;
  action?: KeyAction;
  page?: KeypadPage;
  /** Reserved for a later version: shown, but inactive. */
  later?: string;
};

const ch = (value: string, aria?: string, className = "op"): KeyDef => ({
  id: value,
  label: value,
  ...(aria ? { aria } : {}),
  className,
  action: { kind: "char", value },
});

const digit = (value: string): KeyDef => ({ ...ch(value, undefined, "digit") });

const later = (id: keyof typeof LATER, label: ReactNode): KeyDef => ({
  id,
  label,
  aria: LATER[id],
  className: "later",
  later: LATER[id],
});

const page = (to: KeypadPage, label: string, aria: string): KeyDef => ({
  id: `page-${to}`,
  label,
  aria,
  className: `page kp-key--page-${to}`,
  page: to,
});

/** Fraction, root, square and power: the structure keys. */
const structureKeys: KeyDef[] = [
  {
    id: "frac",
    label: (
      <span className="kp-frac">
        <span />
        <span />
      </span>
    ),
    aria: A.frac,
    className: "frac",
    action: { kind: "frac", fromKeyboard: false },
  },
  {
    id: "sqrt",
    label: (
      <svg className="kp-rootsvg" viewBox="0 0 30 20" aria-hidden="true">
        <path
          d="M2 11.5 5 10l4 7.5L14 2.5h14"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <rect
          x="17"
          y="6"
          width="8"
          height="9"
          rx="1.2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
        />
      </svg>
    ),
    aria: A.sqrt,
    className: "sqrt",
    action: { kind: "sqrt" },
  },
  {
    id: "sq",
    label: (
      <>
        <span className="m-i">x</span>
        <span className="kp-supt">2</span>
      </>
    ),
    aria: A.sq,
    className: "sq",
    action: { kind: "squared" },
  },
  {
    id: "pow",
    label: (
      <>
        <span className="m-i">x</span>
        <span className="kp-supt kp-box" />
      </>
    ),
    aria: A.pow,
    className: "pow",
    action: { kind: "power" },
  },
];

/** The two fixed rows; `variable` is the expected term's first variable. */
export function topKeys(variable: string): KeyDef[] {
  return [
    ...structureKeys,
    {
      id: "left",
      label: <ChevronLeft className="icon" aria-hidden="true" />,
      aria: A.left,
      className: "left",
      action: { kind: "left" },
    },
    {
      id: "right",
      label: <ChevronRight className="icon" aria-hidden="true" />,
      aria: A.right,
      className: "right",
      action: { kind: "right" },
    },
    {
      id: "var",
      label: <span className="m-i">{variable}</span>,
      aria: A.var,
      className: "var",
      action: { kind: "char", value: variable },
    },
    ch("π", A.pi),
    {
      id: "e",
      label: <span className="m-i">e</span>,
      aria: A.e,
      className: "var",
      action: { kind: "char", value: "e" },
    },
    ch("(", A.open),
    ch(")", A.close),
    {
      id: "back",
      label: <Delete className="icon" aria-hidden="true" />,
      aria: A.back,
      className: "back",
      action: { kind: "back" },
    },
  ];
}

export const digitKeys: KeyDef[] = [
  digit("7"),
  digit("8"),
  digit("9"),
  ch("·", A.times),
  page("abc", "abc", A.letters),
  page("fx", "f(x)", A.functions),
  digit("4"),
  digit("5"),
  digit("6"),
  ch("−", A.minus),
  {
    id: "close",
    label: (
      <>
        <ChevronDown className="icon" aria-hidden="true" />
        <span>{TEXT.keypad.close}</span>
      </>
    ),
    aria: A.collapse,
    className: "close",
    action: { kind: "close" },
  },
  digit("1"),
  digit("2"),
  digit("3"),
  ch("+", A.plus),
  {
    id: "check",
    label: TEXT.keypad.check,
    className: "check",
    action: { kind: "check" },
  },
  digit("0"),
  ch(",", A.comma),
  {
    id: ";",
    label: ";",
    aria: A.semicolon,
    className: "op",
    action: { kind: "semicolon" },
  },
  ch("%", A.percent),
];

export const letterKeys: KeyDef[] = [
  ..."abcdefghijklmnopqrstuvwxyz".split("").map((letter): KeyDef => ({
    id: `letter-${letter}`,
    label: <span className="m-i">{letter}</span>,
    aria: letter,
    className: "letter",
    action: { kind: "char", value: letter },
  })),
  page("123", "123", A.digits),
];

const box = <span className="kp-box" />;

export const functionKeys: KeyDef[] = [
  later("sin", "sin"),
  later("cos", "cos"),
  later("tan", "tan"),
  later("ln", "ln"),
  later(
    "log",
    <>
      log<sub>{box}</sub>
    </>,
  ),
  later(
    "exp",
    <>
      <span className="m-i">e</span>
      <sup>{box}</sup>
    </>,
  ),
  later("asin", "sin⁻¹"),
  later("acos", "cos⁻¹"),
  later("atan", "tan⁻¹"),
  later(
    "nroot",
    <>
      <sup>n</sup>√{box}
    </>,
  ),
  later("abs", <>|{box}|</>),
  later("deg", "°"),
  later("fact", "n!"),
  later(
    "binom",
    <>
      (
      <span className="kp-binom">
        n<br />k
      </span>
      )
    </>,
  ),
  later(
    "index",
    <>
      <span className="m-i">x</span>
      <sub>{box}</sub>
    </>,
  ),
  later("inf", "∞"),
  later("reals", "ℝ"),
  later(
    "vector",
    <>
      (
      <span className="kp-binom">
        {box}
        <br />
        {box}
      </span>
      )
    </>,
  ),
  later("eq", "="),
  later("lt", "<"),
  later("gt", ">"),
  later("le", "≤"),
  later("ge", "≥"),
  page("123", "123", A.digits),
];
