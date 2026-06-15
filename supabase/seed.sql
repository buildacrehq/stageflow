-- ============================================================
-- SEED DATA — Run after schema.sql
-- ============================================================

-- --------------------------------------------------------
-- STAGE TARGETS
-- --------------------------------------------------------
insert into stage_targets (stage_name, target_days, buffer_days, category, sort_order) values
  ('Foundation 1',        45,  7, 'structure', 1),
  ('Foundation 2',        45,  7, 'structure', 2),
  ('GF Lintel',           60,  7, 'structure', 3),
  ('GF Roof',             75,  7, 'structure', 4),
  ('FF Lintel',           90,  7, 'structure', 5),
  ('FF Roof',            105,  7, 'structure', 6),
  ('SF Lintel',          120,  7, 'structure', 7),
  ('SF Roof',            135,  7, 'structure', 8),
  ('TF Lintel',          150,  7, 'structure', 9),
  ('TF Roof',            165,  7, 'structure', 10),
  ('4F Lintel',          180,  7, 'structure', 11),
  ('4F Roof',            195,  7, 'structure', 12),
  ('5F Wall',            210,  7, 'structure', 13),
  ('5F Roof',            225,  7, 'structure', 14),
  ('6F Wall',            240,  7, 'structure', 15),
  ('6F Roof',            255,  7, 'structure', 16),
  ('Grills & Frames',    270,  7, 'finishing', 17),
  ('Electrical 1',       280,  7, 'finishing', 18),
  ('Plumbing 1',         290,  7, 'finishing', 19),
  ('Plastering Int',     300,  7, 'finishing', 20),
  ('Flooring Procurement',310, 7, 'finishing', 21),
  ('Flooring Laying',    320,  7, 'finishing', 22),
  ('Plastering Ext',     330,  7, 'finishing', 23),
  ('Electrical 2',       340,  7, 'finishing', 24),
  ('Painting 1',         350,  7, 'finishing', 25),
  ('Plumbing Fixtures',  360,  7, 'finishing', 26),
  ('Railings',           370,  7, 'finishing', 27),
  ('Doors & Windows',    380,  7, 'finishing', 28),
  ('Painting 2',         390,  7, 'finishing', 29),
  ('Handover',           400,  7, 'finishing', 30)
on conflict (stage_name) do nothing;

-- --------------------------------------------------------
-- PROJECTS + STAGES (all 28 from prototype data)
-- --------------------------------------------------------

do $$
declare
  pid uuid;
begin

  -- 1. Archanavinod-Girinagar
  insert into projects (client_name, location, mob_date) values ('Archanavinod', 'Girinagar', '2025-04-08') returning id into pid;
  insert into project_stages (project_id, stage_name, completed_date) values
    (pid, 'Foundation 1',   '2025-06-09'),
    (pid, 'GF Lintel',      '2025-07-05'),
    (pid, 'GF Roof',        '2025-07-31'),
    (pid, 'FF Lintel',      '2025-08-07'),
    (pid, 'FF Roof',        '2025-10-13'),
    (pid, 'SF Lintel',      '2025-08-27'),
    (pid, 'SF Roof',        '2026-01-17'),
    (pid, 'TF Lintel',      '2026-01-20'),
    (pid, 'TF Roof',        '2026-01-25'),
    (pid, '4F Lintel',      '2026-01-28'),
    (pid, 'Grills & Frames','2025-10-24'),
    (pid, 'Flooring Procurement','2026-02-01'),
    (pid, 'Doors & Windows','2025-10-25');

  -- 2. Santhosh - MR
  insert into projects (client_name, location, mob_date) values ('Santhosh', 'MR', '2024-12-14') returning id into pid;
  insert into project_stages (project_id, stage_name, completed_date) values
    (pid, 'Foundation 1',   '2024-12-21'),
    (pid, 'GF Lintel',      '2025-01-05'),
    (pid, 'FF Lintel',      '2025-02-24'),
    (pid, 'SF Lintel',      '2025-04-13'),
    (pid, 'TF Lintel',      '2025-05-23'),
    (pid, 'TF Roof',        '2025-06-28'),
    (pid, 'Grills & Frames','2025-07-26'),
    (pid, 'Plastering Int', '2026-01-11');

  -- 3. Umesh-Sunkadakatte
  insert into projects (client_name, location, mob_date) values ('Umesh', 'Sunkadakatte', '2025-02-22') returning id into pid;
  insert into project_stages (project_id, stage_name, completed_date) values
    (pid, 'Foundation 1',   '2025-04-02'),
    (pid, 'GF Lintel',      '2025-04-16'),
    (pid, 'GF Roof',        '2025-05-07'),
    (pid, 'FF Lintel',      '2025-06-06'),
    (pid, 'FF Roof',        '2025-06-15'),
    (pid, 'SF Lintel',      '2025-07-18'),
    (pid, 'SF Roof',        '2025-08-06'),
    (pid, 'Electrical 1',   '2025-08-25'),
    (pid, 'Plastering Int', '2025-11-21'),
    (pid, 'Flooring Procurement','2026-02-03'),
    (pid, 'Flooring Laying','2026-02-25'),
    (pid, 'Plastering Ext', '2025-12-26'),
    (pid, 'Electrical 2',   '2026-04-04'),
    (pid, 'Painting 1',     '2026-01-03'),
    (pid, 'Railings',       '2026-04-29');

  -- 4. Suma Venugopal-Nelamangala
  insert into projects (client_name, location, mob_date) values ('Suma Venugopal', 'Nelamangala', '2025-06-25') returning id into pid;
  insert into project_stages (project_id, stage_name, completed_date) values
    (pid, 'Foundation 2',   '2025-07-19'),
    (pid, 'GF Lintel',      '2025-08-12'),
    (pid, 'GF Roof',        '2025-08-18'),
    (pid, 'FF Lintel',      '2025-09-24'),
    (pid, 'FF Roof',        '2025-10-03'),
    (pid, 'SF Lintel',      '2025-11-12'),
    (pid, 'SF Roof',        '2025-11-24'),
    (pid, 'Grills & Frames','2025-12-14'),
    (pid, 'Electrical 1',   '2026-01-20'),
    (pid, 'Flooring Laying','2026-01-28'),
    (pid, 'Plastering Ext', '2026-03-11'),
    (pid, 'Doors & Windows','2026-01-20');

  -- 5. Joshua-Bannerghatta
  insert into projects (client_name, location, mob_date) values ('Joshua', 'Bannerghatta', '2025-04-10') returning id into pid;
  insert into project_stages (project_id, stage_name, completed_date) values
    (pid, 'Foundation 1',   '2025-05-08'),
    (pid, 'Foundation 2',   '2025-05-29'),
    (pid, 'GF Lintel',      '2025-06-22'),
    (pid, 'GF Roof',        '2025-07-30'),
    (pid, 'FF Lintel',      '2025-09-03'),
    (pid, 'FF Roof',        '2025-09-22'),
    (pid, 'SF Lintel',      '2025-11-09'),
    (pid, 'SF Roof',        '2025-11-19'),
    (pid, 'Plumbing 1',     '2026-02-25'),
    (pid, 'Plastering Int', '2026-01-24'),
    (pid, 'Plastering Ext', '2026-03-07'),
    (pid, 'Electrical 2',   '2026-03-16'),
    (pid, 'Painting 1',     '2026-03-31');

  -- 6. Poornima Ram-Manyata Tech park
  insert into projects (client_name, location, mob_date) values ('Poornima Ram', 'Manyata Tech Park', '2025-05-05') returning id into pid;
  insert into project_stages (project_id, stage_name, completed_date) values
    (pid, 'Foundation 1',   '2025-05-08'),
    (pid, 'Foundation 2',   '2025-05-26'),
    (pid, 'GF Lintel',      '2025-06-19'),
    (pid, 'GF Roof',        '2025-07-28'),
    (pid, 'FF Lintel',      '2025-08-11'),
    (pid, 'FF Roof',        '2025-08-21'),
    (pid, 'SF Lintel',      '2025-08-28'),
    (pid, 'SF Roof',        '2025-10-03'),
    (pid, 'TF Lintel',      '2025-11-06'),
    (pid, 'TF Roof',        '2025-12-03'),
    (pid, '4F Lintel',      '2026-01-02'),
    (pid, '4F Roof',        '2026-01-16'),
    (pid, 'Grills & Frames','2026-02-09');

  -- 7. Raghavendra Upadhaya-Horamavu
  insert into projects (client_name, location, mob_date) values ('Raghavendra Upadhaya', 'Horamavu', '2025-01-19') returning id into pid;
  insert into project_stages (project_id, stage_name, completed_date) values
    (pid, 'Foundation 1',   '2025-02-15'),
    (pid, 'Foundation 2',   '2025-03-18'),
    (pid, 'GF Lintel',      '2025-04-05'),
    (pid, 'GF Roof',        '2025-04-13'),
    (pid, 'FF Lintel',      '2025-05-14'),
    (pid, 'FF Roof',        '2025-06-03'),
    (pid, 'SF Lintel',      '2025-07-09'),
    (pid, 'SF Roof',        '2025-07-19'),
    (pid, 'TF Lintel',      '2025-09-11'),
    (pid, 'TF Roof',        '2025-09-21'),
    (pid, 'Plastering Int', '2025-12-21'),
    (pid, 'Flooring Procurement','2026-01-05'),
    (pid, 'Plastering Ext', '2026-01-17'),
    (pid, 'Painting 1',     '2026-04-07');

  -- 8. Gautham BSK 6thStage
  insert into projects (client_name, location, mob_date) values ('Gautham', 'BSK 6th Stage', '2024-12-24') returning id into pid;
  insert into project_stages (project_id, stage_name, completed_date) values
    (pid, 'Foundation 1',   '2025-03-18'),
    (pid, 'Foundation 2',   '2025-04-15'),
    (pid, 'GF Lintel',      '2025-05-17'),
    (pid, 'GF Roof',        '2025-07-15'),
    (pid, 'FF Lintel',      '2025-08-20'),
    (pid, 'FF Roof',        '2025-09-06'),
    (pid, 'SF Lintel',      '2025-11-01'),
    (pid, 'SF Roof',        '2025-11-25'),
    (pid, 'TF Lintel',      '2025-12-27'),
    (pid, 'TF Roof',        '2026-01-30'),
    (pid, 'Grills & Frames','2026-02-21'),
    (pid, 'Electrical 1',   '2026-04-13'),
    (pid, 'Plumbing 1',     '2026-05-02');

  -- 9. Sapna-Nandhini layout
  insert into projects (client_name, location, mob_date) values ('Sapna', 'Nandhini Layout', '2025-04-26') returning id into pid;
  insert into project_stages (project_id, stage_name, completed_date) values
    (pid, 'GF Lintel',      '2025-08-01'),
    (pid, 'GF Roof',        '2025-08-01'),
    (pid, 'FF Lintel',      '2025-09-08'),
    (pid, 'FF Roof',        '2025-09-08'),
    (pid, 'SF Roof',        '2025-11-13'),
    (pid, 'TF Lintel',      '2025-12-18'),
    (pid, 'TF Roof',        '2025-12-18'),
    (pid, 'Grills & Frames','2026-02-06'),
    (pid, 'Electrical 1',   '2025-12-29'),
    (pid, 'Plumbing 1',     '2026-03-31');

  -- 10. Sindhu-vishweshwaraiah
  insert into projects (client_name, location, mob_date) values ('Sindhu', 'Vishweshwaraiah', '2025-06-01') returning id into pid;
  insert into project_stages (project_id, stage_name, completed_date) values
    (pid, 'Foundation 1',   '2025-07-03'),
    (pid, 'Foundation 2',   '2025-07-11'),
    (pid, 'GF Lintel',      '2025-09-01'),
    (pid, 'GF Roof',        '2026-01-06'),
    (pid, 'FF Lintel',      '2026-01-25'),
    (pid, 'TF Lintel',      '2026-03-01'),
    (pid, 'TF Roof',        '2026-03-03'),
    (pid, 'Grills & Frames','2026-03-30'),
    (pid, 'Electrical 1',   '2026-03-31');

  -- 11. Shilpa Mahesh
  insert into projects (client_name, location, mob_date) values ('Shilpa Mahesh', null, '2025-03-25') returning id into pid;
  insert into project_stages (project_id, stage_name, completed_date) values
    (pid, 'Foundation 1',   '2025-04-28'),
    (pid, 'Foundation 2',   '2025-05-29'),
    (pid, 'GF Lintel',      '2025-06-05'),
    (pid, 'GF Roof',        '2025-06-20'),
    (pid, 'FF Lintel',      '2025-07-02'),
    (pid, 'FF Roof',        '2025-07-08'),
    (pid, 'SF Lintel',      '2025-08-03'),
    (pid, 'SF Roof',        '2025-08-16'),
    (pid, 'Grills & Frames','2025-09-14'),
    (pid, 'Electrical 1',   '2025-08-30'),
    (pid, 'Plumbing 1',     '2025-12-24'),
    (pid, 'Plastering Int', '2025-12-27'),
    (pid, 'Plastering Ext', '2026-01-17'),
    (pid, 'Painting 1',     '2026-02-21');

  -- 12. Indhushree-Bannerghatta
  insert into projects (client_name, location, mob_date) values ('Indhushree', 'Bannerghatta', '2025-08-29') returning id into pid;
  insert into project_stages (project_id, stage_name, completed_date) values
    (pid, 'Foundation 1',   '2025-09-29'),
    (pid, 'Foundation 2',   '2025-10-02'),
    (pid, 'GF Lintel',      '2025-11-16'),
    (pid, 'GF Roof',        '2025-11-17'),
    (pid, 'FF Lintel',      '2025-12-14'),
    (pid, 'FF Roof',        '2025-12-27'),
    (pid, 'SF Lintel',      '2026-01-25'),
    (pid, 'SF Roof',        '2026-02-07'),
    (pid, 'TF Lintel',      '2026-02-28'),
    (pid, 'TF Roof',        '2026-03-15');

  -- 13. Soubhagya-Vijay Nagar
  insert into projects (client_name, location, mob_date) values ('Soubhagya', 'Vijay Nagar', '2025-07-05') returning id into pid;
  insert into project_stages (project_id, stage_name, completed_date) values
    (pid, 'Foundation 1',   '2025-08-08'),
    (pid, 'GF Lintel',      '2025-09-27'),
    (pid, 'GF Roof',        '2025-09-27'),
    (pid, 'FF Lintel',      '2025-11-08'),
    (pid, 'FF Roof',        '2025-11-12'),
    (pid, 'SF Lintel',      '2025-12-05'),
    (pid, 'SF Roof',        '2025-12-26'),
    (pid, 'TF Lintel',      '2026-01-20'),
    (pid, 'TF Roof',        '2026-02-02');

  -- 14. Arun Kumar
  insert into projects (client_name, location, mob_date) values ('Arun Kumar', null, '2025-04-09') returning id into pid;
  insert into project_stages (project_id, stage_name, completed_date) values
    (pid, 'Foundation 1',   '2025-05-13'),
    (pid, 'Foundation 2',   '2025-06-03'),
    (pid, 'GF Lintel',      '2025-07-04'),
    (pid, 'GF Roof',        '2025-07-16'),
    (pid, 'FF Lintel',      '2025-08-25'),
    (pid, 'FF Roof',        '2025-08-28'),
    (pid, 'SF Lintel',      '2025-10-04'),
    (pid, 'SF Roof',        '2025-10-30'),
    (pid, 'Grills & Frames','2026-01-02'),
    (pid, 'Electrical 1',   '2025-11-29'),
    (pid, 'Plumbing 1',     '2026-01-28'),
    (pid, 'Plastering Int', '2026-01-10'),
    (pid, 'Flooring Procurement','2026-02-10'),
    (pid, 'Plastering Ext', '2026-02-21'),
    (pid, 'Electrical 2',   '2026-03-21'),
    (pid, 'Painting 1',     '2026-02-14');

  -- 15. Dhananjay
  insert into projects (client_name, location, mob_date) values ('Dhananjay', null, '2025-04-15') returning id into pid;
  insert into project_stages (project_id, stage_name, completed_date) values
    (pid, 'Foundation 1',   '2025-05-01'),
    (pid, 'Foundation 2',   '2025-05-07'),
    (pid, 'GF Roof',        '2025-06-08'),
    (pid, 'FF Lintel',      '2025-06-22'),
    (pid, 'FF Roof',        '2025-07-05'),
    (pid, 'SF Roof',        '2025-08-09'),
    (pid, 'Plumbing 1',     '2025-09-29'),
    (pid, 'Plumbing Fixtures','2026-03-21'),
    (pid, 'Railings',       '2026-03-31');

  -- 16. Anil-Jigani
  insert into projects (client_name, location, mob_date) values ('Anil', 'Jigani', '2025-04-15') returning id into pid;
  insert into project_stages (project_id, stage_name, completed_date) values
    (pid, 'Foundation 1',   '2026-02-21'),
    (pid, 'Foundation 2',   '2026-03-09'),
    (pid, 'GF Lintel',      '2026-03-22'),
    (pid, 'GF Roof',        '2026-04-24'),
    (pid, 'Grills & Frames','2026-05-02');

  -- 17. Karthik-jakkur
  insert into projects (client_name, location, mob_date) values ('Karthik', 'Jakkur', '2025-09-04') returning id into pid;
  insert into project_stages (project_id, stage_name, completed_date) values
    (pid, 'Foundation 1',   '2025-09-24'),
    (pid, 'Foundation 2',   '2025-10-18'),
    (pid, 'GF Lintel',      '2025-11-19'),
    (pid, 'GF Roof',        '2025-11-19'),
    (pid, 'FF Roof',        '2025-12-17'),
    (pid, 'SF Lintel',      '2026-01-07'),
    (pid, 'SF Roof',        '2026-01-12'),
    (pid, 'TF Lintel',      '2026-02-07'),
    (pid, '4F Lintel',      '2026-03-11'),
    (pid, '4F Roof',        '2026-03-25'),
    (pid, 'Grills & Frames','2026-03-31'),
    (pid, 'Electrical 1',   '2026-04-09');

  -- 18. Prasad-Ullal
  insert into projects (client_name, location, mob_date) values ('Prasad', 'Ullal', '2025-08-30') returning id into pid;
  insert into project_stages (project_id, stage_name, completed_date) values
    (pid, 'GF Roof',        '2025-10-27'),
    (pid, 'FF Lintel',      '2025-11-22'),
    (pid, 'Grills & Frames','2025-12-29'),
    (pid, 'Electrical 1',   '2026-01-08'),
    (pid, 'Plumbing 1',     '2026-02-18'),
    (pid, 'Plastering Int', '2026-02-06'),
    (pid, 'Plastering Ext', '2026-02-21'),
    (pid, 'Painting 1',     '2026-03-18'),
    (pid, 'Plumbing Fixtures','2026-03-24'),
    (pid, 'Doors & Windows','2026-03-31'),
    (pid, 'Painting 2',     '2026-04-16'),
    (pid, 'Handover',       '2026-04-25');

  -- 19. Rakesh-Nelamangala
  insert into projects (client_name, location, mob_date) values ('Rakesh', 'Nelamangala', '2025-08-23') returning id into pid;
  insert into project_stages (project_id, stage_name, completed_date) values
    (pid, 'Foundation 1',   '2025-10-13'),
    (pid, 'Foundation 2',   '2025-11-01'),
    (pid, 'GF Lintel',      '2025-11-29'),
    (pid, 'GF Roof',        '2025-12-22'),
    (pid, 'FF Lintel',      '2026-02-01'),
    (pid, 'FF Roof',        '2026-02-24');

  -- 20. Sachin-Kengeri
  insert into projects (client_name, location, mob_date) values ('Sachin', 'Kengeri', '2025-09-03') returning id into pid;
  insert into project_stages (project_id, stage_name, completed_date) values
    (pid, 'Foundation 1',   '2025-09-21'),
    (pid, 'Foundation 2',   '2025-09-26'),
    (pid, 'GF Lintel',      '2025-11-01'),
    (pid, 'GF Roof',        '2025-11-15'),
    (pid, 'FF Lintel',      '2025-12-16'),
    (pid, 'SF Lintel',      '2026-01-12'),
    (pid, 'TF Lintel',      '2026-02-21'),
    (pid, 'TF Roof',        '2026-03-09'),
    (pid, 'Electrical 1',   '2026-04-10');

  -- 21. Raghavendra KM-JP nagar
  insert into projects (client_name, location, mob_date) values ('Raghavendra KM', 'JP Nagar', '2025-11-08') returning id into pid;
  insert into project_stages (project_id, stage_name, completed_date) values
    (pid, 'Foundation 1',   '2025-12-05'),
    (pid, 'Foundation 2',   '2025-12-11'),
    (pid, 'GF Lintel',      '2026-01-14'),
    (pid, 'GF Roof',        '2026-02-01'),
    (pid, 'FF Lintel',      '2026-02-28'),
    (pid, 'FF Roof',        '2026-03-14');

  -- 22. Santhosh laggere
  insert into projects (client_name, location, mob_date) values ('Santhosh', 'Laggere', '2024-12-22') returning id into pid;
  insert into project_stages (project_id, stage_name, completed_date) values
    (pid, 'Foundation 1',   '2025-01-21'),
    (pid, 'Foundation 2',   '2025-02-14'),
    (pid, 'GF Lintel',      '2025-02-20'),
    (pid, 'GF Roof',        '2025-03-29'),
    (pid, 'FF Lintel',      '2025-04-07'),
    (pid, 'FF Roof',        '2025-04-07'),
    (pid, 'SF Lintel',      '2025-05-01'),
    (pid, 'SF Roof',        '2025-05-05'),
    (pid, 'TF Lintel',      '2025-05-19'),
    (pid, 'TF Roof',        '2025-05-19'),
    (pid, 'Grills & Frames','2025-05-29'),
    (pid, 'Electrical 1',   '2025-06-07'),
    (pid, 'Plumbing 1',     '2025-08-24'),
    (pid, 'Flooring Procurement','2025-12-31');

  -- 23. Lavanaya-Varthur
  insert into projects (client_name, location, mob_date) values ('Lavanaya', 'Varthur', '2025-11-14') returning id into pid;
  insert into project_stages (project_id, stage_name, completed_date) values
    (pid, 'Foundation 1',   '2025-11-29'),
    (pid, 'Foundation 2',   '2025-12-11'),
    (pid, 'GF Lintel',      '2026-01-03'),
    (pid, 'GF Roof',        '2026-01-17'),
    (pid, 'FF Lintel',      '2026-02-21'),
    (pid, 'FF Roof',        '2026-03-07'),
    (pid, 'SF Lintel',      '2026-04-09'),
    (pid, 'SF Roof',        '2026-04-30');

  -- 24. Bhagath-BTM
  insert into projects (client_name, location, mob_date) values ('Bhagath', 'BTM', '2025-11-18') returning id into pid;
  insert into project_stages (project_id, stage_name, completed_date) values
    (pid, 'Foundation 1',   '2025-12-31'),
    (pid, 'Foundation 2',   '2026-01-23'),
    (pid, 'GF Lintel',      '2026-01-04'),
    (pid, 'GF Roof',        '2026-03-09'),
    (pid, 'FF Lintel',      '2026-04-10');

  -- 25. Ruban-Bannerghatta
  insert into projects (client_name, location, mob_date) values ('Ruban', 'Bannerghatta', '2026-02-10') returning id into pid;
  insert into project_stages (project_id, stage_name, completed_date) values
    (pid, 'Foundation 1',   '2026-03-05'),
    (pid, 'Foundation 2',   '2026-03-11'),
    (pid, 'GF Lintel',      '2026-03-29'),
    (pid, 'GF Roof',        '2026-03-29');

  -- 26. Rajeev-KR Puram
  insert into projects (client_name, location, mob_date) values ('Rajeev', 'KR Puram', '2025-07-27') returning id into pid;
  insert into project_stages (project_id, stage_name, completed_date) values
    (pid, 'Foundation 1',   '2025-08-30');

  -- 27. Shiv G-Ullal (no mob_date)
  insert into projects (client_name, location, mob_date) values ('Shiv G', 'Ullal', null) returning id into pid;
  insert into project_stages (project_id, stage_name, completed_date) values
    (pid, 'Foundation 1',   '2025-09-22'),
    (pid, 'Foundation 2',   '2025-10-02'),
    (pid, 'GF Lintel',      '2025-11-08'),
    (pid, 'GF Roof',        '2025-11-15'),
    (pid, 'FF Lintel',      '2025-12-22'),
    (pid, 'FF Roof',        '2026-01-06'),
    (pid, 'SF Roof',        '2026-02-21'),
    (pid, 'TF Lintel',      '2026-03-18'),
    (pid, 'TF Roof',        '2026-03-28');

  -- 28. Manju Prasad-Nagarbhavi (no mob_date)
  insert into projects (client_name, location, mob_date) values ('Manju Prasad', 'Nagarbhavi', null) returning id into pid;
  insert into project_stages (project_id, stage_name, completed_date) values
    (pid, 'Foundation 2',   '2025-09-14'),
    (pid, 'GF Lintel',      '2025-10-01'),
    (pid, 'GF Roof',        '2025-10-03'),
    (pid, 'FF Lintel',      '2025-10-29'),
    (pid, 'FF Roof',        '2025-10-24'),
    (pid, 'SF Lintel',      '2025-12-27'),
    (pid, 'SF Roof',        '2026-02-10'),
    (pid, 'TF Lintel',      '2026-02-05'),
    (pid, 'TF Roof',        '2026-02-20'),
    (pid, '4F Roof',        '2026-03-30'),
    (pid, 'Grills & Frames','2026-03-21'),
    (pid, 'Electrical 1',   '2026-03-04');

end $$;
