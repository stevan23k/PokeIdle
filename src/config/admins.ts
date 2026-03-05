/**
 * List of user emails or Supabase IDs authorized to access the Developer Debug Panel.
 */
export const AUTHORIZED_ADMINS = [
  "dzyhoveyker@gmail.com",
  "alais-rojas@outlook.es" // Add your email here
  // You can also add Supabase User IDs
];

export function isUserAdmin(user: { email?: string; id: string } | null): boolean {
  if (!user) return false;
  return AUTHORIZED_ADMINS.includes(user.email || "") || AUTHORIZED_ADMINS.includes(user.id);
}
