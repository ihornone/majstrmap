-- Seed categories only. Profiles are created through moderated registration.

INSERT OR IGNORE INTO categories (id, name, is_custom, approved) VALUES
  ('plumbing', 'Сантехніка', 0, 1),
  ('electric', 'Електрика', 0, 1),
  ('appliances', 'Побутова техніка', 0, 1),
  ('finishing', 'Ремонт і оздоблення', 0, 1),
  ('construction', 'Будівництво', 0, 1),
  ('auto', 'Автомайстер', 0, 1),
  ('manicure', 'Манікюр і педикюр', 0, 1),
  ('hairdresser', 'Перукарі', 0, 1),
  ('cosmetology', 'Косметологія', 0, 1),
  ('other', 'Інше', 0, 1);

