/*
  # AI Key Rotation System

  1. Schema Updates
    - Update `ai_settings` table to support multiple API keys
    - Add current_index for key rotation tracking
    - Ensure proper defaults for existing data

  2. Key Management
    - Support up to 10 OpenRouter API keys
    - Track current active key index
    - Enable automatic failover between keys

  3. Model Enforcement
    - Strict model selection from settings
    - No fallback to default models
*/

-- Update ai_settings table structure for key rotation
DO $$
BEGIN
  -- Add new columns if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_settings' AND column_name = 'api_keys'
  ) THEN
    ALTER TABLE ai_settings ADD COLUMN api_keys text[] DEFAULT '{}';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_settings' AND column_name = 'current_index'
  ) THEN
    ALTER TABLE ai_settings ADD COLUMN current_index integer DEFAULT 0;
  END IF;

  -- Migrate existing api_key to api_keys array
  UPDATE ai_settings 
  SET api_keys = CASE 
    WHEN api_key IS NOT NULL AND api_key != '' THEN ARRAY[api_key]
    ELSE '{}'::text[]
  END
  WHERE api_keys = '{}' OR api_keys IS NULL;

  -- Remove old api_key column if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_settings' AND column_name = 'api_key'
  ) THEN
    ALTER TABLE ai_settings DROP COLUMN api_key;
  END IF;
END $$;