import typescript from "@rollup/plugin-typescript";
import cleanup from "rollup-plugin-cleanup";
import pkg from "./package.json";

export default {
  input: "src/index.ts",
  plugins: [
    typescript(),
    cleanup({
      comments: "none",
      extensions: ["js", "ts"]
    })
  ],
  output: { file: pkg.main, format: "cjs" },
  external: [
    "console",
    "path",
    "stream",
    "string_decoder",
    "uws",
  ]
};
