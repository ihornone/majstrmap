DELETE FROM admin_requests WHERE master_id IN (
  SELECT id FROM masters WHERE (telegram_id, slug) IN (
    (100000001, 'oleksandr-kovalenko-kiev'),
    (100000002, 'serhiy-melnyk-kiev'),
    (100000003, 'ivan-petrenko-kyiv'),
    (100000004, 'taras-shevchenko-lviv')
  )
);
DELETE FROM masters WHERE (telegram_id, slug) IN (
  (100000001, 'oleksandr-kovalenko-kiev'),
  (100000002, 'serhiy-melnyk-kiev'),
  (100000003, 'ivan-petrenko-kyiv'),
  (100000004, 'taras-shevchenko-lviv')
);
