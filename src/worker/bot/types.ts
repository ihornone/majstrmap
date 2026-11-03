import type { Context } from 'grammy';
import type { Env } from '../index';
import type { MastersRepository } from '../db/masters.repo';
import type { ServicesRepository } from '../db/services.repo';
import type { ReviewsRepository } from '../db/reviews.repo';
import type { CategoriesRepository } from '../db/categories.repo';
import type { SessionsRepository } from '../db/sessions.repo';
import type { AdminRepository } from '../db/admin.repo';
import type { ClientRepository } from '../db/client.repo';

export interface BotCustomContext extends Context {
  env: Env;
  waitUntil?: (promise: Promise<unknown>) => void;
  repos: {
    masters: MastersRepository;
    services: ServicesRepository;
    reviews: ReviewsRepository;
    categories: CategoriesRepository;
    sessions: SessionsRepository;
    admin: AdminRepository;
    client: ClientRepository;
  };
}
