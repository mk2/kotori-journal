# Development Rules
- Create the application in Node.js / TypeScript.
- Builds should be done using vite and tests should be done using vitest.
- To improve the overall quality and maintainability of the codebase, implementations should be done in TDD, creating tests first, then writing the code for the implementation.
  - The implementation should be as simple as possible, and if it is not simple to implement, then look back to see if anything is different. If something is still unclear, ask a human to solve it.
  - If something is too difficult or simple to implement, or if it is something around the design, do not try to complete it by yourself, but ask for instructions from a human instructor.
- After implementation, be sure to confirm that eslint/test is OK.
  - npm test
  - npm run lint
  - npm run typecheck
