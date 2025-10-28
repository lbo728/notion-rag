-- Create collections table
CREATE TABLE collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  conversation_count INTEGER DEFAULT 0
);

-- Create index for collections
CREATE INDEX idx_collections_user_id ON collections(user_id);

-- Create collection_conversations junction table
CREATE TABLE collection_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  tags TEXT[],
  notes TEXT,
  saved_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_collection_session UNIQUE (collection_id, session_id)
);

-- Create indexes for collection_conversations
CREATE INDEX idx_collection_conversations_collection_id ON collection_conversations(collection_id);
CREATE INDEX idx_collection_conversations_session_id ON collection_conversations(session_id);

-- Create GIN index for tag array searches
CREATE INDEX idx_collection_conversations_tags ON collection_conversations USING GIN (tags);

-- Create trigger for auto-update
CREATE TRIGGER update_collections_updated_at
  BEFORE UPDATE ON collections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to increment conversation count
CREATE OR REPLACE FUNCTION increment_collection_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE collections
  SET conversation_count = conversation_count + 1
  WHERE id = NEW.collection_id;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for auto-increment
CREATE TRIGGER increment_collection_count_trigger
  AFTER INSERT ON collection_conversations
  FOR EACH ROW
  EXECUTE FUNCTION increment_collection_count();

