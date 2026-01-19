import { Metadata } from 'next';
import { SlackConnect } from '@/components/integrations/SlackConnect';
import { NotionConnect } from '@/components/integrations/NotionConnect';
import { CalendarConnect } from '@/components/integrations/CalendarConnect';

export const metadata: Metadata = {
  title: 'Integrations | Catalyst Launch',
  description: 'Connect your favorite tools to Catalyst Launch',
};

export default function IntegrationsPage() {
  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Integrations</h1>
        <p className="text-muted-foreground mt-2">
          Connect your favorite tools to enhance your productivity and keep
          everything in sync.
        </p>
      </div>

      <div className="space-y-6">
        <section>
          <h2 className="text-xl font-semibold mb-4">Communication</h2>
          <SlackConnect />
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Documentation</h2>
          <NotionConnect />
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Calendar</h2>
          <CalendarConnect />
        </section>
      </div>
    </div>
  );
}
