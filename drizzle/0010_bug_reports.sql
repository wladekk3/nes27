CREATE TABLE `bug_reports` (
 `id` text PRIMARY KEY NOT NULL,
 `user_id` text,
 `visitor_id` text NOT NULL,
 `section` text NOT NULL,
 `description` text NOT NULL,
 `user_agent` text NOT NULL,
 `page_url` text NOT NULL,
 `status` text DEFAULT 'open' NOT NULL,
 `created_at` integer NOT NULL,
 `resolved_at` integer
);
CREATE INDEX `idx_bug_reports_status_created` ON `bug_reports` (`status`,`created_at`);
CREATE INDEX `idx_bug_reports_visitor_created` ON `bug_reports` (`visitor_id`,`created_at`);
