-- SQL Migration: Add gacha_tier to species_cache
ALTER TABLE species_cache ADD COLUMN gacha_tier INTEGER DEFAULT 3;

COMMENT ON COLUMN species_cache.gacha_tier IS '6: Major Legendary, 5: Mythical/Paradox/UB, 4: Sub-Legendary/Starter/Pseudo/Rare, 3: Common';
