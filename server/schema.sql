CREATE TABLE IF NOT EXISTS games (
  id VARCHAR(80) PRIMARY KEY,
  slug VARCHAR(80) NOT NULL UNIQUE,
  title VARCHAR(200) NOT NULL,
  status VARCHAR(40) NOT NULL,
  summary TEXT NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS offerings (
  id VARCHAR(80) PRIMARY KEY,
  game_id VARCHAR(80) NOT NULL,
  title VARCHAR(200) NOT NULL,
  available BOOLEAN NOT NULL DEFAULT FALSE,
  pricing_model ENUM('pay-what-you-want', 'fixed') NOT NULL,
  currency CHAR(3) NOT NULL,
  minimum_amount DECIMAL(10,2) NULL,
  maximum_amount DECIMAL(10,2) NULL,
  fixed_amount DECIMAL(10,2) NULL,
  CONSTRAINT fk_offerings_game FOREIGN KEY (game_id) REFERENCES games(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS orders (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  reference CHAR(36) NOT NULL UNIQUE,
  customer_name VARCHAR(100) NOT NULL,
  customer_email VARCHAR(254) NOT NULL,
  currency CHAR(3) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  status ENUM('simulated') NOT NULL DEFAULT 'simulated',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS order_lines (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT UNSIGNED NOT NULL,
  offering_id VARCHAR(80) NOT NULL,
  offering_title VARCHAR(200) NOT NULL,
  unit_amount DECIMAL(10,2) NOT NULL,
  line_total DECIMAL(10,2) NOT NULL,
  CONSTRAINT fk_order_lines_order FOREIGN KEY (order_id) REFERENCES orders(id),
  CONSTRAINT fk_order_lines_offering FOREIGN KEY (offering_id) REFERENCES offerings(id)
) ENGINE=InnoDB;
