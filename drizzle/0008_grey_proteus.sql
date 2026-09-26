CREATE TABLE `maintenance_rewards` (
	`cycle_id` text NOT NULL,
	`claimant` text NOT NULL,
	`code_id` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`cycle_id`, `claimant`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_maintenance_rewards_code` ON `maintenance_rewards` (`code_id`);--> statement-breakpoint
