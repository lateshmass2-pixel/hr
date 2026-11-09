-- Create performance_reviews table
CREATE TABLE IF NOT EXISTS performance_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  review_period TEXT NOT NULL,
  ai_summary TEXT NOT NULL,
  rating DECIMAL(2,1) NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_performance_reviews_employee_id ON performance_reviews(employee_id);
CREATE INDEX IF NOT EXISTS idx_performance_reviews_created_at ON performance_reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_performance_reviews_period ON performance_reviews(review_period);

-- Enable RLS (HR can view all, employees can view their own)
ALTER TABLE performance_reviews ENABLE ROW LEVEL SECURITY;

-- Policy: HR can SELECT all reviews
CREATE POLICY "HR can view all performance reviews"
ON performance_reviews
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'HR_ADMIN'
  )
);

-- Policy: Employees can SELECT their own reviews
CREATE POLICY "Employees can view own performance reviews"
ON performance_reviews
FOR SELECT
TO authenticated
USING (auth.uid() = employee_id);

-- Policy: HR can INSERT reviews
CREATE POLICY "HR can insert performance reviews"
ON performance_reviews
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'HR_ADMIN'
  )
);
