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
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT chk_offerings_pricing CHECK (
    (pricing_model = 'pay-what-you-want'
      AND minimum_amount IS NOT NULL AND maximum_amount IS NOT NULL
      AND minimum_amount >= 0 AND maximum_amount >= minimum_amount AND fixed_amount IS NULL)
    OR
    (pricing_model = 'fixed' AND fixed_amount IS NOT NULL AND fixed_amount >= 0
      AND minimum_amount IS NULL AND maximum_amount IS NULL)
  )
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS orders (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  reference CHAR(36) NOT NULL UNIQUE,
  customer_name VARCHAR(100) NOT NULL,
  customer_email VARCHAR(254) NOT NULL,
  currency CHAR(3) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  status ENUM('simulated') NOT NULL DEFAULT 'simulated',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  idempotency_key CHAR(36) NOT NULL UNIQUE,
  request_hash CHAR(64) NOT NULL,
  CONSTRAINT chk_orders_total CHECK (total >= 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS order_lines (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT UNSIGNED NOT NULL,
  offering_id VARCHAR(80) NOT NULL,
  offering_title VARCHAR(200) NOT NULL,
  unit_amount DECIMAL(10,2) NOT NULL,
  line_total DECIMAL(10,2) NOT NULL,
  INDEX idx_order_lines_order (order_id),
  INDEX idx_order_lines_offering (offering_id),
  CONSTRAINT fk_order_lines_order FOREIGN KEY (order_id) REFERENCES orders(id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_order_lines_offering FOREIGN KEY (offering_id) REFERENCES offerings(id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT chk_order_lines_amounts CHECK (
    unit_amount >= 0 AND line_total >= 0 AND line_total = unit_amount
  )
) ENGINE=InnoDB;
