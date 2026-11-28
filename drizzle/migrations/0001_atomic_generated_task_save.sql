CREATE OR REPLACE FUNCTION public.save_generated_task(p_user_id uuid, p_set_id uuid, p_position integer, p_label text, p_task jsonb)
RETURNS public.tasks
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public
AS $$
DECLARE
  v_set public.task_sets;
  v_task public.tasks;
  v_id uuid;
  v_count integer;
  v_day timestamptz := date_trunc('day', now() AT TIME ZONE 'Europe/Vilnius') AT TIME ZONE 'Europe/Vilnius';
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));
  SELECT * INTO v_set FROM public.task_sets WHERE id = p_set_id AND user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Rinkinys nerastas arba nepriklauso jums.'; END IF;
  SELECT count(*) INTO v_count FROM public.tasks t JOIN public.task_sets s ON s.id=t.set_id
    WHERE s.user_id=p_user_id AND s.created_at >= v_day AND s.created_at < v_day + interval '1 day';
  IF v_count >= 100 THEN RAISE EXCEPTION 'Pasiektas 100 uždavinių dienos limitas.'; END IF;
  SELECT id INTO v_id FROM public.tasks WHERE set_id=p_set_id AND position=p_position LIMIT 1;
  IF v_id IS NULL THEN
    INSERT INTO public.tasks(set_id, position, label, format, topic, points, statement, options, parts, answer, solution, verified, attempts)
    VALUES(p_set_id, p_position, p_label, p_task->>'format', p_task->>'topic', (p_task->>'points')::integer, p_task->>'statement', nullif(p_task->'options','null'::jsonb), p_task->'parts', p_task->'answer', p_task->'solution', (p_task->>'verified')::boolean, (p_task->>'attempts')::integer)
    RETURNING * INTO v_task;
  ELSE
    UPDATE public.tasks SET label=p_label, format=p_task->>'format', topic=p_task->>'topic', points=(p_task->>'points')::integer,
      statement=p_task->>'statement', options=nullif(p_task->'options','null'::jsonb), parts=p_task->'parts', answer=p_task->'answer', solution=p_task->'solution', verified=(p_task->>'verified')::boolean, attempts=(p_task->>'attempts')::integer
    WHERE id=v_id RETURNING * INTO v_task;
  END IF;
  UPDATE public.task_sets SET total_points=(SELECT coalesce(sum(points),0) FROM public.tasks WHERE set_id=p_set_id) WHERE id=p_set_id;
  RETURN v_task;
END;
$$;
REVOKE ALL ON FUNCTION public.save_generated_task(uuid,uuid,integer,text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_generated_task(uuid,uuid,integer,text,jsonb) TO service_role;