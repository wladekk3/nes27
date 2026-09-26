CREATE TABLE `profile_extras` (
	`user_id` text PRIMARY KEY NOT NULL,
	`wishlist` text DEFAULT '[]' NOT NULL,
	`presets` text DEFAULT '[]' NOT NULL
);
