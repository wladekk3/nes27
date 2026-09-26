CREATE TABLE `site_visitors` (`visitor_id` text PRIMARY KEY NOT NULL,`first_seen_at` integer NOT NULL,`last_seen_at` integer NOT NULL,`visits` integer DEFAULT 1 NOT NULL);
