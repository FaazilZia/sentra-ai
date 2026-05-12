import js from "@eslint/js";
import ts from "typescript-eslint";
import globals from "globals";

export default [
    js.configs.recommended,
    ...ts.configs.recommended,
    {
        ignores: ["dist/**", "node_modules/**", "coverage/**"]
    },
    {
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node,
                ...globals.jest
            }
        },
        rules: {
            "no-unused-vars": "off",
            "@typescript-eslint/no-unused-vars": "off",
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/ban-types": "off",
            "@typescript-eslint/no-require-imports": "off",
            "@typescript-eslint/no-unused-expressions": "off",
            "no-empty": "off",
            "no-undef": "off",
            "no-useless-assignment": "off"
        }
    }
];
