-- ============================================
-- Расширения
-- ============================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================
-- Роль для анонимного доступа
-- ============================================
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'web_anon') THEN
        CREATE ROLE web_anon NOLOGIN;
    END IF;
END $$;

GRANT USAGE ON SCHEMA public TO web_anon;

-- ============================================
-- Таблица пользователей
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id              BIGSERIAL PRIMARY KEY,
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   TEXT         NOT NULL,
    full_name       VARCHAR(200) NOT NULL DEFAULT '',
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ============================================
-- Таблица договоров
-- ============================================
CREATE TABLE IF NOT EXISTS contracts (
    id              SERIAL PRIMARY KEY,
    number          VARCHAR(50)  NOT NULL UNIQUE,
    client_name     VARCHAR(200) NOT NULL,
    amount          NUMERIC(14,2) NOT NULL CHECK (amount > 0),
    signed_date     DATE         NOT NULL,
    status          VARCHAR(20)  NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','closed','cancelled')),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);

-- ============================================
-- Таблица платежей
-- ============================================
CREATE TABLE IF NOT EXISTS payments (
    id              BIGSERIAL PRIMARY KEY,
    contract_id     INTEGER      NOT NULL REFERENCES contracts(id) ON DELETE RESTRICT,
    amount          NUMERIC(14,2) NOT NULL CHECK (amount > 0),
    paid_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
    method          VARCHAR(20)  NOT NULL DEFAULT 'bank'
                    CHECK (method IN ('bank','card','cash')),
    comment         TEXT
);

CREATE INDEX IF NOT EXISTS idx_payments_contract ON payments(contract_id);
CREATE INDEX IF NOT EXISTS idx_payments_paid_at  ON payments(paid_at DESC);

-- ============================================
-- Представление задолженности
-- ============================================
DROP VIEW IF EXISTS v_debt_report;
CREATE VIEW v_debt_report AS
SELECT
    c.id             AS contract_id,
    c.number         AS contract_number,
    c.client_name,
    c.amount         AS contract_amount,
    COALESCE(SUM(p.amount), 0)::NUMERIC(14,2) AS paid_amount,
    (c.amount - COALESCE(SUM(p.amount), 0))::NUMERIC(14,2) AS debt
FROM contracts c
LEFT JOIN payments p ON p.contract_id = c.id
WHERE c.status = 'active'
GROUP BY c.id, c.number, c.client_name, c.amount
ORDER BY debt DESC;

-- ============================================
-- Функция регистрации
-- ============================================
DROP FUNCTION IF EXISTS register(TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION register(
    p_email     TEXT,
    p_password  TEXT,
    p_full_name TEXT DEFAULT ''
)
RETURNS TABLE(success BOOLEAN, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_email TEXT := lower(trim(p_email));
BEGIN
    IF v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
        RETURN QUERY SELECT false::BOOLEAN, 'Некорректный email'::TEXT;
        RETURN;
    END IF;

    IF length(p_password) < 6 THEN
        RETURN QUERY SELECT false::BOOLEAN, 'Пароль должен содержать не менее 6 символов'::TEXT;
        RETURN;
    END IF;

    IF EXISTS (SELECT 1 FROM users WHERE email = v_email) THEN
        RETURN QUERY SELECT false::BOOLEAN, 'Пользователь с таким email уже существует'::TEXT;
        RETURN;
    END IF;

    INSERT INTO users(email, password_hash, full_name)
    VALUES (v_email, crypt(p_password, gen_salt('bf', 10)), trim(p_full_name));

    RETURN QUERY SELECT true::BOOLEAN, 'Регистрация успешна'::TEXT;
EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT false::BOOLEAN, 'Внутренняя ошибка регистрации'::TEXT;
END;
$$;

-- ============================================
-- Функция входа
-- ============================================
DROP FUNCTION IF EXISTS login(TEXT, TEXT);

CREATE OR REPLACE FUNCTION login(
    p_email    TEXT,
    p_password TEXT
)
RETURNS TABLE(
    success    BOOLEAN,
    user_id    BIGINT,
    user_email TEXT,
    user_name  TEXT,
    message    TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user  users%ROWTYPE;
    v_email TEXT := lower(trim(p_email));
BEGIN
    SELECT * INTO v_user FROM users WHERE users.email = v_email;

    IF NOT FOUND THEN
        RETURN QUERY
        SELECT
            false::BOOLEAN,
            NULL::BIGINT,
            NULL::TEXT,
            NULL::TEXT,
            'Неверный email или пароль'::TEXT;
        RETURN;
    END IF;

    IF v_user.password_hash <> crypt(p_password, v_user.password_hash) THEN
        RETURN QUERY
        SELECT
            false::BOOLEAN,
            NULL::BIGINT,
            NULL::TEXT,
            NULL::TEXT,
            'Неверный email или пароль'::TEXT;
        RETURN;
    END IF;

    RETURN QUERY
    SELECT
        true::BOOLEAN,
        v_user.id::BIGINT,
        v_user.email::TEXT,
        v_user.full_name::TEXT,
        'Вход выполнен'::TEXT;
END;
$$;

-- ============================================
-- Права
-- ============================================
GRANT SELECT, INSERT, UPDATE, DELETE ON contracts     TO web_anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON payments      TO web_anon;
GRANT SELECT                         ON v_debt_report TO web_anon;
GRANT SELECT, INSERT                 ON users         TO web_anon;
GRANT USAGE, SELECT ON SEQUENCE contracts_id_seq TO web_anon;
GRANT USAGE, SELECT ON SEQUENCE payments_id_seq  TO web_anon;
GRANT USAGE, SELECT ON SEQUENCE users_id_seq     TO web_anon;
GRANT EXECUTE ON FUNCTION register(TEXT, TEXT, TEXT) TO web_anon;
GRANT EXECUTE ON FUNCTION login(TEXT, TEXT)          TO web_anon;

-- ============================================
-- Тестовый пользователь (demo@example.com / demo1234)
-- ============================================
INSERT INTO users (email, password_hash, full_name)
VALUES (
    'demo@example.com',
    crypt('demo1234', gen_salt('bf', 10)),
    'Демо Пользователь'
)
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- Тестовые договоры
-- ============================================
INSERT INTO contracts (number, client_name, amount, signed_date, status) VALUES
('Д-2024-001', 'ООО "Ромашка"',  150000.00, '2024-01-15', 'active'),
('Д-2024-002', 'ИП Иванов И.И.',  80000.00, '2024-02-01', 'active'),
('Д-2024-003', 'АО "Вектор"',    320000.00, '2024-02-20', 'active')
ON CONFLICT (number) DO NOTHING;

-- ============================================
-- Тестовые платежи
-- ============================================
INSERT INTO payments (contract_id, amount, method, comment)
SELECT 1, 50000.00, 'bank', 'Первая оплата'
WHERE NOT EXISTS (SELECT 1 FROM payments WHERE contract_id = 1 AND amount = 50000.00);

INSERT INTO payments (contract_id, amount, method, comment)
SELECT 1, 30000.00, 'card', 'Вторая оплата'
WHERE NOT EXISTS (SELECT 1 FROM payments WHERE contract_id = 1 AND amount = 30000.00);

INSERT INTO payments (contract_id, amount, method, comment)
SELECT 2, 80000.00, 'bank', 'Полная оплата'
WHERE NOT EXISTS (SELECT 1 FROM payments WHERE contract_id = 2 AND amount = 80000.00);