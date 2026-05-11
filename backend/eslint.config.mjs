import js from "@eslint/js";
import ts from "typescript-eslint";

export default [
    js.configs.recommended,
    ...ts.configs.recommended,
    {
        languageOptions: {
            globals: {
                module: "readonly",
                process: "readonly",
                __dirname: "readonly",
                require: "readonly"
            }
        },
        rules: {
            "no-unused-vars": "off",
            "@typescript-eslint/no-unused-vars": "off",
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/ban-types": "off",
            "@typescript-eslint/no-require-imports": "off",
            "@typescript-eslint/ban-ts-comment": "off",
            "@typescript-eslint/no-namespace": "off",
            "no-empty": "off",
            "no-undef": "off"
        }
    }
];
