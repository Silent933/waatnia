import { deleteMessage, toggleMessageRead } from "@/app/actions/admin-settings";
import { requireAdmin } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { requirePrisma } from "@/lib/prisma";

function formatDate(value: Date): string {
  return formatDateTime(value);
}

export default async function AdminMessagesPage() {
  await requireAdmin();
  const prisma = requirePrisma();

  const messages = await prisma.message.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
  const unread = messages.filter((m) => !m.isRead).length;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold sm:text-3xl">الرسائل</h1>
        <p className="mt-1 text-sm text-muted">
          {messages.length} رسالة{unread > 0 && <> · <span className="text-accent">{unread} غير مقروءة</span></>}
        </p>
      </header>

      {messages.length === 0 ? (
        <div className="card p-10 text-center text-muted">لا توجد رسائل بعد.</div>
      ) : (
        <ul className="space-y-3">
          {messages.map((m) => (
            <li key={m.id} className={`card p-4 ${m.isRead ? "" : "border-accent/40 bg-accent-soft/20"}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold">
                    {m.name}
                    {!m.isRead && <span className="badge badge-accent ms-2">جديدة</span>}
                  </p>
                  <p className="mt-0.5 text-xs text-muted" dir="ltr">
                    {[m.email, m.phone].filter(Boolean).join(" · ") || "—"}
                  </p>
                </div>
                <p className="text-xs text-muted">{formatDate(m.createdAt)}</p>
              </div>

              {m.subject && <p className="mt-3 font-semibold">{m.subject}</p>}
              <p className="mt-1.5 whitespace-pre-wrap text-sm text-ink-soft">{m.body}</p>

              <div className="mt-3 flex flex-wrap gap-2">
                <form action={toggleMessageRead}>
                  <input type="hidden" name="id" value={m.id} />
                  <button type="submit" className="btn btn-outline btn-sm">
                    {m.isRead ? "تعليم كغير مقروءة" : "تعليم كمقروءة"}
                  </button>
                </form>
                <form action={deleteMessage}>
                  <input type="hidden" name="id" value={m.id} />
                  <button type="submit" className="btn btn-ghost btn-sm text-danger">حذف</button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
