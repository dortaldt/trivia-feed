-- Create trivia_questions table in Supabase
CREATE TABLE trivia_questions (
    id TEXT PRIMARY KEY,
    question_text TEXT NOT NULL,
    answer_choices TEXT[] NOT NULL,
    correct_answer TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    language TEXT NOT NULL,
    topic TEXT NOT NULL,
    subtopic TEXT NOT NULL,
    branch TEXT NOT NULL,
    tags TEXT[] NOT NULL,
    tone TEXT NOT NULL,
    format TEXT NOT NULL,
    image_url TEXT,
    learning_capsule TEXT,
    source TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Add indices for common query patterns
CREATE INDEX idx_trivia_difficulty ON trivia_questions (difficulty);
CREATE INDEX idx_trivia_topic ON trivia_questions (topic);
CREATE INDEX idx_trivia_language ON trivia_questions (language);

-- Comment on table
COMMENT ON TABLE trivia_questions IS 'Table for storing trivia questions for the app'; 