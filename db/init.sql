-- ============================================
-- Роли и права для PostgREST
-- ============================================
CREATE ROLE web_anon NOLOGIN;
GRANT USAGE ON SCHEMA public TO web_anon;

-- ============================================
-- Таблицы
-- ============================================
CREATE TABLE contracts (
    id              SERIAL PRIMARY KEY,
    number          VARCHAR(50)  NOT NULL UNIQUE,
    client_name     VARCHAR(200) NOT NULL,
    amount          NUMERIC(14,2) NOT NULL CHECK (amount > 0),
    signed_date     DATE         NOT NULL,
    status          VARCHAR(20)  NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','closed','cancelled')),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE payments (
    id              BIGSERIAL PRIMARY KEY,
    contract_id     INTEGER      NOT NULL REFERENCES contracts(id) ON DELETE RESTRICT,
    amount          NUMERIC(14,2) NOT NULL CHECK (amount > 0),
    paid_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
    method          VARCHAR(20)  NOT NULL DEFAULT 'bank'
                    CHECK (method IN ('bank','card','cash')),
    comment         TEXT,
    -- защита от дублей: один платёж на (договор, сумма, дата с точностью до секунды)
    UNIQUE (contract_id, amount, paid_at)
);

CREATE TABLE error_log (
    id              BIGSERIAL PRIMARY KEY,
    occurred_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    source          VARCHAR(50) NOT NULL,
    message         TEXT        NOT NULL,
    details         JSONB
);

-- Индексы для производительности
CREATE INDEX idx_payments_contract ON payments(contract_id);
CREATE INDEX idx_payments_paid_at  ON payments(paid_at DESC);
CREATE INDEX idx_contracts_status  ON contracts(status);

-- ============================================
-- Представление задолженности
-- ============================================
CREATE OR REPLACE VIEW v_debt_report AS
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
-- Триггер аудита ошибок платежей
-- ============================================
CREATE OR REPLACE FUNCTION log_payment_error() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.amount <= 0 THEN
        INSERT INTO error_log(source, message, details)
        VALUES ('payments_trigger', 'Некорректная сумма платежа',
                jsonb_build_object('amount', NEW.amount));
        RAISE EXCEPTION 'Сумма платежа должна быть положительной';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_payment_check
BEFORE INSERT ON payments
FOR EACH ROW EXECUTE FUNCTION log_payment_error();

-- ============================================
-- Права для PostgREST
-- ============================================
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO web_anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO web_anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO web_anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO web_anon;

-- ============================================
-- Тестовые данные
-- ============================================
INSERT INTO contracts (number, client_name, amount, signed_date, status) VALUES
('Д-2024-001', 'ООО "Ромашка"',  150000.00, '2024-01-15', 'active'),
('Д-2024-002', 'ИП Иванов И.И.',  80000.00, '2024-02-01', 'active'),
('Д-2024-003', 'АО "Вектор"',    320000.00, '2024-02-20', 'active'),
('Д-2024-004', 'ООО "Заря"',      50000.00, '2024-03-10', 'closed');

INSERT INTO payments (contract_id, amount, method, comment) VALUES
(1,  50000.00, 'bank', 'Первая оплата'),
(1,  30000.00, 'card', 'Вторая оплата'),
(2,  80000.00, 'bank', 'Полная оплата'),
(3, 100000.00, 'bank', 'Аванс');