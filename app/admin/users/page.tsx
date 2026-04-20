import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { UserActions } from "./user-actions";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const status = (searchParams.status as any) ?? "PENDING";
  const users = await prisma.user.findMany({
    where: { status },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Users</h1>
        <nav className="flex gap-1 text-sm">
          {(["PENDING", "APPROVED", "REJECTED", "BANNED"] as const).map((s) => (
            <Link
              key={s}
              href={`/admin/users?status=${s}`}
              className={`rounded-md px-3 py-1 ${
                s === status ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              }`}
            >
              {s.toLowerCase()}
            </Link>
          ))}
        </nav>
      </header>

      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3">User</th>
              <th className="p-3">Phone</th>
              <th className="p-3">Teacher / school</th>
              <th className="p-3">Portfolio</th>
              <th className="p-3">Joined</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="p-3">
                  <div className="font-medium">{u.fullName}</div>
                  <div className="text-xs text-muted-foreground">{u.email}</div>
                  {u.role === "ADMIN" && (
                    <Badge variant="outline" className="mt-1">
                      Admin
                    </Badge>
                  )}
                </td>
                <td className="p-3 text-muted-foreground">{u.phone ?? "-"}</td>
                <td className="p-3 text-muted-foreground">
                  {u.teacherOrSchool ?? "-"}
                </td>
                <td className="p-3">
                  {u.portfolioUrl ? (
                    <a
                      href={u.portfolioUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline"
                    >
                      view
                    </a>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </td>
                <td className="p-3 text-muted-foreground">
                  {formatDate(u.createdAt)}
                </td>
                <td className="p-3 text-right">
                  <UserActions userId={u.id} status={u.status} />
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={6} className="p-10 text-center text-muted-foreground">
                  No users in this state.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
