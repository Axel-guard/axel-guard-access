-- Update generate_order_id function to return numeric-only ID
CREATE OR REPLACE FUNCTION public.generate_order_id()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    new_id TEXT;
    counter INTEGER;
BEGIN
    SELECT COALESCE(MAX(CAST(order_id AS INTEGER)), 2019946) + 1 
    INTO counter 
    FROM public.sales
    WHERE order_id ~ '^\d+$';
    
    -- Fallback: also check for ORD prefix format
    IF counter IS NULL OR counter <= 2019946 THEN
        SELECT COALESCE(MAX(CAST(SUBSTRING(order_id FROM 4) AS INTEGER)), 2019946) + 1 
        INTO counter 
        FROM public.sales
        WHERE order_id LIKE 'ORD%';
    END IF;
    
    IF counter IS NULL THEN
        counter := 2019947;
    END IF;
    
    new_id := counter::TEXT;
    RETURN new_id;
END;
$function$;