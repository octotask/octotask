import { GitUrlImport } from '~/components/git/GitUrlImport.client';
import { Header } from '~/components/header/Header';
import BackgroundRays from '~/components/ui/BackgroundRays';

export default function Index() {
  return (
    <div className="flex flex-col h-full w-full bg-octo-elements-background-depth-1">
      <BackgroundRays />
      <Header />
      <GitUrlImport />
    </div>
  );
}
