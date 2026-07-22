import type { Icon, Category } from "./api";

/** Grammar roles for the sentence builder (Subject → Verb → Object). */
export type CategoryRole = "subject" | "verb" | "object";

export interface AACCard {
  id: string;
  burmese: string;
  englishMeaning: string;
  category: CategoryRole;
  emoji: string;
  nextCategories?: CategoryRole[];
}

export interface ShortcutCard {
  id: string;
  burmese: string;
  englishMeaning: string;
  emoji: string;
}

/** Map DB category IDs to sentence-builder grammar roles. */
const CATEGORY_ROLE: Record<string, CategoryRole> = {
  people: "subject",
  actions: "verb",
  food: "object",
  feelings: "object",
  places: "object",
  body: "object",
};

/** Which grammar role comes next in the builder flow. */
const NEXT_ROLE: Partial<Record<CategoryRole, CategoryRole[]>> = {
  subject: ["verb"],
  verb: ["object"],
};

/** Convert a raw API Icon + its parent category into an AACCard. */
export function iconToCard(icon: Icon, categoryId: string): AACCard {
  const role = CATEGORY_ROLE[categoryId] ?? "object";
  return {
    id: icon.id,
    burmese: icon.label_my,
    englishMeaning: icon.label_en,
    category: role,
    emoji: icon.image_url,
    nextCategories: NEXT_ROLE[role],
  };
}

/** Hardcoded common shortcuts (not stored in DB — universal needs). */
export const SHORTCUT_CARDS: ShortcutCard[] = [
  { id: "sh1", burmese: "ရေသောက်ချင်တယ်", englishMeaning: "I want to drink water", emoji: "🚰" },
  { id: "sh2", burmese: "အိမ်သာသွားချင်တယ်", englishMeaning: "I want to go to toilet", emoji: "🚽" },
  { id: "sh3", burmese: "ဗိုက်ဆာတယ်", englishMeaning: "I am hungry", emoji: "🍽️" },
  { id: "sh4", burmese: "မလုပ်ချင်ဘူး", englishMeaning: "I do not want to do it", emoji: "🙅" },
];

export const EMERGENCY_CARDS: ShortcutCard[] = [
  { id: "e1", burmese: "ကူညီပါ", englishMeaning: "Help me", emoji: "🆘" },
  { id: "e2", burmese: "ရပ်ပါ", englishMeaning: "Stop", emoji: "🛑" },
];

/** Map DB categories so we know which icons belong to which grammar role. */
export function getSubjectCategoryId(categories: Category[]): string | undefined {
  return categories.find((c) => CATEGORY_ROLE[c.id] === "subject")?.id;
}
