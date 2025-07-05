# Development Rules
- Create the application in Node.js / TypeScript.
- Builds should be done using vite and tests should be done using vitest.
- To improve the overall quality and maintainability of the codebase, implementations should be done in TDD, creating tests first, then writing the code for the implementation.
  - The implementation should be as simple as possible, and if it is not simple to implement, then look back to see if anything is different. If something is still unclear, ask a human to solve it.
  - If something is too difficult or simple to implement, or if it is something around the design, do not try to complete it by yourself, but ask for instructions from a human instructor.
  - If you are ever in doubt about the TDD methodology, remember the contents and suggestions of Kent Beck's book, the leading authority on TDD.
- When adding any external libraries, be sure to present the above to the human instructor and ask for confirmation as to why it is necessary, whether it is absolutely necessary to use it, and what problems might arise in the future by including it.
- After implementation, be sure to confirm that test/lint/typecheck/format is OK.
  - npm test
  - npm run lint
  - npm run typecheck
  - npm run format
- Always create test files in tests directory

# Documenting Rules
- If you run into trouble and figure out how to solve it, be sure to write it down in TROUBLE_SHOOTING.md.
- If you have generated environment variables and all the other settings you need to develop, please write them down in DEVELOPMENT.md so that they can be used for future development.

# Design Rules
- The source code should be as modular as possible, so that there is not too much source code contained in a single file.
- For comments, there is no need for a one-to-one correspondence with the source code. Please write comments only if you intend to write the intent and purpose of why you did so and why you are doing so.