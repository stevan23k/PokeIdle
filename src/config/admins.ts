/**
 * List of user emails or Supabase IDs authorized to access the Developer Debug Panel.
 */
export const AUTHORIZED_ADMINS = [
  "dzyhoveyker@gmail.com",
  "danirojascrronaldo3@gmail.com",
  "konolas0123@gmail.com",
  "nefokun@gmail.com",
  "1777d137-5070-4e39-9a76-40b62b91cd06",
  "e5f2feca-79b9-4a09-9502-708055795dc2",
  "b3bbdd1c-9a72-471f-9fad-5ce0119fdcb7",
  "0042f343-3964-430c-9eff-d10d91fca491",
   // Add your email here
  // You can also add Supabase User IDs
];

export function isUserAdmin(user: { email?: string; id: string } | null): boolean {
  if (!user) return false;
  const userEmail = (user.email || "").toLowerCase().trim();
  const userId = user.id.trim();
  
  return AUTHORIZED_ADMINS.some(admin => {
    const adminLower = admin.toLowerCase().trim();
    return adminLower === userEmail || adminLower === userId;
  });
}
