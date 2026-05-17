-- Per-family custom mission templates.
-- Auto-populated when a parent creates a mission with a title that does not
-- already match a built-in or existing personal template. Used to pre-fill
-- the CreateMission form on subsequent runs so common chores don't have to
-- be retyped.

CREATE TABLE public.mission_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    title text NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 80),
    description text CHECK (description IS NULL OR length(description) <= 500),
    reward_mynt int NOT NULL CHECK (reward_mynt BETWEEN 0 AND 10000),
    recurrence text NOT NULL DEFAULT 'once'
        CHECK (recurrence IN ('once', 'daily', 'weekly')),
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Case-insensitive uniqueness so "Diska" and "diska" don't both get saved
CREATE UNIQUE INDEX mission_templates_family_lower_title_idx
    ON public.mission_templates (family_id, lower(title));

CREATE INDEX mission_templates_family_idx
    ON public.mission_templates (family_id);

ALTER TABLE public.mission_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_templates FORCE ROW LEVEL SECURITY;

CREATE POLICY mission_templates_select ON public.mission_templates
    FOR SELECT USING (public.is_family_member(family_id));

CREATE POLICY mission_templates_insert ON public.mission_templates
    FOR INSERT WITH CHECK (public.is_family_member(family_id));

-- DELETE is allowed here (unlike the append-only ledgers) so parents can
-- prune outdated templates from the picker.
CREATE POLICY mission_templates_delete ON public.mission_templates
    FOR DELETE USING (public.is_family_member(family_id));

COMMENT ON TABLE public.mission_templates IS
    'Per-family custom mission templates auto-saved when a parent creates a mission with a new title. Independent of the missions table — deleting a template does not affect existing missions.';
