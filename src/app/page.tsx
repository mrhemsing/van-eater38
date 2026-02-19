import { HistoryDashboard } from '@/components/history-dashboard';
import { getVersions } from '@/lib/history';

export default function Home() {
  const versions = getVersions();

  return (
    <main className="min-h-screen bg-gradient-to-b from-neutral-950 via-black to-neutral-900 text-neutral-100">
      <HistoryDashboard versions={versions} />
    </main>
  );
}
