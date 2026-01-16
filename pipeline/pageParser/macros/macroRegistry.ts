import { noteMacro } from "./components/note";
import { codeRunnerMacro } from "./components/codeRunner";
import { codeTaskMacro } from "./tasks/codeTask";
import { gapMacro } from "./tasks/gap";
import { mathTaskMacro } from "./tasks/mathTask";
import { mcqMacro } from "./tasks/mcq";
import { textTaskMacro } from "./tasks/textTask";
import { tableMacro } from "./components/table";
import { RawMacro } from "./parseMacro";
import { defineMacroMap } from "./macroDefinition";
import { checkInlineMacros } from "./validateInlineMacros";
import { checkParamsAndSetDefaults } from "./validateParams";
import { imageMacro } from "./components/image";
import { highlightMacro } from "./components/highlight";

const macroMap = defineMacroMap({
  note: noteMacro,
  codeRunner: codeRunnerMacro,
  codeTask: codeTaskMacro,
  gap: gapMacro,
  mathTask: mathTaskMacro,
  mcq: mcqMacro,
  textTask: textTaskMacro,
  table: tableMacro,
  image: imageMacro,
  highlight: highlightMacro
});

type MacroType = keyof typeof macroMap;
type Macro = ReturnType<(typeof macroMap)[MacroType]["parser"]>;

function hasParser(type: string): type is MacroType {
  return type in macroMap;
}

export function parseMacroType(macro: RawMacro): Macro {
  if (!hasParser(macro.type)) {
    throw new Error(`Unknown macro ${macro.type}`);
  }

  const definition = macroMap[macro.type];
  checkInlineMacros(macro, definition.inline ?? {});
  const params = checkParamsAndSetDefaults(macro, definition.params ?? {});

  return definition.parser({ ...macro, params });
}

export type { Macro };
