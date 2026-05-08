import { requireAdmin } from "@/lib/auth-helpers";
import { createUserAction } from "../actions";
import { UserForm } from "../user-form";

export default async function NewUserPage() {
  await requireAdmin();

  return (
    <>
      <h1>Новий користувач</h1>
      <UserForm mode="create" action={createUserAction} />
    </>
  );
}
