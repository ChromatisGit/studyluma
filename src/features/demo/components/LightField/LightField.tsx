import { createLightFieldClasses, LightFieldBase } from "./LightFieldBase";
import styles from "./LightField.module.css";

const LIGHT_FIELD_CLASSES = createLightFieldClasses(styles);

export function LightField() {
  return <LightFieldBase classes={LIGHT_FIELD_CLASSES} />;
}
