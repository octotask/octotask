import { useStore } from '@nanostores/react';
import { chatStore } from '~/lib/stores/chat';
import { classNames } from '~/utils/classNames';
import { HeaderActionButtons } from './HeaderActionButtons.client';
import { ChatDescription } from '~/lib/persistence/ChatDescription.client';
import { OctoTaskLogo } from './OctoTaskLogo';
import { IconButton } from '~/components/ui/IconButton';

export function Header() {
  const chat = useStore(chatStore);

  return (
    <header
      className={classNames(
        'flex items-center px-4 border-b h-[var(--header-height)] bg-octo-elements-background-depth-1',
        {
          'border-transparent': !chat.started,
          'border-octo-elements-borderColor': chat.started,
        },
      )}
    >
      <div className="flex items-center gap-3 z-logo text-octo-elements-textPrimary">
        <IconButton className="text-octo-elements-textSecondary hover:text-octo-elements-textPrimary transition-colors">
          <div className="i-ph:sidebar-simple-duotone text-xl" />
        </IconButton>
        <a href="/" className="flex items-center hover:opacity-80 transition-opacity">
          <OctoTaskLogo size={28} textSize="text-xl" />
        </a>
      </div>
      {chat.started && ( // Display ChatDescription and HeaderActionButtons only when the chat has started.
        <>
          <span className="flex-1 px-4 truncate text-center text-octo-elements-textPrimary">
            <ChatDescription />
          </span>
          <div className="">
            <HeaderActionButtons chatStarted={chat.started} />
          </div>
        </>
      )}
    </header>
  );
}
