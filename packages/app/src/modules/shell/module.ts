import { defineModule } from "@chromatis/base/module";
import { shellConfigSchema } from "./domain/shellConfig";

/** The application shell's per-instance additions: extra navigation and the account link. */
export default defineModule({
  name: "shell",
  config: { schema: shellConfigSchema },
});
