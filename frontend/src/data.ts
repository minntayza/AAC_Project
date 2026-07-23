export type Category =
  | 'subject'
  | 'verb'
  | 'object'
  | 'body_part'
  | 'feeling'
  | 'number'
  | 'direction'
  | 'location'
  | 'shortcut'
  | 'emergency'
  | 'action';

export interface AACCard {
  id: string;
  burmese: string;
  englishMeaning: string;
  category: Category;
  subCategory?: 'verb' | 'activity' | 'modal'; // Distinction for Step 2 Cards
  emoji: string;
  imageUrl?: string;           // Supabase storage URL
  audioUrl?: string;           // Custom voice recording
  contextForVerbs?: string[];  // Specified verbs where this card is relevant
}

// Maps DB category_ids to AAC grammar roles
export const CATEGORY_ROLE: Record<string, Category> = {
  food: 'object',
  feelings: 'feeling',
  actions: 'action',
  places: 'location',
  people: 'subject',
  body: 'body_part',
  verbs: 'verb',
  shortcuts: 'shortcut',
  choices: 'verb',
};

// Kid-Friendly Burmese Subjects
export const subjectCards: AACCard[] = [
  { id: 's1', burmese: 'သား', englishMeaning: 'Son / Boy', category: 'subject', emoji: '👦' },
  { id: 's2', burmese: 'သမီး', englishMeaning: 'Daughter / Girl', category: 'subject', emoji: '👧' },
  { id: 's3', burmese: 'သူ', englishMeaning: 'He/She', category: 'subject', emoji: '👦' },
  { id: 's4', burmese: 'ဒါလေး', englishMeaning: 'This', category: 'subject', emoji: '📦' },
  { id: 's5', burmese: 'မေမေ', englishMeaning: 'Mommy', category: 'subject', emoji: '👩' },
  { id: 's6', burmese: 'တီချယ်', englishMeaning: 'Teacher', category: 'subject', emoji: '👩‍🏫' },
  { id: 's7', burmese: 'သူငယ်ချင်း', englishMeaning: 'Friend', category: 'subject', emoji: '🧑‍🤝‍🧑' },
  { id: 's8', burmese: 'ဖေဖေ', englishMeaning: 'Daddy', category: 'subject', emoji: '👨' },
  { id: 's9', burmese: 'ဖိုးဖိုး', englishMeaning: 'Grandpa', category: 'subject', emoji: '👴' },
  { id: 's10', burmese: 'ဖွားဖွား', englishMeaning: 'Grandma', category: 'subject', emoji: '👵' },
  { id: 's11', burmese: 'ဦးဦး', englishMeaning: 'Uncle', category: 'subject', emoji: '👨‍💼' },
  { id: 's12', burmese: 'ဒေါ်ဒေါ်', englishMeaning: 'Aunt', category: 'subject', emoji: '👩‍💼' },
  { id: 's13', burmese: 'ကိုကို', englishMeaning: 'Older Brother', category: 'subject', emoji: '👦' },
  { id: 's14', burmese: 'မမ', englishMeaning: 'Older Sister', category: 'subject', emoji: '👧' },
];

// Kid-Friendly Daily Shortcuts (Added Yes & No in Burmese: ဟုတ်တယ်, မဟုတ်ဘူး, ရတယ်)
export const dailyShortcutCards: AACCard[] = [
  { id: 'sh_yes', burmese: 'ဟုတ်တယ် / ဟုတ်ကဲ့', englishMeaning: 'Yes', category: 'shortcut', emoji: '👍' },
  { id: 'sh_no', burmese: 'မဟုတ်ဘူး', englishMeaning: 'No', category: 'shortcut', emoji: '👎' },
  { id: 'sh_ok', burmese: 'ရတယ်', englishMeaning: 'Okay', category: 'shortcut', emoji: '👌' },
  { id: 'sh1', burmese: 'ရေသောက်ချင်တယ်', englishMeaning: 'I want to drink water', category: 'shortcut', emoji: '🚰' },
  { id: 'sh2', burmese: 'အိမ်သာသွားချင်တယ်', englishMeaning: 'I want to go to toilet', category: 'shortcut', emoji: '🚽' },
  { id: 'sh3', burmese: 'ဗိုက်ဆာတယ်', englishMeaning: 'I am hungry', category: 'shortcut', emoji: '🍽️' },
  { id: 'sh4', burmese: 'နာတယ်', englishMeaning: 'It hurts', category: 'shortcut', emoji: '🤕' },
  { id: 'sh5', burmese: 'ကူညီပါ', englishMeaning: 'Help me', category: 'emergency', emoji: '🆘' },
  { id: 'sh6', burmese: 'မလုပ်ချင်ဘူး', englishMeaning: 'I do not want to', category: 'shortcut', emoji: '🙅' },
  { id: 'sh7', burmese: 'အိပ်ချင်တယ်', englishMeaning: 'I want to sleep', category: 'shortcut', emoji: '🥱' },
  { id: 'sh8', burmese: 'ကြောက်တယ်', englishMeaning: 'I am scared', category: 'shortcut', emoji: '😨' },
];

// Requirement 3: Categorized Verbs, Activities & Modals in Step 2
export const verbCards: AACCard[] = [
  // 🔵 Verbs (ကြိယာများ)
  { id: 'v1', burmese: 'စားမယ်', englishMeaning: 'eat', category: 'verb', subCategory: 'verb', emoji: '🍽️' },
  { id: 'v2', burmese: 'သောက်မယ်', englishMeaning: 'drink', category: 'verb', subCategory: 'verb', emoji: '🥤' },
  { id: 'v10', burmese: 'သွားမယ်', englishMeaning: 'go', category: 'verb', subCategory: 'verb', emoji: '🚶' },

  // 🟢 Activities (လှုပ်ရှားမှုများ - moved from Objects)
  { id: 'a1', burmese: 'ကစားမယ်', englishMeaning: 'play', category: 'verb', subCategory: 'activity', emoji: '⚽' },
  { id: 'a2', burmese: 'စာဖတ်မယ်', englishMeaning: 'read', category: 'verb', subCategory: 'activity', emoji: '📚' },
  { id: 'a3', burmese: 'ရေချိုးမယ်', englishMeaning: 'bath', category: 'verb', subCategory: 'activity', emoji: '🚿' },
  { id: 'a4', burmese: 'တီဗီကြည့်မယ်', englishMeaning: 'watch TV', category: 'verb', subCategory: 'activity', emoji: '📺' },
  { id: 'a5', burmese: 'အိပ်မယ်', englishMeaning: 'sleep', category: 'verb', subCategory: 'activity', emoji: '💤' },
  { id: 'a6', burmese: 'ဆေးသောက်မယ်', englishMeaning: 'take medicine', category: 'verb', subCategory: 'activity', emoji: '💊' },

  // 🟠 Modals (သဘောထားနှင့် အကူအညီများ)
  { id: 'm1', burmese: 'လိုချင်တယ်', englishMeaning: 'want', category: 'verb', subCategory: 'modal', emoji: '🤲' },
  { id: 'm2', burmese: 'လိုတယ်', englishMeaning: 'need', category: 'verb', subCategory: 'modal', emoji: '❗' },
  { id: 'm3', burmese: 'ခံစားရတယ်', englishMeaning: 'feel', category: 'verb', subCategory: 'modal', emoji: '❤️' },
  { id: 'm4', burmese: 'ဖြစ်တယ်', englishMeaning: 'is / am', category: 'verb', subCategory: 'modal', emoji: '👤' },
  { id: 'm5', burmese: 'လုပ်နိုင်တယ်', englishMeaning: 'can do', category: 'verb', subCategory: 'modal', emoji: '👍' },
  { id: 'm6', burmese: 'မလုပ်နိုင်ဘူး', englishMeaning: 'cannot do', category: 'verb', subCategory: 'modal', emoji: '👎' },
  { id: 'm9', burmese: 'နာတယ်', englishMeaning: 'hurt', category: 'verb', subCategory: 'modal', emoji: '🤕' },
];

// Dedicated Activities array for Step 3 (Loaded dynamically from DB photo cards & custom cards)
export const activityCards: AACCard[] = [];

// Clean Objects & Foods (No action verbs here!)
export const objectCards: AACCard[] = [
  { id: 'o1', burmese: 'ရေ', englishMeaning: 'water', category: 'object', emoji: '💧' },
  { id: 'o2', burmese: 'အစားအစာ', englishMeaning: 'food', category: 'object', emoji: '🍎' },
  { id: 'o3', burmese: 'ကစားစရာ', englishMeaning: 'toy', category: 'object', emoji: '🧸' },
  { id: 'o4', burmese: 'မုန့်', englishMeaning: 'snacks', category: 'object', emoji: '🍪' },
  { id: 'o5', burmese: 'သစ်သီး', englishMeaning: 'fruit', category: 'object', emoji: '🍌' },
  { id: 'o6', burmese: 'မေမေ', englishMeaning: 'mommy', category: 'object', emoji: '👩' },
  { id: 'o7', burmese: 'အနားယူချိန်', englishMeaning: 'break time', category: 'object', emoji: '⏱️' },
  { id: 'o8', burmese: 'ဖုန်း / Tablet', englishMeaning: 'phone / tablet', category: 'object', emoji: '📱' },
  { id: 'o9', burmese: 'စာအုပ်', englishMeaning: 'book', category: 'object', emoji: '📖' },
  { id: 'o16', burmese: 'ထပ်ပြီး', englishMeaning: 'more', category: 'object', emoji: '➕' },
  { id: 'o17', burmese: 'ရပ်ပါ', englishMeaning: 'stop', category: 'emergency', emoji: '🛑' },
];

// Body parts for "နာတယ်" (m9)
export const bodyPartCards: AACCard[] = [
  { id: 'bp1', burmese: 'ခေါင်း', englishMeaning: 'head', category: 'body_part', emoji: '🗣️' },
  { id: 'bp2', burmese: 'ဗိုက်', englishMeaning: 'stomach', category: 'body_part', emoji: '🤰' },
  { id: 'bp3', burmese: 'လက်', englishMeaning: 'hand / arm', category: 'body_part', emoji: '✋' },
  { id: 'bp4', burmese: 'ခြေ', englishMeaning: 'foot / leg', category: 'body_part', emoji: '🦶' },
  { id: 'bp5', burmese: 'ပါးစပ်', englishMeaning: 'mouth', category: 'body_part', emoji: '👄' },
  { id: 'bp6', burmese: 'နား', englishMeaning: 'ear', category: 'body_part', emoji: '👂' },
];

// Feelings & Adjectives for "ခံစားရတယ်" (m3) & "ဖြစ်တယ်" (m4)
export const feelingCards: AACCard[] = [
  { id: 'f1', burmese: 'ပျော်တယ်', englishMeaning: 'happy', category: 'feeling', emoji: '😀' },
  { id: 'f2', burmese: 'ဝမ်းနည်းတယ်', englishMeaning: 'sad', category: 'feeling', emoji: '😢' },
  { id: 'f3', burmese: 'စိတ်ဆိုးတယ်', englishMeaning: 'angry', category: 'feeling', emoji: '😠' },
  { id: 'f4', burmese: 'ကြောက်တယ်', englishMeaning: 'scared', category: 'feeling', emoji: '😨' },
  { id: 'f5', burmese: 'ပင်ပန်းတယ်', englishMeaning: 'tired', category: 'feeling', emoji: '🥱' },
  { id: 'f6', burmese: 'နေမကောင်းဘူး', englishMeaning: 'sick', category: 'feeling', emoji: '🤒' },
  { id: 'f7', burmese: 'လိမ္မာတယ်', englishMeaning: 'good child', category: 'feeling', emoji: '🌟' },
  { id: 'f8', burmese: 'တော်တယ်', englishMeaning: 'clever / smart', category: 'feeling', emoji: '👏' },
  { id: 'f9', burmese: 'လှတယ်', englishMeaning: 'pretty', category: 'feeling', emoji: '✨' },
];

// Numbers & Amounts
export const numberCards: AACCard[] = [
  { id: 'amt1', burmese: 'နည်းနည်း', englishMeaning: 'a little', category: 'number', emoji: '🤏' },
  { id: 'amt2', burmese: 'များများ', englishMeaning: 'a lot', category: 'number', emoji: '👐' },
  { id: 'amt3', burmese: 'နည်းနည်းလေး', englishMeaning: 'a tiny bit', category: 'number', emoji: '🤏' },
  { id: 'amt4', burmese: 'အများကြီး', englishMeaning: 'lots', category: 'number', emoji: '👐' },
  { id: 'amt5', burmese: 'တစ်ဝက်', englishMeaning: 'half', category: 'number', emoji: '🌗' },
  { id: 'amt6', burmese: 'ထပ်ပြီး', englishMeaning: 'more', category: 'number', emoji: '➕' },
  { id: 'num1', burmese: '၁', englishMeaning: '1', category: 'number', emoji: '1️⃣' },
  { id: 'num2', burmese: '၂', englishMeaning: '2', category: 'number', emoji: '2️⃣' },
  { id: 'num3', burmese: '၃', englishMeaning: '3', category: 'number', emoji: '3️⃣' },
  { id: 'num4', burmese: '၄', englishMeaning: '4', category: 'number', emoji: '4️⃣' },
  { id: 'num5', burmese: '၅', englishMeaning: '5', category: 'number', emoji: '5️⃣' },
  { id: 'num6', burmese: '၆', englishMeaning: '6', category: 'number', emoji: '6️⃣' },
  { id: 'num7', burmese: '၇', englishMeaning: '7', category: 'number', emoji: '7️⃣' },
  { id: 'num8', burmese: '၈', englishMeaning: '8', category: 'number', emoji: '8️⃣' },
  { id: 'num9', burmese: '၉', englishMeaning: '9', category: 'number', emoji: '9️⃣' },
  { id: 'num10', burmese: '၁၀', englishMeaning: '10', category: 'number', emoji: '🔟' },
];

// Directions & Positions
export const directionCards: AACCard[] = [
  { id: 'dir1', burmese: 'ရှေ့', englishMeaning: 'front', category: 'direction', emoji: '⬆️' },
  { id: 'dir2', burmese: 'နောက်', englishMeaning: 'back / behind', category: 'direction', emoji: '⬇️' },
  { id: 'dir3', burmese: 'အပေါ်', englishMeaning: 'up / top', category: 'direction', emoji: '👆' },
  { id: 'dir4', burmese: 'အောက်', englishMeaning: 'down / bottom', category: 'direction', emoji: '👇' },
  { id: 'dir5', burmese: 'ဘယ်', englishMeaning: 'left', category: 'direction', emoji: '⬅️' },
  { id: 'dir6', burmese: 'ညာ', englishMeaning: 'right', category: 'direction', emoji: '➡️' },
  { id: 'dir7', burmese: 'အထဲ', englishMeaning: 'inside', category: 'direction', emoji: '📥' },
  { id: 'dir8', burmese: 'အပြင်', englishMeaning: 'outside', category: 'direction', emoji: '📤' },
];

// Places & Locations
export const locationCards: AACCard[] = [
  { id: 'loc1', burmese: 'အိမ်', englishMeaning: 'home', category: 'location', emoji: '🏠' },
  { id: 'loc2', burmese: 'ကျောင်း', englishMeaning: 'school', category: 'location', emoji: '🏫' },
  { id: 'loc3', burmese: 'အခန်း', englishMeaning: 'room', category: 'location', emoji: '🚪' },
  { id: 'loc4', burmese: 'ကစားကွင်း', englishMeaning: 'playground', category: 'location', emoji: '🛝' },
  { id: 'loc5', burmese: 'အိမ်သာ', englishMeaning: 'bathroom', category: 'location', emoji: '🚽' },
  { id: 'loc6', burmese: 'ကုတင်', englishMeaning: 'bed', category: 'location', emoji: '🛏️' },
  { id: 'loc7', burmese: 'ဆေးရုံ', englishMeaning: 'hospital', category: 'location', emoji: '🏥' },
  { id: 'loc8', burmese: 'ဆိုင်', englishMeaning: 'shop', category: 'location', emoji: '🏪' },
];

export const allCards: AACCard[] = [
  ...subjectCards,
  ...dailyShortcutCards,
  ...verbCards,
  ...objectCards,
  ...bodyPartCards,
  ...feelingCards,
  ...numberCards,
  ...directionCards,
  ...locationCards,
];
