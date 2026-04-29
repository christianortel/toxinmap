import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextVitals,
  ...nextTypescript,
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      ".local/**",
      "out/**",
      "dist/**",
      "public/cesium/**",
    ],
  },
];

export default eslintConfig;
