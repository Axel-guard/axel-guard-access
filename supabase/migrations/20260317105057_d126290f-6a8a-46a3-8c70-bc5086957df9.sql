
CREATE OR REPLACE FUNCTION public.verify_otp(_email text, _otp text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_attempts int;
BEGIN
  -- Find valid, unused OTP
  SELECT id, attempts INTO v_id, v_attempts
  FROM otp_verifications
  WHERE email = lower(_email)
    AND otp_code = _otp
    AND used = false
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_id IS NULL THEN
    -- Increment attempts on latest unused OTP for rate limiting
    UPDATE otp_verifications
    SET attempts = attempts + 1
    WHERE email = lower(_email)
      AND used = false
      AND expires_at > now();
    RETURN false;
  END IF;

  -- Mark as used
  UPDATE otp_verifications
  SET used = true
  WHERE id = v_id;

  RETURN true;
END;
$$;
