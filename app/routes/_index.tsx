import type { MetaFunction } from '@remix-run/react';
import { Chat } from '~/components/chat/Chat.client';
import { Header } from '~/components/header/Header';
import BackgroundRays from '~/components/ui/BackgroundRays';

export const meta: MetaFunction = () => {
  return [
    { title: 'OctoTask' },
    { name: 'description', content: 'Talk with OctoTask, an AI assistant from KhulnaSoft' },
  ];
};

/**
 * Landing page component for OctoTask
 * Note: Settings functionality should ONLY be accessed through the sidebar menu.
 * Do not add settings button/panel to this landing page as it was intentionally removed
 * to keep the UI clean and consistent with the design system.
 */
export default function Index() {
  return (
    <div className="flex flex-col h-full w-full bg-octo-elements-background-depth-1">
      <BackgroundRays />
      <Header />
      <Chat />
    </div>
  );
}
