import { useMemo } from "react";
import qrcode from "qrcode-generator";
import { fill } from "../../../helper/text";
import type { JoinInfo } from "../infrastructure/projectorChannel";
import TEXT from "./lessons.de.json";

/** A QR code as one SVG path, dark on a white quiet zone so any scanner reads it. */
function QrCode({ text, label }: { text: string; label: string }) {
  const { path, size } = useMemo(() => {
    const code = qrcode(0, "M");
    code.addData(text);
    code.make();
    const count = code.getModuleCount();
    let d = "";
    for (let row = 0; row < count; row++) {
      for (let col = 0; col < count; col++) {
        if (code.isDark(row, col)) {
          d += `M${col + 4} ${row + 4}h1v1h-1z`;
        }
      }
    }
    return { path: d, size: count + 8 };
  }, [text]);
  return (
    <svg
      className="lj__qr"
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={label}
      shapeRendering="crispEdges"
    >
      <rect width={size} height={size} fill="#fff" />
      <path d={path} fill="#000" />
    </svg>
  );
}

/** The invitation as a slide: on the projector, and on the teacher's stage while it is shown. */
export function JoinView({ join }: { join: JoinInfo }) {
  return (
    <div className="lf lf--slide lf--tone-neutral lj">
      <div className="lf__bar" />
      <div className="lf__tab">
        <span className="lf__tab-label">{TEXT.join.title}</span>
      </div>
      <div className="lj__body">
        <QrCode text={join.url} label={TEXT.join.qrLabel} />
        <p className="lj__address">{join.address}</p>
        <p className="lj__count">
          {fill(TEXT.join.count, { count: join.count })}
        </p>
      </div>
    </div>
  );
}
