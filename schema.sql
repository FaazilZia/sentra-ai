-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table (optional if you just use auth.users, but good for custom profile data)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create requests table to store AI interactions
CREATE TABLE IF NOT EXISTS public.requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  prompt TEXT NOT NULL,
  response TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Turn on Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;

-- Create Policies

-- Users can only read and update their own profiles
CREATE POLICY "Users can view own profile" 
ON public.users FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
ON public.users FOR UPDATE 
USING (auth.uid() = id);

-- Requests can only be seen and created by the owner
CREATE POLICY "Users can view own requests" 
ON public.requests FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own requests" 
ON public.requests FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Optional: Create a trigger to automatically add a new row to public.users on sign up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
