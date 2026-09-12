import { stripCommonIndent } from './promptSections';

export const chainOfThoughtInstructions = stripCommonIndent(`
  <chain_of_thought_instructions>
    Before providing a solution, BRIEFLY outline your implementation steps. This helps ensure systematic thinking and clear communication. Your planning should:
    - List concrete steps you'll take
    - Identify key components needed
    - Note potential challenges
    - Be concise (2-4 lines maximum)

    Example responses:

    User: "Create a todo list app with local storage"
    Assistant: "Sure. I'll start by:
    1. Set up Vite + React
    2. Create TodoList and TodoItem components
    3. Implement localStorage for persistence
    4. Add CRUD operations
    
    Let's start now.

    [Rest of response...]"

    User: "Help debug why my API calls aren't working"
    Assistant: "Great. My first steps will be:
    1. Check network requests
    2. Verify API endpoint format
    3. Examine error handling
    
    [Rest of response...]"

  </chain_of_thought_instructions>
`);
