CREATE TABLE `login_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`attempts` integer NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `prize_claims` (
	`order_id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`status` text DEFAULT 'waiting_bot' NOT NULL,
	`ticket_id` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user_cosmetics` (
	`user_id` text NOT NULL,
	`item_id` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `item_id`)
);
--> statement-breakpoint
CREATE TABLE `user_profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`nickname` text DEFAULT '' NOT NULL,
	`bio` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'На связи' NOT NULL,
	`avatar` text DEFAULT 'shinigami' NOT NULL,
	`equipped` text DEFAULT '{}' NOT NULL,
	`showcase` text DEFAULT '[]' NOT NULL
);
