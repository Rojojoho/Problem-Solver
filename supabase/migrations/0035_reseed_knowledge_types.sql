-- Resets the Knowledge item types list to the defaults set via
-- Admin > Global Settings > Pages > Knowledge Base: Policy, Evidence,
-- Definition, Other. Renames existing rows in place (not delete+reinsert)
-- so any Knowledge item already using one of these types keeps a valid
-- type_id reference.
update public.knowledge_types set label = 'Policy', sort_order = 1 where label = 'Policies';
update public.knowledge_types set sort_order = 2 where label = 'Evidence';
update public.knowledge_types set label = 'Definition', sort_order = 3 where label = 'Terminology';
update public.knowledge_types set sort_order = 4 where label = 'Other';
delete from public.knowledge_types where label = 'Values';
