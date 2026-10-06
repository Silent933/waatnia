import { listActivity } from "@/lib/activity";
import { requireAdmin } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";

function formatDate(value: Date): string {
  return formatDateTime(value);
}

export default async function AdminActivityPage() {
  await requireAdmin();
  const activity = await listActivity(200);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold sm:text-3xl">سجل النشاط</h1>
        <p className="mt-1 text-sm text-muted">آخر {activity.length} عملية</p>
      </header>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[40rem] text-sm">
          <thead>
            <tr className="border-b border-line text-xs text-muted">
              <th className="p-3 text-start font-semibold">العملية</th>
              <th className="p-3 text-start font-semibold">التفاصيل</th>
              <th className="p-3 text-start font-semibold">بواسطة</th>
              <th className="p-3 text-start font-semibold">التاريخ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {activity.map((a) => (
              <tr key={a.id} className="align-top">
                <td className="p-3">
                  <span className="latin font-semibold" dir="ltr">{a.action}</span>
                </td>
                <td className="p-3">{a.summary}</td>
                <td className="p-3 text-muted">
                  <span className="latin text-xs" dir="ltr">{a.actor}</span>
                </td>
                <td className="p-3 text-xs text-muted">{formatDate(a.createdAt)}</td>
              </tr>
            ))}
            {activity.length === 0 && (
              <tr>
                <td colSpan={4} className="p-10 text-center text-muted">لا يوجد نشاط مسجّل.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
