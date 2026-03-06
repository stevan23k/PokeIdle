/**
 * scripts/seed-items.ts
 * 
 * Migra todos los items de items.ts a la tabla items en Supabase.
 * Ejecutar una sola vez con: npx tsx scripts/seed-items.ts
 * 
 * Requiere variables de entorno:
 *   VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_KEY  (service_role key, no la anon key)
 */

    import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });
    import { createClient } from "@supabase/supabase-js";
    import { ITEMS } from "../src/lib/items";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function seedItems() {
  const rows = Object.values(ITEMS).map((item, index) => ({
    id:          item.id,
    name:        item.name,
    sprite_slug: item.spriteSlug,
    description: item.description ?? "",
    category:    item.category,
    effect:      item.effect,
    buyable:     item.buyable ?? false,
    lootable:    (item as any).lootable ?? false,
    shop_price:  item.shopPrice ?? null,
    sort_order:  index,
  }));

  console.log(`Inserting ${rows.length} items...`);

  // Upsert en lotes de 50 para no saturar
  const BATCH = 50;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error } = await supabase
      .from("items")
      .upsert(batch, { onConflict: "id" });

    if (error) {
      console.error(`Error en batch ${i / BATCH + 1}:`, error.message);
    } else {
      console.log(`Batch ${i / BATCH + 1} OK (${batch.length} items)`);
    }
  }

  console.log("Done.");
}

seedItems();