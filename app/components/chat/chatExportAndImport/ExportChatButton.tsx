import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { workbenchStore } from '~/lib/stores/workbench';
import { classNames } from '~/utils/classNames';

export const ExportChatButton = ({ exportChat }: { exportChat?: () => void }) => {
  return (
    <div className="flex border border-octotask-elements-borderColor rounded-md overflow-hidden mr-2 text-sm">
      <DropdownMenu.Root>
        <DropdownMenu.Trigger className="rounded-md items-center justify-center [&:is(:disabled,.disabled)]:cursor-not-allowed [&:is(:disabled,.disabled)]:opacity-60 px-3 py-1.5 text-xs bg-octotask-elements-background-depth-2 text-octotask-elements-textPrimary [&:not(:disabled,.disabled)]:hover:bg-octotask-elements-button-primary-backgroundHover outline-accent-500 flex gap-1.7">
          Export
          <span className={classNames('i-ph:caret-down transition-transform')} />
        </DropdownMenu.Trigger>
        <DropdownMenu.Content
          className={classNames(
            'z-[250]',
            'bg-octotask-elements-background-depth-2',
            'rounded-lg shadow-lg',
            'border border-octotask-elements-borderColor',
            'animate-in fade-in-0 zoom-in-95',
            'py-1',
          )}
          sideOffset={5}
          align="end"
        >
          <DropdownMenu.Item
            className={classNames(
              'cursor-pointer flex items-center w-auto px-4 py-2 text-sm text-octotask-elements-textPrimary hover:bg-octotask-elements-item-backgroundActive gap-2 rounded-md group relative',
            )}
            onClick={() => {
              workbenchStore.downloadZip();
            }}
          >
            <div className="i-ph:code size-4.5"></div>
            <span>Download Code</span>
          </DropdownMenu.Item>
          <DropdownMenu.Item
            className={classNames(
              'cursor-pointer flex items-center w-full px-4 py-2 text-sm text-octotask-elements-textPrimary hover:bg-octotask-elements-item-backgroundActive gap-2 rounded-md group relative',
            )}
            onClick={() => exportChat?.()}
          >
            <div className="i-ph:chat size-4.5"></div>
            <span>Export Chat</span>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </div>
  );
};
