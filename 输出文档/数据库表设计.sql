CREATE TABLE user (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  openid VARCHAR(64) UNIQUE NOT NULL,
  unionid VARCHAR(64),
  phone VARCHAR(20) UNIQUE,
  email VARCHAR(128),
  password_hash VARCHAR(255),
  nickname VARCHAR(64) NOT NULL,
  avatar_url VARCHAR(255),
  gender TINYINT,
  status TINYINT DEFAULT 1,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  deleted_at DATETIME
);

CREATE TABLE role (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(32) UNIQUE NOT NULL,
  name VARCHAR(64) NOT NULL
);

CREATE TABLE user_role (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  role_id BIGINT NOT NULL,
  created_at DATETIME NOT NULL,
  UNIQUE KEY uk_user_role (user_id, role_id)
);

CREATE TABLE user_settings (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  privacy_level TINYINT DEFAULT 0,
  notify_like TINYINT DEFAULT 1,
  notify_comment TINYINT DEFAULT 1,
  notify_dm TINYINT DEFAULT 1,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);

CREATE TABLE pet (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  name VARCHAR(64) NOT NULL,
  breed VARCHAR(64),
  age INT,
  gender TINYINT,
  avatar_url VARCHAR(255),
  description VARCHAR(512),
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  deleted_at DATETIME,
  INDEX idx_pet_user (user_id)
);

CREATE TABLE follow (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  follower_id BIGINT NOT NULL,
  followee_id BIGINT NOT NULL,
  created_at DATETIME NOT NULL,
  UNIQUE KEY uk_follow (follower_id, followee_id)
);

CREATE TABLE topic (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(64) UNIQUE NOT NULL,
  created_at DATETIME NOT NULL
);

CREATE TABLE tag (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(64) UNIQUE NOT NULL
);

CREATE TABLE post (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  title VARCHAR(128),
  content TEXT,
  pet_type VARCHAR(32),
  visibility TINYINT DEFAULT 0,
  status TINYINT DEFAULT 1,
  like_count INT DEFAULT 0,
  comment_count INT DEFAULT 0,
  favorite_count INT DEFAULT 0,
  share_count INT DEFAULT 0,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  deleted_at DATETIME,
  INDEX idx_post_user_created (user_id, created_at)
);

CREATE TABLE post_media (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  post_id BIGINT NOT NULL,
  type VARCHAR(16) NOT NULL,
  url VARCHAR(255) NOT NULL,
  cover_url VARCHAR(255),
  sort_order INT DEFAULT 0,
  created_at DATETIME NOT NULL,
  INDEX idx_post_media_post (post_id)
);

CREATE TABLE post_tag (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  post_id BIGINT NOT NULL,
  tag_id BIGINT NOT NULL,
  UNIQUE KEY uk_post_tag (post_id, tag_id)
);

CREATE TABLE post_topic (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  post_id BIGINT NOT NULL,
  topic_id BIGINT NOT NULL,
  UNIQUE KEY uk_post_topic (post_id, topic_id)
);

CREATE TABLE `like` (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  post_id BIGINT NOT NULL,
  created_at DATETIME NOT NULL,
  UNIQUE KEY uk_like (user_id, post_id)
);

CREATE TABLE comment (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  post_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  parent_id BIGINT,
  content VARCHAR(1024) NOT NULL,
  like_count INT DEFAULT 0,
  status TINYINT DEFAULT 1,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  INDEX idx_comment_post_created (post_id, created_at)
);

CREATE TABLE favorite (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  post_id BIGINT NOT NULL,
  created_at DATETIME NOT NULL,
  UNIQUE KEY uk_favorite (user_id, post_id)
);

CREATE TABLE history (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  item_type VARCHAR(16) NOT NULL,
  item_id BIGINT NOT NULL,
  created_at DATETIME NOT NULL,
  INDEX idx_history_user_created (user_id, created_at)
);

CREATE TABLE dm_conversation (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_a BIGINT NOT NULL,
  user_b BIGINT NOT NULL,
  last_message_id BIGINT,
  unread_a INT DEFAULT 0,
  unread_b INT DEFAULT 0,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  UNIQUE KEY uk_conv_pair (user_a, user_b)
);

CREATE TABLE dm_message (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  conversation_id BIGINT NOT NULL,
  sender_id BIGINT NOT NULL,
  content VARCHAR(1024),
  media_url VARCHAR(255),
  created_at DATETIME NOT NULL,
  INDEX idx_dm_msg_conv_created (conversation_id, created_at)
);

CREATE TABLE notification (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  type VARCHAR(32) NOT NULL,
  ref_type VARCHAR(16),
  ref_id BIGINT,
  status TINYINT DEFAULT 0,
  created_at DATETIME NOT NULL,
  INDEX idx_notif_user_created (user_id, created_at)
);

CREATE TABLE category (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  parent_id BIGINT,
  name VARCHAR(64) NOT NULL,
  sort_order INT DEFAULT 0
);

CREATE TABLE brand (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(64) NOT NULL
);

CREATE TABLE product (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  category_id BIGINT NOT NULL,
  brand_id BIGINT,
  name VARCHAR(128) NOT NULL,
  description TEXT,
  cover_url VARCHAR(255),
  status TINYINT DEFAULT 1,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  INDEX idx_product_cat (category_id)
);

CREATE TABLE sku (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  product_id BIGINT NOT NULL,
  spec VARCHAR(128) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  stock INT NOT NULL,
  status TINYINT DEFAULT 1,
  UNIQUE KEY uk_sku_product_spec (product_id, spec)
);

CREATE TABLE cart (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  updated_at DATETIME NOT NULL,
  UNIQUE KEY uk_cart_user (user_id)
);

CREATE TABLE cart_item (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  cart_id BIGINT NOT NULL,
  sku_id BIGINT NOT NULL,
  quantity INT NOT NULL,
  UNIQUE KEY uk_cart_item (cart_id, sku_id)
);

CREATE TABLE address (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  receiver VARCHAR(64) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  region VARCHAR(128),
  detail VARCHAR(256) NOT NULL,
  is_default TINYINT DEFAULT 0
);

CREATE TABLE `order` (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  status VARCHAR(16) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  pay_amount DECIMAL(10,2) NOT NULL,
  pay_method VARCHAR(16),
  address_id BIGINT,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  INDEX idx_order_user_created (user_id, created_at)
);

CREATE TABLE order_item (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  order_id BIGINT NOT NULL,
  sku_id BIGINT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  quantity INT NOT NULL
);

CREATE TABLE payment (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  order_id BIGINT NOT NULL,
  status VARCHAR(16) NOT NULL,
  transaction_id VARCHAR(64),
  created_at DATETIME NOT NULL
);

CREATE TABLE refund (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  order_id BIGINT NOT NULL,
  status VARCHAR(16) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  created_at DATETIME NOT NULL
);

CREATE TABLE review (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  product_id BIGINT NOT NULL,
  order_id BIGINT,
  rating TINYINT NOT NULL,
  content VARCHAR(1024),
  created_at DATETIME NOT NULL,
  UNIQUE KEY uk_review_user_product (user_id, product_id)
);

CREATE TABLE coupon (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(32) UNIQUE NOT NULL,
  name VARCHAR(64) NOT NULL,
  discount DECIMAL(10,2) NOT NULL,
  threshold DECIMAL(10,2) NOT NULL,
  start_at DATETIME NOT NULL,
  end_at DATETIME NOT NULL,
  total INT,
  claimed INT DEFAULT 0
);

CREATE TABLE coupon_claim (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  coupon_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  status TINYINT DEFAULT 0,
  created_at DATETIME NOT NULL,
  UNIQUE KEY uk_coupon_user (coupon_id, user_id)
);

CREATE TABLE service_org (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(128) NOT NULL,
  address VARCHAR(256),
  phone VARCHAR(20),
  geo_lat DECIMAL(10,6),
  geo_lng DECIMAL(10,6),
  created_at DATETIME NOT NULL
);

CREATE TABLE service_type (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(32) UNIQUE NOT NULL,
  name VARCHAR(64) NOT NULL
);

CREATE TABLE service_item (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  org_id BIGINT NOT NULL,
  type_code VARCHAR(32) NOT NULL,
  name VARCHAR(128) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  duration INT NOT NULL,
  status TINYINT DEFAULT 1
);

CREATE TABLE schedule (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  org_id BIGINT NOT NULL,
  service_item_id BIGINT NOT NULL,
  start_time DATETIME NOT NULL,
  end_time DATETIME NOT NULL,
  capacity INT NOT NULL
);

CREATE TABLE appointment (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  org_id BIGINT NOT NULL,
  service_item_id BIGINT NOT NULL,
  schedule_id BIGINT NOT NULL,
  status VARCHAR(16) NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);

CREATE TABLE service_order (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  appointment_id BIGINT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(16) NOT NULL,
  created_at DATETIME NOT NULL
);

CREATE TABLE service_record (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  appointment_id BIGINT NOT NULL,
  notes VARCHAR(1024),
  created_at DATETIME NOT NULL
);

CREATE TABLE rating (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  ref_type VARCHAR(16) NOT NULL,
  ref_id BIGINT NOT NULL,
  score TINYINT NOT NULL,
  content VARCHAR(1024),
  created_at DATETIME NOT NULL,
  UNIQUE KEY uk_rating_ref (user_id, ref_type, ref_id)
);

CREATE TABLE audit_log (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  actor_id BIGINT,
  action VARCHAR(64) NOT NULL,
  target_type VARCHAR(16),
  target_id BIGINT,
  created_at DATETIME NOT NULL
);

CREATE TABLE risk_event (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT,
  type VARCHAR(32) NOT NULL,
  detail VARCHAR(512),
  created_at DATETIME NOT NULL
);

CREATE TABLE ban_list (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  reason VARCHAR(256),
  start_at DATETIME,
  end_at DATETIME
);

CREATE TABLE config_kv (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  k VARCHAR(64) UNIQUE NOT NULL,
  v VARCHAR(512) NOT NULL,
  updated_at DATETIME NOT NULL
);
