BEGIN;

CREATE TABLE alembic_version (
    version_num VARCHAR(32) NOT NULL, 
    CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num)
);

-- Running upgrade  -> cf38faa9f7dd

CREATE TABLE campionati (
    id VARCHAR(80) NOT NULL, 
    gara_id VARCHAR(80), 
    data JSONB NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
    PRIMARY KEY (id)
);

CREATE INDEX ix_campionati_gara_id ON campionati (gara_id);

CREATE TABLE catture (
    id VARCHAR(80) NOT NULL, 
    gara_id VARCHAR(80), 
    data JSONB NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
    PRIMARY KEY (id)
);

CREATE INDEX ix_catture_gara_id ON catture (gara_id);

CREATE TABLE documenti (
    id VARCHAR(80) NOT NULL, 
    gara_id VARCHAR(80), 
    data JSONB NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
    PRIMARY KEY (id)
);

CREATE INDEX ix_documenti_gara_id ON documenti (gara_id);

CREATE TABLE gare (
    id VARCHAR(80) NOT NULL, 
    gara_id VARCHAR(80), 
    data JSONB NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
    PRIMARY KEY (id)
);

CREATE INDEX ix_gare_gara_id ON gare (gara_id);

CREATE TABLE inviti (
    id VARCHAR(80) NOT NULL, 
    gara_id VARCHAR(80), 
    data JSONB NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
    PRIMARY KEY (id)
);

CREATE INDEX ix_inviti_gara_id ON inviti (gara_id);

CREATE TABLE iscritti (
    id VARCHAR(80) NOT NULL, 
    gara_id VARCHAR(80), 
    data JSONB NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
    PRIMARY KEY (id)
);

CREATE INDEX ix_iscritti_gara_id ON iscritti (gara_id);

CREATE TABLE messaggi (
    id VARCHAR(80) NOT NULL, 
    gara_id VARCHAR(80), 
    data JSONB NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
    PRIMARY KEY (id)
);

CREATE INDEX ix_messaggi_gara_id ON messaggi (gara_id);

CREATE TABLE specie (
    id VARCHAR(80) NOT NULL, 
    gara_id VARCHAR(80), 
    data JSONB NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
    PRIMARY KEY (id)
);

CREATE INDEX ix_specie_gara_id ON specie (gara_id);

CREATE TABLE users (
    id VARCHAR(80) NOT NULL, 
    gara_id VARCHAR(80), 
    data JSONB NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
    PRIMARY KEY (id)
);

CREATE INDEX ix_users_gara_id ON users (gara_id);

INSERT INTO alembic_version (version_num) VALUES ('cf38faa9f7dd') RETURNING alembic_version.version_num;

COMMIT;

BEGIN;

-- Running upgrade cf38faa9f7dd -> 791c5caa7909

CREATE TABLE atleti (
    id VARCHAR(80) NOT NULL, 
    gara_id VARCHAR(80), 
    data JSONB NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
    PRIMARY KEY (id)
);

CREATE INDEX ix_atleti_gara_id ON atleti (gara_id);

UPDATE alembic_version SET version_num='791c5caa7909' WHERE alembic_version.version_num = 'cf38faa9f7dd';

COMMIT;

