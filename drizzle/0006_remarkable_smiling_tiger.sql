ALTER TABLE `reward_codes` ADD `reward_type` text DEFAULT 'coupons' NOT NULL;--> statement-breakpoint
ALTER TABLE `reward_codes` ADD `reward_item` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `reward_codes` ADD `reward_amount` integer DEFAULT 0 NOT NULL;