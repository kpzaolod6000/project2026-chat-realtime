import node from "@chat/config/eslint/node";

// Type-aware rules are on: an unhandled promise or a misused `await` in
// the API is a production bug, and the package is small enough that the
// extra program build stays cheap.
export default [
  { ignores: ["dist/**"] },
  ...node({ tsconfigRootDir: import.meta.dirname, typeChecked: true }),
];
