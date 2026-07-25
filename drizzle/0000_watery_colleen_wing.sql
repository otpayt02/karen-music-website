CREATE TABLE `songs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title_karen` text DEFAULT '' NOT NULL,
	`title_english` text NOT NULL,
	`style` text DEFAULT 'Worship' NOT NULL,
	`song_key` text DEFAULT 'C' NOT NULL,
	`bpm` integer DEFAULT 72 NOT NULL,
	`meter` text DEFAULT '4/4' NOT NULL,
	`song_group` text DEFAULT '' NOT NULL,
	`payload` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
