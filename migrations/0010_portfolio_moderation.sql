-- Додавання статусу модерації для фотографій портфоліо
ALTER TABLE master_portfolio ADD COLUMN status TEXT NOT NULL DEFAULT 'approved';
