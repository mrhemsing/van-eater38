import { HistoryDashboard } from '@/components/history-dashboard';
import { getVersions } from '@/lib/history';

export default function Home() {
  const versions = getVersions();

  return (
    <main className="eater-bg min-h-screen text-neutral-100">
      <HistoryDashboard versions={versions} />
    </main>
  );
}
