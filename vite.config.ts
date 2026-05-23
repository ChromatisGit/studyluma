import { mergeConfig } from "vite";
import { createViteConfig } from "@chromatis/base/vite";

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
    },
  }),
);
