-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (replaces flat auth in data.json)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'caregiver')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories for icon grouping
CREATE TABLE categories (
  id TEXT PRIMARY KEY,  -- e.g. 'food', 'feelings', 'actions'
  name_en TEXT NOT NULL,
  name_my TEXT NOT NULL,  -- Burmese
  color TEXT NOT NULL DEFAULT '#FF6B6B',
  icon_order INTEGER DEFAULT 0
);

-- Communication icons (the core AAC vocabulary)
CREATE TABLE icons (
  id TEXT PRIMARY KEY,  -- e.g. 'apple', 'toothbrush'
  category_id TEXT REFERENCES categories(id) ON DELETE CASCADE,
  image_url TEXT,
  label_en TEXT NOT NULL,
  label_my TEXT NOT NULL,  -- Burmese
  icon_order INTEGER DEFAULT 0
);

-- User favorites (starred icons)
CREATE TABLE favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  icon_id TEXT REFERENCES icons(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, icon_id)
);

-- Sentences built by users (recent history)
CREATE TABLE sentences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  text_my TEXT NOT NULL,  -- Burmese sentence
  text_en TEXT,           -- English translation
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Routines (created by caregivers)
CREATE TABLE routines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  caregiver_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Steps within a routine
CREATE TABLE routine_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  routine_id UUID REFERENCES routines(id) ON DELETE CASCADE,
  icon_id TEXT REFERENCES icons(id) ON DELETE SET NULL,
  label TEXT NOT NULL,
  step_order INTEGER NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_favorites_user ON favorites(user_id);
CREATE INDEX idx_sentences_user ON sentences(user_id);
CREATE INDEX idx_sentences_created ON sentences(created_at DESC);
CREATE INDEX idx_routine_steps_routine ON routine_steps(routine_id);
CREATE INDEX idx_icons_category ON icons(category_id);

-- ============================================================
-- SEED DATA: Initial vocabulary for the AAC app
-- ============================================================

-- Categories
INSERT INTO categories (id, name_en, name_my, color, icon_order) VALUES
  ('food',     'Food & Drink', 'အစားအသောက်',   '#FF6B6B', 1),
  ('feelings', 'Feelings',     'ခံစားချက်များ',    '#FFD93D', 2),
  ('actions',  'Actions',      'လုပ်ဆောင်ချက်များ', '#6BCB77', 3),
  ('places',   'Places',       'နေရာများ',        '#4D96FF', 4),
  ('people',   'People',       'လူများ',          '#9B59B6', 5),
  ('body',     'Body & Health','ခန္ဓာကိုယ်',      '#E67E22', 6);

-- Icons: Food & Drink
INSERT INTO icons (id, category_id, label_en, label_my, image_url, icon_order) VALUES
  ('water',      'food', 'Water',      'ရေ',            '💧', 1),
  ('rice',       'food', 'Rice',       'ထမင်း',         '🍚', 2),
  ('milk',       'food', 'Milk',       'နို့',            '🥛', 3),
  ('banana',     'food', 'Banana',     'ငှက်ပျောသီး',    '🍌', 4),
  ('snack',      'food', 'Snack',      'မုန့်',           '🍪', 5),
  ('juice',      'food', 'Juice',      'ဖျော်ရည်',       '🧃', 6),
  ('egg',        'food', 'Egg',        'ကြက်ဥ',         '🥚', 7),
  ('noodles',    'food', 'Noodles',    'ခေါက်ဆွဲ',       '🍜', 8);

-- Icons: Feelings
INSERT INTO icons (id, category_id, label_en, label_my, image_url, icon_order) VALUES
  ('happy',      'feelings', 'Happy',     'ပျော်တယ်',      '😊', 1),
  ('sad',        'feelings', 'Sad',       'ဝမ်းနည်းတယ်',   '😢', 2),
  ('angry',      'feelings', 'Angry',     'စိတ်ဆိုးတယ်',    '😠', 3),
  ('scared',     'feelings', 'Scared',    'ကြောက်တယ်',     '😨', 4),
  ('tired',      'feelings', 'Tired',     'ပင်ပန်းတယ်',    '😴', 5),
  ('hungry',     'feelings', 'Hungry',    'ဗိုက်ဆာတယ်',    '🤤', 6),
  ('sick',       'feelings', 'Sick',      'မကျန်းမာဘူး',   '🤒', 7),
  ('love',       'feelings', 'Love',      'ချစ်တယ်',       '❤️', 8);

-- Icons: Actions
INSERT INTO icons (id, category_id, label_en, label_my, image_url, icon_order) VALUES
  ('eat',        'actions', 'Eat',       'စားမယ်',        '🍽️', 1),
  ('drink',      'actions', 'Drink',     'သောက်မယ်',      '🥤', 2),
  ('play',       'actions', 'Play',      'ကစားမယ်',       '🎮', 3),
  ('sleep',      'actions', 'Sleep',     'အိပ်မယ်',       '🛏️', 4),
  ('go',         'actions', 'Go',        'သွားမယ်',        '🚶', 5),
  ('read',       'actions', 'Read',      'ဖတ်မယ်',        '📖', 6),
  ('wash',       'actions', 'Wash',      'ဆေးမယ်',        '🧼', 7),
  ('help',       'actions', 'Help',      'ကူညီပါ',        '🤝', 8);

-- Icons: Places
INSERT INTO icons (id, category_id, label_en, label_my, image_url, icon_order) VALUES
  ('home',       'places', 'Home',      'အိမ်',          '🏠', 1),
  ('school',     'places', 'School',    'ကျောင်း',       '🏫', 2),
  ('toilet',     'places', 'Toilet',    'အိမ်သာ',        '🚻', 3),
  ('hospital',   'places', 'Hospital',  'ဆေးရုံ',        '🏥', 4),
  ('park',       'places', 'Park',      'ပန်းခြံ',        '🌳', 5),
  ('market',     'places', 'Market',    'ဈေး',           '🏪', 6);

-- Icons: People
INSERT INTO icons (id, category_id, label_en, label_my, image_url, icon_order) VALUES
  ('mom',        'people', 'Mom',       'အမေ',          '👩', 1),
  ('dad',        'people', 'Dad',       'အဖေ',          '👨', 2),
  ('teacher',    'people', 'Teacher',   'ဆရာ/ဆရာမ',     '👩‍🏫', 3),
  ('friend',     'people', 'Friend',    'သူငယ်ချင်း',    '👫', 4),
  ('doctor',     'people', 'Doctor',    'ဆရာဝန်',       '👨‍⚕️', 5);

-- Icons: Body & Health
INSERT INTO icons (id, category_id, label_en, label_my, image_url, icon_order) VALUES
  ('head',       'body', 'Head hurts',    'ခေါင်းကိုက်တယ်',  '🤕', 1),
  ('stomach',    'body', 'Stomach hurts', 'ဗိုက်နာတယ်',      '🤢', 2),
  ('hot',        'body', 'Hot',           'ပူတယ်',          '🥵', 3),
  ('cold',       'body', 'Cold',          'အေးတယ်',         '🥶', 4),
  ('medicine',   'body', 'Medicine',      'ဆေး',            '💊', 5);
