import { injectChromatis } from "@chromatis/base/testing";
// Test support builds the empty-file configuration from the module's own schema.
// eslint-disable-next-line chromatis/dependencies
import { classroomConfigSchema } from "../modules/classroom/infrastructure/classroomConfig";

// `@chromatis/base/test-preload` (bunfig.toml) provides the generated
// `chromatis-config` and `chromatis-artifacts` modules. By default the tests
// run as an instance whose classroom.toml is empty and that embeds no
// artifacts: each test provides the catalog it needs through
// `provideCatalogFiles`, so a bare checkout runs them without any build.
injectChromatis({ config: { classroom: classroomConfigSchema.parse({}) } });
