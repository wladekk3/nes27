CREATE TABLE `code_redemptions` (
	`code_id` text NOT NULL,
	`user_id` text NOT NULL,
	`coupons` integer NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`code_id`, `user_id`)
);
--> statement-breakpoint
CREATE TABLE `reward_codes` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`scope` text NOT NULL,
	`kind` text NOT NULL,
	`coupons` integer NOT NULL,
	`max_uses` integer NOT NULL,
	`uses` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`creator` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_reward_code_scope` ON `reward_codes` (`scope`,`code`);