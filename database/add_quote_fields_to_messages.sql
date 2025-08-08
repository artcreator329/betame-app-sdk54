-- Add quote fields to messages table
ALTER TABLE messages 
ADD COLUMN quoted_message_id UUID REFERENCES messages(id),
ADD COLUMN quoted_message_content TEXT,
ADD COLUMN quoted_message_sender_name TEXT,
ADD COLUMN quoted_message_type TEXT CHECK (quoted_message_type IN ('text', 'service', 'offer'));

-- Add index for better performance when querying quoted messages
CREATE INDEX idx_messages_quoted_message_id ON messages(quoted_message_id); 