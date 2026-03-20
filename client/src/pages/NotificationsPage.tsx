import { useEffect } from "react";

export function NotificationsPage({ onRefresh }: any) {
  useEffect(() => {
    if (onRefresh) onRefresh();
  }, [onRefresh]);

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-4">Уведомления</h1>
      <p>Здесь будут ваши уведомления.</p>
    </div>
  );
}
