-- Add missing columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS position TEXT,
ADD COLUMN IF NOT EXISTS resume_url TEXT;

-- Update the handle_new_user function to respect metadata role and prevent duplicates if we manually insert
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if profile already exists (to support manual profile creation before auth)
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
      INSERT INTO public.profiles (id, email, full_name, role, position)
      VALUES (
          NEW.id, 
          NEW.email, 
          NEW.raw_user_meta_data->>'full_name', 
          COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'EMPLOYEE'),
          NEW.raw_user_meta_data->>'position'
      );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
