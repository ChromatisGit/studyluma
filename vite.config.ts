import { fileURLToPath } from "node:url";
import { mergeConfig } from "vite";
import { createViteConfig } from "../reactRouterFramework/src/vite";

export default createViteConfig().then((config) =>
  mergeConfig(config, {
    resolve: {
      dedupe: [
        "react",
        "react-dom",
        "react-router",
        "lucide-react",
        "motion",
        "framer-motion",
        "sonner",
      ],
      alias: [
        {
          find: "@platform/framework/styles",
          replacement: fileURLToPath(
            new URL("../reactRouterFramework/src/ui/style/consumer.css", import.meta.url),
          ),
        },
      ],
    },
  }),
);
