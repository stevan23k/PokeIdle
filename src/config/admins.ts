/**
 * List of user emails or Supabase IDs authorized to access the Developer Debug Panel.
 */
export const AUTHORIZED_ADMINS = [
  "dzyhoveyker@gmail.com",
  "danirojascrronaldo3@gmail.com",
  "1777d137-5070-4e39-9a76-40b62b91cd06",
  "e5f2feca-79b9-4a09-9502-708055795dc2"
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
