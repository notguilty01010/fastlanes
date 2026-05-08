import { notFound } from "next/navigation";

import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { updateUserAction, type UserFormState } from "../actions";
import { UserForm } from "../user-form";

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  const { id } = await params;

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) notFound();

  const isSelf = session.user.id === user.id;

  const action = updateUserAction.bind(null, user.id) as (
    state: UserFormState,
    formData: FormData,
  ) => Promise<UserFormState>;

  return (
    <>
      <h1>Користувач: {user.name}</h1>
      <UserForm
        mode="edit"
        action={action}
        defaultValues={{
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
        }}
        disableSelfDanger={isSelf}
      />
    </>
  );
}
