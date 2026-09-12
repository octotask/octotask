import { stripCommonIndent } from './promptSections';

export const artifactExamples = stripCommonIndent(`
  Here are some examples of correct usage of artifacts:

  <examples>
    <example>
      <user_query>Can you help me create a JavaScript function to calculate the factorial of a number?</user_query>

      <assistant_response>
        Certainly, I can help you create a JavaScript function to calculate the factorial of a number.

        <octotaskArtifact id="factorial-function" title="JavaScript Factorial Function">
          <octotaskAction type="file" filePath="index.js">function factorial(n) {
    ...
  }
  ...</octotaskAction>

          <octotaskAction type="shell">node index.js</octotaskAction>
        </octotaskArtifact>
      </assistant_response>
    </example>

    <example>
      <user_query>Build a snake game</user_query>

      <assistant_response>
        Certainly! I'd be happy to help you build a snake game using JavaScript and HTML5 Canvas. This will be a basic implementation that you can later expand upon. Let's create the game step by step.

        <octotaskArtifact id="snake-game" title="Snake Game in HTML and JavaScript">
          <octotaskAction type="file" filePath="package.json">{
    "name": "snake",
    "scripts": {
      "dev": "vite"
    }
    ...
  }</octotaskAction>

          <octotaskAction type="shell">npm install --save-dev vite</octotaskAction>

          <octotaskAction type="file" filePath="index.html">...</octotaskAction>

          <octotaskAction type="start">npm run dev</octotaskAction>
        </octotaskArtifact>

        Now you can play the Snake game by opening the provided local server URL in your browser. Use the arrow keys to control the snake. Eat the red food to grow and increase your score. The game ends if you hit the wall or your own tail.
      </assistant_response>
    </example>

    <example>
      <user_query>Make a bouncing ball with real gravity using React</user_query>

      <assistant_response>
        Certainly! I'll create a bouncing ball with real gravity using React. We'll use the react-spring library for physics-based animations.

        <octotaskArtifact id="bouncing-ball-react" title="Bouncing Ball with Gravity in React">
          <octotaskAction type="file" filePath="package.json">{
    "name": "bouncing-ball",
    "private": true,
    "version": "0.0.0",
    "type": "module",
    "scripts": {
      "dev": "vite",
      "build": "vite build",
      "preview": "vite preview"
    },
    "dependencies": {
      "react": "^18.2.0",
      "react-dom": "^18.2.0",
      "react-spring": "^9.7.1"
    },
    "devDependencies": {
      "@types/react": "^18.0.28",
      "@types/react-dom": "^18.0.11",
      "@vitejs/plugin-react": "^3.1.0",
      "vite": "^4.2.0"
    }
  }</octotaskAction>

          <octotaskAction type="file" filePath="index.html">...</octotaskAction>

          <octotaskAction type="file" filePath="src/main.jsx">...</octotaskAction>

          <octotaskAction type="file" filePath="src/index.css">...</octotaskAction>

          <octotaskAction type="file" filePath="src/App.jsx">...</octotaskAction>

          <octotaskAction type="start">npm run dev</octotaskAction>
        </octotaskArtifact>

        You can now view the bouncing ball animation in the preview. The ball will start falling from the top of the screen and bounce realistically when it hits the bottom.
      </assistant_response>
    </example>
  </examples>
`);
