# App.tsx Refactoring Requirements

System Name: **kotori-journal**

## Functional Requirements

1. WHEN a user enters text in the journal input field, the kotori-journal SHALL accept multiline text input
2. WHEN a user presses Enter key, the kotori-journal SHALL submit the current input as a journal entry
3. WHEN a user presses Ctrl+J, the kotori-journal SHALL insert a new line in the input field
4. WHEN a user presses Tab key, the kotori-journal SHALL cycle through available categories
5. WHEN a user presses Escape key, the kotori-journal SHALL display the main menu
6. WHEN a user presses Ctrl+F without input text, the kotori-journal SHALL switch to search mode
7. WHEN a user presses Ctrl+C or Ctrl+D, the kotori-journal SHALL exit the application
8. The kotori-journal SHALL preserve all existing journal entry submission functionality
9. The kotori-journal SHALL maintain backward compatibility with existing AI command triggers
10. The kotori-journal SHALL preserve plugin system functionality

## Performance Requirements

11. The kotori-journal SHALL maintain or improve current rendering performance
12. WHEN journal entries are updated, the kotori-journal SHALL avoid unnecessary re-renders
13. The kotori-journal SHALL update journal entries list at most once per second
14. WHILE checking for data changes, the kotori-journal SHALL preserve the user's scroll position

## Architecture Requirements

15. The kotori-journal SHALL separate UI logic from business logic
16. The kotori-journal SHALL extract state management into dedicated hooks or components
17. The kotori-journal SHALL split the App component into multiple smaller components with single responsibilities
18. The kotori-journal SHALL maintain clear separation between different application modes (journal, search, category, menu)
19. The kotori-journal SHALL organize side effects into dedicated hooks with clear purposes

## Testing Requirements

20. The kotori-journal SHALL pass all existing automated tests after refactoring
21. The kotori-journal SHALL maintain testability for each extracted component
22. WHERE manual testing is performed, the kotori-journal SHALL preserve all current user interactions

## Implementation Constraints

23. The kotori-journal SHALL implement refactoring in incremental phases
24. The kotori-journal SHALL prioritize message input functionality during refactoring
25. The kotori-journal SHALL reduce the App.tsx component to under 200 lines of code
26. The kotori-journal SHALL ensure each component has a single, well-defined responsibility