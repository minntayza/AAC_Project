export type Category = 'subject' | 'verb' | 'object' | 'shortcut' | 'emergency';

export interface AACCard {
  id: string;
  burmese: string;
  englishMeaning: string;
  category: Category;
  emoji: string;
  nextCategories?: Category[];
}

export const cards: AACCard[] = [
  // Subjects (Yellow)
  { id: 's1', burmese: 'ကျွန်တော် / ကျွန်မ', englishMeaning: 'I', category: 'subject', emoji: '🧑', nextCategories: ['verb'] },
  { id: 's2', burmese: 'သူ', englishMeaning: 'He/She', category: 'subject', emoji: '👦', nextCategories: ['verb'] },
  { id: 's3', burmese: 'အမေ', englishMeaning: 'Mother', category: 'subject', emoji: '👩', nextCategories: ['verb'] },
  { id: 's4', burmese: 'အဖေ', englishMeaning: 'Father', category: 'subject', emoji: '👨', nextCategories: ['verb'] },
  { id: 's5', burmese: 'ဆရာမ', englishMeaning: 'Teacher', category: 'subject', emoji: '👩‍🏫', nextCategories: ['verb'] },

  // Verbs (Green)
  { id: 'v1', burmese: 'လိုချင်တယ်', englishMeaning: 'want', category: 'verb', emoji: '🤲', nextCategories: ['object'] },
  { id: 'v2', burmese: 'လိုအပ်တယ်', englishMeaning: 'need', category: 'verb', emoji: '❗', nextCategories: ['object'] },
  { id: 'v3', burmese: 'ခံစားရတယ်', englishMeaning: 'feel', category: 'verb', emoji: '❤️', nextCategories: ['object'] },
  { id: 'v4', burmese: 'နာတယ်', englishMeaning: 'hurt', category: 'verb', emoji: '🤕', nextCategories: ['object'] },
  { id: 'v5', burmese: 'သွားချင်တယ်', englishMeaning: 'want to go', category: 'verb', emoji: '🚶', nextCategories: ['object'] },

  // Objects / Needs / Body Parts / Feelings (Blue/Orange)
  { id: 'o1', burmese: 'ရေ', englishMeaning: 'water', category: 'object', emoji: '💧' },
  { id: 'o2', burmese: 'အစားအစာ', englishMeaning: 'food', category: 'object', emoji: '🍎' },
  { id: 'o3', burmese: 'ကစားစရာ', englishMeaning: 'toy', category: 'object', emoji: '🧸' },
  { id: 'o4', burmese: 'အိမ်သာ', englishMeaning: 'toilet', category: 'object', emoji: '🚽' },
  { id: 'o5', burmese: 'ခေါင်း', englishMeaning: 'head', category: 'object', emoji: '🗣️' },
  { id: 'o6', burmese: 'ဗိုက်', englishMeaning: 'stomach', category: 'object', emoji: '🤰' },
  { id: 'o7', burmese: 'ပျော်တယ်', englishMeaning: 'happy', category: 'object', emoji: '😀' },
  { id: 'o8', burmese: 'ဝမ်းနည်းတယ်', englishMeaning: 'sad', category: 'object', emoji: '😢' },
  { id: 'o9', burmese: 'စိတ်ဆိုးတယ်', englishMeaning: 'angry', category: 'object', emoji: '😠' },
  { id: 'o10', burmese: 'ပင်ပန်းတယ်', englishMeaning: 'tired', category: 'object', emoji: '🥱' },
  { id: 'o11', burmese: 'အနားယူချိန်', englishMeaning: 'break time', category: 'object', emoji: '⏱️' },

  // Shortcuts / Emergency (Purple / Red)
  { id: 'sh1', burmese: 'ရေသောက်ချင်တယ်', englishMeaning: 'I want to drink water', category: 'shortcut', emoji: '🚰' },
  { id: 'sh2', burmese: 'အိမ်သာသွားချင်တယ်', englishMeaning: 'I want to go to toilet', category: 'shortcut', emoji: '🚽' },
  { id: 'sh3', burmese: 'ဗိုက်ဆာတယ်', englishMeaning: 'I am hungry', category: 'shortcut', emoji: '🍽️' },
  { id: 'sh4', burmese: 'မလုပ်ချင်ဘူး', englishMeaning: 'I do not want to do it', category: 'shortcut', emoji: '🙅' },
  { id: 'e1', burmese: 'ကူညီပါ', englishMeaning: 'Help me', category: 'emergency', emoji: '🆘' },
  { id: 'e2', burmese: 'ရပ်ပါ', englishMeaning: 'Stop', category: 'emergency', emoji: '🛑' },
];
