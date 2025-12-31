import React from 'react';

const EXAMPLE_PROMPTS = [
  { text: 'Create a mobile app about octotask', icon: 'i-ph:device-mobile-camera' },
  { text: 'Build a todo app in React using Tailwind', icon: 'i-ph:check-square' },
  { text: 'Build a simple blog using Astro', icon: 'i-ph:article' },
  { text: 'Create a cookie consent form using Material UI', icon: 'i-ph:newspaper' },
  { text: 'Make a space invaders game', icon: 'i-ph:game-controller' },
  { text: 'Make a Tic Tac Toe game in html, css and js only', icon: 'i-ph:circles-three-plus' },
];

export function ExamplePrompts(sendMessage?: { (event: React.UIEvent, messageInput?: string): void | undefined }) {
  return (
    <div id="examples" className="relative flex flex-col gap-4 w-full max-w-4xl mx-auto flex justify-center mt-6 px-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 animate-fade-in animation-delay-300">
        {EXAMPLE_PROMPTS.map((examplePrompt, index) => {
          return (
            <button
              key={index}
              onClick={(event) => {
                sendMessage?.(event, examplePrompt.text);
              }}
              className="group flex items-center gap-3 p-4 rounded-xl border border-octo-elements-borderColor bg-octo-elements-background-depth-2 hover:bg-octo-elements-background-depth-3 hover:border-octo-elements-borderColorActive transition-all duration-300 text-left items-start shadow-sm hover:shadow-md"
            >
              <div
                className={`text-xl text-octo-elements-textTertiary group-hover:text-octo-elements-accent transition-colors ${examplePrompt.icon}`}
              />
              <span className="text-sm text-octo-elements-textSecondary group-hover:text-octo-elements-textPrimary transition-colors">
                {examplePrompt.text}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
