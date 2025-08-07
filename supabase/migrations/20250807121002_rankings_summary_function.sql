-- Aggregate counts per tier and total, bypassing RLS via security definer
DROP FUNCTION IF EXISTS public.get_user_rankings_summary();

CREATE FUNCTION public.get_user_rankings_summary()
RETURNS TABLE (tier text, users bigint, total bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH total_cte AS (
    SELECT count(*)::bigint AS total FROM public.user_rankings
  )
  SELECT r.tier, count(*)::bigint AS users, (SELECT total FROM total_cte) AS total
  FROM public.user_rankings r
  GROUP BY r.tier;
$$;

-- Allow execution from client roles
GRANT EXECUTE ON FUNCTION public.get_user_rankings_summary() TO anon, authenticated; 