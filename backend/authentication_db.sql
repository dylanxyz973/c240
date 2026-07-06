-- Authentication DB schema for server.js
CREATE DATABASE IF NOT EXISTS `authentication_db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `authentication_db`;

CREATE TABLE IF NOT EXISTS `users` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(100) NOT NULL,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create a development MySQL user for this app
CREATE USER IF NOT EXISTS 'c240user'@'localhost' IDENTIFIED BY 'C240pass123!';
GRANT ALL PRIVILEGES ON `authentication_db`.* TO 'c240user'@'localhost';
FLUSH PRIVILEGES;

-- Example: insert a user via the signup page rather than seeding a plaintext password.
-- If you want to create a test user with password "password", run this in Node to produce a bcrypt hash, then insert it:
-- const bcrypt = require('bcryptjs'); bcrypt.hash('password', 10).then(h => console.log(h));
-- INSERT INTO users (username, email, password) VALUES ('testuser','test@example.com','<PASTE_HASH_HERE>');
