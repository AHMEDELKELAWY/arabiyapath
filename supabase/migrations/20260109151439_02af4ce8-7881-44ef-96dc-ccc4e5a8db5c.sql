-- Create Advanced Level for Gulf Arabic
INSERT INTO levels (id, dialect_id, name, order_index)
VALUES (
  'd4e5f607-4444-4444-4444-444444444444',
  'a1b2c3d4-1111-1111-1111-111111111111',
  'Advanced',
  3
);

-- Create 8 Advanced Units with challenging topics
INSERT INTO units (id, level_id, title, description, order_index) VALUES
('a1000001-0000-0000-0000-000000000001', 'd4e5f607-4444-4444-4444-444444444444', 'Politics & Current Affairs', 'Discuss regional news, political topics, and current events in Arabic', 1),
('a1000002-0000-0000-0000-000000000002', 'd4e5f607-4444-4444-4444-444444444444', 'Business Negotiations', 'Master advanced business vocabulary for meetings, contracts, and negotiations', 2),
('a1000003-0000-0000-0000-000000000003', 'd4e5f607-4444-4444-4444-444444444444', 'Literature & Poetry', 'Explore Gulf poetry, proverbs, and literary expressions', 3),
('a1000004-0000-0000-0000-000000000004', 'd4e5f607-4444-4444-4444-444444444444', 'Legal & Formal Language', 'Learn formal Arabic for legal documents, contracts, and official matters', 4),
('a1000005-0000-0000-0000-000000000005', 'd4e5f607-4444-4444-4444-444444444444', 'Media & Journalism', 'Understand news broadcasts, articles, and media terminology', 5),
('a1000006-0000-0000-0000-000000000006', 'd4e5f607-4444-4444-4444-444444444444', 'Science & Environment', 'Discuss scientific topics, environmental issues, and technology innovations', 6),
('a1000007-0000-0000-0000-000000000007', 'd4e5f607-4444-4444-4444-444444444444', 'Philosophy & Religion', 'Engage in deep discussions about beliefs, values, and philosophical concepts', 7),
('a1000008-0000-0000-0000-000000000008', 'd4e5f607-4444-4444-4444-444444444444', 'Diplomacy & International Relations', 'Master diplomatic vocabulary and discuss international affairs', 8);

-- Create Quizzes for each unit
INSERT INTO quizzes (id, unit_id) VALUES
('b1000001-0000-0000-0000-000000000001', 'a1000001-0000-0000-0000-000000000001'),
('b1000002-0000-0000-0000-000000000002', 'a1000002-0000-0000-0000-000000000002'),
('b1000003-0000-0000-0000-000000000003', 'a1000003-0000-0000-0000-000000000003'),
('b1000004-0000-0000-0000-000000000004', 'a1000004-0000-0000-0000-000000000004'),
('b1000005-0000-0000-0000-000000000005', 'a1000005-0000-0000-0000-000000000005'),
('b1000006-0000-0000-0000-000000000006', 'a1000006-0000-0000-0000-000000000006'),
('b1000007-0000-0000-0000-000000000007', 'a1000007-0000-0000-0000-000000000007'),
('b1000008-0000-0000-0000-000000000008', 'a1000008-0000-0000-0000-000000000008');