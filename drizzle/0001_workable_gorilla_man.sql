CREATE TABLE `operations` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`action` text NOT NULL,
	`result` text NOT NULL,
	`valid` integer NOT NULL CONSTRAINT operation_valid CHECK (`valid` = 1),
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `shop_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`product_id` text NOT NULL,
	`name` text NOT NULL,
	`price` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer NOT NULL
);

--> statement-breakpoint
UPDATE referrals SET reward_tokens=-1 WHERE status='verified';
--> statement-breakpoint
UPDATE referrals SET reward_tokens=0 WHERE status='pending';
--> statement-breakpoint
UPDATE site_settings SET value=json_remove(value,'$.acts','$.seasonSubtitle','$.dismantleValues') WHERE key='site_config' AND json_valid(value);
