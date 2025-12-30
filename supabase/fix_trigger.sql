-- 1. ADD MISSING COLUMNS
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS position TEXT,
ADD COLUMN IF NOT EXISTS resume_url TEXT;

-- 2. FIX THE TRIGGER FUNCTION
-- This version prevents errors if metadata is missing and handles duplicate keys gracefully
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  extracted_role user_role;
BEGIN
  -- Safely cast role from metadata, default to EMPLOYEE
  BEGIN
    extracted_role := (NEW.raw_user_meta_data->>'role')::user_role;
  EXCEPTION WHEN OTHERS THEN
    extracted_role := 'EMPLOYEE';
  END;

  -- Insert profile if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
      INSERT INTO public.profiles (id, email, full_name, role, position)
      VALUES (
          NEW.id, 
          NEW.email, 
          COALESCE(NEW.raw_user_meta_data->>'full_name', 'New Employee'),
          COALESCE(extracted_role, 'EMPLOYEE'),
          NEW.raw_user_meta_data->>'position'
      );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
