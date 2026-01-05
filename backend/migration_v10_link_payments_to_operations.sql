-- Migration V10: Link Payments to specific Operations (Receptions/Livraisons)

-- Add operation_id column to payments table
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS operation_id UUID REFERENCES public.receptions_livraisons(id) ON DELETE SET NULL;

-- Add index for performance when querying payments for a specific delivery
CREATE INDEX IF NOT EXISTS idx_payments_operation_id ON public.payments(operation_id);

-- Update the Payment type in Typescript later
COMMENT ON COLUMN public.payments.operation_id IS 'Optional link to a specific stock operation (reception or livraison).';
