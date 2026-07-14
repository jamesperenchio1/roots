-- Triggers that maintain counters and notifications for the comments system.

-- Auto-update comments.updated_at.
DROP TRIGGER IF EXISTS comments_set_updated_at ON public.comments;
CREATE TRIGGER comments_set_updated_at
  BEFORE UPDATE ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Maintain likes_count and replies_count on comments.
CREATE OR REPLACE FUNCTION public.update_comment_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Reactions affect likes_count (reaction = 'like').
  IF TG_TABLE_NAME = 'comment_reactions' THEN
    IF TG_OP = 'INSERT' AND NEW.reaction = 'like' THEN
      UPDATE public.comments SET likes_count = likes_count + 1 WHERE id = NEW.comment_id;
    ELSIF TG_OP = 'DELETE' AND OLD.reaction = 'like' THEN
      UPDATE public.comments SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.comment_id;
    END IF;
  END IF;

  -- Replies affect replies_count.
  IF TG_TABLE_NAME = 'comments' THEN
    IF TG_OP = 'INSERT' AND NEW.parent_comment_id IS NOT NULL THEN
      UPDATE public.comments SET replies_count = replies_count + 1 WHERE id = NEW.parent_comment_id;
    ELSIF TG_OP = 'DELETE' AND OLD.parent_comment_id IS NOT NULL THEN
      UPDATE public.comments SET replies_count = GREATEST(replies_count - 1, 0) WHERE id = OLD.parent_comment_id;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS comment_reactions_count_trigger ON public.comment_reactions;
CREATE TRIGGER comment_reactions_count_trigger
  AFTER INSERT OR DELETE ON public.comment_reactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_comment_counts();

DROP TRIGGER IF EXISTS comments_replies_count_trigger ON public.comments;
CREATE TRIGGER comments_replies_count_trigger
  AFTER INSERT OR DELETE ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_comment_counts();

-- Bump reported_count when a new report is opened.
CREATE OR REPLACE FUNCTION public.increment_comment_reported_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.comments
     SET reported_count = reported_count + 1
   WHERE id = NEW.comment_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS comment_reports_increment_trigger ON public.comment_reports;
CREATE TRIGGER comment_reports_increment_trigger
  AFTER INSERT ON public.comment_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_comment_reported_count();

-- Notify mentioned users when a comment is inserted.
CREATE OR REPLACE FUNCTION public.notify_comment_mentions()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_mentioned_user_id uuid;
BEGIN
  FOR v_mentioned_user_id IN
    SELECT mentioned_user_id FROM public.comment_mentions WHERE comment_id = NEW.id
  LOOP
    INSERT INTO public.notifications (user_id, type, title, message, link, read)
    VALUES (
      v_mentioned_user_id,
      'message',
      'Someone mentioned you',
      'You were mentioned in a discussion.',
      '/species/' || NEW.species_id || '#comment-' || NEW.id,
      false
    );
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS comments_notify_mentions_trigger ON public.comments;
CREATE TRIGGER comments_notify_mentions_trigger
  AFTER INSERT ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_comment_mentions();
