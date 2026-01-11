-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Rooms Table
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL DEFAULT 'غرفة العشاق',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Members Table
CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  display_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(room_id, user_id)
);

-- Questions Table
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE NOT NULL,
  from_member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  to_member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  question_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Answers Table
CREATE TABLE answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE NOT NULL,
  from_member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  answer_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Rooms: Members can view their room
CREATE POLICY "Members can view their room" ON rooms
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.room_id = rooms.id
      AND members.user_id = auth.uid()
    )
  );

-- Members: Users can view members of their room
CREATE POLICY "Users can view members of their room" ON members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM members AS m
      WHERE m.room_id = members.room_id
      AND m.user_id = auth.uid()
    )
  );

-- Members: Users can insert themselves
CREATE POLICY "Users can insert themselves" ON members
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
  );

-- Questions: Members can view questions in their room
CREATE POLICY "Members can view questions in their room" ON questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.room_id = questions.room_id
      AND members.user_id = auth.uid()
    )
  );

-- Questions: Members can insert questions in their room
CREATE POLICY "Members can insert questions in their room" ON questions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.room_id = questions.room_id
      AND members.user_id = auth.uid()
    )
  );

-- Answers: Members can view answers in their room via questions
CREATE POLICY "Members can view answers in their room" ON answers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM questions
      JOIN members ON members.room_id = questions.room_id
      WHERE questions.id = answers.question_id
      AND members.user_id = auth.uid()
    )
  );

-- Answers: Members can insert answers in their room
CREATE POLICY "Members can insert answers" ON answers
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM questions
      JOIN members ON members.room_id = questions.room_id
      WHERE questions.id = answers.question_id
      AND members.user_id = auth.uid()
    )
  );
