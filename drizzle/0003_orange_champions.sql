CREATE TABLE `card_locks` (
	`user_id` text NOT NULL,
	`card_slug` text NOT NULL,
	PRIMARY KEY(`user_id`, `card_slug`)
);
--> statement-breakpoint
CREATE TABLE `collection_claims` (
	`user_id` text NOT NULL,
	`set_id` text NOT NULL,
	`reward` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `set_id`)
);
--> statement-breakpoint
CREATE TABLE `event_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`scope` text NOT NULL,
	`event_id` text NOT NULL,
	`evidence` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`reward` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_event_user_once` ON `event_entries` (`user_id`,`event_id`);--> statement-breakpoint
CREATE INDEX `idx_event_scope_status` ON `event_entries` (`scope`,`status`);